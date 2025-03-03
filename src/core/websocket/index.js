// src/core/websocket/index.js
const WebSocketServer = require('./server');
const WebSocketClient = require('./client');
const { createAuthMiddleware } = require('./auth');

/**
 * Create and configure a WebSocket server
 * @param {http.Server} httpServer - HTTP server to attach to
 * @param {object} options - WebSocket server options
 * @returns {WebSocketServer} Configured WebSocket server
 */
function createWebSocketServer(httpServer, options = {}) {
  const server = new WebSocketServer(options);
  
  if (httpServer) {
    server.attach(httpServer);
  }
  
  return server;
}

module.exports = {
  WebSocketServer,
  WebSocketClient,
  createWebSocketServer,
  createAuthMiddleware
};
