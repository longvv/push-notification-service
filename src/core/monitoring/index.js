// src/core/monitoring/index.js
const metricsManager = require('./metrics');
const middleware = require('./middleware');

module.exports = {
  metricsManager,
  middleware
};
