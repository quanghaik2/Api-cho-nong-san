const express = require("express");
const {
  getCategories,
  addCategory,
  updateCategory,
  deleteCategory,
  uploadCategoryImage,
  getCategoryById,
} = require("../controllers/categoryController");
const { authMiddlewareSeller } = require("../middleware/auth");
const upload = require("../middleware/uploadCategoryImage");

const router = express.Router();

router.get("/", getCategories);
router.get("/:id", getCategoryById);
router.post("/", addCategory);
router.put("/upload-image", upload.single("category_image"), uploadCategoryImage);
router.put("/:id", updateCategory);
router.delete("/:id", deleteCategory);

module.exports = router;