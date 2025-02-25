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

// Register the custom metrics
register.registerMetric(notificationsSent);
register.registerMetric(notificationLatency);
register.registerMetric(activeWebsocketConnections);

module.exports = {
  register,
  metrics: {
    notificationsSent,
    notificationLatency,
    activeWebsocketConnections
  }
};