const Cart = require("../models/Cart");
const Product = require("../models/Product");

exports.getCart = async (req, res) => {
  try {
    const cart = await Cart.getOrCreateCart(req.user.id);
    const cartItems = await Cart.getCartItems(cart.id);
    res.status(200).json(cartItems);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server: " + error.message });
  }
};

exports.addToCart = async (req, res) => {
  const { productId } = req.body;
  try {
    const cart = await Cart.getOrCreateCart(req.user.id);
    const product = await Product.getById(productId);
    if (!product) {
      return res.status(404).json({ message: "Sản phẩm không tồn tại!" });
    }
    await Cart.addToCart(cart.id, productId, product.price);
    res.status(200).json({ message: "Thêm vào giỏ thành công!" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server: " + error.message });
  }
};



exports.updateCartQuantity = async (req, res) => {
  const { productId, quantity } = req.body;
  try {
    const cart = await Cart.getOrCreateCart(req.user.id);
    if (quantity < 1) {
      return res.status(400).json({ message: "Số lượng phải lớn hơn 0!" });
    }
    await Cart.updateQuantity(cart.id, productId, quantity);
    res.status(200).json({ message: "Cập nhật số lượng thành công!" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server: " + error.message });
  }
};

exports.removeFromCart = async (req, res) => {
  const { productId } = req.body;
  try {
    const cart = await Cart.getOrCreateCart(req.user.id);
    await Cart.removeFromCart(cart.id, productId);
    res.status(200).json({ message: "Xóa sản phẩm khỏi giỏ thành công!" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server: " + error.message });
  }
};