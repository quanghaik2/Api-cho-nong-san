const Order = require("../models/Order");
const OrderItem = require("../models/OrderItem");
const UserAddress = require("../models/UserAddress");
const Product = require("../models/Product");
const Cart = require("../models/Cart");
const Notification = require("../models/Notification");
const db = require("../config/db");

exports.getRevenueStats = async (req, res) => {
  const user = req.user;
  const { date, month } = req.query;

  try {
    // Doanh thu hôm nay (đơn hàng delivered trong ngày hiện tại)
    const today = new Date().toISOString().split("T")[0];
    const revenueQuery = `
      SELECT SUM(oi.quantity * oi.price_at_time) AS total_revenue
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE oi.seller_id = ? AND o.status = 'delivered' AND DATE(o.created_at) = ?
    `;
    const [revenueResult] = await db.promise().query(revenueQuery, [user.id, date || today]);

    // Đơn hàng chờ (pending)
    const pendingQuery = `
      SELECT COUNT(DISTINCT o.id) AS pending_orders
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      WHERE oi.seller_id = ? AND o.status = 'pending'
    `;
    const [pendingResult] = await db.promise().query(pendingQuery, [user.id]);

    // Sản phẩm đang bán
    const productsQuery = `
      SELECT COUNT(*) AS active_products
      FROM products
      WHERE seller_id = ?
    `;
    const [productsResult] = await db.promise().query(productsQuery, [user.id]);

    // Daily stats
    let dailyQuery = `
      SELECT 
        DATE(o.created_at) AS sale_date,
        SUM(oi.quantity * oi.price_at_time) AS total_revenue,
        oi.product_id,
        oi.name AS product_name,
        SUM(oi.quantity) AS total_quantity,
        SUM(oi.quantity * oi.price_at_time) AS product_revenue
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE oi.seller_id = ? AND o.status = 'delivered'
    `;
    let dailyParams = [user.id];

    if (date) {
      dailyQuery += " AND DATE(o.created_at) = ?";
      dailyParams.push(date);
    }

    dailyQuery += `
      GROUP BY 
        DATE(o.created_at),
        oi.product_id,
        oi.name
      ORDER BY sale_date DESC
    `;
    const [dailyResults] = await db.promise().query(dailyQuery, dailyParams);

    const dailyStats = {};
    dailyResults.forEach((row) => {
      const dateKey = row.sale_date.toISOString().split("T")[0];
      if (!dailyStats[dateKey]) {
        dailyStats[dateKey] = {
          date: dateKey,
          totalRevenue: 0,
          products: [],
        };
      }
      dailyStats[dateKey].totalRevenue += parseFloat(row.product_revenue) || 0;
      dailyStats[dateKey].products.push({
        product_id: row.product_id,
        name: row.product_name,
        quantity: row.total_quantity,
        revenue: row.product_revenue,
      });
    });

    // Monthly stats
    let monthlyQuery = `
      SELECT 
        DATE_FORMAT(o.created_at, '%Y-%m') AS sale_month,
        SUM(oi.quantity * oi.price_at_time) AS total_revenue,
        oi.product_id,
        oi.name AS product_name,
        SUM(oi.quantity) AS total_quantity,
        SUM(oi.quantity * oi.price_at_time) AS product_revenue
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE oi.seller_id = ? AND o.status = 'delivered'
    `;
    let monthlyParams = [user.id];

    if (month) {
      monthlyQuery += " AND DATE_FORMAT(o.created_at, '%Y-%m') = ?";
      monthlyParams.push(month);
    }

    monthlyQuery += `
      GROUP BY 
        DATE_FORMAT(o.created_at, '%Y-%m'),
        oi.product_id,
        oi.name
      ORDER BY sale_month DESC
    `;
    const [monthlyResults] = await db.promise().query(monthlyQuery, monthlyParams);

    const monthlyStats = {};
    monthlyResults.forEach((row) => {
      const monthKey = row.sale_month;
      if (!monthlyStats[monthKey]) {
        monthlyStats[monthKey] = {
          month: monthKey,
          totalRevenue: 0,
          products: [],
        };
      }
      monthlyStats[monthKey].totalRevenue += parseFloat(row.product_revenue) || 0;
      monthlyStats[monthKey].products.push({
        product_id: row.product_id,
        name: row.product_name,
        quantity: row.total_quantity,
        revenue: row.product_revenue,
      });
    });

    res.status(200).json({
      daily: Object.values(dailyStats),
      monthly: Object.values(monthlyStats),
      revenueToday: parseFloat(revenueResult[0]?.total_revenue) || 0,
      pendingOrders: parseInt(pendingResult[0]?.pending_orders) || 0,
      activeProducts: parseInt(productsResult[0]?.active_products) || 0,
    });
  } catch (error) {
    console.error("Lỗi khi thống kê doanh thu:", error);
    res.status(500).json({ message: "Lỗi server: " + error.message });
  }
};

