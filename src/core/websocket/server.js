// src/core/websocket/server.js
const socketIO = require('socket.io');
const logger = require('../logging');
const { maybeCompress } = require('../utils/compression');

/**
 * WebSocket server abstraction using Socket.IO
 */
class WebSocketServer {
  /**
   * Create a new WebSocket server
   * @param {object} options - Server options
   */
  constructor(options = {}) {
    this.options = {
      cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST']
      },
      serveClient: false,
      pingInterval: 10000,
      pingTimeout: 5000,
      ...options
    };
    
    this.io = null;
    this.httpServer = null;
    this.handlers = new Map();
    this.middleware = [];
    this.namespaces = new Map();
    this.metrics = {
      connections: 0,
      messagesSent: 0,
      messagesReceived: 0,
      errors: 0
    };
    
    // Active connections by namespace
    this.activeConnections = new Map();
  }
  
  /**
   * Attach to HTTP server
   * @param {http.Server} server - HTTP server
   * @returns {WebSocketServer} this for chaining
   */
  attach(server) {
    if (this.io) {
      logger.warn('WebSocket server already attached');
      return this;
    }
    
    this.httpServer = server;
    this.io = socketIO(server, this.options);
    
    // Apply middleware
    this.middleware.forEach(middleware => {
      this.io.use(middleware);
    });
    
    // Initialize namespaces
    this.namespaces.forEach((handlers, namespace) => {
      this._setupNamespace(namespace, handlers);
    });
    
    // Set up default namespace if not already added
    if (!this.namespaces.has('/')) {
      this._setupNamespace('/', this.handlers);
    }
    
    logger.info('WebSocket server attached to HTTP server');
    
    return this;
  }
  
  /**
   * Set up a namespace with handlers
   * @param {string} namespace - Namespace path
   * @param {Map<string, Function>} handlers - Event handlers
   * @private
   */
  _setupNamespace(namespace, handlers) {
    const nsp = namespace === '/' ? this.io : this.io.of(namespace);
    
    // Initialize active connections for this namespace
    if (!this.activeConnections.has(namespace)) {
      this.activeConnections.set(namespace, new Set());
    }
    
    // Set up connection handler
    nsp.on('connection', socket => {
      this._handleConnection(socket, namespace, handlers);
    });
    
    logger.info(`WebSocket namespace ${namespace} set up`);
  }
  
  /**
   * Handle a socket connection
   * @param {Socket} socket - Socket.IO socket
   * @param {string} namespace - Namespace path
   * @param {Map<string, Function>} handlers - Event handlers
   * @private
   */
  _handleConnection(socket, namespace, handlers) {
    logger.info(`WebSocket connection established: ${socket.id} (${namespace})`);
    
    // Track connection
    this.metrics.connections++;
    this.activeConnections.get(namespace).add(socket.id);
    
    // Set up event handlers
    handlers.forEach((handler, event) => {
      socket.on(event, (...args) => {
        try {
          this.metrics.messagesReceived++;
          handler(socket, ...args);
        } catch (error) {
          this.metrics.errors++;
          logger.error(`Error in WebSocket handler for event ${event}:`, error);
        }
      });
    });
    
    // Handle disconnect
    socket.on('disconnect', reason => {
      logger.info(`WebSocket disconnected: ${socket.id} (${reason})`);
      
      // Remove from active connections
      this.activeConnections.get(namespace).delete(socket.id);
      
      // Call disconnect handler if provided
      const disconnectHandler = handlers.get('disconnect');
      if (disconnectHandler) {
        try {
          disconnectHandler(socket, reason);
        } catch (error) {
          this.metrics.errors++;
          logger.error('Error in WebSocket disconnect handler:', error);
        }
      }
    });
    
    // Call connect handler if provided
    const connectHandler = handlers.get('connect');
    if (connectHandler) {
      try {
        connectHandler(socket);
      } catch (error) {
        this.metrics.errors++;
        logger.error('Error in WebSocket connect handler:', error);
      }
    }
  }
  
  /**
   * Register an event handler
   * @param {string} event - Event name
   * @param {function} handler - Event handler
   * @param {string} namespace - Namespace (optional)
   * @returns {WebSocketServer} this for chaining
   */
  on(event, handler, namespace = '/') {
    // Get or create handlers map for namespace
    let handlers;
    if (this.namespaces.has(namespace)) {
      handlers = this.namespaces.get(namespace);
    } else {
      handlers = new Map();
      this.namespaces.set(namespace, handlers);
    }
    
    // Add handler
    handlers.set(event, handler);
    
    // If already attached, set up namespace
    if (this.io && !this.activeConnections.has(namespace)) {
      this._setupNamespace(namespace, handlers);
    }
    
    return this;
  }
  
  /**
   * Register a middleware function
   * @param {function} middleware - Socket.IO middleware
   * @returns {WebSocketServer} this for chaining
   */
  use(middleware) {
    this.middleware.push(middleware);
    
    // Apply immediately if already attached
    if (this.io) {
      this.io.use(middleware);
    }
    
    return this;
  }
  
  /**
   * Emit an event to all clients
   * @param {string} event - Event name
   * @param {any} data - Event data
   * @param {object} options - Emit options
   * @param {string} namespace - Namespace (optional)
   * @returns {boolean} True if successful
   */
  async emit(event, data, options = {}, namespace = '/') {
    if (!this.io) {
      logger.warn('WebSocket server not attached, cannot emit event');
      return false;
    }
    
    try {
      // Get namespace
      const nsp = namespace === '/' ? this.io : this.io.of(namespace);
      
      // Apply compression if configured
      const { data: messageData, metadata } = 
        options.compression !== false ? 
        await maybeCompress(data) : 
        { data, metadata: { compressed: false } };
      
      // Convert buffer to base64 if needed
      const payload = {
        data: Buffer.isBuffer(messageData) ? messageData.toString('base64') : messageData,
        metadata
      };
      
      // Emit event
      nsp.emit(event, payload);
      
      this.metrics.messagesSent++;
      return true;
    } catch (error) {
      this.metrics.errors++;
      logger.error(`Error emitting WebSocket event ${event}:`, error);
      return false;
    }
  }
  
  /**
   * Emit an event to a specific room
   * @param {string} room - Room name
   * @param {string} event - Event name
   * @param {any} data - Event data
   * @param {object} options - Emit options
   * @param {string} namespace - Namespace (optional)
   * @returns {boolean} True if successful
   */
  async emitToRoom(room, event, data, options = {}, namespace = '/') {
    if (!this.io) {
      logger.warn('WebSocket server not attached, cannot emit event');
      return false;
    }
    
    try {
      // Get namespace
      const nsp = namespace === '/' ? this.io : this.io.of(namespace);
      
      // Apply compression if configured
      const { data: messageData, metadata } = 
        options.compression !== false ? 
        await maybeCompress(data) : 
        { data, metadata: { compressed: false } };
      
      // Convert buffer to base64 if needed
      const payload = {
        data: Buffer.isBuffer(messageData) ? messageData.toString('base64') : messageData,
        metadata
      };
      
      // Emit event to room
      nsp.to(room).emit(event, payload);
      
      this.metrics.messagesSent++;
      return true;
    } catch (error) {
      this.metrics.errors++;
      logger.error(`Error emitting WebSocket event ${event} to room ${room}:`, error);
      return false;
    }
  }
  
  /**
   * Emit an event to a specific client
   * @param {string} socketId - Socket ID
   * @param {string} event - Event name
   * @param {any} data - Event data
   * @param {object} options - Emit options
   * @param {string} namespace - Namespace (optional)
   * @returns {boolean} True if successful
   */
  async emitToClient(socketId, event, data, options = {}, namespace = '/') {
    if (!this.io) {
      logger.warn('WebSocket server not attached, cannot emit event');
      return false;
    }
    
    try {
      // Get namespace
      const nsp = namespace === '/' ? this.io : this.io.of(namespace);
      
      // Get socket
      const socket = nsp.sockets.get(socketId);
      
      if (!socket) {
        logger.warn(`Socket ${socketId} not found in namespace ${namespace}`);
        return false;
      }
      
      // Apply compression if configured
      const { data: messageData, metadata } = 
        options.compression !== false ? 
        await maybeCompress(data) : 
        { data, metadata: { compressed: false } };
      
      // Convert buffer to base64 if needed
      const payload = {
        data: Buffer.isBuffer(messageData) ? messageData.toString('base64') : messageData,
        metadata
      };
      
      // Emit event to client
      socket.emit(event, payload);
      
      this.metrics.messagesSent++;
      return true;
    } catch (error) {
      this.metrics.errors++;
      logger.error(`Error emitting WebSocket event ${event} to client ${socketId}:`, error);
      return false;
    }
  }
  
  /**
   * Get active connection count
   * @param {string} namespace - Namespace (optional)
   * @returns {number} Connection count
   */
  getConnectionCount(namespace = '/') {
    if (!this.activeConnections.has(namespace)) {
      return 0;
    }
    
    return this.activeConnections.get(namespace).size;
  }
  
  /**
   * Get server metrics
   * @returns {object} Server metrics
   */
  getMetrics() {
    const connectionsByNamespace = {};
    
    this.activeConnections.forEach((connections, namespace) => {
      connectionsByNamespace[namespace] = connections.size;
    });
    
    return {
      ...this.metrics,
      activeConnections: connectionsByNamespace,
      totalActiveConnections: [...this.activeConnections.values()]
        .reduce((total, connections) => total + connections.size, 0)
    };
  }
  
  /**
   * Get the Socket.IO server instance
   * @returns {SocketIO.Server} Socket.IO server
   */
  getServer() {
    return this.io;
  }
  
  /**
   * Close the WebSocket server
   * @returns {Promise<void>}
   */
  async close() {
    if (!this.io) {
      return;
    }
    
    return new Promise((resolve, reject) => {
      this.io.close(err => {
        if (err) {
          logger.error('Error closing WebSocket server:', err);
          reject(err);
          return;
        }
        
        this.io = null;
        this.activeConnections.clear();
        logger.info('WebSocket server closed');
        resolve();
      });
    });
  }
}

module.exports = WebSocketServer;
