const db = require("../config/db");

class UserInfo {
  static async create({ account_id, full_name, role, phone_number = null, address = null }) {
    await db
      .promise()
      .query(
        "INSERT INTO user_info (account_id, full_name, role, phone_number, address) VALUES (?, ?, ?, ?, ?)",
        [account_id, full_name, role, phone_number, address]
      );
  }

  static async findByAccountId(account_id) {
    const [rows] = await db
      .promise()
      .query("SELECT * FROM user_info WHERE account_id = ?", [account_id]);
    return rows[0];
  }

  static async update(account_id, { phone_number, address }) {
    await db
      .promise()
      .query(
        "UPDATE user_info SET phone_number = ?, address = ? WHERE account_id = ?",
        [phone_number, address, account_id]
      );
  }

  static async updateProfile(account_id, { full_name, phone_number, address }) {
    await db
      .promise()
      .query(
        "UPDATE user_info SET full_name = ?, phone_number = ?, address = ? WHERE account_id = ?",
        [full_name, phone_number, address, account_id]
      );
  }

  static async updateAvatar(account_id, avatar_url) {
    await db
      .promise()
      .query(
        "UPDATE user_info SET avatar_url = ? WHERE account_id = ?",
        [avatar_url, account_id]
      );
  }

  static async findAllForAdmin() {
    const [rows] = await db.promise().query(`
      SELECT a.id, a.email, u.full_name, u.role, u.phone_number, u.address, u.avatar_url
      FROM accounts a
      JOIN user_info u ON a.id = u.account_id
      WHERE u.role IN ('buyer', 'seller')
    `);
    return rows;
  }
}

module.exports = UserInfo;