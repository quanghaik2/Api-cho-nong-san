const db = require("../config/db");

class Category {
  static async getAll() {
    const [rows] = await db.promise().query("SELECT * FROM categories");
    return rows;
  }

  static async getById(category_id) {
    const [rows] = await db
      .promise()
      .query("SELECT * FROM categories WHERE id = ?", [category_id]);
    return rows[0];
  }

  static async create({ name, image_url }) {
    const [result] = await db
      .promise()
      .query("INSERT INTO categories (name, image_url) VALUES (?, ?)", [
        name,
        image_url,
      ]);
    return result.insertId;
  }

  static async update(category_id, { name, image_url }) {
    await db
      .promise()
      .query("UPDATE categories SET name = ?, image_url = ? WHERE id = ?", [
        name,
        image_url,
        category_id,
      ]);
  }

  static async delete(category_id) {
    await db
      .promise()
      .query("DELETE FROM categories WHERE id = ?", [category_id]);
  }
}

module.exports = Category;