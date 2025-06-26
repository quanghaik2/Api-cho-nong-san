const db = require("../config/db");

class Notification {
  static async create({ user_id, message, order_id, product_id }) {
    const [userExists] = await db
      .promise()
      .query("SELECT id FROM accounts WHERE id = ?", [user_id]);

    if (!userExists.length) {
      throw new Error(`Người dùng với ID ${user_id} không tồn tại!`);
    }

    const [result] = await db
      .promise()
      .query(
        "INSERT INTO notifications (user_id, message, order_id, product_id, created_at) VALUES (?, ?, ?, ?, NOW())",
        [user_id, message, order_id || null, product_id || null]
      );
    return result.insertId;
  }

  static async getByUserId(user_id) {
    const [rows] = await db
      .promise()
      .query(
        "SELECT id, message, created_at, order_id, product_id FROM notifications WHERE user_id = ? ORDER BY created_at DESC",
        [user_id]
      );
    return rows;
  }

  static async getByUserIdAndProduct(user_id) {
    const [rows] = await db
      .promise()
      .query(
        "SELECT id, message, created_at, order_id, product_id FROM notifications WHERE user_id = ? AND product_id IS NOT NULL ORDER BY created_at DESC",
        [user_id]
      );
    return rows;
  }
}


module.exports = Notification;