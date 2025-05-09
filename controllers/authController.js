const Account = require("../models/Account");
const UserInfo = require("../models/UserInfo");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const register = async (req, res) => {
  const { full_name, email, password, role } = req.body;

  if (!full_name || !email || !password || !role) {
    return res.status(400).json({ message: "Vui lòng điền đầy đủ thông tin bắt buộc!" });
  }

  try {
    const existingAccount = await Account.findByEmail(email);
    if (existingAccount) {
      return res.status(400).json({ message: "Email đã tồn tại!" });
    }

    // Tạo tài khoản
    const accountId = await Account.create({ email, password });

    // Tạo thông tin người dùng
    await UserInfo.create({ account_id: accountId, full_name, role });

    res.status(201).json({ message: "Đăng ký thành công!" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server: " + error.message });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Vui lòng điền đầy đủ thông tin!" });
  }
  try {
    const account = await Account.findByEmail(email);
    if (!account) {
      return res.status(400).json({ message: "Email không tồn tại!" });
    }
    const isMatch = await bcrypt.compare(password, account.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Mật khẩu không đúng!" });
    }
    const userInfo = await UserInfo.findByAccountId(account.id);
    const accessToken = jwt.sign(
      { id: account.id, email: account.email, role: userInfo.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    const refreshToken = jwt.sign(
      { id: account.id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );
    // Xóa refresh token cũ
    await Account.updateRefreshToken(account.id, null);
    // Lưu refresh token mới
    await Account.updateRefreshToken(account.id, refreshToken);
    console.log("Đăng nhập thành công, refresh token mới:", refreshToken);
    res.status(200).json({
      message: "Đăng nhập thành công!",
      accessToken,
      refreshToken,
      user: { id: account.id, email: account.email, role: userInfo.role },
    });
  } catch (error) {
    console.error("Lỗi đăng nhập:", error.message);
    res.status(500).json({ message: "Lỗi server: " + error.message });
  }
};

const refreshToken = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ message: "Refresh Token không được cung cấp!" });
  }
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const account = await Account.findById(decoded.id);
    if (!account) {
      return res.status(401).json({ message: "Tài khoản không tồn tại!" });
    }
    console.log("So sánh Refresh Token:", {
      lưu_trong_db: account.refresh_token,
      gửi_từ_client: refreshToken,
    });
    if (account.refresh_token !== refreshToken) {
      return res.status(401).json({ message: "Refresh Token không hợp lệ!" });
    }
    const userInfo = await UserInfo.findByAccountId(decoded.id);
    const accessToken = jwt.sign(
      { id: account.id, email: account.email, role: userInfo.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    res.status(200).json({
      message: "Làm mới token thành công!",
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.log("Lỗi Refresh Token:", error.message);
    res.status(401).json({ message: "Refresh Token không hợp lệ hoặc đã hết hạn!" });
  }
};

const getUserProfile = async (req, res) => {
  try {
    // Lấy token từ header Authorization
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Token không hợp lệ!" });
    }

    const token = authHeader.split(" ")[1]; // Lấy token từ "Bearer <token>"
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Giải mã token
    const account_id = decoded.id; 

    // Tìm thông tin người dùng bằng account_id
    const userInfo = await UserInfo.findByAccountId(account_id);
    if (!userInfo) {
      return res.status(404).json({ message: "Thông tin người dùng không tồn tại!" });
    }

    res.status(200).json({
      full_name: userInfo.full_name,
      email: (await Account.findById(account_id)).email,
      phone_number: userInfo.phone_number,
      address: userInfo.address,
      role: userInfo.role,
      avatar_url: userInfo.avatar_url, // Thêm avatar_url vào phản hồi
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server: " + error.message });
  }
};

const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Vui lòng chọn một file ảnh hợp lệ!" });
    }

    const avatarUrl = `/avatars/${req.file.filename}`; // Đường dẫn ảnh lưu trong public

    // Cập nhật đường dẫn avatar vào database
    await UserInfo.updateAvatar(req.user.id, avatarUrl );

    res.status(200).json({ message: "Cập nhật ảnh đại diện thành công!", avatar_url: avatarUrl });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server: " + error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { full_name, phone_number, address } = req.body; // Loại bỏ avatar_url

    await UserInfo.updateProfile(req.user.id, { full_name, phone_number, address }); // Chỉ cập nhật các trường này

    res.status(200).json({ message: "Cập nhật thông tin thành công!" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server: " + error.message });
  }
};

// Lấy danh sách tất cả người dùng
const getAllUsers = async (req, res) => {
  try {
    // if (!req.user || req.user.role !== "admin") {
    //   return res.status(403).json({ message: "Yêu cầu quyền admin!" });
    // }

    // Lấy tất cả người dùng từ bảng accounts và user_info
    const users = await UserInfo.findAllForAdmin();
    res.status(200).json(users);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách người dùng:", error.message);
    res.status(500).json({ message: "Lỗi server: " + error.message });
  }
};

// Lấy thông tin chi tiết người dùng theo ID
const getUserById = async (req, res) => {
  try {
    // Kiểm tra vai trò admin từ token (tùy chọn, để tăng bảo mật)
    // if (!req.user || req.user.role !== "admin") {
    //   return res.status(403).json({ message: "Yêu cầu quyền admin!" });
    // }

    const userId = req.params.id;
    const account = await Account.findById(userId);
    if (!account) {
      return res.status(404).json({ message: "Người dùng không tồn tại!" });
    }

    const userInfo = await UserInfo.findByAccountId(userId);
    if (!userInfo || !["buyer", "seller"].includes(userInfo.role)) {
      return res.status(404).json({ message: "Người dùng không tồn tại!" });
    }

    res.status(200).json({
      id: account.id,
      email: account.email,
      full_name: userInfo.full_name,
      role: userInfo.role,
      phone_number: userInfo.phone_number,
      address: userInfo.address,
      avatar_url: userInfo.avatar_url,
    });
  } catch (error) {
    console.error("Lỗi khi lấy thông tin người dùng:", error.message);
    res.status(500).json({ message: "Lỗi server: " + error.message });
  }
};
module.exports = { register, login, getUserProfile, uploadAvatar, updateProfile, uploadAvatar, refreshToken, getAllUsers, getUserById };

