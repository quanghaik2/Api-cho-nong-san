const db = require("../config/db");

class UserAddress {
  static async create({ user_id, full_name, phone_number, province, district, ward, detailed_address, is_default }) {
    const [result] = await db
      .promise()
      .query(
        "INSERT INTO user_addresses (user_id, full_name, phone_number, province, district, ward, detailed_address, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [user_id, full_name, phone_number, province, district, ward, detailed_address, is_default]
      );
    return result.insertId;
  }

  static async getByUserId(user_id) {
    const [rows] = await db
      .promise()
      .query("SELECT * FROM user_addresses WHERE user_id = ?", [user_id]);
    return rows;
  }

  static async getDefaultByUserId(user_id) {
    const [rows] = await db
      .promise()
      .query("SELECT * FROM user_addresses WHERE user_id = ? AND is_default = TRUE LIMIT 1", [user_id]);
    return rows[0];
  }

  static async getById(address_id) {
    const [rows] = await db
      .promise()
      .query("SELECT * FROM user_addresses WHERE id = ?", [address_id]);
    return rows[0];
  }

  static async updateDefault(address_id, user_id) {
    // Đặt tất cả địa chỉ khác về không mặc định
    await db
      .promise()
      .query("UPDATE user_addresses SET is_default = FALSE WHERE user_id = ?", [user_id]);
    // Đặt địa chỉ được chọn thành mặc định
    await db
      .promise()
      .query("UPDATE user_addresses SET is_default = TRUE WHERE id = ? AND user_id = ?", [address_id, user_id]);
  }

  static async delete(address_id, user_id) {
    await db
      .promise()
      .query("DELETE FROM user_addresses WHERE id = ? AND user_id = ?", [address_id, user_id]);
  }
}

module.exports = UserAddress;