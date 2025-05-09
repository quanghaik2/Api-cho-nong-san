const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const productController = require("./routes/product");
const categoryRoutes = require("./routes/category");
const cartRoutes = require("./routes/cart");
const orderRoutes = require("./routes/orders");
const addressRoutes = require("./routes/address");
const notificationRoutes = require("./routes/notification");
const sellerRoutes = require("./routes/sellerRouter");
const { processUserQuery } = require("./services/geminiService");
const db = require("./config/db");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Điều chỉnh origin theo domain của client nếu cần
    methods: ["GET", "POST"],
  },
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productController);
app.use("/api/categories", categoryRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/addresses", addressRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/seller", sellerRoutes);

// WebSocket logic
io.on("connection", (socket) => {
  console.log("A client connected:", socket.id);

  // Client gửi userId khi kết nối
  socket.on("join", (userId) => {
    socket.join(userId); // Tham gia vào "room" dựa trên userId
    console.log(`User ${userId} joined room`);
  });

  socket.on("disconnect", () => {
    console.log("A client disconnected:", socket.id);
  });
});

// Lưu io để sử dụng trong các controller
app.set("io", io);

// File server.js (đoạn xử lý /api/chatbot)

app.post("/api/chatbot", async (req, res) => {
  const { query } = req.body;
  // *** QUAN TRỌNG: Cần lấy user_id từ middleware xác thực ***
  // Ví dụ: const userId = req.user?.id; // Giả sử bạn có middleware xác thực gán req.user
  const userId = 1; // Tạm thời hardcode, CẦN THAY THẾ BẰNG XÁC THỰC THỰC TẾ

  if (!query) {
      return res.status(400).json({ message: "Vui lòng gửi câu hỏi!" });
  }

  try {
      const geminiResponse = await processUserQuery(query);
      const { intent, params, suggestion, natural_response } = geminiResponse;

      console.log("Gemini Response:", geminiResponse); // Log để debug

      // --- Intent: search_product ---
      if (intent === "search_product") {
          let sql = "SELECT * FROM products WHERE 1=1"; // Bắt đầu với điều kiện luôn đúng
          let sqlParams = [];

          if (params.product_name) {
              sql += " AND name LIKE ?";
              sqlParams.push(`%${params.product_name}%`);
          }
          if (params.category) {
              // Giả sử bạn có cột category_id hoặc tương tự
              // sql += " AND category_id = (SELECT id FROM categories WHERE name LIKE ?)";
              // sqlParams.push(`%${params.category}%`);
              // Hoặc nếu chỉ là cột text:
              // sql += " AND category LIKE ?";
              // sqlParams.push(`%${params.category}%`);
          }
          if (params.price_min) {
              sql += " AND price >= ?";
              sqlParams.push(params.price_min);
          }
          if (params.price_max) {
              sql += " AND price <= ?";
              sqlParams.push(params.price_max);
          }
          if (params.address) {
               // Thêm điều kiện lọc theo địa chỉ nếu có trong search_product
               sql += " AND address LIKE ?";
               sqlParams.push(`%${params.address}%`);
          }

           sql += " LIMIT 20"; // Giới hạn số lượng kết quả trả về

          let [products] = await db.promise().query(sql, sqlParams);

          if (products.length > 0) {
              let responseMessage = `${natural_response}\nTìm thấy ${products.length} sản phẩm phù hợp:`;
              return res.status(200).json({ message: responseMessage, products });
          } else {
              const [popularProducts] = await db
                  .promise()
                  .query("SELECT * FROM products ORDER BY RAND() LIMIT 3"); 
              if (popularProducts.length > 0) {
                  let responseMessage = `${natural_response}\nKhông tìm thấy sản phẩm nào khớp chính xác. Dưới đây là một số sản phẩm gợi ý:`;
                  return res.status(200).json({ message: responseMessage, products: popularProducts });
              }
              return res.status(404).json({ message: `${natural_response}\nKhông tìm thấy sản phẩm nào phù hợp. Bạn thử tìm kiếm với tiêu chí khác nhé!` });
          }
      }

      if (intent === "product_by_address") {
          let sql = "SELECT * FROM products WHERE address LIKE ?";
          let sqlParams = [`%${params.address}%`];

           if (params.product_name) { // Kết hợp tìm theo tên SP nếu có
               sql += " AND name LIKE ?";
               sqlParams.push(`%${params.product_name}%`);
           }

          sql += " LIMIT 20";

          let [products] = await db.promise().query(sql, sqlParams);

          if (products.length > 0) {
              let responseMessage = `${natural_response}\nTìm thấy ${products.length} sản phẩm tại khu vực ${params.address}:`;
              return res.status(200).json({ message: responseMessage, products });
          } else {
              let nearbyProducts = [];
              // Ưu tiên fallback từ suggestion của Gemini nếu có
              let fallbackAddress = suggestion?.nearby_address || null;

              // Logic fallback cứng nếu Gemini không gợi ý (có thể giữ lại hoặc bỏ tùy nhu cầu)
              if (!fallbackAddress) {
                  const addressHierarchy = {
                      "Đảo Cai": "Cần Thơ", // Ví dụ
                      "Cần Thơ": "Hậu Giang", // Ví dụ
                      "Trung Quốc": "Hà Nội",
                      "Anh Quốc": "TP.HCM"
                  };
                 fallbackAddress = addressHierarchy[params.address] || "Hà Nội"; // Fallback cuối cùng
              }


              if (fallbackAddress) {
                  console.log(`Không tìm thấy ở "${params.address}", thử tìm ở fallback: "${fallbackAddress}"`);
                  let fallbackSql = "SELECT * FROM products WHERE address LIKE ? LIMIT 3";
                  let fallbackParams = [`%${fallbackAddress}%`];
                   if (params.product_name) { // Tìm cả tên SP ở địa chỉ fallback
                       fallbackSql += " AND name LIKE ?";
                       fallbackParams.push(`%${params.product_name}%`);
                   }

                  [nearbyProducts] = await db.promise().query(fallbackSql, fallbackParams);
              }

              if (nearbyProducts.length > 0) {
                  // natural_response từ Gemini có thể đã xử lý việc không tìm thấy ở địa chỉ gốc
                  let responseMessage = `${natural_response}\nĐây là một số sản phẩm gợi ý từ ${fallbackAddress}:`;
                  return res.status(200).json({ message: responseMessage, products: nearbyProducts });
              }
              return res.status(404).json({ message: `${natural_response}\nKhông tìm thấy sản phẩm nào tại ${params.address} hoặc các khu vực lân cận. Bạn thử lại nhé!` });
          }
      }

      // --- Intent: add_to_cart ---
      if (intent === "add_to_cart") {
          if (!userId) { // *** KIỂM TRA USER ID ***
               return res.status(401).json({ message: "Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng." });
          }
          if (!params.product_name) {
               return res.status(400).json({ message: `${natural_response}\nBạn muốn thêm sản phẩm nào vào giỏ hàng?` });
          }

          // Tìm product_id dựa trên tên. Cần xử lý trường hợp tên không rõ ràng hoặc có nhiều kết quả.
          // Ưu tiên tìm chính xác tên trước, sau đó mới LIKE
          let [exactProducts] = await db.promise().query("SELECT id FROM products WHERE name = ?", [params.product_name]);
          let productId = null;

          if (exactProducts.length === 1) {
               productId = exactProducts[0].id;
          } else {
               // Nếu không tìm thấy tên chính xác hoặc có nhiều, thử tìm LIKE
               let [likeProducts] = await db.promise().query("SELECT id FROM products WHERE name LIKE ? LIMIT 1", [`%${params.product_name}%`]);
               if (likeProducts.length === 1) {
                   productId = likeProducts[0].id;
                   // Có thể cần xác nhận lại với người dùng nếu tên không khớp hoàn toàn
                   natural_response += ` (Tìm thấy sản phẩm tương tự: ${params.product_name})`;
               }
          }


          if (productId) {
              const quantity = params.quantity || 1; // Lấy số lượng từ params, mặc định là 1
              await db.promise().query(
                  "INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)",
                  [userId, productId, quantity]
              );
              return res.status(200).json({ message: `${natural_response}` }); // Chỉ trả về câu xác nhận
          } else {
              return res.status(404).json({ message: `${natural_response}\nKhông tìm thấy sản phẩm "${params.product_name}". Bạn có thể thử tìm với tên khác hoặc xem danh sách sản phẩm nhé!` });
          }
      }

       // --- Intent: view_cart (Ví dụ) ---
       if (intent === "view_cart") {
           if (!userId) {
               return res.status(401).json({ message: "Vui lòng đăng nhập để xem giỏ hàng." });
           }
           // Logic lấy thông tin giỏ hàng từ DB
           const [cartItems] = await db.promise().query(
               `SELECT p.id, p.name, p.price, c.quantity
                FROM cart c
                JOIN products p ON c.product_id = p.id
                WHERE c.user_id = ?`,
               [userId]
           );
            if (cartItems.length > 0) {
                 return res.status(200).json({ message: natural_response, cart: cartItems });
            } else {
                 return res.status(200).json({ message: "Giỏ hàng của bạn đang trống." });
            }
       }

      // --- Intent: unknown hoặc các intent khác chưa xử lý ---
      return res.status(200).json({ message: natural_response });

  } catch (error) {
      console.error("Lỗi xử lý chatbot:", error.message, error.stack);
      // Trả về lỗi 500 chung chung hơn cho client
      return res.status(500).json({ message: "Ôi, có lỗi xảy ra trong quá trình xử lý yêu cầu. Bạn thử lại sau nhé!" });
  }
});

// Khởi động server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server đang chạy trên cổng ${PORT}`);
});