// src/core/http/router.js
const express = require('express');
const { responseHelpers } = require('./response');
const middleware = require('./middleware');

/**
 * Route builder to simplify route definition
 */
class RouteBuilder {
  /**
   * Create a new route builder
   * @param {string} prefix - Route prefix
   */
  constructor(prefix = '') {
    this.router = express.Router();
    this.prefix = prefix;
    
    // Add response helpers by default
    this.router.use(responseHelpers);
  }
  
  /**
   * Add a middleware to the router
   * @param {function} middleware - Express middleware
   * @returns {RouteBuilder} this for chaining
   */
  use(middleware) {
    this.router.use(middleware);
    return this;
  }
  
  /**
   * Define a GET route
   * @param {string} path - Route path
   * @param {function[]} handlers - Route handlers
   * @returns {RouteBuilder} this for chaining
   */
  get(path, ...handlers) {
    this.router.get(this._resolvePath(path), handlers);
    return this;
  }
  
  /**
   * Define a POST route
   * @param {string} path - Route path
   * @param {function[]} handlers - Route handlers
   * @returns {RouteBuilder} this for chaining
   */
  post(path, ...handlers) {
    this.router.post(this._resolvePath(path), handlers);
    return this;
  }
  
  /**
   * Define a PUT route
   * @param {string} path - Route path
   * @param {function[]} handlers - Route handlers
   * @returns {RouteBuilder} this for chaining
   */
  put(path, ...handlers) {
    this.router.put(this._resolvePath(path), handlers);
    return this;
  }
  
  /**
   * Define a PATCH route
   * @param {string} path - Route path
   * @param {function[]} handlers - Route handlers
   * @returns {RouteBuilder} this for chaining
   */
  patch(path, ...handlers) {
    this.router.patch(this._resolvePath(path), handlers);
    return this;
  }
  
  /**
   * Define a DELETE route
   * @param {string} path - Route path
   * @param {function[]} handlers - Route handlers
   * @returns {RouteBuilder} this for chaining
   */
  delete(path, ...handlers) {
    this.router.delete(this._resolvePath(path), handlers);
    return this;
  }
  
  /**
   * Define a resource with CRUD routes
   * @param {string} path - Resource path
   * @param {object} controller - Resource controller
   * @param {object} options - Resource options
   * @returns {RouteBuilder} this for chaining
   */
  resource(path, controller, options = {}) {
    const resourcePath = this._resolvePath(path);
    const idParam = options.idParam || 'id';
    const idPath = `${resourcePath}/:${idParam}`;
    
    // GET /resource - List
    if (controller.list && options.list !== false) {
      this.router.get(resourcePath, controller.list);
    }
    
    // POST /resource - Create
    if (controller.create && options.create !== false) {
      this.router.post(resourcePath, controller.create);
    }
    
    // GET /resource/:id - Get one
    if (controller.get && options.get !== false) {
      this.router.get(idPath, controller.get);
    }
    
    // PUT /resource/:id - Update
    if (controller.update && options.update !== false) {
      this.router.put(idPath, controller.update);
    }
    
    // PATCH /resource/:id - Partial update
    if (controller.patch && options.patch !== false) {
      this.router.patch(idPath, controller.patch);
    }
    
    // DELETE /resource/:id - Delete
    if (controller.delete && options.delete !== false) {
      this.router.delete(idPath, controller.delete);
    }
    
    return this;
  }
  
  /**
   * Add validation middleware to the router
   * @param {object} schema - Validation schema
   * @param {string} location - Request property to validate
   * @returns {function} Validation middleware
   */
  validate(schema, location = 'body') {
    return middleware.validate(schema, location);
  }
  
  /**
   * Create a router group with shared middleware
   * @param {string} prefix - Group prefix
   * @param {function[]} middleware - Shared middleware
   * @param {function} callback - Group definition callback
   * @returns {RouteBuilder} this for chaining
   */
  group(prefix, middleware, callback) {
    const groupRouter = express.Router();
    
    // Apply middleware to the group
    if (Array.isArray(middleware)) {
      middleware.forEach(mw => groupRouter.use(mw));
    } else if (typeof middleware === 'function') {
      groupRouter.use(middleware);
    }
    
    // Create a new route builder for the group
    const groupBuilder = new RouteBuilder();
    groupBuilder.router = groupRouter;
    
    // Call the callback with the group builder
    callback(groupBuilder);
    
    // Mount the group router
    this.router.use(this._resolvePath(prefix), groupRouter);
    
    return this;
  }
  
  /**
   * Get the express router
   * @returns {express.Router} Express router
   */
  getRouter() {
    return this.router;
  }
  
  /**
   * Resolve a path with the prefix
   * @param {string} path - Path to resolve
   * @returns {string} Resolved path
   * @private
   */
  _resolvePath(path) {
    // Remove trailing slash from prefix
    const prefix = this.prefix.endsWith('/') 
      ? this.prefix.slice(0, -1) 
      : this.prefix;
    
    // Add leading slash to path if needed
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    
    return prefix ? `${prefix}${normalizedPath}` : normalizedPath;
  }
}

/**
 * Create a new route builder
 * @param {string} prefix - Route prefix
 * @returns {RouteBuilder} Route builder instance
 */
function createRouter(prefix = '') {
  return new RouteBuilder(prefix);
}

module.exports = {
  RouteBuilder,
  createRouter
};
