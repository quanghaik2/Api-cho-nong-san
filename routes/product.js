const express = require("express");
const {
  getProducts,
  addProduct,
  updateProduct,
  hideProduct,
  deleteProduct,
  uploadProductImage,
  getAllProducts,
  getProductById,
  getProductsByAddress,
  getProductsBySellerId,
} = require("../controllers/productController");
const { authMiddlewareSeller } = require("../middleware/auth");
const upload = require("../middleware/uploadProductImage");

const router = express.Router();

// Lấy tất cả sản phẩm (public)
router.get("/all", getAllProducts);

// Lấy sản phẩm theo ID (public)
router.get("/:id", getProductById);

// Lấy sản phẩm theo địa chỉ (public)
router.get("/by-address", getProductsByAddress);

// Lấy sản phẩm theo seller ID (public)
router.get("/seller/:sellerId", getProductsBySellerId);

// Tải ảnh sản phẩm
router.put("/upload-image", authMiddlewareSeller, upload.single("product_image"), uploadProductImage);

// Tải ảnh giấy phép nguồn gốc sản phẩm
router.put("/upload-origin-proof", authMiddlewareSeller, upload.single("origin_proof_image"), uploadProductImage);

// Cập nhật sản phẩm
router.put("/:id", updateProduct);

// Ẩn sản phẩm
router.put("/:id/hide", hideProduct);

// Các route yêu cầu xác thực seller
router.use(authMiddlewareSeller);

// Lấy sản phẩm của seller hiện tại
router.get("/", getProducts);

// Thêm sản phẩm mới
router.post("/", addProduct);

// Xóa sản phẩm
router.delete("/:id", deleteProduct);

module.exports = router;