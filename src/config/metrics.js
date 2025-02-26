// src/config/metrics.js
const promClient = require('prom-client');

// Create a Registry which registers the metrics
const register = new promClient.Registry();

// Add a default label which is added to all metrics
register.setDefaultLabels({
  app: 'notification-service'
});

// Enable the collection of default metrics
promClient.collectDefaultMetrics({ register });

// Define custom metrics
const notificationsSent = new promClient.Counter({
  name: 'notifications_sent_total',
  help: 'Total number of notifications sent',
  labelNames: ['status', 'type']
});

const notificationLatency = new promClient.Histogram({
  name: 'notification_latency_seconds',
  help: 'Notification processing latency in seconds',
  labelNames: ['type'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

const activeWebsocketConnections = new promClient.Gauge({
  name: 'active_websocket_connections',
  help: 'Number of active websocket connections'
});

const compressionStats = new promClient.Counter({
  name: 'compression_operations_total',
  help: 'Total number of compression operations',
  labelNames: ['operation', 'compressed']
});

const compressionRatio = new promClient.Histogram({
  name: 'compression_ratio',
  help: 'Compression ratio (original size / compressed size)',
  buckets: [1, 1.5, 2, 3, 5, 10]
});

const compressionTime = new promClient.Histogram({
  name: 'compression_time_seconds',
  help: 'Time spent on compression/decompression operations',
  labelNames: ['operation'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5]
});

// Register the custom metrics
register.registerMetric(notificationsSent);
register.registerMetric(notificationLatency);
register.registerMetric(activeWebsocketConnections);
register.registerMetric(compressionStats);
register.registerMetric(compressionRatio);
register.registerMetric(compressionTime);

module.exports = {
  register,
  metrics: {
    notificationsSent,
    notificationLatency,
    activeWebsocketConnections
  }
};