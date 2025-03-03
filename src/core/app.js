// src/core/app.js
const logger = require('./logging');
const configManager = require('./config/manager');
const vaultProvider = require('./config/vault');
const HttpServer = require('./http/server');
const { createWebSocketServer } = require('./websocket');
const dbConnection = require('./database/connection');
const cacheManager = require('./cache');
const queueManager = require('./queue');
const workerManager = require('./worker/manager');
const metricsManager = require('./monitoring/metrics');
const { metricsMiddleware, metricsEndpoint } = require('./monitoring/middleware');
const { moduleManager } = require('./module');

/**
 * Main application class
 * Initializes and manages all components
 */
class Application {
  /**
   * Create a new application instance
   * @param {object} options - Application options
   */
  constructor(options = {}) {
    this.options = {
      name: process.env.APP_NAME || 'server-starter',
      version: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      ...options
    };
    
    this.services = {
      config: configManager,
      logger,
      http: null,
      database: dbConnection,
      cache: cacheManager,
      queue: queueManager,
      websocket: null,
      workers: workerManager,
      metrics: metricsManager,
      modules: moduleManager
    };
    
    this.initialized = false;
    this.running = false;
  }
  
  /**
   * Register application module
   * @param {Module} module - Module instance
   * @returns {Application} this for chaining
   */
  registerModule(module) {
    this.services.modules.register(module);
    return this;
  }
  
  /**
   * Initialize the application
   * @returns {Promise<Application>} this for chaining
   */
  async initialize() {
    if (this.initialized) {
      logger.warn('Application already initialized');
      return this;
    }
    
    logger.info(`Initializing ${this.options.name} v${this.options.version} (${this.options.environment})`);
    
    try {
      // Register Vault configuration provider
      configManager.registerProvider(vaultProvider);
      
      // Initialize configuration
      await configManager.initialize();
      
      // Initialize metrics
      metricsManager.updateAppVersionMetric(
        this.options.version,
        this.options.commit || 'unknown',
        this.options.environment
      );
      
      metricsManager.startUptimeMetric();
      metricsManager.startEventLoopMetric();
      
      // Initialize database connection
      await dbConnection.testConnection();
      
      // Initialize cache manager
      await cacheManager.initialize();
      
      // Initialize queue manager
      await queueManager.initialize();
      
      // Create HTTP server
      this.services.http = new HttpServer({
        port: configManager.get('server.port', 3003),
        host: configManager.get('server.host', '0.0.0.0')
      });
      
      // Add metrics middleware
      this.services.http.use(metricsMiddleware());
      this.services.http.use(metricsEndpoint());
      
      // Create WebSocket server
      this.services.websocket = createWebSocketServer(null, {
        cors: {
          origin: configManager.get('server.cors.origin', '*'),
          methods: configManager.get('server.cors.methods', ['GET', 'POST'])
        }
      });
      
      // Initialize modules
      await this.services.modules.initializeModules(this);
      
      this.initialized = true;
      logger.info('Application initialized successfully');
      
      return this;
    } catch (error) {
      logger.error('Error initializing application:', error);
      throw error;
    }
  }
  
  /**
   * Configure application routes and middleware
   * @returns {Promise<Application>} this for chaining
   */
  async configure() {
    if (!this.initialized) {
      throw new Error('Application not initialized');
    }
    
    logger.info('Configuring application routes and middleware');
    
    try {
      // Configure modules
      await this.services.modules.configureModules(this);
      
      logger.info('Application configured successfully');
      
      return this;
    } catch (error) {
      logger.error('Error configuring application:', error);
      throw error;
    }
  }
  
  /**
   * Start the application
   * @returns {Promise<Application>} this for chaining
   */
  async start() {
    if (this.running) {
      logger.warn('Application already running');
      return this;
    }
    
    if (!this.initialized) {
      await this.initialize();
    }
    
    logger.info('Starting application');
    
    try {
      // Configure application
      await this.configure();
      
      // Start HTTP server
      const server = await this.services.http.start();
      
      // Attach WebSocket server
      this.services.websocket.attach(server);
      
      // Start background workers
      await workerManager.startAll();
      
      // Start modules
      await this.services.modules.startModules(this);
      
      this.running = true;
      logger.info(`Application started successfully on ${configManager.get('server.host', '0.0.0.0')}:${configManager.get('server.port', 3003)}`);
      
      return this;
    } catch (error) {
      logger.error('Error starting application:', error);
      throw error;
    }
  }
  
  /**
   * Stop the application
   * @returns {Promise<Application>} this for chaining
   */
  async stop() {
    if (!this.running) {
      logger.warn('Application not running');
      return this;
    }
    
    logger.info('Stopping application');
    
    try {
      // Stop modules
      await this.services.modules.stopModules(this);
      
      // Stop background workers
      await workerManager.stopAll();
      
      // Stop WebSocket server
      await this.services.websocket.close();
      
      // Stop HTTP server
      await this.services.http.stop();
      
      // Close queue connections
      await queueManager.close();
      
      // Close cache connections
      await cacheManager.close();
      
      // Close database connection
      await dbConnection.close();
      
      this.running = false;
      logger.info('Application stopped successfully');
      
      return this;
    } catch (error) {
      logger.error('Error stopping application:', error);
      throw error;
    }
  }
  
  /**
   * Get a service by name
   * @param {string} name - Service name
   * @returns {object} Service instance
   */
  getService(name) {
    return this.services[name];
  }
  
  /**
   * Get a module by name
   * @param {string} name - Module name
   * @returns {Module} Module instance
   */
  getModule(name) {
    return this.services.modules.getModule(name);
  }
}

module.exports = Application;
