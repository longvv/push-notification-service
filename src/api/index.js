// src/api/index.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const router = require('./routes');
const { register } = require('../config/metrics');
const logger = require('../config/logging');

const createServer = () => {
  const app = express();
  
  // Middleware
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  
  // Logging middleware
  app.use((req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.info({
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        duration,
      });
    });
    
    next();
  });
  
  // Routes
  app.use('/api', router);
  
  // Prometheus metrics endpoint
  app.get('/metrics', async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  });
  
  // Error handling
  app.use((err, req, res, next) => {
    logger.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  });
  
  return app;
};

module.exports = createServer;