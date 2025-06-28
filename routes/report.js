// routes/report.js
const express = require("express");
const router = express.Router();
const {
  createReport,
  getAllReports,
  getReportsByProductId,
  deleteReport,
  getReportSummary,
  getSevereReportSummary,
  getAutoHiddenProducts,
} = require("../controllers/reportController");
const { authMiddleware } = require("../middleware/auth"); // Sử dụng authMiddleware thay vì authMiddlewareAdmin (tạm thời)
const upload = require("../middleware/uploadReportImage");

router.post("/", authMiddleware, upload.array("evidence_images", 5), createReport);
router.get("/", getAllReports); // Tạm thời cho người dùng xem báo cáo của mình
router.get("/summary", getReportSummary); 
router.get("/severe-summary", getSevereReportSummary);
router.get("/product/:productId", getReportsByProductId);
router.get("/auto-hidden", authMiddleware, getAutoHiddenProducts);
router.delete("/:id", authMiddleware, deleteReport); // Tạm thời cho người dùng xóa báo cáo của mình

module.exports = router;