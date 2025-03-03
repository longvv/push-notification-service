// src/modules/notifications/routes.js
const { createRouter } = require('../../core/http');
const { Validator } = require('../../core/api');
const NotificationController = require('./controllers/notification-controller');
const {
  createNotificationSchema,
  markAsReadSchema,
  getNotificationsQuerySchema
} = require('./validators');

/**
 * Create notification routes
 * @param {NotificationService} service - Notification service
 * @returns {express.Router} Express router
 */
function createNotificationRoutes(service) {
  const controller = new NotificationController(service);
  const router = createRouter('/notifications');
  
  // Get notifications
  router.get(
    '/user/:userId',
    Validator.validate(getNotificationsQuerySchema, 'query'),
    controller.getUserNotifications
  );
  
  // Mark notifications as read
  router.post(
    '/user/:userId/read',
    Validator.validate(markAsReadSchema),
    controller.markAsRead
  );
  
  // Get notification statistics
  router.get(
    '/user/:userId/stats',
    controller.getStats
  );
  
  // Standard CRUD routes
  router.post(
    '/',
    Validator.validate(createNotificationSchema),
    controller.create
  );
  
  router.get('/:id', controller.get);
  
  router.delete('/:id', controller.delete);
  
  return router.getRouter();
}

module.exports = createNotificationRoutes;
