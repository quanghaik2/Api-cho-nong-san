const multer = require("multer");
const path = require("path");

// Cấu hình lưu trữ ảnh đại diện
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/avatars/"); // Lưu vào thư mục avatars
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `avatar_${req.user.id}${ext}`); // Đặt tên file theo ID người dùng
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Giới hạn 5MB
  fileFilter: function (req, file, cb) {
    const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error("Chỉ chấp nhận định dạng JPG, JPEG, PNG"));
    }
    cb(null, true);
  },
});

module.exports = upload;

