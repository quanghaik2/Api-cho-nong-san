const Notification = require("../models/Notification");
const db = require("../config/db");

exports.createNotification = async (req, res) => {
  const { user_id, message, order_id } = req.body;

  if (!user_id || !message) {
    return res.status(400).json({ message: "Thiếu thông tin user_id hoặc message!" });
  }

  try {
    const notificationId = await Notification.create({ user_id, message, order_id });
    res.status(201).json({ message: "Tạo thông báo thành công!", notificationId });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server: " + error.message });
  }
};

exports.getUserNotifications = async (req, res) => {
  try {
    const notifications = await Notification.getByUserId(req.user.id);
    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server: " + error.message });
  }
};

exports.getProductRemovedNotifications = async (req, res) => {
  try {
    const notifications = await Notification.getByUserIdAndProduct(req.user.id);
    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server: " + error.message });
  }
};

exports.getNotificationById = async (req, res) => {
  try {
    const [notification] = await db
      .promise()
      .query(
        "SELECT id, message, created_at, product_id FROM notifications WHERE id = ?",
        [req.params.id]
      );
    if (!notification) {
      return res.status(404).json({ message: "Không tìm thấy thông báo!" });
    }
    res.status(200).json(notification);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server: " + error.message });
  }
};

module.exports = exports;