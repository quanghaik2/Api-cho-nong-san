const db = require("../config/db");

class Product {
  static async getBySellerId(seller_id) {
    const [rows] = await db
      .promise()
      .query("SELECT * FROM products WHERE seller_id = ? AND is_hidden = 0", [seller_id]);
    return rows;
  }

  static async getAllProduct() {
    const [rows] = await db
      .promise()
      .query("SELECT * FROM products WHERE is_hidden = 0");
    return rows;
  }

  static async getById(product_id) {
    const [rows] = await db
      .promise()
      .query("SELECT * FROM products WHERE id = ?", [product_id]);
    return rows[0];
  }

  static async getByAddress(address) {
    const [rows] = await db
      .promise()
      .query("SELECT * FROM products WHERE address LIKE ? AND is_hidden = 0", [`%${address}%`]);
    return rows;
  }

  static async create({
    seller_id,
    name,
    store_name,
    price,
    description,
    address,
    image_url,
    category_id,
    origin_proof_image_url,
    issued_by,
    expiry_date,
  }) {
    const [result] = await db
      .promise()
      .query(
        "INSERT INTO products (seller_id, name, store_name, price, description, address, image_url, category_id, origin_proof_image_url, issued_by, expiry_date, is_hidden) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          seller_id,
          name,
          store_name,
          price,
          description,
          address,
          image_url,
          category_id,
          origin_proof_image_url || null,
          issued_by || null,
          expiry_date || null,
          0,
        ]
      );
    return result.insertId;
  }

  static async update(
    product_id,
    { name, store_name, price, description, address, image_url, category_id, is_hidden, origin_proof_image_url, issued_by, expiry_date }
  ) {
    await db
      .promise()
      .query(
        "UPDATE products SET name = ?, store_name = ?, price = ?, description = ?, address = ?, image_url = ?, category_id = ?, is_hidden = ?, origin_proof_image_url = ?, issued_by = ?, expiry_date = ? WHERE id = ?",
        [
          name,
          store_name,
          price,
          description,
          address,
          image_url,
          category_id,
          is_hidden,
          origin_proof_image_url || null,
          issued_by || null,
          expiry_date || null,
          product_id,
        ]
      );
  }

  static async delete(product_id) {
    await db.promise().query("DELETE FROM products WHERE id = ?", [product_id]);
  }

  static async hide(product_id) {
    await db
      .promise()
      .query("UPDATE products SET is_hidden = 1 WHERE id = ?", [product_id]);
  }
}

module.exports = Product;