// src/workers/index.js
const notificationWorker = require('./notificationWorker');
const logger = require('../config/logging');

const startWorkers = async () => {
  try {
    // Start notification workers
    await notificationWorker.processImmediateNotifications();
    await notificationWorker.processScheduledNotifications();
    
    logger.info('All workers started successfully');
  } catch (error) {
    logger.error('Error starting workers:', error);
    throw error;
  }
};

module.exports = startWorkers;