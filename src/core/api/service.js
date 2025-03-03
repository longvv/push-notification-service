// src/core/api/service.js
const logger = require('../logging');

/**
 * Base Service class for business logic
 */
class Service {
  /**
   * Create a new service
   * @param {object} options - Service options
   */
  constructor(options = {}) {
    this.options = {
      cacheEnabled: true,
      cacheTTL: 3600, // 1 hour
      ...options
    };
    
    this.cache = null;
    this.cachePrefix = this.constructor.name.toLowerCase();
  }
  
  /**
   * Set the cache manager
   * @param {object} cacheManager - Cache manager instance
   * @returns {Service} this for chaining
   */
  setCache(cacheManager) {
    this.cache = cacheManager;
    return this;
  }
  
  /**
   * Generate a cache key
   * @param {string} method - Method name
   * @param {any[]} args - Method arguments
   * @returns {string} Cache key
   * @protected
   */
  _getCacheKey(method, args) {
    // Normalize arguments to create a consistent key
    const normalizedArgs = args.map(arg => {
      if (typeof arg === 'object' && arg !== null) {
        return JSON.stringify(arg);
      }
      return String(arg);
    });
    
    // Create key with service name, method name, and arguments
    return `${this.cachePrefix}:${method}:${normalizedArgs.join(':')}`;
  }
  
  /**
   * Execute a method with caching
   * @param {string} method - Method name
   * @param {function} fn - Method to execute
   * @param {any[]} args - Method arguments
   * @param {object} options - Cache options
   * @returns {Promise<any>} Method result
   * @protected
   */
  async _withCache(method, fn, args, options = {}) {
    const cacheOptions = {
      enabled: this.options.cacheEnabled,
      ttl: this.options.cacheTTL,
      ...options
    };
    
    // If cache is disabled or not available, execute directly
    if (!cacheOptions.enabled || !this.cache) {
      return fn(...args);
    }
    
    try {
      // Generate cache key
      const cacheKey = this._getCacheKey(method, args);
      
      // Try to get from cache
      const cached = await this.cache.get(cacheKey);
      
      if (cached !== null && cached !== undefined) {
        return cached;
      }
      
      // Execute method
      const result = await fn(...args);
      
      // Store in cache
      await this.cache.set(cacheKey, result, { ttl: cacheOptions.ttl });
      
      return result;
    } catch (error) {
      logger.error(`Error in cached method ${method}:`, error);
      
      // If cache fails, still execute the method
      return fn(...args);
    }
  }
  
  /**
   * Clear all cache for this service
   * @returns {Promise<boolean>} True if successful
   */
  async clearCache() {
    if (!this.cache) {
      return false;
    }
    
    try {
      // Using pattern would be better, but for simplicity
      // we'll just clear the entire cache
      await this.cache.clear();
      return true;
    } catch (error) {
      logger.error('Error clearing service cache:', error);
      return false;
    }
  }
  
  /**
   * Create a cached method
   * @param {string} methodName - Method name
   * @param {function} fn - Method implementation
   * @param {object} options - Cache options
   * @returns {function} Cached method
   */
  static cached(methodName, fn, options = {}) {
    return function(...args) {
      return this._withCache(methodName, fn.bind(this), args, options);
    };
  }
}

module.exports = Service;
