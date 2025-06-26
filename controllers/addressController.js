const UserAddress = require("../models/UserAddress");

exports.createAddress = async (req, res) => {
  const { full_name, phone_number, province, district, ward, detailed_address, is_default } = req.body;

  if (!full_name || !phone_number || !province || !district || !ward || !detailed_address) {
    return res.status(400).json({ message: "Vui lòng điền đầy đủ thông tin địa chỉ!" });
  }

  try {
    const user_id = req.user.id;
    if (is_default) {
      await UserAddress.updateDefault(null, user_id); // Reset các địa chỉ khác
    }
    const addressId = await UserAddress.create({
      user_id,
      full_name,
      phone_number,
      province,
      district,
      ward,
      detailed_address,
      is_default: is_default || false,
    });
    if (is_default) {
      await UserAddress.updateDefault(addressId, user_id);
    }
    res.status(201).json({ message: "Thêm địa chỉ thành công!", addressId });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server: " + error.message });
  }
};

exports.getUserAddresses = async (req, res) => {
  try {
    const addresses = await UserAddress.getByUserId(req.user.id);
    res.status(200).json(addresses);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server: " + error.message });
  }
};

exports.setDefaultAddress = async (req, res) => {
  const { address_id } = req.body;
  try {
    await UserAddress.updateDefault(address_id, req.user.id);
    res.status(200).json({ message: "Đặt địa chỉ mặc định thành công!" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server: " + error.message });
  }
};

exports.deleteAddress = async (req, res) => {
  const { address_id } = req.body;
  try {
    await UserAddress.delete(address_id, req.user.id);
    res.status(200).json({ message: "Xóa địa chỉ thành công!" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server: " + error.message });
  }
};

