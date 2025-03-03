// src/core/module/manager.js
const logger = require('../logging');
const Module = require('./base');

/**
 * Module manager to handle module registration and lifecycle
 */
class ModuleManager {
  constructor() {
    this.modules = new Map();
    this.initialized = false;
  }
  
  /**
   * Register a module
   * @param {Module} module - Module instance
   * @returns {ModuleManager} this for chaining
   */
  register(module) {
    if (!(module instanceof Module)) {
      throw new Error('Module must be an instance of Module');
    }
    
    // Check if module already registered
    if (this.modules.has(module.name)) {
      throw new Error(`Module ${module.name} already registered`);
    }
    
    this.modules.set(module.name, module);
    logger.info(`Registered module: ${module.name}`);
    
    return this;
  }
  
  /**
   * Check if a module is registered
   * @param {string} name - Module name
   * @returns {boolean} True if registered
   */
  isRegistered(name) {
    return this.modules.has(name);
  }
  
  /**
   * Get a module by name
   * @param {string} name - Module name
   * @returns {Module} Module instance
   */
  getModule(name) {
    return this.modules.get(name);
  }
  
  /**
   * Get all registered modules
   * @returns {Map<string, Module>} Modules map
   */
  getAllModules() {
    return this.modules;
  }
  
  /**
   * Sort modules by dependencies
   * @returns {Module[]} Sorted modules
   * @private
   */
  _sortModulesByDependencies() {
    const visited = new Set();
    const visiting = new Set();
    const sorted = [];
    
    // Topological sort
    const visit = (moduleName) => {
      if (visited.has(moduleName)) {
        return;
      }
      
      if (visiting.has(moduleName)) {
        throw new Error(`Circular dependency detected in modules: ${moduleName}`);
      }
      
      visiting.add(moduleName);
      
      const module = this.modules.get(moduleName);
      
      // Process dependencies
      for (const dependency of module.options.dependencies) {
        if (!this.modules.has(dependency)) {
          throw new Error(`Module dependency not found: ${dependency}`);
        }
        
        visit(dependency);
      }
      
      visiting.delete(moduleName);
      visited.add(moduleName);
      sorted.push(module);
    };
    
    // Visit all modules
    for (const [name] of this.modules) {
      if (!visited.has(name)) {
        visit(name);
      }
    }
    
    return sorted;
  }
  
  /**
   * Initialize all modules
   * @param {Application} app - Application instance
   * @returns {Promise<void>}
   */
  async initializeModules(app) {
    if (this.initialized) {
      logger.warn('Modules already initialized');
      return;
    }
    
    logger.info('Initializing modules');
    
    try {
      // Sort modules by dependencies
      const modules = this._sortModulesByDependencies();
      
      // Initialize modules in order
      for (const module of modules) {
        if (module.options.enabled) {
          await module.initialize(app);
        } else {
          logger.info(`Skipping disabled module: ${module.name}`);
        }
      }
      
      this.initialized = true;
      logger.info('All modules initialized successfully');
    } catch (error) {
      logger.error('Error initializing modules:', error);
      throw error;
    }
  }
  
  /**
   * Configure all modules
   * @param {Application} app - Application instance
   * @returns {Promise<void>}
   */
  async configureModules(app) {
    if (!this.initialized) {
      throw new Error('Modules not initialized');
    }
    
    logger.info('Configuring modules');
    
    try {
      // Sort modules by dependencies
      const modules = this._sortModulesByDependencies();
      
      // Configure modules in order
      for (const module of modules) {
        if (module.options.enabled) {
          await module.configure(app);
        }
      }
      
      logger.info('All modules configured successfully');
    } catch (error) {
      logger.error('Error configuring modules:', error);
      throw error;
    }
  }
  
  /**
   * Start all modules
   * @param {Application} app - Application instance
   * @returns {Promise<void>}
   */
  async startModules(app) {
    if (!this.initialized) {
      throw new Error('Modules not initialized');
    }
    
    logger.info('Starting modules');
    
    try {
      // Sort modules by dependencies
      const modules = this._sortModulesByDependencies();
      
      // Start modules in order
      for (const module of modules) {
        if (module.options.enabled) {
          await module.start(app);
        }
      }
      
      logger.info('All modules started successfully');
    } catch (error) {
      logger.error('Error starting modules:', error);
      throw error;
    }
  }
  
  /**
   * Stop all modules
   * @param {Application} app - Application instance
   * @returns {Promise<void>}
   */
  async stopModules(app) {
    logger.info('Stopping modules');
    
    try {
      // Sort modules by dependencies (in reverse)
      const modules = this._sortModulesByDependencies().reverse();
      
      // Stop modules in reverse order
      for (const module of modules) {
        if (module.options.enabled && module.started) {
          await module.stop(app);
        }
      }
      
      this.initialized = false;
      logger.info('All modules stopped successfully');
    } catch (error) {
      logger.error('Error stopping modules:', error);
      throw error;
    }
  }
  
  /**
   * Get module status
   * @returns {object[]} Modules status
   */
  getModulesStatus() {
    const status = [];
    
    for (const [name, module] of this.modules) {
      status.push(module.getStatus());
    }
    
    return status;
  }
}

// Create and export singleton instance
const moduleManager = new ModuleManager();

module.exports = moduleManager;
