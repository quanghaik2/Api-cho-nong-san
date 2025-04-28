const express = require("express");
const { createOrder, getUserOrders, getOrderById, createOrderBuyNow, getSellerOrders, getSellerOrderById, updateOrderStatus, getRevenueStats, getSellerOrdersByStatus, requestCancellation, denyCancellation } = require("../controllers/orderController");
const { authMiddleware, authMiddlewareSeller } = require("../middleware/auth");

const router = express.Router();

// Tạo đơn hàng thông thường
router.post("/create", authMiddleware, createOrder);

// Tạo đơn hàng nhanh (mua ngay)
router.post("/create-buy-now", authMiddleware, createOrderBuyNow);

// Lấy danh sách đơn hàng của người dùng
router.get("/", authMiddleware, getUserOrders);

// Lấy chi tiết đơn hàng
router.get("/create-detail/:id", authMiddleware, getOrderById);

// Yêu cầu hủy đơn hàng (người mua)
router.post("/:id/request-cancellation", authMiddleware, requestCancellation);

// Các route cho người bán
router.get("/seller", authMiddlewareSeller, getSellerOrders); // Danh sách tất cả đơn hàng của người bán
router.get("/seller/orders/:status", authMiddlewareSeller, getSellerOrdersByStatus); // Lấy đơn hàng theo trạng thái
router.get("/seller/:id", authMiddlewareSeller, getSellerOrderById); // Chi tiết đơn hàng của người bán
router.put("/seller/:id/status", authMiddlewareSeller, updateOrderStatus); // Cập nhật trạng thái đơn hàng
router.post("/seller/:id/deny-cancellation", authMiddlewareSeller, denyCancellation); // Từ chối hủy đơn hàng
router.get("/seller/stats/revenue", authMiddlewareSeller, getRevenueStats); // Thống kê doanh thu

module.exports = router;