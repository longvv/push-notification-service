// src/core/monitoring/metrics.js
const promClient = require('prom-client');
const logger = require('../logging');

/**
 * Prometheus metrics manager
 */
class MetricsManager {
  constructor() {
    // Create registry
    this.registry = new promClient.Registry();
    
    // Set default labels
    this.registry.setDefaultLabels({
      app: process.env.APP_NAME || 'server-starter'
    });
    
    // Metrics collections by category
    this.metrics = {
      http: {},
      database: {},
      cache: {},
      queue: {},
      websocket: {},
      worker: {},
      compression: {},
      app: {}
    };
    
    // Register default metrics
    this._registerDefaultMetrics();
  }
  
  /**
   * Register default metrics
   * @private
   */
  _registerDefaultMetrics() {
    // Enable default metrics collection
    promClient.collectDefaultMetrics({ register: this.registry });
    
    // HTTP metrics
    this.metrics.http.requestCount = new promClient.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'path', 'status']
    });
    
    this.metrics.http.requestDuration = new promClient.Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'path', 'status'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
    });
    
    this.metrics.http.requestSize = new promClient.Histogram({
      name: 'http_request_size_bytes',
      help: 'HTTP request size in bytes',
      labelNames: ['method', 'path'],
      buckets: [10, 100, 1000, 10000, 100000, 1000000]
    });
    
    this.metrics.http.responseSize = new promClient.Histogram({
      name: 'http_response_size_bytes',
      help: 'HTTP response size in bytes',
      labelNames: ['method', 'path', 'status'],
      buckets: [10, 100, 1000, 10000, 100000, 1000000]
    });
    
    // Database metrics
    this.metrics.database.queryCount = new promClient.Counter({
      name: 'db_queries_total',
      help: 'Total number of database queries',
      labelNames: ['operation', 'model', 'status']
    });
    
    this.metrics.database.queryDuration = new promClient.Histogram({
      name: 'db_query_duration_seconds',
      help: 'Database query duration in seconds',
      labelNames: ['operation', 'model'],
      buckets: [0.001, 0.01, 0.1, 0.5, 1, 2, 5]
    });
    
    this.metrics.database.connectionPoolSize = new promClient.Gauge({
      name: 'db_connection_pool_size',
      help: 'Database connection pool size',
      labelNames: ['state']
    });
    
    // Cache metrics
    this.metrics.cache.operationCount = new promClient.Counter({
      name: 'cache_operations_total',
      help: 'Total number of cache operations',
      labelNames: ['operation', 'status', 'provider']
    });
    
    this.metrics.cache.operationDuration = new promClient.Histogram({
      name: 'cache_operation_duration_seconds',
      help: 'Cache operation duration in seconds',
      labelNames: ['operation', 'provider'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5]
    });
    
    this.metrics.cache.hitRatio = new promClient.Gauge({
      name: 'cache_hit_ratio',
      help: 'Cache hit ratio',
      labelNames: ['provider']
    });
    
    // Queue metrics
    this.metrics.queue.messageCount = new promClient.Counter({
      name: 'queue_messages_total',
      help: 'Total number of queue messages',
      labelNames: ['operation', 'queue', 'status']
    });
    
    this.metrics.queue.messageDuration = new promClient.Histogram({
      name: 'queue_message_duration_seconds',
      help: 'Queue message processing duration in seconds',
      labelNames: ['queue'],
      buckets: [0.01, 0.1, 0.5, 1, 2, 5, 10]
    });
    
    // WebSocket metrics
    this.metrics.websocket.connectionCount = new promClient.Gauge({
      name: 'websocket_connections',
      help: 'Current number of WebSocket connections',
      labelNames: ['namespace']
    });
    
    this.metrics.websocket.messageCount = new promClient.Counter({
      name: 'websocket_messages_total',
      help: 'Total number of WebSocket messages',
      labelNames: ['direction', 'event', 'namespace']
    });
    
    // Worker metrics
    this.metrics.worker.jobCount = new promClient.Counter({
      name: 'worker_jobs_total',
      help: 'Total number of worker jobs',
      labelNames: ['worker', 'status']
    });
    
    this.metrics.worker.jobDuration = new promClient.Histogram({
      name: 'worker_job_duration_seconds',
      help: 'Worker job duration in seconds',
      labelNames: ['worker'],
      buckets: [0.01, 0.1, 0.5, 1, 5, 10, 30, 60, 300]
    });
    
    this.metrics.worker.activeJobs = new promClient.Gauge({
      name: 'worker_active_jobs',
      help: 'Current number of active worker jobs',
      labelNames: ['worker']
    });
    
    // Compression metrics
    this.metrics.compression.compressionOperations = new promClient.Counter({
      name: 'compression_operations_total',
      help: 'Total number of compression operations',
      labelNames: ['operation', 'compressed']
    });
    
    this.metrics.compression.compressionRatio = new promClient.Histogram({
      name: 'compression_ratio',
      help: 'Compression ratio (original size / compressed size)',
      buckets: [1, 1.5, 2, 3, 5, 10, 20]
    });
    
    this.metrics.compression.compressionTime = new promClient.Histogram({
      name: 'compression_time_seconds',
      help: 'Time spent on compression/decompression operations',
      labelNames: ['operation'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5]
    });
    
    // Application metrics
    this.metrics.app.version = new promClient.Gauge({
      name: 'app_version_info',
      help: 'Application version information',
      labelNames: ['version', 'commit', 'environment']
    });
    
    this.metrics.app.uptime = new promClient.Gauge({
      name: 'app_uptime_seconds',
      help: 'Application uptime in seconds'
    });
    
    this.metrics.app.eventLoopLag = new promClient.Gauge({
      name: 'app_event_loop_lag_seconds',
      help: 'Event loop lag in seconds'
    });
    
    // Register all metrics
    Object.values(this.metrics).forEach(category => {
      Object.values(category).forEach(metric => {
        this.registry.registerMetric(metric);
      });
    });
    
    logger.info('Default metrics registered');
  }
  
  /**
   * Register a custom metric
   * @param {string} category - Metric category
   * @param {string} name - Metric name
   * @param {object} metric - Prometheus metric
   * @returns {object} Registered metric
   */
  registerMetric(category, name, metric) {
    // Ensure category exists
    if (!this.metrics[category]) {
      this.metrics[category] = {};
    }
    
    // Register metric
    this.metrics[category][name] = metric;
    this.registry.registerMetric(metric);
    
    logger.info(`Registered custom metric: ${category}.${name}`);
    
    return metric;
  }
  
  /**
   * Get a metric by category and name
   * @param {string} category - Metric category
   * @param {string} name - Metric name
   * @returns {object} Prometheus metric
   */
  getMetric(category, name) {
    if (!this.metrics[category] || !this.metrics[category][name]) {
      return null;
    }
    
    return this.metrics[category][name];
  }
  
  /**
   * Update application version metric
   * @param {string} version - Application version
   * @param {string} commit - Git commit hash
   * @param {string} environment - Deployment environment
   */
  updateAppVersionMetric(version, commit, environment) {
    this.metrics.app.version.set({ version, commit, environment }, 1);
  }
  
  /**
   * Start application uptime metric updater
   */
  startUptimeMetric() {
    const startTime = Date.now();
    
    // Update uptime every 15 seconds
    setInterval(() => {
      const uptime = (Date.now() - startTime) / 1000;
      this.metrics.app.uptime.set(uptime);
    }, 15000);
  }
  
  /**
   * Start event loop lag metric updater
   */
  startEventLoopMetric() {
    // Update event loop lag every 5 seconds
    setInterval(() => {
      const start = Date.now();
      
      setImmediate(() => {
        const lag = (Date.now() - start) / 1000;
        this.metrics.app.eventLoopLag.set(lag);
      });
    }, 5000);
  }
  
  /**
   * Get all metrics
   * @returns {Promise<string>} Prometheus metrics output
   */
  async getMetrics() {
    return this.registry.metrics();
  }
  
  /**
   * Get content type for Prometheus metrics
   * @returns {string} Content type
   */
  getContentType() {
    return this.registry.contentType;
  }
}

// Create and export singleton instance
const metricsManager = new MetricsManager();

// Set global metrics reference for easy access
global.metrics = metricsManager.metrics;

module.exports = metricsManager;
