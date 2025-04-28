const express = require("express");
const {
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  uploadProductImage,
  getAllProducts,
  getProductById,
  getProductsByAddress,
  getProductsBySellerId, // Thêm hàm mới
} = require("../controllers/productController");
const { authMiddlewareSeller } = require("../middleware/auth");
const upload = require("../middleware/uploadProductImage");

const router = express.Router();

router.get("/", authMiddlewareSeller, getProducts);
router.get("/by-address", getProductsByAddress);
router.get("/all", getAllProducts);
// router.get("/seller/:id", getProductById); 
router.get("/seller/:sellerId", getProductsBySellerId); // Sửa route này để lấy danh sách sản phẩm của seller
router.get("/:id", getProductById);
router.post("/", authMiddlewareSeller, addProduct);
router.put("/upload-image", authMiddlewareSeller, upload.single("product_image"), uploadProductImage);
router.put("/:id", authMiddlewareSeller, updateProduct);
router.delete("/:id", authMiddlewareSeller, deleteProduct);

module.exports = router;