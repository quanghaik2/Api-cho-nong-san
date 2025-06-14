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
const { webSearch, searchProductInfo } = require("./controllers/webSearchController");
const { processUserQuery } = require("./services/geminiService");
const db = require("./config/db");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use("/api/auth", authRoutes);
app.use("/api/products", productController);
app.use("/api/categories", categoryRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/addresses", addressRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/seller", sellerRoutes);

app.post("/api/chatbot/web-search", webSearch);
app.post("/api/chatbot/search-product-info", searchProductInfo);

io.on("connection", (socket) => {
  console.log("A client connected:", socket.id);
  socket.on("join", (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined room`);
  });
  socket.on("disconnect", () => {
    console.log("A client disconnected:", socket.id);
  });
});

app.set("io", io);

app.post("/api/chatbot", async (req, res) => {
  const { query } = req.body;
  const userId = 1;

  if (!query) {
    return res.status(400).json({ message: "Vui lòng gửi câu hỏi!" });
  }

  try {
    const geminiResponse = await processUserQuery(query);
    const { intent, params, suggestion, natural_response } = geminiResponse;

    console.log("Gemini Response:", geminiResponse);

    if (intent === "search_product") {
      let sql = "SELECT * FROM products WHERE 1=1";
      let sqlParams = [];

      if (params.product_name) {
        sql += " AND name LIKE ?";
        sqlParams.push(`%${params.product_name}%`);
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
        sql += " AND address LIKE ?";
        sqlParams.push(`%${params.address}%`);
      }

      sql += " LIMIT 20";
      let [products] = await db.promise().query(sql, sqlParams);

      if (products.length > 0) {
        return res.status(200).json({ message: `${natural_response}\nTìm thấy ${products.length} sản phẩm phù hợp:`, products });
      } else {
        const [popularProducts] = await db.promise().query("SELECT * FROM products ORDER BY RAND() LIMIT 3");
        if (popularProducts.length > 0) {
          return res.status(200).json({ message: `${natural_response}\nKhông tìm thấy sản phẩm nào khớp chính xác. Dưới đây là một số sản phẩm gợi ý:`, products: popularProducts });
        }
        return res.status(404).json({ message: `${natural_response}\nKhông tìm thấy sản phẩm nào phù hợp. Bạn thử tìm kiếm với tiêu chí khác nhé!` });
      }
    }

    if (intent === "product_by_address") {
      let sql = "SELECT * FROM products WHERE address LIKE ?";
      let sqlParams = [params.address ? `%${params.address}%` : "%"];

      if (params.product_name) {
        sql += " AND name LIKE ?";
        sqlParams.push(`%${params.product_name}%`);
      }

      sql += " LIMIT 20";
      let [products] = await db.promise().query(sql, sqlParams);

      if (products.length > 0) {
        return res.status(200).json({ message: `${natural_response}\nTìm thấy ${products.length} sản phẩm tại khu vực ${params.address}:`, products });
      } else {
        let nearbyProducts = [];
        let fallbackAddress = suggestion?.nearby_address || null;

        // if (!fallbackAddress) {
        //   const addressHierarchy = {
        //     "Đảo Cai": "Cần Thơ",
        //     "Cần Thơ": "Hậu Giang",
        //     "Trung Quốc": "Hà Nội",
        //     "Anh Quốc": "TP.HCM",
        //   };
        //   fallbackAddress = addressHierarchy[params.address] || "Hà Nội";
        // }

        if (fallbackAddress) {
          let fallbackSql = "SELECT * FROM products WHERE address LIKE ? LIMIT 3";
          let fallbackParams = [`%${fallbackAddress}%`];
          if (params.product_name) {
            fallbackSql += " AND name LIKE ?";
            fallbackParams.push(`%${params.product_name}%`);
          }
          [nearbyProducts] = await db.promise().query(fallbackSql, fallbackParams);
        }

        if (nearbyProducts.length > 0) {
          return res.status(200).json({ message: `${natural_response}\nĐây là một số sản phẩm gợi ý từ ${fallbackAddress}:`, products: nearbyProducts });
        }
        return res.status(404).json({ message: `${natural_response}\nKhông tìm thấy sản phẩm nào tại ${params.address} hoặc các khu vực lân cận. Bạn thử lại nhé!` });
      }
    }

    if (intent === "add_to_cart") {
      if (!userId) {
        return res.status(401).json({ message: "Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng." });
      }
      if (!params.product_name) {
        return res.status(400).json({ message: `${natural_response}\nBạn muốn thêm sản phẩm nào vào giỏ hàng?` });
      }

      let [exactProducts] = await db.promise().query("SELECT id FROM products WHERE name = ?", [params.product_name]);
      let productId = null;

      if (exactProducts.length === 1) {
        productId = exactProducts[0].id;
      } else {
        let [likeProducts] = await db.promise().query("SELECT id FROM products WHERE name LIKE ? LIMIT 1", [`%${params.product_name}%`]);
        if (likeProducts.length === 1) {
          productId = likeProducts[0].id;
          natural_response += ` (Tìm thấy sản phẩm tương tự: ${params.product_name})`;
        }
      }

      if (productId) {
        const quantity = params.quantity || 1;
        await db.promise().query(
          "INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)",
          [userId, productId, quantity]
        );
        return res.status(200).json({ message: `${natural_response}` });
      } else {
        return res.status(404).json({ message: `${natural_response}\nKhông tìm thấy sản phẩm "${params.product_name}". Bạn có thể thử tìm với tên khác hoặc xem danh sách sản phẩm nhé!` });
      }
    }

    if (intent === "view_cart") {
      if (!userId) {
        return res.status(401).json({ message: "Vui lòng đăng nhập để xem giỏ hàng." });
      }
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

    return res.status(200).json({ message: natural_response });

  } catch (error) {
    console.error("Lỗi xử lý chatbot:", error.message, error.stack);
    return res.status(500).json({ message: "Ôi, có lỗi xảy ra trong quá trình xử lý yêu cầu. Bạn thử lại sau nhé!" });
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server đang chạy trên cổng ${PORT}`);
});