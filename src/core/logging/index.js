// src/core/logging/index.js
const winston = require('winston');

/**
 * Logger factory to create configured Winston loggers
 */
class Logger {
  constructor() {
    this.defaultLogger = this.createLogger();
    this.loggers = new Map();
  }
  
  /**
   * Create a Winston logger with standard configuration
   * @param {string} name - Logger name/category
   * @param {object} options - Additional logger options
   * @returns {winston.Logger} Configured logger instance
   */
  createLogger(name = 'default', options = {}) {
    // Default configuration
    const config = {
      level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      defaultMeta: { 
        service: process.env.SERVICE_NAME || 'server-starter',
        ...(name !== 'default' ? { category: name } : {})
      },
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        }),
      ],
      ...options
    };
    
    // Add file transport in production
    if (process.env.NODE_ENV === 'production' && process.env.LOG_FILE) {
      config.transports.push(
        new winston.transports.File({ 
          filename: process.env.LOG_FILE,
          maxsize: 10485760, // 10MB
          maxFiles: 5,
          tailable: true
        })
      );
    }
    
    return winston.createLogger(config);
  }
  
  /**
   * Get a logger by name, creating it if it doesn't exist
   * @param {string} name - Logger name/category
   * @returns {winston.Logger} The requested logger
   */
  getLogger(name) {
    if (!name || name === 'default') {
      return this.defaultLogger;
    }
    
    if (!this.loggers.has(name)) {
      this.loggers.set(name, this.createLogger(name));
    }
    
    return this.loggers.get(name);
  }
  
  /**
   * Log at error level
   */
  error(...args) {
    this.defaultLogger.error(...args);
  }
  
  /**
   * Log at warn level
   */
  warn(...args) {
    this.defaultLogger.warn(...args);
  }
  
  /**
   * Log at info level
   */
  info(...args) {
    this.defaultLogger.info(...args);
  }
  
  /**
   * Log at debug level
   */
  debug(...args) {
    this.defaultLogger.debug(...args);
  }
  
  /**
   * Add a custom transport to all loggers
   * @param {winston.transport} transport - Winston transport to add
   */
  addTransport(transport) {
    this.defaultLogger.add(transport);
    this.loggers.forEach(logger => logger.add(transport));
  }
}

// Export singleton instance
const logger = new Logger();
module.exports = logger;
