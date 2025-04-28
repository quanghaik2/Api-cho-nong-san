const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token không hợp lệ!" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Gắn thông tin user vào req
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token đã hết hạn!", expired: true });
    }
    return res.status(401).json({ message: "Token không hợp lệ!" });
  }
};

const authMiddlewareSeller = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    console.log("Không có token trong authMiddlewareSeller:", req.headers);
    return res.status(401).json({ message: "Không có token!" });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "seller") {
      console.log("Vai trò không phải seller:", decoded);
      return res.status(403).json({ message: "Yêu cầu quyền seller!" });
    }
    req.user = decoded;
    next();
  } catch (error) {
    console.log("Lỗi authMiddlewareSeller:", error.message, { token });
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token đã hết hạn!", expired: true });
    }
    return res.status(401).json({ message: "Token không hợp lệ!" });
  }
};

module.exports = { authMiddleware, authMiddlewareSeller };