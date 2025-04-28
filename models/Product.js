const db = require("../config/db");

class Product {
  static async getBySellerId(seller_id) {
    const [rows] = await db
      .promise()
      .query("SELECT * FROM products WHERE seller_id = ?", [seller_id]);
    return rows;
  }

  static async getAllProduct() {
    const [rows] = await db
      .promise()
      .query("SELECT * FROM products");
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
      .query("SELECT * FROM products WHERE address LIKE ?", [`%${address}%`]);
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
  }) {
    const [result] = await db
      .promise()
      .query(
        "INSERT INTO products (seller_id, name, store_name, price, description, address, image_url, category_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [
          seller_id,
          name,
          store_name,
          price,
          description,
          address,
          image_url,
          category_id,
        ]
      );
    return result.insertId;
  }

  static async update(
    product_id,
    { name, store_name, price, description, address, image_url, category_id }
  ) {
    await db
      .promise()
      .query(
        "UPDATE products SET name = ?, store_name = ?, price = ?, description = ?, address = ?, image_url = ?, category_id = ? WHERE id = ?",
        [
          name,
          store_name,
          price,
          description,
          address,
          image_url,
          category_id,
          product_id,
        ]
      );
  }

  static async delete(product_id) {
    await db.promise().query("DELETE FROM products WHERE id = ?", [product_id]);
  }
}

module.exports = Product;