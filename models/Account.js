const db = require("../config/db");
const bcrypt = require("bcryptjs");

class Account {
  static async findByEmail(email) {
    const [rows] = await db
      .promise()
      .query("SELECT * FROM accounts WHERE email = ?", [email]);
    return rows[0];
  }

  static async findById(id) {
    const [rows] = await db
      .promise()
      .query("SELECT * FROM accounts WHERE id = ?", [id]);
    return rows[0];
  }

  static async create({ email, password, login_type = "default" }) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await db
      .promise()
      .query(
        "INSERT INTO accounts (email, password, login_type) VALUES (?, ?, ?)",
        [email, hashedPassword, login_type]
      );
    return result.insertId;
  }

  static async updateRefreshToken(id, refreshToken) {
    await db
      .promise()
      .query("UPDATE accounts SET refresh_token = ? WHERE id = ?", [refreshToken, id]);
  }
}

module.exports = Account;