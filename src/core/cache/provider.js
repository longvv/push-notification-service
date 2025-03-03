// src/core/cache/provider.js

/**
 * Abstract cache provider interface
 * All cache implementations should extend this class
 */
class CacheProvider {
  /**
   * Initialize the cache provider
   * @returns {Promise<void>}
   */
  async initialize() {
    throw new Error('Method not implemented');
  }
  
  /**
   * Close the cache connection
   * @returns {Promise<void>}
   */
  async close() {
    throw new Error('Method not implemented');
  }
  
  /**
   * Check if the cache is connected and ready
   * @returns {boolean} True if connected
   */
  isConnected() {
    throw new Error('Method not implemented');
  }
  
  /**
   * Get a value from the cache
   * @param {string} key - Cache key
   * @returns {Promise<any>} The cached value or null if not found
   */
  async get(key) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Set a value in the cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {object} options - Additional options (e.g. TTL)
   * @returns {Promise<boolean>} True if successful
   */
  async set(key, value, options = {}) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Delete a value from the cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} True if successful
   */
  async delete(key) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Clear all values from the cache
   * @returns {Promise<boolean>} True if successful
   */
  async clear() {
    throw new Error('Method not implemented');
  }
  
  /**
   * Get multiple values from the cache
   * @param {string[]} keys - Cache keys
   * @returns {Promise<Map<string, any>>} Map of key-value pairs
   */
  async getMany(keys) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Set multiple values in the cache
   * @param {Map<string, any>} items - Map of key-value pairs
   * @param {object} options - Additional options (e.g. TTL)
   * @returns {Promise<boolean>} True if successful
   */
  async setMany(items, options = {}) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Delete multiple values from the cache
   * @param {string[]} keys - Cache keys
   * @returns {Promise<boolean>} True if successful
   */
  async deleteMany(keys) {
    throw new Error('Method not implemented');
  }
}

module.exports = CacheProvider;
