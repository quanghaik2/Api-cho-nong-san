const Product = require("../models/Product");
const Notification = require("../models/Notification");
const fs = require("fs").promises;
const path = require("path");
const { notifyProductRemoved } = require("../websocket");

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
      return res.status(404).json({ message: `Sản phẩm với ID ${productId} không tồn tại hoặc bị ẩn!` });
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
      return res.status(404).json({ message: `Không tìm thấy sản phẩm tại địa chỉ: ${address} hoặc chúng đã bị ẩn!` });
    }
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server: " + error.message });
  }
};

const addProduct = async (req, res) => {
  const { name, store_name, price, description, address, image_url, category_id, origin_proof_image_url, issued_by, expiry_date } = req.body;
  if (!name || !store_name || !price || !image_url) {
    return res.status(400).json({ message: "Tên sản phẩm, tên cửa hàng, giá và ảnh là bắt buộc!" });
  }
  if (!origin_proof_image_url) {
    return res.status(400).json({ message: "Ảnh giấy phép là bắt buộc!" });
  }
  if (!issued_by) {
    return res.status(400).json({ message: "Vui lòng cung cấp nơi cấp giấy phép!" });
  }
  if (!expiry_date) {
    return res.status(400).json({ message: "Vui lòng cung cấp ngày hết hạn!" });
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
      origin_proof_image_url,
      issued_by,
      expiry_date,
    });
    res.status(201).json({ message: "Thêm sản phẩm thành công!", productId });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server: " + error.message });
  }
};

const updateProduct = async (req, res) => {
  const productId = req.params.id;
  const { name, store_name, price, description, address, image_url, category_id, is_hidden, origin_proof_image_url, issued_by, expiry_date } = req.body;

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
    if (origin_proof_image_url && product.origin_proof_image_url && origin_proof_image_url !== product.origin_proof_image_url) {
      const oldProofPath = path.join(__dirname, "..", "public", product.origin_proof_image_url);
      try {
        await fs.unlink(oldProofPath);
      } catch (err) {
        console.warn("Không thể xóa ảnh giấy phép cũ:", err.message);
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
      is_hidden: is_hidden !== undefined ? is_hidden : product.is_hidden,
      origin_proof_image_url,
      issued_by,
      expiry_date,
    });
    res.status(200).json({ message: "Cập nhật sản phẩm thành công!" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server: " + error.message });
  }
};

const hideProduct = async (req, res) => {
  const productId = req.params.id;
  const { reason, report_id } = req.body;

  try {
    const product = await Product.getById(productId);
    if (!product) {
      return res.status(404).json({ message: `Sản phẩm với ID ${productId} không tồn tại!` });
    }
    if (!reason) {
      return res.status(400).json({ message: "Vui lòng cung cấp lý do ẩn sản phẩm!" });
    }

    await Product.hide(productId);

    const message = `Sản phẩm "${product.name}" của bạn đã bị gỡ. Lý do: ${reason}`;
    const notificationId = await Notification.create({
      user_id: product.seller_id,
      message,
      product_id: productId,
    });

    notifyProductRemoved(product.seller_id.toString(), product.name, reason);

    res.status(200).json({ message: "Sản phẩm đã được ẩn thành công và thông báo đã được gửi!" });
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
      return res.status(404).json({ message: `Không tìm thấy sản phẩm nào cho seller với ID ${sellerId} hoặc chúng đã bị ẩn!` });
    }
    res.status(200).json(products);
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
      const oldImagePath = path.join(__dirname, "..", "public", product.image_url);
      try {
        await fs.unlink(oldImagePath);
      } catch (err) {
        console.warn("Không thể xóa ảnh cũ:", err.message);
      }
    }
    if (product.origin_proof_image_url) {
      const oldProofPath = path.join(__dirname, "..", "public", product.origin_proof_image_url);
      try {
        await fs.unlink(oldProofPath);
      } catch (err) {
        console.warn("Không thể xóa ảnh giấy phép cũ:", err.message);
      }
    }

    await Product.delete(productId);
    res.status(200).json({ message: "Xóa sản phẩm thành công!" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server: " + error.message });
  }
  
};

const getAutoHiddenProducts = async (req, res) => {
  try {
    const products = await Product.getAutoHiddenProducts();
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server: " + error.message });
  }
};

const restoreProduct = async (req, res) => {
  const productId = req.params.id;
  try {
    const product = await Product.restore_product(productId);
    if (!product) {
      return res.status(404).json({ message: `Sản phẩm với ID ${productId} không tồn tại!` });
    }
    res.status(200).json({ message: `Sản phẩm với ID ${productId} đã được khôi phục`, product });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server: " + error.message });
  }
};

module.exports = { getProducts, addProduct, updateProduct, hideProduct, uploadProductImage, getAllProducts, getProductById, getProductsByAddress, getProductsBySellerId, deleteProduct, getAutoHiddenProducts, restoreProduct };