// src/models/Device.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./user');

const Device = sequelize.define('Device', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  device_token: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  device_type: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'devices',
  timestamps: false
});

// Định nghĩa quan hệ
Device.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(Device, { foreignKey: 'user_id', as: 'devices' });

module.exports = Device;