// src/core/module/base.js
const logger = require('../logging');

/**
 * Base Module class
 * All application modules should extend this class
 */
class Module {
  /**
   * Create a new module
   * @param {string} name - Module name
   * @param {object} options - Module options
   */
  constructor(name, options = {}) {
    this.name = name;
    this.options = {
      enabled: true,
      dependencies: [],
      ...options
    };
    
    this.initialized = false;
    this.configured = false;
    this.started = false;
    this.app = null;
  }
  
  /**
   * Initialize the module
   * @param {Application} app - Application instance
   * @returns {Promise<void>}
   */
  async initialize(app) {
    if (this.initialized) {
      logger.warn(`Module ${this.name} already initialized`);
      return;
    }
    
    if (!this.options.enabled) {
      logger.info(`Module ${this.name} is disabled, skipping initialization`);
      return;
    }
    
    this.app = app;
    
    // Check dependencies
    for (const dependency of this.options.dependencies) {
      const module = app.getModule(dependency);
      
      if (!module) {
        throw new Error(`Module ${this.name} depends on ${dependency}, but it is not registered`);
      }
      
      if (!module.initialized) {
        throw new Error(`Module ${this.name} depends on ${dependency}, but it is not initialized`);
      }
    }
    
    logger.info(`Initializing module ${this.name}`);
    
    try {
      // Call the onInitialize hook
      if (typeof this.onInitialize === 'function') {
        await this.onInitialize(app);
      }
      
      this.initialized = true;
      logger.info(`Module ${this.name} initialized successfully`);
    } catch (error) {
      logger.error(`Error initializing module ${this.name}:`, error);
      throw error;
    }
  }
  
  /**
   * Configure the module
   * @param {Application} app - Application instance
   * @returns {Promise<void>}
   */
  async configure(app) {
    if (!this.initialized) {
      throw new Error(`Module ${this.name} is not initialized`);
    }
    
    if (this.configured) {
      logger.warn(`Module ${this.name} already configured`);
      return;
    }
    
    if (!this.options.enabled) {
      logger.info(`Module ${this.name} is disabled, skipping configuration`);
      return;
    }
    
    logger.info(`Configuring module ${this.name}`);
    
    try {
      // Call the onConfigure hook
      if (typeof this.onConfigure === 'function') {
        await this.onConfigure(app);
      }
      
      this.configured = true;
      logger.info(`Module ${this.name} configured successfully`);
    } catch (error) {
      logger.error(`Error configuring module ${this.name}:`, error);
      throw error;
    }
  }
  
  /**
   * Start the module
   * @param {Application} app - Application instance
   * @returns {Promise<void>}
   */
  async start(app) {
    if (!this.initialized || !this.configured) {
      throw new Error(`Module ${this.name} is not initialized or configured`);
    }
    
    if (this.started) {
      logger.warn(`Module ${this.name} already started`);
      return;
    }
    
    if (!this.options.enabled) {
      logger.info(`Module ${this.name} is disabled, skipping start`);
      return;
    }
    
    logger.info(`Starting module ${this.name}`);
    
    try {
      // Call the onStart hook
      if (typeof this.onStart === 'function') {
        await this.onStart(app);
      }
      
      this.started = true;
      logger.info(`Module ${this.name} started successfully`);
    } catch (error) {
      logger.error(`Error starting module ${this.name}:`, error);
      throw error;
    }
  }
  
  /**
   * Stop the module
   * @param {Application} app - Application instance
   * @returns {Promise<void>}
   */
  async stop(app) {
    if (!this.started) {
      logger.warn(`Module ${this.name} not started or already stopped`);
      return;
    }
    
    logger.info(`Stopping module ${this.name}`);
    
    try {
      // Call the onStop hook
      if (typeof this.onStop === 'function') {
        await this.onStop(app);
      }
      
      this.started = false;
      logger.info(`Module ${this.name} stopped successfully`);
    } catch (error) {
      logger.error(`Error stopping module ${this.name}:`, error);
      throw error;
    }
  }
  
  /**
   * Reset the module state
   */
  reset() {
    this.initialized = false;
    this.configured = false;
    this.started = false;
    this.app = null;
  }
  
  /**
   * Get module status
   * @returns {object} Module status
   */
  getStatus() {
    return {
      name: this.name,
      enabled: this.options.enabled,
      initialized: this.initialized,
      configured: this.configured,
      started: this.started,
      dependencies: this.options.dependencies
    };
  }
}

module.exports = Module;
