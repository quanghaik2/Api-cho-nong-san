// middleware/uploadReportImage.js
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/report_images/"); // Thư mục lưu ảnh báo cáo
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `report_${req.user.id}_${Date.now()}${ext}`); // Đặt tên file theo ID người dùng và timestamp
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // Giới hạn 5MB
  fileFilter: function (req, file, cb) {
    const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error("Chỉ chấp nhận định dạng JPG, JPEG, PNG"));
    }
    cb(null, true);
  },
});

module.exports = upload;