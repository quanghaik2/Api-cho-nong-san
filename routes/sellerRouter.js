const express = require("express");
const { getSellerOrders, getSellerOrderById, updateOrderStatus, getRevenueStats, getSellerOrdersByStatus } = require("../controllers/sellerController");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();

// Các route cho người bán
router.get("/", authMiddleware, getSellerOrders); // Danh sách tất cả đơn hàng của người bán
router.get("/orders/:status", authMiddleware, getSellerOrdersByStatus); // Lấy đơn hàng theo trạng thái
router.get("/:id", authMiddleware, getSellerOrderById); // Chi tiết đơn hàng của người bán
router.put("/:id/status", authMiddleware, updateOrderStatus); // Cập nhật trạng thái đơn hàng
router.get("/stats/revenue", authMiddleware, getRevenueStats); // Thống kê doanh thu

module.exports = router;