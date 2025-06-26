const db = require("../config/db");

class Report {
  static async create({ product_id, user_id, reason, evidence_image_url }) {
    const query = "INSERT INTO reports (product_id, user_id, reason, evidence_image_url) VALUES (?, ?, ?, ?)";
    const values = [product_id, user_id, reason, evidence_image_url || null];
    const [result] = await db.promise().query(query, values);
    return result.insertId;
  }

  static async getAll() {
    const query = `
      SELECT r.*, p.name as product_name, a.email as user_email
      FROM reports r
      JOIN products p ON r.product_id = p.id
      JOIN accounts a ON r.user_id = a.id
      ORDER BY r.created_at DESC
    `;
    const [rows] = await db.promise().query(query);
    return rows;
  }

  static async getReportSummary({ limit = 10, offset = 0 } = {}) {
    const query = `
      SELECT 
        r.product_id,
        p.name as product_name,
        COUNT(r.id) as report_count,
        MAX(r.created_at) as latest_report
      FROM reports r
      JOIN products p ON r.product_id = p.id
      GROUP BY r.product_id, p.name
      ORDER BY latest_report DESC
      LIMIT ? OFFSET ?
    `;
    const [rows] = await db.promise().query(query, [limit, offset]);
    return rows;
  }

  static async getByProductId(product_id) {
    const query = `
      SELECT r.*, a.email as user_email
      FROM reports r 
      JOIN accounts a ON r.user_id = a.id 
      WHERE r.product_id = ?
      ORDER BY r.created_at DESC
    `;
    const [rows] = await db.promise().query(query, [product_id]);
    return rows;
  }

  static async delete(report_id) {
    const query = "DELETE FROM reports WHERE id = ?";
    await db.promise().query(query, [report_id]);
  }
}

module.exports = Report;