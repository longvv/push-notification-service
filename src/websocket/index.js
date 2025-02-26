// src/websocket/index.js
const socketIO = require('socket.io');
const { redisClient } = require('../config/redis');
const logger = require('../config/logging');
const { metrics } = require('../config/metrics');
const { maybeCompress } = require('../utils/compression');

let io;

const setupWebsocket = (server) => {
    // Initialize Socket.IO with CORS settings
    io = socketIO(server, {
        cors: {
            origin: '*', // In production, restrict this to your domains
            methods: ['GET', 'POST']
        }
    });

    // Track active connections for metrics
    const activeConnections = new Set();

    // Handle new connections
    io.on('connection', (socket) => {
        logger.info(`New WebSocket connection: ${socket.id}`);

        // Add to active connections
        activeConnections.add(socket.id);
        metrics.activeWebsocketConnections.set(activeConnections.size);

        // Handle user authentication
        socket.on('authenticate', async (data) => {
            try {
                const { userId } = data;
                if (!userId) {
                    return socket.emit('error', { message: 'User ID is required' });
                }

                // Associate socket with user
                socket.userId = userId;
                await socket.join(`user:${userId}`);

                // Store user's online status in Redis if available
                try {
                    if (redisClient.isOpen) {
                        await redisClient.set(`user:${userId}:online`, 'true');
                        await redisClient.set(`user:${userId}:socket`, socket.id);
                    }
                } catch (error) {
                    logger.warn(`Could not store user online status in Redis: ${error.message}`);
                    // Continue execution, don't fail the operation
                }

                socket.emit('authenticated', { success: true });
                logger.info(`User ${userId} authenticated on socket ${socket.id}`);
            } catch (error) {
                logger.error('Authentication error:', error);
                socket.emit('error', { message: 'Authentication failed' });
            }
        });

        // Handle client disconnection
        socket.on('disconnect', async () => {
            logger.info(`WebSocket disconnected: ${socket.id}`);

            // Remove from active connections
            activeConnections.delete(socket.id);
            metrics.activeWebsocketConnections.set(activeConnections.size);

            // Clear user's online status if this was an authenticated socket
            if (socket.userId) {
                try {
                    const userId = socket.userId;
                    if (redisClient.isOpen) {
                        await redisClient.del(`user:${userId}:online`);
                        await redisClient.del(`user:${userId}:socket`);
                    }
                    logger.info(`User ${socket.userId} went offline`);
                } catch (error) {
                    logger.warn(`Could not update Redis for disconnected user: ${error.message}`);
                }
            }
        });
    });

    return io;
};

// Function to send a notification to a specific user
const sendNotificationToUser = async (userId, notification) => {
    try {
      if (!io) {
        throw new Error('WebSocket server not initialized');
      }
  
      // Áp dụng nén có điều kiện
      const { data, metadata } = await maybeCompress(notification);
      
      // Chuyển đổi buffer thành base64 nếu cần thiết để truyền qua WebSocket
      const payload = {
        data: Buffer.isBuffer(data) ? data.toString('base64') : data,
        metadata
      };
      
      // Gửi thông báo với metadata đi kèm
      io.to(`user:${userId}`).emit('notification', payload);
      
      logger.info(`Notification sent to user ${userId} via WebSocket (compressed: ${metadata.compressed})`);
      return true;
    } catch (error) {
      logger.error(`Error sending notification via WebSocket: ${error.message}`);
      return false;
    }
  };

// Function to broadcast notification to all connected clients
const broadcastNotification = (notification) => {
    try {
        if (!io) {
            throw new Error('WebSocket server not initialized');
        }

        io.emit('broadcast', notification);
        logger.info('Broadcast notification sent to all users');
        return true;
    } catch (error) {
        logger.error(`Error broadcasting notification: ${error.message}`);
        return false;
    }
};

module.exports = setupWebsocket;
module.exports.sendNotificationToUser = sendNotificationToUser;
module.exports.broadcastNotification = broadcastNotification;