// src/modules/notifications/controllers/notification-controller.js
const { BaseController } = require('../../../core/api');
const NotificationModel = require('../models/notification');
const logger = require('../../../core/logging');

/**
 * Notification API controller
 */
class NotificationController extends BaseController {
  /**
   * Create a new notification controller
   * @param {NotificationService} service - Notification service
   */
  constructor(service) {
    super(NotificationModel, {
      idParam: 'id',
      defaultLimit: 20,
      defaultSort: [['created_at', 'DESC']],
      softDelete: true,
      allowedFilters: ['type', 'read', 'delivered']
    });
    
    this.service = service;
    
    // Bind custom methods
    this.getUserNotifications = this.getUserNotifications.bind(this);
    this.markAsRead = this.markAsRead.bind(this);
    this.getStats = this.getStats.bind(this);
  }
  
  /**
   * Get notifications for a user
   * @param {object} req - Express request
   * @param {object} res - Express response
   * @param {function} next - Express next function
   * @returns {Promise<void>}
   */
  async getUserNotifications(req, res, next) {
    try {
      const userId = req.params.userId || req.user?.id;
      
      if (!userId) {
        return res.badRequest('User ID is required');
      }
      
      // Parse query parameters
      const options = {
        limit: parseInt(req.query.limit, 10) || this.options.defaultLimit,
        offset: parseInt(req.query.offset, 10) || 0
      };
      
      // Add read filter if specified
      if (req.query.read !== undefined) {
        options.read = req.query.read === 'true';
      }
      
      // Add type filter if specified
      if (req.query.type) {
        options.type = req.query.type;
      }
      
      // Get notifications
      const result = await this.service.getUserNotifications(userId, options);
      
      return res.success({
        data: result.notifications,
        meta: {
          total: result.total,
          limit: result.limit,
          offset: result.offset
        }
      });
    } catch (error) {
      logger.error('Error in getUserNotifications controller:', error);
      next(error);
    }
  }
  
  /**
   * Mark notifications as read
   * @param {object} req - Express request
   * @param {object} res - Express response
   * @param {function} next - Express next function
   * @returns {Promise<void>}
   */
  async markAsRead(req, res, next) {
    try {
      const userId = req.params.userId || req.user?.id;
      
      if (!userId) {
        return res.badRequest('User ID is required');
      }
      
      // Get notification IDs from body
      const ids = req.body.ids;
      
      // Mark notifications as read
      const updated = await this.service.markAsRead(userId, ids);
      
      return res.success({
        data: {
          updated
        }
      });
    } catch (error) {
      logger.error('Error in markAsRead controller:', error);
      next(error);
    }
  }
  
  /**
   * Get notification statistics
   * @param {object} req - Express request
   * @param {object} res - Express response
   * @param {function} next - Express next function
   * @returns {Promise<void>}
   */
  async getStats(req, res, next) {
    try {
      const userId = req.params.userId || req.user?.id;
      
      if (!userId) {
        return res.badRequest('User ID is required');
      }
      
      // Get statistics
      const stats = await this.service.getNotificationStats(userId);
      
      return res.success({ data: stats });
    } catch (error) {
      logger.error('Error in getStats controller:', error);
      next(error);
    }
  }
  
  /**
   * Override create method to use service
   * @param {object} req - Express request
   * @param {object} res - Express response
   * @param {function} next - Express next function
   * @returns {Promise<void>}
   */
  async create(req, res, next) {
    try {
      // Map request body to service format
      const data = {
        userId: req.body.userId || req.user?.id,
        type: req.body.type,
        title: req.body.title,
        message: req.body.message,
        data: req.body.data,
        deliver: req.body.deliver,
        deliveryType: req.body.deliveryType
      };
      
      if (!data.userId) {
        return res.badRequest('User ID is required');
      }
      
      // Create notification
      const notification = await this.service.createNotification(data);
      
      return res.created({ data: notification });
    } catch (error) {
      logger.error('Error in create controller:', error);
      next(error);
    }
  }
}

module.exports = NotificationController;