exports.createOrder = async (req, res) => {
  const { items, address_id, shippingFee } = req.body;
  console.log({ items, address_id, shippingFee });

  if (!items || items.length === 0) {
    return res.status(400).json({ message: "Không có sản phẩm nào để đặt hàng!" });
  }
  if (!address_id) {
    return res.status(400).json({ message: "Vui lòng chọn địa chỉ nhận hàng!" });
  }

  try {
    for (const item of items) {
      const product = await Product.getById(item.product_id);
      if (!product) {
        return res.status(400).json({ message: `Sản phẩm ID ${item.product_id} không tồn tại!` });
      }
      if (!item.seller_id || item.seller_id === null || item.seller_id === undefined) {
        item.seller_id = product.seller_id;
      }
      if (!item.store_name || item.store_name === null || item.store_name === undefined) {
        item.store_name = product.store_name;
      }
      if (!item.seller_id) {
        return res.status(400).json({ message: `Sản phẩm ID ${item.product_id} không có thông tin người bán (seller_id)!` });
      }
      if (!item.store_name) {
        return res.status(400).json({ message: `Sản phẩm ID ${item.product_id} không có thông tin cửa hàng (store_name)!` });
      }
    }

    const address = await UserAddress.getById(address_id);
    if (!address || address.user_id !== req.user.id) {
      return res.status(400).json({ message: "Địa chỉ không hợp lệ!" });
    }
    const fullAddress = `${address.detailed_address}, ${address.ward}, ${address.district}, ${address.province}`;

    const ordersBySeller = items.reduce((acc, item) => {
      const { seller_id } = item;
      if (!acc[seller_id]) acc[seller_id] = [];
      acc[seller_id].push(item);
      return acc;
    }, {});

    const orderIds = [];
    const io = req.app.get("io");

    for (const seller_id in ordersBySeller) {
      const sellerItems = ordersBySeller[seller_id];
      const original_amount = sellerItems.reduce(
        (total, item) => total + item.price_at_time * item.quantity,
        0
      );
      const total_amount = original_amount + shippingFee;

      const orderId = await Order.create({
        user_id: req.user.id,
        total_amount,
        original_amount,
        shipping_fee: shippingFee,
        address: fullAddress,
        status: "pending",
      });

      for (const item of sellerItems) {
        await OrderItem.create({
          order_id: orderId,
          product_id: item.product_id,
          quantity: item.quantity,
          price_at_time: item.price_at_time,
          seller_id: item.seller_id,
          name: item.name,
          store_name: item.store_name,
        });
      }
      orderIds.push(orderId);

      io.to(seller_id.toString()).emit("newOrder", {
        message: `Có đơn hàng mới #${orderId}`,
        order_id: orderId,
        created_at: new Date().toISOString(),
      });
    }

    const cart = await Cart.getCartByUserId(req.user.id);
    if (!cart) {
      return res.status(400).json({ message: "Giỏ hàng không tồn tại!" });
    }

    console.log("Cart ID:", cart.id);

    const productIds = items.map((item) => item.product_id);
    if (productIds.length > 0) {
      await Cart.removeMultipleFromCart(cart.id, productIds);
    }

    res.status(201).json({ message: "Đặt hàng thành công!", orderIds });
  } catch (error) {
    console.error("Lỗi khi tạo đơn hàng:", error);
    res.status(500).json({ message: "Lỗi server: " + error.message });
  }
};

