// src/core/websocket/client.js
const { maybeDecompress } = require('../utils/compression');

/**
 * WebSocket client helper for browser use
 * This is meant to be bundled for browser clients
 */
class WebSocketClient {
  /**
   * Create a new WebSocket client
   * @param {object} options - Client options
   */
  constructor(options = {}) {
    this.options = {
      url: options.url || window.location.origin,
      autoConnect: options.autoConnect !== false,
      reconnection: options.reconnection !== false,
      reconnectionDelay: options.reconnectionDelay || 1000,
      reconnectionAttempts: options.reconnectionAttempts || 5,
      auth: options.auth || {},
      path: options.path || '/socket.io',
      ...options
    };
    
    this.socket = null;
    this.connected = false;
    this.reconnecting = false;
    this.reconnectionAttempts = 0;
    this.handlers = new Map();
    
    // Auto-connect if configured
    if (this.options.autoConnect) {
      this.connect();
    }
  }
  
  /**
   * Connect to the WebSocket server
   * @returns {Promise<void>}
   */
  connect() {
    return new Promise((resolve, reject) => {
      if (this.socket) {
        if (this.connected) {
          resolve();
          return;
        }
        
        // If socket exists but not connected, disconnect first
        this.socket.disconnect();
        this.socket = null;
      }
      
      try {
        // Load Socket.IO client
        if (!window.io) {
          reject(new Error('Socket.IO client not found. Make sure to include socket.io.js in your HTML.'));
          return;
        }
        
        // Create socket
        this.socket = window.io(this.options.url, {
          reconnection: this.options.reconnection,
          reconnectionDelay: this.options.reconnectionDelay,
          reconnectionAttempts: this.options.reconnectionAttempts,
          auth: this.options.auth,
          path: this.options.path
        });
        
        // Set up event handlers
        this.socket.on('connect', () => {
          this.connected = true;
          this.reconnecting = false;
          this.reconnectionAttempts = 0;
          
          // Call handler if registered
          this._triggerHandler('connect');
          
          resolve();
        });
        
        this.socket.on('disconnect', (reason) => {
          this.connected = false;
          
          // Call handler if registered
          this._triggerHandler('disconnect', reason);
        });
        
        this.socket.on('connect_error', (error) => {
          this.connected = false;
          
          // Increment reconnection attempts
          this.reconnectionAttempts++;
          
          // Call handler if registered
          this._triggerHandler('connect_error', error);
          
          if (this.reconnectionAttempts === 1) {
            reject(error);
          }
        });
        
        this.socket.on('reconnecting', (attemptNumber) => {
          this.reconnecting = true;
          
          // Call handler if registered
          this._triggerHandler('reconnecting', attemptNumber);
        });
        
        this.socket.on('reconnect', (attemptNumber) => {
          this.connected = true;
          this.reconnecting = false;
          this.reconnectionAttempts = 0;
          
          // Call handler if registered
          this._triggerHandler('reconnect', attemptNumber);
        });
        
        this.socket.on('reconnect_failed', () => {
          this.reconnecting = false;
          
          // Call handler if registered
          this._triggerHandler('reconnect_failed');
        });
        
        // Set up existing event handlers
        this.handlers.forEach((handler, event) => {
          if (event !== 'connect' && event !== 'disconnect' && 
              event !== 'connect_error' && event !== 'reconnecting' && 
              event !== 'reconnect' && event !== 'reconnect_failed') {
            this.socket.on(event, async (...args) => {
              // Check for compressed messages
              const payload = args[0];
              
              if (payload && payload.metadata) {
                try {
                  // Decompress if needed
                  const data = await this._processPayload(payload);
                  handler(data, ...args.slice(1));
                } catch (error) {
                  console.error(`Error processing WebSocket payload for event ${event}:`, error);
                }
              } else {
                // Not a compressed message, pass through
                handler(...args);
              }
            });
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }
  
  /**
   * Process a WebSocket payload
   * @param {object} payload - WebSocket payload
   * @returns {Promise<any>} Processed data
   * @private
   */
  async _processPayload(payload) {
    // Handle compressed data
    if (payload.metadata && payload.metadata.compressed) {
      // Convert base64 to binary if needed
      let data = payload.data;
      
      if (typeof data === 'string' && payload.metadata.compressed) {
        // Decode base64
        const binaryString = atob(data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        data = bytes.buffer;
      }
      
      // Decompress data
      const result = await this._decompressData({
        data, 
        metadata: payload.metadata
      });
      
      return result;
    }
    
    // Not compressed, return as is
    return payload.data;
  }
  
  /**
   * Decompress data using available methods
   * @param {object} package - Data package
   * @returns {Promise<any>} Decompressed data
   * @private
   */
  async _decompressData(package) {
    // If maybeDecompress is available (included in bundle), use it
    if (typeof maybeDecompress === 'function') {
      return maybeDecompress(package);
    }
    
    // Otherwise, try to use browser's decompression API if available
    if (window.CompressionStream) {
      const { data, metadata } = package;
      
      // Create a new readable stream from the compressed data
      const compressedStream = new ReadableStream({
        start(controller) {
          controller.enqueue(data);
          controller.close();
        }
      });
      
      // Create decompression stream
      const decompressStream = compressedStream.pipeThrough(
        new DecompressionStream('gzip')
      );
      
      // Read the decompressed data
      const reader = decompressStream.getReader();
      const chunks = [];
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      
      // Combine chunks
      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }
      
      // Convert to original format
      if (metadata.originalType === 'string') {
        return new TextDecoder().decode(result);
      } else if (metadata.originalType === 'object') {
        return JSON.parse(new TextDecoder().decode(result));
      }
      
      return result;
    }
    
    // If no decompression method is available, return the data as is
    console.warn('No decompression method available');
    return package.data;
  }
  
  /**
   * Register an event handler
   * @param {string} event - Event name
   * @param {function} handler - Event handler
   * @returns {WebSocketClient} this for chaining
   */
  on(event, handler) {
    this.handlers.set(event, handler);
    
    // If already connected, add handler to socket
    if (this.socket) {
      if (event !== 'connect' && event !== 'disconnect' && 
          event !== 'connect_error' && event !== 'reconnecting' && 
          event !== 'reconnect' && event !== 'reconnect_failed') {
        this.socket.on(event, async (...args) => {
          // Check for compressed messages
          const payload = args[0];
          
          if (payload && payload.metadata) {
            try {
              // Decompress if needed
              const data = await this._processPayload(payload);
              handler(data, ...args.slice(1));
            } catch (error) {
              console.error(`Error processing WebSocket payload for event ${event}:`, error);
            }
          } else {
            // Not a compressed message, pass through
            handler(...args);
          }
        });
      }
    }
    
    return this;
  }
  
  /**
   * Trigger a handler for an event
   * @param {string} event - Event name
   * @param  {...any} args - Event arguments
   * @private
   */
  _triggerHandler(event, ...args) {
    const handler = this.handlers.get(event);
    
    if (handler) {
      handler(...args);
    }
  }
  
  /**
   * Emit an event to the server
   * @param {string} event - Event name
   * @param {any} data - Event data
   * @returns {WebSocketClient} this for chaining
   */
  emit(event, data) {
    if (!this.socket || !this.connected) {
      console.warn('Cannot emit event, not connected');
      return this;
    }
    
    this.socket.emit(event, data);
    return this;
  }
  
  /**
   * Disconnect from the server
   * @returns {WebSocketClient} this for chaining
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.connected = false;
    }
    
    return this;
  }
  
  /**
   * Get connection status
   * @returns {boolean} True if connected
   */
  isConnected() {
    return this.connected;
  }
  
  /**
   * Get reconnection status
   * @returns {boolean} True if reconnecting
   */
  isReconnecting() {
    return this.reconnecting;
  }
  
  /**
   * Get the Socket.IO client instance
   * @returns {SocketIOClient.Socket} Socket.IO client
   */
  getSocket() {
    return this.socket;
  }
}

// Export for browser use
if (typeof window !== 'undefined') {
  window.WebSocketClient = WebSocketClient;
}

module.exports = WebSocketClient;
