// src/server.js
require('dotenv').config();
const core = require('./core');
const NotificationsModule = require('./modules/notifications');
const logger = core.logger;

/**
 * Start the server
 */
async function startServer() {
  try {
    // Create application instance
    const app = new core.Application({
      name: process.env.APP_NAME || 'server-starter',
      version: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    });
    
    // Register modules
    app.registerModule(new NotificationsModule());
    
    // Initialize and start the application
    await app.initialize();
    await app.start();
    
    // Handle process termination
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down...');
      await app.stop();
      process.exit(0);
    });
    
    process.on('SIGINT', async () => {
      logger.info('SIGINT received, shutting down...');
      await app.stop();
      process.exit(0);
    });
    
    // Log startup message
    logger.info(`Server started successfully: ${process.env.APP_NAME || 'server-starter'} v${process.env.APP_VERSION || '1.0.0'}`);
    
    return app;
  } catch (error) {
    logger.error('Error starting server:', error);
    process.exit(1);
  }
}

// Start server if this is the main module
if (require.main === module) {
  startServer();
}

module.exports = { startServer };
