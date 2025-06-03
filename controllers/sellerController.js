const db = require("../config/db");
const Order = require("../models/Order");
const OrderItem = require("../models/OrderItem");

// Lấy tất cả đơn hàng của người bán. 
exports.getSellerOrders = async (req, res) => {
    const { id } = req.user;
    console.log({user: req.user});
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
        [id, seller_id]
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
  
      if (orders[0].status === "delivered" || orders[0].status === "cancelled") {
        return res.status(400).json({ message: "Không thể thay đổi trạng thái đơn hàng đã giao hoặc đã hủy!" });
      }
  
      if (status === "cancelled" && orders[0].status !== "pending") {
        return res.status(400).json({ message: "Chỉ có thể hủy đơn hàng đang ở trạng thái chờ!" });
      }
  
      await Order.updateStatus(id, status);
      res.status(200).json({ message: "Cập nhật trạng thái thành công!" });
    } catch (error) {
      console.error("Lỗi khi cập nhật trạng thái:", error);
      res.status(500).json({ message: "Lỗi server: " + error.message });
    }
  };
  
  exports.getRevenueStats = async (req, res) => {
    const user = req.user;
    const { date, month } = req.query;
  
    try {
      let query = `
        SELECT 
          DATE(o.created_at) AS sale_date,
          MONTH(o.created_at) AS sale_month,
          YEAR(o.created_at) AS sale_year,
          oi.product_id,
          oi.name AS product_name,
          SUM(oi.quantity) AS total_quantity,
          SUM(oi.quantity * oi.price_at_time) AS total_revenue
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE oi.seller_id = ? AND o.status = 'delivered'
      `;
      const params = user.id;
  
      if (date) {
        query += " AND DATE(o.created_at) = ?";
        params.push(date);
      } else if (month) {
        query += " AND DATE_FORMAT(o.created_at, '%Y-%m') = ?";
        params.push(month);
      }
  
      query += `
        GROUP BY 
          DATE(o.created_at),
          MONTH(o.created_at),
          YEAR(o.created_at),
          oi.product_id,
          oi.name
        ORDER BY sale_date DESC
      `;
  
      const [results] = await db.promise().query(query, params);
  
      const dailyStats = {};
      const monthlyStats = {};
  
      results.forEach((row) => {
        const dateKey = row.sale_date;
        const monthKey = `${row.sale_year}-${row.sale_month.toString().padStart(2, "0")}`;
  
        if (!dailyStats[dateKey]) {
          dailyStats[dateKey] = {
            date: dateKey,
            totalRevenue: 0,
            products: [],
          };
        }
        dailyStats[dateKey].totalRevenue += row.total_revenue;
        dailyStats[dateKey].products.push({
          product_id: row.product_id,
          name: row.product_name,
          quantity: row.total_quantity,
          revenue: row.total_revenue,
        });
  
        if (!monthlyStats[monthKey]) {
          monthlyStats[monthKey] = {
            month: monthKey,
            totalRevenue: 0,
            products: [],
          };
        }
        monthlyStats[monthKey].totalRevenue += row.total_revenue;
        monthlyStats[monthKey].products.push({
          product_id: row.product_id,
          name: row.product_name,
          quantity: row.total_quantity,
          revenue: row.total_revenue,
        });
      });
  
      res.status(200).json({
        daily: Object.values(dailyStats),
        monthly: Object.values(monthlyStats),
      });
    } catch (error) {
      console.error("Lỗi khi thống kê doanh thu:", error);
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