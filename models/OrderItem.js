const db = require("../config/db");

class OrderItem {
  static async create({ order_id, product_id, quantity, price_at_time, seller_id, name, store_name }) {
    await db
      .promise()
      .query(
        "INSERT INTO order_items (order_id, product_id, quantity, price_at_time, seller_id, name, store_name) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [order_id, product_id, quantity, price_at_time, seller_id, name, store_name]
      );
  }

  static async getByOrderId(order_id) {
    const [rows] = await db
      .promise()
      .query("SELECT * FROM order_items WHERE order_id = ?", [order_id]);
    return rows;
  }
}

module.exports = OrderItem;