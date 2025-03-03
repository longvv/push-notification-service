// src/modules/notifications/validators/index.js
const { Validator } = require('../../../core/api');

// Create notification schema
const createNotificationSchema = Validator.createSchema({
  userId: {
    type: 'string',
    required: true,
    pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  },
  type: {
    type: 'string',
    required: true,
    maxLength: 50
  },
  title: {
    type: 'string',
    required: true,
    maxLength: 255
  },
  message: {
    type: 'string',
    required: true
  },
  data: {
    type: 'object'
  },
  deliver: {
    type: 'boolean'
  },
  deliveryType: {
    type: 'string',
    enum: ['email', 'sms', 'push', 'in-app']
  }
});

// Mark as read schema
const markAsReadSchema = Validator.createSchema({
  ids: {
    type: 'array',
    items: {
      type: 'string',
      pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    }
  }
});

// Get notifications query schema
const getNotificationsQuerySchema = Validator.createSchema({
  limit: {
    type: 'number',
    min: 1,
    max: 100
  },
  offset: {
    type: 'number',
    min: 0
  },
  read: {
    type: 'string',
    enum: ['true', 'false']
  },
  type: {
    type: 'string',
    maxLength: 50
  }
});

module.exports = {
  createNotificationSchema,
  markAsReadSchema,
  getNotificationsQuerySchema
};
