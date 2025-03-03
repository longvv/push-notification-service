// src/core/http/server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const logger = require('../logging');

/**
 * HTTP server abstraction using Express
 */
class HttpServer {
  /**
   * Create a new HTTP server
   * @param {object} options - Server options
   */
  constructor(options = {}) {
    this.options = {
      port: process.env.PORT || 3003,
      host: process.env.HOST || '0.0.0.0',
      corsOrigin: process.env.CORS_ORIGIN || '*',
      ...options
    };
    
    this.app = express();
    this.server = null;
    this.routers = new Map();
    this.middleware = [];
    this.errorHandlers = [];
    
    // Set up basic middleware
    this._setupMiddleware();
  }
  
  /**
   * Configure basic middleware
   * @private
   */
  _setupMiddleware() {
    // Security middleware
    this.app.use(helmet());
    
    // CORS middleware
    this.app.use(cors({
      origin: this.options.corsOrigin,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));
    
    // Body parser middleware
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    
    // Request logging middleware
    this.app.use((req, res, next) => {
      const start = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info({
          method: req.method,
          url: req.originalUrl,
          status: res.statusCode,
          duration,
          ip: req.ip
        });
      });
      
      next();
    });
  }
  
  /**
   * Register a middleware function
   * @param {function} middleware - Express middleware function
   * @returns {HttpServer} this for chaining
   */
  use(middleware) {
    this.middleware.push(middleware);
    return this;
  }
  
  /**
   * Register an error handler
   * @param {function} handler - Express error handler
   * @returns {HttpServer} this for chaining
   */
  useErrorHandler(handler) {
    this.errorHandlers.push(handler);
    return this;
  }
  
  /**
   * Register a router
   * @param {string} prefix - URL prefix for the router
   * @param {express.Router} router - Express router
   * @returns {HttpServer} this for chaining
   */
  registerRouter(prefix, router) {
    this.routers.set(prefix, router);
    return this;
  }
  
  /**
   * Start the HTTP server
   * @returns {Promise<http.Server>} The Node.js HTTP server
   */
  async start() {
    return new Promise((resolve, reject) => {
      try {
        // Apply registered middleware
        this.middleware.forEach(middleware => {
          this.app.use(middleware);
        });
        
        // Apply registered routers
        this.routers.forEach((router, prefix) => {
          this.app.use(prefix, router);
        });
        
        // Add 404 handler
        this.app.use((req, res) => {
          res.status(404).json({
            error: 'Not Found',
            message: `Route ${req.method} ${req.url} not found`
          });
        });
        
        // Apply registered error handlers
        this.errorHandlers.forEach(handler => {
          this.app.use(handler);
        });
        
        // Add default error handler
        if (this.errorHandlers.length === 0) {
          this.app.use((err, req, res, next) => {
            logger.error('Unhandled error:', err);
            res.status(500).json({
              error: 'Internal Server Error',
              message: process.env.NODE_ENV === 'production' 
                ? 'An unexpected error occurred' 
                : err.message
            });
          });
        }
        
        // Start the server
        this.server = this.app.listen(this.options.port, this.options.host, () => {
          logger.info(`Server running on http://${this.options.host}:${this.options.port}`);
          resolve(this.server);
        });
        
        // Handle server errors
        this.server.on('error', (err) => {
          logger.error('Server error:', err);
          reject(err);
        });
      } catch (error) {
        logger.error('Error starting server:', error);
        reject(error);
      }
    });
  }
  
  /**
   * Stop the HTTP server
   * @returns {Promise<void>}
   */
  async stop() {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        resolve();
        return;
      }
      
      this.server.close((err) => {
        if (err) {
          logger.error('Error stopping server:', err);
          reject(err);
          return;
        }
        
        logger.info('Server stopped');
        this.server = null;
        resolve();
      });
    });
  }
  
  /**
   * Get the Express app instance
   * @returns {express.Application} The Express app
   */
  getApp() {
    return this.app;
  }
  
  /**
   * Get the Node.js HTTP server
   * @returns {http.Server} The server
   */
  getServer() {
    return this.server;
  }
}

module.exports = HttpServer;
