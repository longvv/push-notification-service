// src/core/websocket/auth.js
const logger = require('../logging');
const cacheManager = require('../cache');

/**
 * Create authentication middleware for WebSockets
 * @param {object} options - Authentication options
 * @returns {function} Socket.IO middleware
 */
function createAuthMiddleware(options = {}) {
  const defaultOptions = {
    required: true,
    headerName: 'Authorization',
    tokenType: 'Bearer',
    userIdField: 'userId',
    cacheProvider: null,
    authenticator: null,
    ...options
  };
  
  return async (socket, next) => {
    try {
      // Get authorization header from handshake
      const authHeader = socket.handshake.headers[defaultOptions.headerName.toLowerCase()];
      
      // If auth is required but no header, reject
      if (defaultOptions.required && !authHeader) {
        return next(new Error('Authentication required'));
      }
      
      // If no header and not required, continue
      if (!authHeader) {
        return next();
      }
      
      // Parse token
      let token;
      if (defaultOptions.tokenType) {
        // Check token type if specified
        if (!authHeader.startsWith(`${defaultOptions.tokenType} `)) {
          return next(new Error(`Invalid token type, expected ${defaultOptions.tokenType}`));
        }
        
        token = authHeader.substring(defaultOptions.tokenType.length + 1);
      } else {
        token = authHeader;
      }
      
      // Check token in cache first if cache provider is specified
      let user = null;
      if (defaultOptions.cacheProvider) {
        const cacheKey = `ws:auth:${token}`;
        user = await cacheManager.get(cacheKey, defaultOptions.cacheProvider);
      }
      
      // If not in cache and authenticator provided, authenticate
      if (!user && typeof defaultOptions.authenticator === 'function') {
        try {
          user = await defaultOptions.authenticator(token, socket);
          
          // Store in cache if cache provider is specified
          if (user && defaultOptions.cacheProvider) {
            const cacheKey = `ws:auth:${token}`;
            await cacheManager.set(cacheKey, user, { ttl: 3600 }, defaultOptions.cacheProvider);
          }
        } catch (authError) {
          logger.error('WebSocket authentication error:', authError);
          return next(new Error('Authentication failed'));
        }
      }
      
      // If auth is required but no user, reject
      if (defaultOptions.required && !user) {
        return next(new Error('Authentication failed'));
      }
      
      // Set user data on socket
      if (user) {
        socket.user = user;
        
        // Set user ID if available
        if (user[defaultOptions.userIdField]) {
          socket[defaultOptions.userIdField] = user[defaultOptions.userIdField];
        }
      }
      
      next();
    } catch (error) {
      logger.error('Error in WebSocket auth middleware:', error);
      next(new Error('Internal server error'));
    }
  };
}

module.exports = { createAuthMiddleware };
