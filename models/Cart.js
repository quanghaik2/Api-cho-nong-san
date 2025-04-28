const db = require("../config/db");

class Cart {
  static async getOrCreateCart(userId) {
    const [rows] = await db
      .promise()
      .query("SELECT * FROM carts WHERE user_id = ?", [userId]);
    if (rows.length > 0) {
      return rows[0];
    }
    const [result] = await db
      .promise()
      .query("INSERT INTO carts (user_id) VALUES (?)", [userId]);
    return { id: result.insertId, user_id: userId, created_at: new Date() };
  }

  static async getCartItems(cartId) {
    const [rows] = await db
      .promise()
      .query(
        "SELECT ci.*, p.name, p.image_url FROM cart_items ci JOIN products p ON ci.product_id = p.id WHERE ci.cart_id = ?",
        [cartId]
      );
    return rows;
  }

  static async addToCart(cartId, productId, price) {
    const [rows] = await db
      .promise()
      .query(
        "SELECT * FROM cart_items WHERE cart_id = ? AND product_id = ?",
        [cartId, productId]
      );
    if (rows.length > 0) {
      await db
        .promise()
        .query(
          "UPDATE cart_items SET quantity = quantity + 1, price_at_time = ? WHERE cart_id = ? AND product_id = ?",
          [price, cartId, productId]
        );
    } else {
      await db
        .promise()
        .query(
          "INSERT INTO cart_items (cart_id, product_id, quantity, price_at_time) VALUES (?, ?, 1, ?)",
          [cartId, productId, price]
        );
    }
  }

  static async updateQuantity(cartId, productId, quantity) {
    await db
      .promise()
      .query(
        "UPDATE cart_items SET quantity = ? WHERE cart_id = ? AND product_id = ?",
        [quantity, cartId, productId]
      );
  }

  static async getCartByUserId(userId) {
    const [rows] = await db
      .promise()
      .query("SELECT * FROM carts WHERE user_id = ?", [userId]);
    return rows.length > 0 ? rows[0] : null;
  }

  static async removeFromCart(cartId, productId) {
    await db
      .promise()
      .query("DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?", [
        cartId,
        productId,
      ]);
  }

  static async removeMultipleFromCart(cart_id, product_ids) {
    await db
      .promise()
      .query("DELETE FROM cart_items WHERE cart_id = ? AND product_id IN (?)", [
        cart_id,
        product_ids,
      ]);
  }
}

module.exports = Cart;