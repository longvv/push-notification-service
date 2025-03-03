// src/core/cache/redis.js
const Redis = require('redis');
const CacheProvider = require('./provider');
const logger = require('../logging');

/**
 * Redis implementation of the cache provider
 */
class RedisProvider extends CacheProvider {
  /**
   * Create a new Redis cache provider
   * @param {object} options - Redis connection options
   */
  constructor(options = {}) {
    super();
    
    this.options = {
      url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`,
      socket: {
        reconnectStrategy: (retries) => {
          // Exponential backoff with max 3000ms
          const delay = Math.min(retries * 50, 3000);
          logger.info(`Redis reconnecting in ${delay}ms...`);
          return delay;
        },
        connectTimeout: 10000 // Increase timeout to 10 seconds
      },
      ...options
    };
    
    this.client = null;
  }
  
  /**
   * Initialize the Redis connection
   * @returns {Promise<Redis>} Redis client
   */
  async initialize() {
    if (this.client && this.client.isOpen) {
      logger.info('Redis already connected');
      return this.client;
    }
    
    try {
      logger.info('Connecting to Redis...');
      this.client = Redis.createClient(this.options);
      
      // Set up event handlers
      this.client.on('error', (err) => {
        logger.error('Redis error:', err);
      });
      
      this.client.on('connect', () => {
        logger.info('Connected to Redis successfully');
      });
      
      this.client.on('reconnecting', () => {
        logger.info('Reconnecting to Redis...');
      });
      
      await this.client.connect();
      return this.client;
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      logger.warn('Application will continue without Redis functionality');
      return null;
    }
  }
  
  /**
   * Close the Redis connection
   * @returns {Promise<void>}
   */
  async close() {
    if (this.client && this.client.isOpen) {
      await this.client.quit();
      this.client = null;
      logger.info('Redis connection closed');
    }
  }
  
  /**
   * Check if Redis is connected
   * @returns {boolean} True if connected
   */
  isConnected() {
    return this.client && this.client.isOpen;
  }
  
  /**
   * Get a value from Redis
   * @param {string} key - Cache key
   * @returns {Promise<any>} The cached value or null
   */
  async get(key) {
    try {
      if (!this.isConnected()) {
        logger.warn('Redis not connected, cannot get value');
        return null;
      }
      
      const value = await this.client.get(key);
      if (value === null) {
        return null;
      }
      
      // Try to parse as JSON, return raw string if not valid JSON
      try {
        return JSON.parse(value);
      } catch (e) {
        return value;
      }
    } catch (error) {
      logger.error(`Error getting Redis value for key ${key}:`, error);
      return null;
    }
  }
  
  /**
   * Set a value in Redis
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {object} options - Additional options (e.g. TTL)
   * @returns {Promise<boolean>} True if successful
   */
  async set(key, value, options = {}) {
    try {
      if (!this.isConnected()) {
        logger.warn('Redis not connected, cannot set value');
        return false;
      }
      
      // Serialize value if it's not a string
      const serializedValue = typeof value === 'string' 
        ? value 
        : JSON.stringify(value);
      
      // Set with expiration if provided
      if (options.ttl) {
        await this.client.set(key, serializedValue, { EX: options.ttl });
      } else {
        await this.client.set(key, serializedValue);
      }
      
      return true;
    } catch (error) {
      logger.error(`Error setting Redis value for key ${key}:`, error);
      return false;
    }
  }
  
  /**
   * Delete a value from Redis
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} True if successful
   */
  async delete(key) {
    try {
      if (!this.isConnected()) {
        logger.warn('Redis not connected, cannot delete value');
        return false;
      }
      
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error(`Error deleting Redis value for key ${key}:`, error);
      return false;
    }
  }
  
  /**
   * Clear all values from Redis
   * @returns {Promise<boolean>} True if successful
   */
  async clear() {
    try {
      if (!this.isConnected()) {
        logger.warn('Redis not connected, cannot clear cache');
        return false;
      }
      
      await this.client.flushAll();
      return true;
    } catch (error) {
      logger.error('Error clearing Redis cache:', error);
      return false;
    }
  }
  
  /**
   * Get multiple values from Redis
   * @param {string[]} keys - Cache keys
   * @returns {Promise<Map<string, any>>} Map of key-value pairs
   */
  async getMany(keys) {
    try {
      if (!this.isConnected() || !keys.length) {
        return new Map();
      }
      
      const values = await this.client.mGet(keys);
      const result = new Map();
      
      keys.forEach((key, i) => {
        const value = values[i];
        if (value !== null) {
          try {
            result.set(key, JSON.parse(value));
          } catch (e) {
            result.set(key, value);
          }
        }
      });
      
      return result;
    } catch (error) {
      logger.error('Error getting multiple Redis values:', error);
      return new Map();
    }
  }
  
  /**
   * Set multiple values in Redis
   * @param {Map<string, any>} items - Map of key-value pairs
   * @param {object} options - Additional options (e.g. TTL)
   * @returns {Promise<boolean>} True if successful
   */
  async setMany(items, options = {}) {
    try {
      if (!this.isConnected()) {
        return false;
      }
      
      const multi = this.client.multi();
      
      for (const [key, value] of items.entries()) {
        const serializedValue = typeof value === 'string' 
          ? value 
          : JSON.stringify(value);
        
        if (options.ttl) {
          multi.set(key, serializedValue, { EX: options.ttl });
        } else {
          multi.set(key, serializedValue);
        }
      }
      
      await multi.exec();
      return true;
    } catch (error) {
      logger.error('Error setting multiple Redis values:', error);
      return false;
    }
  }
  
  /**
   * Delete multiple values from Redis
   * @param {string[]} keys - Cache keys
   * @returns {Promise<boolean>} True if successful
   */
  async deleteMany(keys) {
    try {
      if (!this.isConnected() || !keys.length) {
        return false;
      }
      
      await this.client.del(keys);
      return true;
    } catch (error) {
      logger.error('Error deleting multiple Redis values:', error);
      return false;
    }
  }
}

// Create and export singleton instance
const redisCache = new RedisProvider();

module.exports = redisCache;
