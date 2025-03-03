// src/modules/notifications/workers/delivery-worker.js
const { QueueWorker } = require('../../../core/worker');
const logger = require('../../../core/logging');

/**
 * Notification delivery worker
 */
class NotificationDeliveryWorker extends QueueWorker {
  /**
   * Create a new notification delivery worker
   * @param {NotificationService} service - Notification service
   * @param {object} options - Worker options
   */
  constructor(service, options = {}) {
    super('notification-delivery', {
      queueName: 'notifications.delivery',
      exchangeName: 'notifications',
      routingKey: 'notifications.delivery.#',
      maxRetries: 3,
      ...options
    });
    
    this.service = service;
  }
  
  /**
   * Process notification delivery job
   * @param {object} job - Job data
   * @returns {Promise<boolean>} True if successful
   */
  async handleWork(job) {
    try {
      const { notification, deliveryType } = job;
      
      logger.info(`Processing notification delivery for ${notification.id} via ${deliveryType}`);
      
      // Handle different delivery types
      let success = false;
      
      switch (deliveryType) {
        case 'email':
          success = await this._sendEmailNotification(notification);
          break;
        case 'sms':
          success = await this._sendSmsNotification(notification);
          break;
        case 'push':
          success = await this._sendPushNotification(notification);
          break;
        case 'in-app':
          // In-app notifications are delivered via WebSocket
          success = await this._sendInAppNotification(notification);
          break;
        default:
          logger.warn(`Unknown delivery type: ${deliveryType}`);
          return false;
      }
      
      if (success) {
        // Mark as delivered in database
        await this.service.markAsDelivered(notification.id);
        logger.info(`Notification ${notification.id} delivered successfully via ${deliveryType}`);
        return true;
      }
      
      logger.warn(`Failed to deliver notification ${notification.id} via ${deliveryType}`);
      return false;
    } catch (error) {
      logger.error('Error processing notification delivery:', error);
      throw error;
    }
  }
  
  /**
   * Send email notification
   * @param {object} notification - Notification data
   * @returns {Promise<boolean>} True if successful
   * @private
   */
  async _sendEmailNotification(notification) {
    // This would be implemented with an email service
    logger.info(`Would send email to user ${notification.userId}: ${notification.title}`);
    return true;
  }
  
  /**
   * Send SMS notification
   * @param {object} notification - Notification data
   * @returns {Promise<boolean>} True if successful
   * @private
   */
  async _sendSmsNotification(notification) {
    // This would be implemented with an SMS service
    logger.info(`Would send SMS to user ${notification.userId}: ${notification.title}`);
    return true;
  }
  
  /**
   * Send push notification
   * @param {object} notification - Notification data
   * @returns {Promise<boolean>} True if successful
   * @private
   */
  async _sendPushNotification(notification) {
    // This would be implemented with a push notification service
    logger.info(`Would send push notification to user ${notification.userId}: ${notification.title}`);
    return true;
  }
  
  /**
   * Send in-app notification via WebSocket
   * @param {object} notification - Notification data
   * @returns {Promise<boolean>} True if successful
   * @private
   */
  async _sendInAppNotification(notification) {
    try {
      // Get WebSocket server from app
      const app = this.service.app;
      
      if (!app) {
        logger.warn('App not available, skipping in-app notification');
        return false;
      }
      
      const ws = app.getService('websocket');
      
      if (!ws) {
        logger.warn('WebSocket server not available, skipping in-app notification');
        return false;
      }
      
      // Send notification to user's room
      await ws.emitToRoom(
        `user:${notification.userId}`,
        'notification',
        {
          id: notification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data,
          createdAt: new Date()
        }
      );
      
      return true;
    } catch (error) {
      logger.error(`Error sending in-app notification:`, error);
      return false;
    }
  }
}

module.exports = NotificationDeliveryWorker;