exports.createOrderBuyNow = async (req, res) => {
  const { items, address_id, shippingFee } = req.body;
  console.log({ items, address_id, shippingFee });

  if (!items || items.length === 0) {
    return res.status(400).json({ message: "Không có sản phẩm nào để đặt hàng!" });
  }
  if (!address_id) {
    return res.status(400).json({ message: "Vui lòng chọn địa chỉ nhận hàng!" });
  }

  try {
    for (const item of items) {
      const product = await Product.getById(item.product_id);
      if (!product) {
        return res.status(400).json({ message: `Sản phẩm ID ${item.product_id} không tồn tại!` });
      }
      if (!item.seller_id || item.seller_id === null || item.seller_id === undefined) {
        item.seller_id = product.seller_id;
      }
      if (!item.store_name || item.store_name === null || item.store_name === undefined) {
        item.store_name = product.store_name;
      }
      if (!item.seller_id) {
        return res.status(400).json({ message: `Sản phẩm ID ${item.product_id} không có thông tin người bán (seller_id)!` });
      }
      if (!item.store_name) {
        return res.status(400).json({ message: `Sản phẩm ID ${item.product_id} không có thông tin cửa hàng (store_name)!` });
      }
    }

    const address = await UserAddress.getById(address_id);
    if (!address || address.user_id !== req.user.id) {
      return res.status(400).json({ message: "Địa chỉ không hợp lệ!" });
    }
    const fullAddress = `${address.detailed_address}, ${address.ward}, ${address.district}, ${address.province}`;

    const ordersBySeller = items.reduce((acc, item) => {
      const { seller_id } = item;
      if (!acc[seller_id]) acc[seller_id] = [];
      acc[seller_id].push(item);
      return acc;
    }, {});

    const orderIds = [];
    const io = req.app.get("io");

    for (const seller_id in ordersBySeller) {
      const sellerItems = ordersBySeller[seller_id];
      const original_amount = sellerItems.reduce(
        (total, item) => total + item.price_at_time * item.quantity,
        0
      );
      const total_amount = original_amount + shippingFee;

      const orderId = await Order.create({
        user_id: req.user.id,
        total_amount,
        original_amount,
        shipping_fee: shippingFee,
        address: fullAddress,
        status: "pending",
      });

      for (const item of sellerItems) {
        await OrderItem.create({
          order_id: orderId,
          product_id: item.product_id,
          quantity: item.quantity,
          price_at_time: item.price_at_time,
          seller_id: item.seller_id,
          name: item.name,
          store_name: item.store_name,
        });
      }
      orderIds.push(orderId);

      io.to(seller_id.toString()).emit("newOrder", {
        message: `Có đơn hàng mới #${orderId}`,
        order_id: orderId,
        created_at: new Date().toISOString(),
      });
    }

    res.status(201).json({ message: "Đặt hàng thành công!", orderIds });
  } catch (error) {
    console.error("Lỗi khi tạo đơn hàng nhanh:", error);
    res.status(500).json({ message: "Lỗi server: " + error.message });
  }
};

exports.getUserOrders = async (req, res) => {
  try {
    const orders = await Order.getByUserId(req.user.id);
    const detailedOrders = await Promise.all(
      orders.map(async (order) => {
        const items = await OrderItem.getByOrderId(order.id);
        return { ...order, items };
      })
    );
    res.status(200).json(detailedOrders);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server: " + error.message });
  }
};

exports.getOrderById = async (req, res) => {
  const { id } = req.params;

  try {
    const order = await Order.getById(id);
    if (!order) {
      return res.status(404).json({ message: "Đơn hàng không tồn tại!" });
    }
    if (order.user_id !== req.user.id) {
      return res.status(403).json({ message: "Bạn không có quyền xem đơn hàng này!" });
    }

    const items = await OrderItem.getByOrderId(id);
    res.status(200).json({ ...order, items });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server: " + error.message });
  }
};

