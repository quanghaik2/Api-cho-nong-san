const Report = require("../models/Report");
const Product = require("../models/Product");
const Notification = require("../models/Notification");
const path = require("path");
const db = require("../config/db");
const fs = require("fs");
const axios = require("axios");
const { notifyProductRemoved } = require("../websocket");

const createReport = async (req, res) => {
  const { product_id, reason } = req.body;
  const evidence_image_urls = req.files ? req.files.map(file => `/report_images/${file.filename}`) : [];

  if (!product_id || !reason) {
    return res.status(400).json({ message: "Thiếu thông tin báo cáo (product_id hoặc reason)!" });
  }

  try {
    let severity = "Trung bình";
    try {
      const response = await axios.post(
        "https://api-inference.huggingface.co/models/nlptown/bert-base-multilingual-uncased-sentiment",
        { inputs: reason },
        {
          headers: {
            Authorization: `Bearer ${process.env.HUGGING_FACE_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      const scores = response.data[0];
      const highestScoreLabel = scores.reduce((max, item) => (item.score > max.score ? item : max), scores[0]).label;

      if (highestScoreLabel === "1 star" || highestScoreLabel === "2 stars") {
        severity = "Nghiêm trọng";
      } else if (highestScoreLabel === "3 stars") {
        severity = "Trung bình";
      } else if (highestScoreLabel === "4 stars" || highestScoreLabel === "5 stars") {
        severity = "Thấp";
      }
    } catch (apiError) {
      console.warn("Lỗi khi gọi Hugging Face API:", apiError.message);
    }

    const reportId = await Report.create({
      product_id,
      user_id: req.user.id,
      reason,
      evidence_image_url: evidence_image_urls.length > 0 ? JSON.stringify(evidence_image_urls) : null,
      severity,
    });

    if (severity === "Nghiêm trọng") {
      const [severeReports] = await db
        .promise()
        .query(
          "SELECT COUNT(*) as severe_count FROM reports WHERE product_id = ? AND severity = 'Nghiêm trọng'",
          [product_id]
        );
      const severeCount = severeReports[0].severe_count;

      if (severeCount >= 3) {
        const [product] = await db
          .promise()
          .query("SELECT id, name, seller_id FROM products WHERE id = ?", [product_id]);
        if (product.length > 0) {
          const productData = product[0];
          await Product.auto_hide(product_id);

          const reason = `Sản phẩm bị gỡ do nhận được ${severeCount} báo cáo nghiêm trọng`;
          const message = `Sản phẩm "${productData.name}" của bạn đã bị gỡ. Lý do: ${reason}`;
          await Notification.create({
            user_id: productData.seller_id,
            message,
            product_id,
          });

          notifyProductRemoved(productData.seller_id.toString(), productData.name, reason);
          console.log(`Sản phẩm ${product_id} đã được ẩn do vượt ngưỡng báo cáo.`);
        }
      }
    }

    res.status(201).json({
      message: "Báo cáo đã được gửi!",
      reportId,
      evidence_image_urls,
      severity,
    });
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

const getSevereReportSummary = async (req, res) => {
  try {
    const { limit = 10, page = 1 } = req.query;
    const offset = (page - 1) * limit;
    const reports = await Report.getSevereReportSummary({ limit: parseInt(limit), offset: parseInt(offset) });
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

const getAutoHiddenProducts = async (req, res) => {
  try {
    const [rows] = await db
      .promise()
      .query(
        "SELECT p.id AS product_id, p.name AS product_name, p.updated_at AS auto_hide_date, n.message AS reason " +
        "FROM products p " +
        "JOIN notifications n ON p.id = n.product_id " +
        "WHERE p.is_hidden = 2 AND n.message LIKE '%bị gỡ do nhận được 3+ báo cáo nghiêm trọng%'"
      );
    res.status(200).json(rows);
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

module.exports = { createReport, getAllReports, getReportSummary, getReportsByProductId, deleteReport, getSevereReportSummary, getAutoHiddenProducts };