const Product = require("../models/Product");
const fs = require("fs").promises;
const path = require("path");

const getProducts = async (req, res) => {
  try {
    const products = await Product.getBySellerId(req.user.id);
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server: " + error.message });
  }
};

const getAllProducts = async (req, res) => {
  try {
    const products = await Product.getAllProduct();
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server: " + error.message });
  }
};

const getProductById = async (req, res) => {
  const productId = req.params.id;
  try {
    const product = await Product.getById(productId);
    if (!product) {
      return res.status(404).json({ message: `Sản phẩm với ID ${productId} không tồn tại!` });
    }
    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server: " + error.message });
  }
};

const getProductsByAddress = async (req, res) => {
  const { address } = req.query;
  if (!address) {
    return res.status(400).json({ message: "Vui lòng cung cấp địa chỉ để tìm kiếm!" });
  }

  try {
    const products = await Product.getByAddress(address);
    if (products.length === 0) {
      return res.status(404).json({ message: `Không tìm thấy sản phẩm tại địa chỉ: ${address}` });
    }
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server: " + error.message });
  }
};

const addProduct = async (req, res) => {
  const { name, store_name, price, description, address, image_url, category_id } = req.body;
  if (!name || !store_name || !price || !image_url) {
    return res.status(400).json({ message: "Tên sản phẩm, tên cửa hàng, giá và ảnh là bắt buộc!" });
  }

  try {
    const productId = await Product.create({
      seller_id: req.user.id,
      name,
      store_name,
      price: parseFloat(price),
      description,
      address,
      image_url,
      category_id: parseInt(category_id) || null,
    });
    res.status(201).json({ message: "Thêm sản phẩm thành công!", productId });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server: " + error.message });
  }
};

const updateProduct = async (req, res) => {
  const productId = req.params.id;
  const { name, store_name, price, description, address, image_url, category_id } = req.body;

  try {
    const product = await Product.getById(productId);
    if (!product || product.seller_id !== req.user.id) {
      return res.status(403).json({ message: "Bạn không có quyền cập nhật sản phẩm này!" });
    }

    if (image_url && product.image_url && image_url !== product.image_url) {
      const oldImagePath = path.join(__dirname, "..", "public", product.image_url);
      try {
        await fs.unlink(oldImagePath);
      } catch (err) {
        console.warn("Không thể xóa ảnh cũ:", err.message);
      }
    }

    await Product.update(productId, {
      name,
      store_name,
      price: parseFloat(price),
      description,
      address,
      image_url,
      category_id: parseInt(category_id) || null,
    });
    res.status(200).json({ message: "Cập nhật sản phẩm thành công!" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server: " + error.message });
  }
};

const deleteProduct = async (req, res) => {
  const productId = req.params.id;

  try {
    const product = await Product.getById(productId);
    if (!product || product.seller_id !== req.user.id) {
      return res.status(403).json({ message: "Bạn không có quyền xóa sản phẩm này!" });
    }

    if (product.image_url) {
      const imagePath = path.join(__dirname, "..", "public", product.image_url);
      try {
        await fs.unlink(imagePath);
      } catch (err) {
        console.warn("Không thể xóa ảnh:", err.message);
      }
    }

    await Product.delete(productId);
    res.status(200).json({ message: "Xóa sản phẩm thành công!" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server: " + error.message });
  }
};

const uploadProductImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Vui lòng chọn một file ảnh hợp lệ!" });
    }

    const imageUrl = `/product_images/${req.file.filename}`;
    res.status(200).json({ message: "Tải ảnh sản phẩm thành công!", image_url: imageUrl });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server: " + error.message });
  }
};

const getProductsBySellerId = async (req, res) => {
  const sellerId = parseInt(req.params.sellerId);
  if (isNaN(sellerId)) {
    return res.status(400).json({ message: "ID của seller không hợp lệ!" });
  }

  try {
    const products = await Product.getBySellerId(sellerId);
    if (!products || products.length === 0) {
      return res.status(404).json({ message: `Không tìm thấy sản phẩm nào cho seller với ID ${sellerId}` });
    }
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server: " + error.message });
  }
};



module.exports = { getProducts, addProduct, updateProduct, deleteProduct, uploadProductImage, getAllProducts, getProductById, getProductsByAddress, getProductsBySellerId };