exports.getSellerOrders = async (req, res) => {
  const { id } = req.user;
  console.log({ user: req.user });
  try {
    const [orders] = await db.promise().query(
      `
      SELECT DISTINCT o.*
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      WHERE oi.seller_id = ?
      ORDER BY o.created_at DESC
    `,
      [id]
    );

    const detailedOrders = await Promise.all(
      orders.map(async (order) => {
        const [items] = await db.promise().query(
          "SELECT * FROM order_items WHERE order_id = ? AND seller_id = ?",
          [order.id, id]
        );
        return { ...order, items };
      })
    );

    res.status(200).json(detailedOrders);
  } catch (error) {
    console.error("Lỗi khi lấy đơn hàng:", error);
    res.status(500).json({ message: "Lỗi server: " + error.message });
  }
};

exports.getSellerOrderById = async (req, res) => {
  const user = req.user;
  const { id } = req.params;

  try {
    const [orders] = await db.promise().query(
      `
      SELECT o.*
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      WHERE o.id = ? AND oi.seller_id = ?
    `,
      [id, user.id]
    );

    if (!orders[0]) {
      return res.status(404).json({ message: "Đơn hàng không tồn tại!" });
    }

    const order = orders[0];
    const [items] = await db.promise().query(
      "SELECT * FROM order_items WHERE order_id = ? AND seller_id = ?",
      [id, user.id]
    );

    res.status(200).json({ ...order, items });
  } catch (error) {
    console.error("Lỗi khi lấy chi tiết đơn hàng:", error);
    res.status(500).json({ message: "Lỗi server: " + error.message });
  }
};

exports.updateOrderStatus = async (req, res) => {
  const user = req.user;
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ["pending", "confirmed", "shipped", "delivered", "cancelled"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: "Trạng thái không hợp lệ!" });
  }

  try {
    const [orders] = await db.promise().query(
      `
      SELECT o.*, oi.seller_id
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      WHERE o.id = ? AND oi.seller_id = ?
    `,
      [id, user.id]
    );

    if (!orders[0]) {
      return res.status(404).json({ message: "Đơn hàng không tồn tại!" });
    }

    const order = orders[0];
    if (order.status === "delivered" || order.status === "cancelled") {
      return res.status(400).json({ message: "Không thể thay đổi trạng thái đơn hàng đã giao hoặc đã hủy!" });
    }

    if (status === "cancelled" && !order.cancellation_requested) {
      return res.status(400).json({ message: "Chỉ có thể hủy đơn hàng khi có yêu cầu từ người mua!" });
    }

    await Order.updateStatus(id, status);

    const message = order.cancellation_requested && status === "cancelled"
      ? `Yêu cầu hủy đơn hàng #${id} đã được chấp nhận.`
      : `Đơn hàng #${id} đã được cập nhật trạng thái thành "${status}".`;

    const notificationId = await Notification.create({
      user_id: order.user_id,
      message,
      order_id: id,
    });

    const io = req.app.get("io");
    io.to(order.user_id.toString()).emit("newNotification", {
      id: notificationId,
      user_id: order.user_id,
      message,
      order_id: id,
      created_at: new Date().toISOString(),
    });

    io.to(user.id.toString()).emit("orderStatusUpdated", {
      message: `Đơn hàng #${id} đã được cập nhật trạng thái thành "${status}".`,
      order_id: id,
      new_status: status,
    });

    res.status(200).json({ message: "Cập nhật trạng thái thành công!" });
  } catch (error) {
    console.error("Lỗi khi cập nhật trạng thái:", error);
    res.status(500).json({ message: "Lỗi server: " + error.message });
  }
};

