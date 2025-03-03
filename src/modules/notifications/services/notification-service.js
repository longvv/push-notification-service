// src/modules/notifications/services/notification-service.js
const { Service } = require('../../../core/api');
const logger = require('../../../core/logging');
const NotificationModel = require('../models/notification');

/**
 * Notification service for handling notification operations
 */
class NotificationService extends Service {
  /**
   * Create a new notification service
   * @param {object} options - Service options
   */
  constructor(options = {}) {
    super({
      cacheEnabled: true,
      cacheTTL: 300, // 5 minutes
      ...options
    });
    
    this.model = NotificationModel;
  }
  
  /**
   * Create a new notification
   * @param {object} data - Notification data
   * @returns {Promise<object>} Created notification
   */
  async createNotification(data) {
    try {
      // Create notification in database
      const notification = await this.model.create({
        user_id: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        data: data.data || {},
        delivery_type: data.deliveryType
      });
      
      logger.info(`Created notification ${notification.id} for user ${data.userId}`);
      
      // Queue notification for delivery if requested
      if (data.deliver !== false && data.deliveryType) {
        await this.queueNotificationDelivery(notification, data.deliveryType);
      }
      
      return notification;
    } catch (error) {
      logger.error('Error creating notification:', error);
      throw error;
    }
  }
  
  /**
   * Get notifications for a user
   * @param {string} userId - User ID
   * @param {object} options - Query options
   * @returns {Promise<object[]>} User notifications
   */
  async getUserNotifications(userId, options = {}) {
    return this._withCache('getUserNotifications', async (userId, options) => {
      const { limit = 10, offset = 0, read, type } = options;
      
      // Build query
      const query = {
        where: {
          user_id: userId,
          deleted_at: null
        },
        order: [['created_at', 'DESC']],
        limit,
        offset
      };
      
      // Add read filter if specified
      if (read !== undefined) {
        query.where.read = read;
      }
      
      // Add type filter if specified
      if (type) {
        query.where.type = type;
      }
      
      // Get notifications
      const result = await this.model.findAndCountAll(query);
      
      return {
        notifications: result.rows,
        total: result.count,
        limit,
        offset
      };
    }, [userId, options]);
  }
  
  /**
   * Mark notifications as read
   * @param {string} userId - User ID
   * @param {string[]} ids - Notification IDs (all if not specified)
   * @returns {Promise<number>} Number of updated notifications
   */
  async markAsRead(userId, ids = null) {
    try {
      const query = {
        where: {
          user_id: userId,
          read: false,
          deleted_at: null
        }
      };
      
      // Limit to specific notifications if IDs provided
      if (ids && ids.length > 0) {
        query.where.id = ids;
      }
      
      // Update notifications
      const [updated] = await this.model.update(
        { read: true },
        query
      );
      
      logger.info(`Marked ${updated} notifications as read for user ${userId}`);
      
      // Clear cache for this user
      if (this.cache) {
        await this.cache.delete(`${this.cachePrefix}:getUserNotifications:${userId}`);
      }
      
      return updated;
    } catch (error) {
      logger.error('Error marking notifications as read:', error);
      throw error;
    }
  }
  
  /**
   * Delete notifications
   * @param {string} userId - User ID
   * @param {string[]} ids - Notification IDs (all if not specified)
   * @returns {Promise<number>} Number of deleted notifications
   */
  async deleteNotifications(userId, ids = null) {
    try {
      const query = {
        where: {
          user_id: userId,
          deleted_at: null
        }
      };
      
      // Limit to specific notifications if IDs provided
      if (ids && ids.length > 0) {
        query.where.id = ids;
      }
      
      // Soft delete notifications
      const [deleted] = await this.model.update(
        { deleted_at: new Date() },
        query
      );
      
      logger.info(`Deleted ${deleted} notifications for user ${userId}`);
      
      // Clear cache for this user
      if (this.cache) {
        await this.cache.delete(`${this.cachePrefix}:getUserNotifications:${userId}`);
      }
      
      return deleted;
    } catch (error) {
      logger.error('Error deleting notifications:', error);
      throw error;
    }
  }
  
  /**
   * Mark notification as delivered
   * @param {string} notificationId - Notification ID
   * @returns {Promise<boolean>} True if successful
   */
  async markAsDelivered(notificationId) {
    try {
      // Update notification
      const [updated] = await this.model.update(
        { delivered: true },
        {
          where: {
            id: notificationId,
            delivered: false
          }
        }
      );
      
      return updated > 0;
    } catch (error) {
      logger.error(`Error marking notification ${notificationId} as delivered:`, error);
      return false;
    }
  }
  
  /**
   * Queue notification for delivery
   * @param {object} notification - Notification object
   * @param {string} deliveryType - Delivery type (email, sms, push)
   * @returns {Promise<boolean>} True if queued successfully
   */
  async queueNotificationDelivery(notification, deliveryType) {
    try {
      const queueManager = this.app?.getService('queue');
      
      if (!queueManager) {
        logger.warn('Queue manager not available, skipping notification delivery');
        return false;
      }
      
      // Queue notification for delivery
      await queueManager.publish(
        'notifications',
        `notifications.delivery.${deliveryType}`,
        {
          notification: {
            id: notification.id,
            userId: notification.user_id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            data: notification.data
          },
          deliveryType
        }
      );
      
      logger.info(`Queued notification ${notification.id} for ${deliveryType} delivery`);
      return true;
    } catch (error) {
      logger.error(`Error queuing notification for delivery:`, error);
      return false;
    }
  }
  
  /**
   * Get notification statistics for a user
   * @param {string} userId - User ID
   * @returns {Promise<object>} Notification statistics
   */
  async getNotificationStats(userId) {
    return this._withCache('getNotificationStats', async (userId) => {
      // Get counts by type
      const stats = await this.model.findAll({
        attributes: [
          'type',
          [this.model.sequelize.fn('COUNT', this.model.sequelize.col('*')), 'total'],
          [this.model.sequelize.fn('SUM', this.model.sequelize.literal("CASE WHEN read = false THEN 1 ELSE 0 END")), 'unread']
        ],
        where: {
          user_id: userId,
          deleted_at: null
        },
        group: ['type']
      });
      
      // Format results
      const result = {
        total: 0,
        unread: 0,
        types: {}
      };
      
      stats.forEach(stat => {
        const data = stat.toJSON();
        result.total += parseInt(data.total, 10) || 0;
        result.unread += parseInt(data.unread, 10) || 0;
        
        result.types[data.type] = {
          total: parseInt(data.total, 10) || 0,
          unread: parseInt(data.unread, 10) || 0
        };
      });
      
      return result;
    }, [userId], { ttl: 60 }); // 1 minute cache
  }
  
  /**
   * Set application instance
   * @param {Application} app - Application instance
   * @returns {NotificationService} this for chaining
   */
  setApp(app) {
    this.app = app;
    
    // Set cache from app
    if (app) {
      this.setCache(app.getService('cache'));
    }
    
    return this;
  }
}

module.exports = NotificationService;
