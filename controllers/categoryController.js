const Category = require("../models/Category");
const fs = require("fs").promises;
const path = require("path");

const getCategories = async (req, res) => {
  try {
    const categories = await Category.getAll();
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server: " + error.message });
  }
};

const getCategoryById = async (req, res) => {
  const categoryId = req.params.id;
  try {
    const category = await Category.getById(categoryId);
    if (!category) {
      return res.status(404).json({ message: "Danh mục không tồn tại!" });
    }
    res.status(200).json(category);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server: " + error.message });
  }
};

const addCategory = async (req, res) => {
  const { name, image_url } = req.body;
  if (!name) {
    return res.status(400).json({ message: "Tên danh mục là bắt buộc!" });
  }

  try {
    const categoryId = await Category.create({ name, image_url });
    res.status(201).json({ message: "Thêm danh mục thành công!", categoryId });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server: " + error.message });
  }
};

const updateCategory = async (req, res) => {
  const categoryId = req.params.id;
  const { name, image_url } = req.body;

  try {
    const category = await Category.getById(categoryId);
    if (!category) {
      return res.status(404).json({ message: "Danh mục không tồn tại!" });
    }

    // Nếu có ảnh mới, xóa ảnh cũ
    if (image_url && category.image_url && image_url !== category.image_url) {
      const oldImagePath = path.join(__dirname, "..", "public", category.image_url);
      try {
        await fs.unlink(oldImagePath);
      } catch (err) {
        console.warn("Không thể xóa ảnh cũ:", err.message);
      }
    }

    await Category.update(categoryId, { name, image_url });
    res.status(200).json({ message: "Cập nhật danh mục thành công!" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server: " + error.message });
  }
};

const deleteCategory = async (req, res) => {
  const categoryId = req.params.id;

  try {
    const category = await Category.getById(categoryId);
    if (!category) {
      return res.status(404).json({ message: "Danh mục không tồn tại!" });
    }

    // Xóa ảnh khi xóa danh mục
    if (category.image_url) {
      const imagePath = path.join(__dirname, "..", "public", category.image_url);
      try {
        await fs.unlink(imagePath);
      } catch (err) {
        console.warn("Không thể xóa ảnh:", err.message);
      }
    }

    await Category.delete(categoryId);
    res.status(200).json({ message: "Xóa danh mục thành công!" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server: " + error.message });
  }
};

const uploadCategoryImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Vui lòng chọn một file ảnh hợp lệ!" });
    }

    const imageUrl = `/category_images/${req.file.filename}`;
    res.status(200).json({ message: "Tải ảnh danh mục thành công!", image_url: imageUrl });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server: " + error.message });
  }
};

module.exports = {
  getCategories,
  getCategoryById,
  addCategory,
  updateCategory,
  deleteCategory,
  uploadCategoryImage,
};