exports.getSellerOrdersByStatus = async (req, res) => {
  const user = req.user;
  const { status } = req.params;

  const validStatuses = ["pending", "confirmed", "shipped", "delivered", "cancelled"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: "Trạng thái không hợp lệ!" });
  }

  try {
    const [orders] = await db.promise().query(
      `
      SELECT DISTINCT o.*
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      WHERE oi.seller_id = ? AND o.status = ?
      ORDER BY o.created_at DESC
    `,
      [user.id, status]
    );

    const detailedOrders = await Promise.all(
      orders.map(async (order) => {
        const [items] = await db.promise().query(
          "SELECT * FROM order_items WHERE order_id = ? AND seller_id = ?",
          [order.id, user.id]
        );
        return { ...order, items };
      })
    );

    res.status(200).json(detailedOrders);
  } catch (error) {
    console.error(`Lỗi khi lấy đơn hàng (trạng thái: ${status}):`, error);
    res.status(500).json({ message: "Lỗi server: " + error.message });
  }
};

exports.requestCancellation = async (req, res) => {
  const { id } = req.params;

  try {
    const order = await Order.getById(id);
    if (!order) {
      return res.status(404).json({ message: "Đơn hàng không tồn tại!" });
    }
    if (order.user_id !== req.user.id) {
      return res.status(403).json({ message: "Bạn không có quyền yêu cầu hủy đơn hàng này!" });
    }
    if (!["pending", "confirmed"].includes(order.status)) {
      return res.status(400).json({ message: "Chỉ có thể yêu cầu hủy đơn hàng ở trạng thái 'Đang chờ' hoặc 'Đã xác nhận'!" });
    }
    if (order.cancellation_requested) {
      return res.status(400).json({ message: "Đơn hàng đã có yêu cầu hủy đang chờ xử lý!" });
    }

    await Order.requestCancellation(id);

    const [orderItems] = await db.promise().query(
      "SELECT DISTINCT seller_id FROM order_items WHERE order_id = ?",
      [id]
    );
    const sellerIds = orderItems.map(item => item.seller_id);

    const message = `Người mua đã yêu cầu hủy đơn hàng #${id}.`;
    const notificationId = await Notification.create({
      user_id: sellerIds[0],
      message,
      order_id: id,
    });

    const io = req.app.get("io");
    sellerIds.forEach(seller_id => {
      io.to(seller_id.toString()).emit("newNotification", {
        id: notificationId,
        user_id: seller_id,
        message,
        order_id: id,
        created_at: new Date().toISOString(),
      });
    });

    res.status(200).json({ message: "Yêu cầu hủy đơn hàng đã được gửi!" });
  } catch (error) {
    console.error("Lỗi khi yêu cầu hủy đơn hàng:", error);
    res.status(500).json({ message: "Lỗi server: " + error.message });
  }
};

exports.denyCancellation = async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  if (!reason) {
    return res.status(400).json({ message: "Vui lòng cung cấp lý do từ chối hủy!" });
  }

  try {
    const [orders] = await db.promise().query(
      `
      SELECT o.*, oi.seller_id
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      WHERE o.id = ? AND oi.seller_id = ?
    `,
      [id, req.user.id]
    );

    if (!orders[0]) {
      return res.status(404).json({ message: "Đơn hàng không tồn tại!" });
    }

    const order = orders[0];
    if (!order.cancellation_requested) {
      return res.status(400).json({ message: "Đơn hàng không có yêu cầu hủy để từ chối!" });
    }

    await Order.denyCancellation(id, reason);

    const message = `Yêu cầu hủy đơn hàng #${id} đã bị từ chối. Lý do: ${reason}.`;
    const notificationId = await Notification.create({
      user_id: order.user_id,
      message,
      order_id: id,
    });

    const io = req.app.get("io");
    io.to(order.user_id.toString()).emit("newNotification", {
      id: notificationId,
      user_id: order.user_id,
      message,
      order_id: id,
      created_at: new Date().toISOString(),
    });

    res.status(200).json({ message: "Yêu cầu hủy đơn hàng đã bị từ chối!" });
  } catch (error) {
    console.error("Lỗi khi từ chối hủy đơn hàng:", error);
    res.status(500).json({ message: "Lỗi server: " + error.message });
  }
};