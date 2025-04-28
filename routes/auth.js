const express = require("express");
const { register, login, getUserProfile, updateProfile, uploadAvatar, refreshToken, getAllUsers, getUserById } = require("../controllers/authController");
const authMiddleware = require("../middleware/auth");
const upload = require("../middleware/uploadMiddleware");
const router = express.Router();

// API đăng ký
router.post("/register", register);

// API đăng nhập
router.post("/login", login);
router.post("/refresh-token", refreshToken);

router.put("/update-avatar", authMiddleware.authMiddleware, upload.single("avatar"), uploadAvatar);

// API lấy thông tin người dùng
router.get("/profile", authMiddleware.authMiddleware, getUserProfile);

router.put("/update-profile", authMiddleware.authMiddleware, updateProfile, updateProfile);

// API lấy danh sách người dùng
router.get("/AllForAdmin", getAllUsers);

// API lấy thông tin chi tiết người dùng theo ID
router.get("/getUsers/:id", getUserById);

module.exports = router;