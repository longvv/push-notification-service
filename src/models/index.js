// src/models/index.js
const User = require('./user');
const Device = require('./device');
const Notification = require('./notification');

// Có thể thêm hàm sync để tạo bảng nếu chưa tồn tại
const syncModels = async () => {
  await User.sync();
  await Device.sync();
  await Notification.sync();
  console.log('Models synchronized successfully');
};

module.exports = {
  User,
  Device,
  Notification,
  syncModels
};