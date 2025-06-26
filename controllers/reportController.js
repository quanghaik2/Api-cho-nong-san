const Report = require("../models/Report");
const path = require("path");
const db = require("../config/db");
const fs = require("fs");

const createReport = async (req, res) => {
  const { product_id, reason } = req.body;
  console.log({ des: req.user });
  const evidence_image_urls = req.files ? req.files.map(file => `/report_images/${file.filename}`) : [];

  if (!product_id || !reason) {
    return res.status(400).json({ message: "Thiếu thông tin báo cáo (product_id hoặc reason)!" });
  }

  try {
    const reportId = await Report.create({
      product_id,
      user_id: req.user.id,
      reason,
      evidence_image_url: evidence_image_urls.length > 0 ? JSON.stringify(evidence_image_urls) : null,
    });
    res.status(201).json({ message: "Báo cáo đã được gửi!", reportId, evidence_image_urls });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server: " + error.message });
  }
};

const getAllReports = async (req, res) => {
  try {
    const reports = await Report.getAll();
    res.status(200).json(reports);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server: " + error.message });
  }
};

const getReportSummary = async (req, res) => {
  try {
    const { limit = 10, page = 1 } = req.query;
    const offset = (page - 1) * limit;
    const reports = await Report.getReportSummary({ limit: parseInt(limit), offset: parseInt(offset) });
    res.status(200).json(reports);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server: " + error.message });
  }
};

const getReportsByProductId = async (req, res) => {
  const productId = req.params.productId;
  try {
    const reports = await Report.getByProductId(productId);
    if (!reports || reports.length === 0) {
      return res.status(404).json({ message: `Không tìm thấy báo cáo cho sản phẩm với ID ${productId}` });
    }
    res.status(200).json(reports);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server: " + error.message });
  }
};

const deleteReport = async (req, res) => {
  const reportId = req.params.id;
  try {
    const [report] = await db
      .promise()
      .query("SELECT evidence_image_url FROM reports WHERE id = ?", [reportId]);
    if (report[0]?.evidence_image_url) {
      const imagePath = path.join(__dirname, "..", "public", report[0].evidence_image_url);
      try {
        await fs.promises.unlink(imagePath);
      } catch (err) {
        console.warn("Không thể xóa ảnh báo cáo:", err.message);
      }
    }
    await Report.delete(reportId);
    res.status(200).json({ message: "Báo cáo đã được xóa!" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server: " + error.message });
  }
};



module.exports = { createReport, getAllReports, getReportSummary, getReportsByProductId, deleteReport };