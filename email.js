const nodemailer = require("nodemailer");

// Cấu hình transporter với Gmail hoặc dịch vụ email khác
const transporter = nodemailer.createTransport({
  service: "Gmail", // Hoặc dịch vụ khác như SendGrid, Mailgun
  auth: {
    user: process.env.EMAIL_USER, // Email của bạn (thêm vào .env)
    pass: process.env.EMAIL_PASS, // Mật khẩu ứng dụng (App Password nếu dùng Gmail)
  },
});

// Hàm gửi email chứa OTP
const sendOTPEmail = async (to, otp) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: "Mã OTP để đặt lại mật khẩu",
    text: `Mã OTP của bạn là: ${otp}. Mã này có hiệu lực trong 5 phút.`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email OTP sent to ${to}`);
  } catch (error) {
    console.error("Error sending OTP email:", error);
    throw new Error("Không thể gửi email OTP!");
  }
};

module.exports = { sendOTPEmail };