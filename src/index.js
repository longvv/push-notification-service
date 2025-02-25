// src/index.js
require('dotenv').config();
const createServer = require('./api');
const setupWebsocket = require('./websocket');
const { sequelize, testConnection } = require('./config/database');
const { connectRedis } = require('./config/redis');
const { connectRabbitMQ } = require('./config/rabbitmq');
const logger = require('./config/logging');
const { syncModels } = require('./models');
const startWorkers = require('./workers');

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    // Kết nối đến database
    await testConnection();
    
    // Đồng bộ models nếu cần
    // await syncModels();
    
    // Kết nối đến Redis
    await connectRedis();
    
    // Kết nối đến RabbitMQ
    await connectRabbitMQ();
    
    // Khởi động workers
    await startWorkers();
    
    // Tạo Express server
    const app = createServer();
    
    // Khởi động server HTTP
    const server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
    
    // Thiết lập WebSocket server
    setupWebsocket(server);
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();