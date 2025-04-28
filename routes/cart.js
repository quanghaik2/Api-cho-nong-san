const express = require("express");
const {
  getCart,
  addToCart,
  updateCartQuantity,
  removeFromCart,
} = require("../controllers/cartController");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();

// Lấy giỏ hàng của người dùng
router.get("/", authMiddleware, getCart);

// Thêm sản phẩm vào giỏ hàng
router.post("/add", authMiddleware, addToCart);

// Cập nhật số lượng sản phẩm trong giỏ hàng
router.put("/update", authMiddleware, updateCartQuantity);

// Xóa sản phẩm khỏi giỏ hàng
router.delete("/remove", authMiddleware, removeFromCart);

module.exports = router;