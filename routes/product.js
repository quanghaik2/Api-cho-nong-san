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
  getAutoHiddenProducts,
  restoreProduct,
} = require("../controllers/productController");
const { authMiddlewareSeller } = require("../middleware/auth");
const upload = require("../middleware/uploadProductImage");

const router = express.Router();

// Public routes (GET)
router.get("/all", getAllProducts); // Lấy tất cả sản phẩm
router.get("/by-address", getProductsByAddress); // Lấy sản phẩm theo địa chỉ
router.get("/seller/:sellerId", getProductsBySellerId); // Lấy sản phẩm theo seller ID
router.get("/auto-hidden", getAutoHiddenProducts); // Lấy sản phẩm tự động ẩn
router.get("/:id", getProductById); // Lấy sản phẩm theo ID
router.put("/:id/restore", restoreProduct); // Khôi phục sản phẩm

// Protected routes (yêu cầu xác thực seller)
router.use(authMiddlewareSeller);

// GET
router.get("/", getProducts); // Lấy sản phẩm của seller hiện tại

// POST
router.post("/", addProduct); // Thêm sản phẩm mới

// PUT
router.put("/upload-image", upload.single("product_image"), uploadProductImage); // Tải ảnh sản phẩm
router.put("/upload-origin-proof", upload.single("origin_proof_image"), uploadProductImage); // Tải ảnh giấy phép nguồn gốc
router.put("/:id", updateProduct); // Cập nhật sản phẩm
router.put("/:id/hide", hideProduct); // Ẩn sản phẩm


// DELETE
router.delete("/:id", deleteProduct); // Xóa sản phẩm

module.exports = router;