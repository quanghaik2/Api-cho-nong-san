const db = require("../config/db");

class Order {
  static async create({ user_id, total_amount, original_amount, shipping_fee, address, status }) {
    const [result] = await db
      .promise()
      .query(
        "INSERT INTO orders (user_id, total_amount, original_amount, shipping_fee, address, status, cancellation_requested, cancellation_reason) VALUES (?, ?, ?, ?, ?, ?, FALSE, NULL)",
        [user_id, total_amount, original_amount, shipping_fee, address, status]
      );
    return result.insertId;
  }

  static async getByUserId(user_id) {
    const [rows] = await db
      .promise()
      .query(
        "SELECT id, user_id, total_amount, original_amount, shipping_fee, address, status, created_at, cancellation_requested, cancellation_reason FROM orders WHERE user_id = ?",
        [user_id]
      );
    return rows;
  }

  static async getById(order_id) {
    const [rows] = await db
      .promise()
      .query(
        "SELECT id, user_id, total_amount, original_amount, shipping_fee, address, status, created_at, cancellation_requested, cancellation_reason FROM orders WHERE id = ?",
        [order_id]
      );
    return rows[0];
  }

  static async updateStatus(order_id, status) {
    await db
      .promise()
      .query(
        "UPDATE orders SET status = ?, cancellation_requested = FALSE, cancellation_reason = NULL WHERE id = ?",
        [status, order_id]
      );
  }

  static async requestCancellation(order_id) {
    await db
      .promise()
      .query(
        "UPDATE orders SET cancellation_requested = TRUE WHERE id = ?",
        [order_id]
      );
  }

  static async denyCancellation(order_id, reason) {
    await db
      .promise()
      .query(
        "UPDATE orders SET cancellation_requested = FALSE, cancellation_reason = ? WHERE id = ?",
        [reason, order_id]
      );
  }
}

module.exports = Order;