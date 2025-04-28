const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationController");
const { authMiddleware } = require("../middleware/auth");

// Định nghĩa các route cho thông báo
router.post("/create", authMiddleware, notificationController.createNotification);
router.get("/", authMiddleware, notificationController.getUserNotifications);

module.exports = router;