// src/modules/notifications/index.js
const { Module } = require('../../core/module');
const NotificationService = require('./services/notification-service');
const NotificationDeliveryWorker = require('./workers/delivery-worker');
const createNotificationRoutes = require('./routes');
const NotificationModel = require('./models/notification');
const logger = require('../../core/logging');

/**
 * Notifications module
 */
class NotificationsModule extends Module {
  /**
   * Create a new notifications module
   * @param {object} options - Module options
   */
  constructor(options = {}) {
    super('notifications', {
      enabled: true,
      ...options
    });
    
    this.service = new NotificationService();
    this.worker = null;
    this.router = null;
  }
  
  /**
   * Initialize the module
   * @param {Application} app - Application instance
   */
  async onInitialize(app) {
    logger.info('Initializing notifications module');
    
    // Set app on service
    this.service.setApp(app);
    
    // Create worker
    this.worker = new NotificationDeliveryWorker(this.service);
    
    // Register worker with worker manager
    const workerManager = app.getService('workers');
    
    if (workerManager) {
      workerManager.registerWorker(this.worker);
    } else {
      logger.warn('Worker manager not available, skipping worker registration');
    }
    
    // Sync models with database
    const dbConnection = app.getService('database');
    
    if (dbConnection) {
      try {
        await dbConnection.syncModels();
        logger.info('Notification models synchronized successfully');
      } catch (error) {
        logger.error('Error synchronizing notification models:', error);
        throw error;
      }
    } else {
      logger.warn('Database connection not available, skipping model synchronization');
    }
  }
  
  /**
   * Configure the module
   * @param {Application} app - Application instance
   */
  async onConfigure(app) {
    logger.info('Configuring notifications module');
    
    // Create routes
    this.router = createNotificationRoutes(this.service);
    
    // Register routes with HTTP server
    const http = app.getService('http');
    
    if (http) {
      http.registerRouter('/api', this.router);
      logger.info('Notification routes registered successfully');
    } else {
      logger.warn('HTTP server not available, skipping route registration');
    }
    
    // Configure WebSocket events
    const ws = app.getService('websocket');
    
    if (ws) {
      // Add WebSocket authentication middleware
      ws.use((socket, next) => {
        // Extract user ID from token or session
        const userId = socket.handshake.auth.userId;
        
        if (userId) {
          // Store user ID on socket
          socket.userId = userId;
          next();
        } else {
          next();
        }
      });
      
      // Handle connection
      ws.on('connect', socket => {
        // Join user's room for targeted notifications
        if (socket.userId) {
          socket.join(`user:${socket.userId}`);
          logger.debug(`User ${socket.userId} joined notification room`);
        }
      });
      
      logger.info('WebSocket events configured successfully');
    } else {
      logger.warn('WebSocket server not available, skipping WS configuration');
    }
  }
  
  /**
   * Start the module
   * @param {Application} app - Application instance
   */
  async onStart(app) {
    logger.info('Starting notifications module');
    
    // Set up queues for notifications
    const queue = app.getService('queue');
    
    if (queue) {
      try {
        // Create standard queues for notifications
        await queue.createStandardQueues('notifications');
        logger.info('Notification queues created successfully');
      } catch (error) {
        logger.error('Error creating notification queues:', error);
      }
    } else {
      logger.warn('Queue manager not available, skipping queue setup');
    }
  }
  
  /**
   * Stop the module
   * @param {Application} app - Application instance
   */
  async onStop(app) {
    logger.info('Stopping notifications module');
    
    // Nothing to clean up
  }
  
  /**
   * Get the notification service
   * @returns {NotificationService} Notification service
   */
  getService() {
    return this.service;
  }
}

module.exports = NotificationsModule;
