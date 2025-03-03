// src/modules/notifications/models/notification.js
const { DataTypes } = require('sequelize');
const BaseModel = require('../../../core/database/model');

const NotificationModel = BaseModel.define('Notification', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    index: true
  },
  type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    index: true
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  data: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  read: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    index: true
  },
  delivered: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    index: true
  },
  delivery_type: {
    type: DataTypes.STRING(20),
    allowNull: true,
    index: true
  },
  deleted_at: {
    type: DataTypes.DATE,
    allowNull: true,
    index: true
  }
}, {
  tableName: 'notifications',
  timestamps: true
});

module.exports = NotificationModel;
