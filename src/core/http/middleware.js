// src/core/http/middleware.js
const logger = require('../logging');

/**
 * Collection of common HTTP middleware functions
 */
const middleware = {
  /**
   * Error handling middleware
   * @param {Error} err - Error object
   * @param {object} req - Express request
   * @param {object} res - Express response
   * @param {function} next - Express next function
   */
  errorHandler: (err, req, res, next) => {
    logger.error('Request error:', err);
    
    // Handle validation errors
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Validation Error',
        details: err.details || err.message
      });
    }
    
    // Handle not found errors
    if (err.name === 'NotFoundError') {
      return res.status(404).json({
        error: 'Not Found',
        message: err.message
      });
    }
    
    // Handle unauthorized errors
    if (err.name === 'UnauthorizedError') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: err.message
      });
    }
    
    // Handle forbidden errors
    if (err.name === 'ForbiddenError') {
      return res.status(403).json({
        error: 'Forbidden',
        message: err.message
      });
    }
    
    // Default server error
    res.status(500).json({
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'production' 
        ? 'An unexpected error occurred' 
        : err.message
    });
  },
  
  /**
   * Request logging middleware
   * @param {object} req - Express request
   * @param {object} res - Express response
   * @param {function} next - Express next function
   */
  requestLogger: (req, res, next) => {
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
  },
  
  /**
   * CORS middleware with configurable options
   * @param {object} options - CORS options
   * @returns {function} Express middleware
   */
  cors: (options = {}) => {
    return (req, res, next) => {
      const origin = options.origin || '*';
      const methods = options.methods || 'GET,HEAD,PUT,PATCH,POST,DELETE';
      const allowedHeaders = options.allowedHeaders || 'Content-Type,Authorization';
      
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', methods);
      res.setHeader('Access-Control-Allow-Headers', allowedHeaders);
      
      // Handle preflight requests
      if (req.method === 'OPTIONS') {
        return res.status(204).end();
      }
      
      next();
    };
  },
  
  /**
   * JSON body parser middleware
   * @param {object} options - Body parser options
   * @returns {function} Express middleware
   */
  jsonParser: (options = {}) => {
    return (req, res, next) => {
      if (!req.is('application/json')) {
        return next();
      }
      
      let body = '';
      
      req.on('data', chunk => {
        body += chunk.toString();
      });
      
      req.on('end', () => {
        try {
          req.body = body ? JSON.parse(body) : {};
          next();
        } catch (error) {
          next({
            name: 'ValidationError',
            message: 'Invalid JSON payload',
            details: error.message
          });
        }
      });
    };
  },
  
  /**
   * Request validation middleware using schema
   * @param {object} schema - Validation schema
   * @param {string} location - Request property to validate (body, query, params)
   * @returns {function} Express middleware
   */
  validate: (schema, location = 'body') => {
    return (req, res, next) => {
      try {
        const data = req[location];
        
        // Simple validation without a library
        const errors = [];
        
        for (const [field, rules] of Object.entries(schema)) {
          const value = data[field];
          
          // Required check
          if (rules.required && (value === undefined || value === null || value === '')) {
            errors.push(`${field} is required`);
            continue;
          }
          
          // Skip other validations if the field is not present
          if (value === undefined || value === null) {
            continue;
          }
          
          // Type check
          if (rules.type) {
            const type = typeof value;
            if (rules.type === 'array' && !Array.isArray(value)) {
              errors.push(`${field} must be an array`);
            } else if (rules.type !== 'array' && type !== rules.type) {
              errors.push(`${field} must be a ${rules.type}`);
            }
          }
          
          // Min/max checks for numbers
          if (rules.type === 'number') {
            if (rules.min !== undefined && value < rules.min) {
              errors.push(`${field} must be at least ${rules.min}`);
            }
            if (rules.max !== undefined && value > rules.max) {
              errors.push(`${field} must be at most ${rules.max}`);
            }
          }
          
          // Min/max length checks for strings
          if (rules.type === 'string') {
            if (rules.minLength !== undefined && value.length < rules.minLength) {
              errors.push(`${field} must be at least ${rules.minLength} characters`);
            }
            if (rules.maxLength !== undefined && value.length > rules.maxLength) {
              errors.push(`${field} must be at most ${rules.maxLength} characters`);
            }
          }
          
          // Pattern check for strings
          if (rules.type === 'string' && rules.pattern) {
            const regex = new RegExp(rules.pattern);
            if (!regex.test(value)) {
              errors.push(`${field} has an invalid format`);
            }
          }
          
          // Custom validation function
          if (rules.validate && typeof rules.validate === 'function') {
            try {
              const valid = rules.validate(value);
              if (!valid) {
                errors.push(`${field} is invalid`);
              }
            } catch (error) {
              errors.push(`${field} validation error: ${error.message}`);
            }
          }
        }
        
        if (errors.length > 0) {
          return next({
            name: 'ValidationError',
            message: 'Validation failed',
            details: errors
          });
        }
        
        next();
      } catch (error) {
        next({
          name: 'ValidationError',
          message: 'Validation error',
          details: [error.message]
        });
      }
    };
  }
};

module.exports = middleware;
