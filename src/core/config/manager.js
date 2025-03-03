// src/core/config/manager.js
const logger = require('../logging');

/**
 * Configuration manager for centralized configuration management
 */
class ConfigManager {
  constructor() {
    this.config = {};
    this.providers = [];
    this.cache = new Map();
    this.envPrefix = process.env.CONFIG_ENV_PREFIX || '';
  }
  
  /**
   * Register a configuration provider
   * @param {object} provider - Configuration provider
   * @returns {ConfigManager} this for chaining
   */
  registerProvider(provider) {
    this.providers.push(provider);
    return this;
  }
  
  /**
   * Initialize the configuration manager
   * @returns {Promise<void>}
   */
  async initialize() {
    // Load configuration from all providers
    for (const provider of this.providers) {
      try {
        if (typeof provider.getConfig === 'function') {
          const config = await provider.getConfig();
          this.merge(config);
        }
      } catch (error) {
        logger.error(`Error loading configuration from provider:`, error);
      }
    }
    
    // Load environment variables
    this.loadFromEnvironment();
    
    logger.info('Configuration manager initialized');
  }
  
  /**
   * Load configuration from environment variables
   * @private
   */
  loadFromEnvironment() {
    // Get all environment variables with the configured prefix
    const envVars = Object.keys(process.env)
      .filter(key => this.envPrefix ? key.startsWith(this.envPrefix) : true)
      .reduce((acc, key) => {
        const configKey = this.envPrefix 
          ? key.replace(this.envPrefix, '').toLowerCase() 
          : key.toLowerCase();
        
        acc[configKey] = process.env[key];
        return acc;
      }, {});
    
    // Merge with existing configuration
    this.merge(envVars);
  }
  
  /**
   * Merge configuration object with existing configuration
   * @param {object} config - Configuration object to merge
   * @private
   */
  merge(config) {
    // Deep merge objects
    for (const [key, value] of Object.entries(config)) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        this.config[key] = this.config[key] || {};
        this.merge(value);
      } else {
        this.config[key] = value;
      }
    }
    
    // Clear cache after merge
    this.cache.clear();
  }
  
  /**
   * Get a configuration value
   * @param {string} key - Configuration key (dot notation supported)
   * @param {any} defaultValue - Default value if key not found
   * @returns {any} Configuration value
   */
  get(key, defaultValue = null) {
    // Check cache first
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }
    
    // Split key by dots
    const parts = key.split('.');
    let value = this.config;
    
    // Traverse the configuration object
    for (const part of parts) {
      if (value === null || value === undefined || typeof value !== 'object') {
        value = defaultValue;
        break;
      }
      
      value = value[part];
      
      if (value === undefined) {
        value = defaultValue;
        break;
      }
    }
    
    // Cache the result
    this.cache.set(key, value);
    
    return value;
  }
  
  /**
   * Set a configuration value
   * @param {string} key - Configuration key (dot notation supported)
   * @param {any} value - Configuration value
   * @returns {ConfigManager} this for chaining
   */
  set(key, value) {
    // Split key by dots
    const parts = key.split('.');
    let current = this.config;
    
    // Traverse the configuration object
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      
      if (!current[part] || typeof current[part] !== 'object') {
        current[part] = {};
      }
      
      current = current[part];
    }
    
    // Set the value
    current[parts[parts.length - 1]] = value;
    
    // Clear cache
    this.cache.clear();
    
    return this;
  }
  
  /**
   * Check if a configuration key exists
   * @param {string} key - Configuration key (dot notation supported)
   * @returns {boolean} True if key exists
   */
  has(key) {
    return this.get(key, undefined) !== undefined;
  }
  
  /**
   * Get all configuration
   * @returns {object} All configuration
   */
  getAll() {
    return { ...this.config };
  }
  
  /**
   * Get a section of the configuration
   * @param {string} section - Section name
   * @returns {object} Section configuration
   */
  getSection(section) {
    return this.get(section, {});
  }
  
  /**
   * Reset the configuration
   * @returns {ConfigManager} this for chaining
   */
  reset() {
    this.config = {};
    this.cache.clear();
    return this;
  }
}

// Create and export singleton instance
const configManager = new ConfigManager();

module.exports = configManager;
