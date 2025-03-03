// src/core/cache/index.js
const logger = require('../logging');
const redisProvider = require('./redis');

/**
 * Cache manager that handles multiple cache providers
 */
class CacheManager {
  constructor() {
    this.providers = new Map();
    this.defaultProvider = null;
  }
  
  /**
   * Register a cache provider
   * @param {string} name - Provider name
   * @param {CacheProvider} provider - Cache provider instance
   * @param {boolean} isDefault - Set as default provider
   * @returns {CacheManager} this for chaining
   */
  registerProvider(name, provider, isDefault = false) {
    this.providers.set(name, provider);
    
    if (isDefault || !this.defaultProvider) {
      this.defaultProvider = provider;
    }
    
    return this;
  }
  
  /**
   * Get a registered cache provider
   * @param {string} name - Provider name
   * @returns {CacheProvider} The requested provider
   */
  getProvider(name) {
    if (!name) {
      return this.defaultProvider;
    }
    
    return this.providers.get(name);
  }
  
  /**
   * Initialize all registered cache providers
   * @returns {Promise<void>}
   */
  async initialize() {
    const initPromises = [];
    
    for (const [name, provider] of this.providers.entries()) {
      logger.info(`Initializing cache provider: ${name}`);
      initPromises.push(provider.initialize());
    }
    
    await Promise.all(initPromises);
    logger.info('All cache providers initialized');
  }
  
  /**
   * Close all registered cache providers
   * @returns {Promise<void>}
   */
  async close() {
    const closePromises = [];
    
    for (const [name, provider] of this.providers.entries()) {
      logger.info(`Closing cache provider: ${name}`);
      closePromises.push(provider.close());
    }
    
    await Promise.all(closePromises);
    logger.info('All cache providers closed');
  }
  
  /**
   * Get a value from the cache
   * @param {string} key - Cache key
   * @param {string} provider - Provider name (optional)
   * @returns {Promise<any>} The cached value or null
   */
  async get(key, provider) {
    const cacheProvider = this.getProvider(provider);
    
    if (!cacheProvider) {
      logger.warn(`Cache provider not found: ${provider}`);
      return null;
    }
    
    return cacheProvider.get(key);
  }
  
  /**
   * Set a value in the cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {object} options - Additional options (e.g. TTL)
   * @param {string} provider - Provider name (optional)
   * @returns {Promise<boolean>} True if successful
   */
  async set(key, value, options = {}, provider) {
    const cacheProvider = this.getProvider(provider);
    
    if (!cacheProvider) {
      logger.warn(`Cache provider not found: ${provider}`);
      return false;
    }
    
    return cacheProvider.set(key, value, options);
  }
  
  /**
   * Delete a value from the cache
   * @param {string} key - Cache key
   * @param {string} provider - Provider name (optional)
   * @returns {Promise<boolean>} True if successful
   */
  async delete(key, provider) {
    const cacheProvider = this.getProvider(provider);
    
    if (!cacheProvider) {
      logger.warn(`Cache provider not found: ${provider}`);
      return false;
    }
    
    return cacheProvider.delete(key);
  }
  
  /**
   * Clear the cache
   * @param {string} provider - Provider name (optional)
   * @returns {Promise<boolean>} True if successful
   */
  async clear(provider) {
    const cacheProvider = this.getProvider(provider);
    
    if (!cacheProvider) {
      logger.warn(`Cache provider not found: ${provider}`);
      return false;
    }
    
    return cacheProvider.clear();
  }
}

// Create instance and register providers
const cacheManager = new CacheManager();
cacheManager.registerProvider('redis', redisProvider, true);

module.exports = cacheManager;
