// src/config/redis.js
const Redis = require('redis');
const logger = require('./logging');

// Create Redis client with more robust error handling
const redisClient = Redis.createClient({
  url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`,
  socket: {
    reconnectStrategy: (retries) => {
      // Exponential backoff with max 3000ms
      const delay = Math.min(retries * 50, 3000);
      logger.info(`Redis reconnecting in ${delay}ms...`);
      return delay;
    },
    connectTimeout: 10000 // Increase timeout to 10 seconds
  }
});

// Handle Redis errors
redisClient.on('error', (err) => {
  logger.error('Redis error:', err);
  // Don't crash the application on Redis errors
});

redisClient.on('connect', () => {
  logger.info('Connected to Redis successfully');
});

redisClient.on('reconnecting', () => {
  logger.info('Reconnecting to Redis...');
});

// Make connect function more resilient
const connectRedis = async () => {
  try {
    // Check if already connected to avoid duplicate connections
    if (redisClient.isOpen) {
      logger.info('Redis already connected');
      return redisClient;
    }
    
    logger.info('Connecting to Redis...');
    await redisClient.connect();
    return redisClient;
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    
    // Instead of failing completely, we'll continue without Redis
    // This allows your app to start even if Redis isn't available
    logger.warn('Application will continue without Redis functionality');
    return null;
  }
};

// Make sure functions handle the case where Redis might be unavailable
const getRedisValue = async (key) => {
  try {
    if (!redisClient.isOpen) {
      logger.warn('Redis not connected, cannot get value');
      return null;
    }
    return await redisClient.get(key);
  } catch (error) {
    logger.error(`Error getting Redis value for key ${key}:`, error);
    return null;
  }
};

const setRedisValue = async (key, value, expireSeconds = null) => {
  try {
    if (!redisClient.isOpen) {
      logger.warn('Redis not connected, cannot set value');
      return false;
    }
    
    await redisClient.set(key, value);
    if (expireSeconds) {
      await redisClient.expire(key, expireSeconds);
    }
    return true;
  } catch (error) {
    logger.error(`Error setting Redis value for key ${key}:`, error);
    return false;
  }
};

module.exports = {
  redisClient,
  connectRedis,
  getRedisValue,
  setRedisValue
};