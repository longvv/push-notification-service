// src/core/monitoring/middleware.js
const metricsManager = require('./metrics');

/**
 * HTTP metrics middleware for Express
 * @param {object} options - Middleware options
 * @returns {function} Express middleware
 */
function metricsMiddleware(options = {}) {
  const defaultOptions = {
    omitRoutes: ['/metrics', '/health', '/favicon.ico'],
    omitMethods: [],
    usePathLabel: false,
    pathLabelMaxSegments: 3,
    ...options
  };
  
  return (req, res, next) => {
    // Skip excluded routes
    if (defaultOptions.omitRoutes.includes(req.path) || 
        defaultOptions.omitMethods.includes(req.method)) {
      return next();
    }
    
    // Record start time
    const start = Date.now();
    
    // Get path label
    let path = req.path;
    
    // If using normalized path label, create it
    if (!defaultOptions.usePathLabel) {
      // Replace numeric IDs with parameter placeholders
      path = req.route?.path || 
        req.baseUrl + req.path.replace(/\/([0-9a-f]{8,}|[0-9]+)(?=\/|$)/g, '/:id');
      
      // Limit to max segments
      if (defaultOptions.pathLabelMaxSegments > 0) {
        path = '/' + path.split('/')
          .filter(Boolean)
          .slice(0, defaultOptions.pathLabelMaxSegments)
          .join('/');
      }
    }
    
    // Record request size
    const contentLength = parseInt(req.headers['content-length'] || 0, 10);
    if (contentLength > 0) {
      metricsManager.metrics.http.requestSize.observe(
        { method: req.method, path }, 
        contentLength
      );
    }
    
    // Track response metrics
    const originalEnd = res.end;
    res.end = function(chunk, encoding) {
      // Restore original end
      res.end = originalEnd;
      
      // Call original end with arguments
      res.end(chunk, encoding);
      
      // Record metrics
      const duration = (Date.now() - start) / 1000;
      
      // Record request count and duration
      metricsManager.metrics.http.requestCount.inc({
        method: req.method,
        path,
        status: res.statusCode
      });
      
      metricsManager.metrics.http.requestDuration.observe(
        { method: req.method, path, status: res.statusCode },
        duration
      );
      
      // Record response size
      const responseLength = parseInt(res.getHeader('content-length') || 0, 10);
      if (responseLength > 0) {
        metricsManager.metrics.http.responseSize.observe(
          { method: req.method, path, status: res.statusCode },
          responseLength
        );
      }
    };
    
    next();
  };
}

/**
 * Database metrics middleware for Sequelize
 * @param {object} sequelize - Sequelize instance
 * @param {object} options - Middleware options
 */
function setupDatabaseMetrics(sequelize, options = {}) {
  const defaultOptions = {
    trackModels: true,
    ...options
  };
  
  // Set up query hooks
  sequelize.afterInit((instance) => {
    // Set up connection pool metrics
    instance.connectionManager.pool.on('acquire', () => {
      metricsManager.metrics.database.connectionPoolSize.inc({ state: 'active' });
      metricsManager.metrics.database.connectionPoolSize.dec({ state: 'idle' });
    });
    
    instance.connectionManager.pool.on('release', () => {
      metricsManager.metrics.database.connectionPoolSize.dec({ state: 'active' });
      metricsManager.metrics.database.connectionPoolSize.inc({ state: 'idle' });
    });
    
    // Initialize pool metrics
    metricsManager.metrics.database.connectionPoolSize.set(
      { state: 'total' },
      instance.connectionManager.pool.max
    );
    
    metricsManager.metrics.database.connectionPoolSize.set(
      { state: 'active' },
      0
    );
    
    metricsManager.metrics.database.connectionPoolSize.set(
      { state: 'idle' },
      instance.connectionManager.pool.min
    );
    
    // Add query hooks
    const originalQuery = instance.dialect.Query.prototype.run;
    
    instance.dialect.Query.prototype.run = function(sql, options) {
      const operation = sql.split(' ')[0].toLowerCase();
      const model = options.model ? options.model.name : 'unknown';
      const start = Date.now();
      
      return originalQuery.call(this, sql, options)
        .then(result => {
          const duration = (Date.now() - start) / 1000;
          
          metricsManager.metrics.database.queryCount.inc({
            operation,
            model: defaultOptions.trackModels ? model : 'all',
            status: 'success'
          });
          
          metricsManager.metrics.database.queryDuration.observe(
            {
              operation,
              model: defaultOptions.trackModels ? model : 'all'
            },
            duration
          );
          
          return result;
        })
        .catch(error => {
          metricsManager.metrics.database.queryCount.inc({
            operation,
            model: defaultOptions.trackModels ? model : 'all',
            status: 'error'
          });
          
          throw error;
        });
    };
  });
}

/**
 * Cache metrics middleware for cache providers
 * @param {object} cacheManager - Cache manager instance
 * @param {object} options - Middleware options
 */
function setupCacheMetrics(cacheManager, options = {}) {
  const providers = options.providers || ['default'];
  let hits = 0;
  let misses = 0;
  
  // Wrap get method to track hits/misses
  const originalGet = cacheManager.get;
  cacheManager.get = async function(key, provider) {
    const start = Date.now();
    const providerName = provider || 'default';
    
    try {
      const result = await originalGet.call(this, key, provider);
      const duration = (Date.now() - start) / 1000;
      
      metricsManager.metrics.cache.operationDuration.observe(
        { operation: 'get', provider: providerName },
        duration
      );
      
      if (result === null || result === undefined) {
        metricsManager.metrics.cache.operationCount.inc({
          operation: 'get',
          status: 'miss',
          provider: providerName
        });
        
        misses++;
      } else {
        metricsManager.metrics.cache.operationCount.inc({
          operation: 'get',
          status: 'hit',
          provider: providerName
        });
        
        hits++;
      }
      
      // Update hit ratio
      const total = hits + misses;
      if (total > 0) {
        metricsManager.metrics.cache.hitRatio.set(
          { provider: providerName },
          hits / total
        );
      }
      
      return result;
    } catch (error) {
      metricsManager.metrics.cache.operationCount.inc({
        operation: 'get',
        status: 'error',
        provider: providerName
      });
      
      throw error;
    }
  };
  
  // Wrap set method
  const originalSet = cacheManager.set;
  cacheManager.set = async function(key, value, options, provider) {
    const start = Date.now();
    const providerName = provider || 'default';
    
    try {
      const result = await originalSet.call(this, key, value, options, provider);
      const duration = (Date.now() - start) / 1000;
      
      metricsManager.metrics.cache.operationCount.inc({
        operation: 'set',
        status: 'success',
        provider: providerName
      });
      
      metricsManager.metrics.cache.operationDuration.observe(
        { operation: 'set', provider: providerName },
        duration
      );
      
      return result;
    } catch (error) {
      metricsManager.metrics.cache.operationCount.inc({
        operation: 'set',
        status: 'error',
        provider: providerName
      });
      
      throw error;
    }
  };
}

/**
 * Queue metrics middleware for queue providers
 * @param {object} queueManager - Queue manager instance
 * @param {object} options - Middleware options
 */
function setupQueueMetrics(queueManager, options = {}) {
  const providers = options.providers || ['default'];
  
  // Wrap publish method
  const originalPublish = queueManager.publish;
  queueManager.publish = async function(exchange, routingKey, message, options, provider) {
    const providerName = provider || 'default';
    
    try {
      const result = await originalPublish.call(this, exchange, routingKey, message, options, provider);
      
      metricsManager.metrics.queue.messageCount.inc({
        operation: 'publish',
        queue: `${exchange}:${routingKey}`,
        status: 'success'
      });
      
      return result;
    } catch (error) {
      metricsManager.metrics.queue.messageCount.inc({
        operation: 'publish',
        queue: `${exchange}:${routingKey}`,
        status: 'error'
      });
      
      throw error;
    }
  };
  
  // Wrap subscribe method
  const originalSubscribe = queueManager.subscribe;
  queueManager.subscribe = async function(queue, callback, options, provider) {
    const providerName = provider || 'default';
    
    // Wrap callback to track metrics
    const wrappedCallback = async (message, originalMessage) => {
      const start = Date.now();
      
      try {
        const result = await callback(message, originalMessage);
        const duration = (Date.now() - start) / 1000;
        
        metricsManager.metrics.queue.messageCount.inc({
          operation: 'consume',
          queue,
          status: 'success'
        });
        
        metricsManager.metrics.queue.messageDuration.observe(
          { queue },
          duration
        );
        
        return result;
      } catch (error) {
        metricsManager.metrics.queue.messageCount.inc({
          operation: 'consume',
          queue,
          status: 'error'
        });
        
        throw error;
      }
    };
    
    return originalSubscribe.call(this, queue, wrappedCallback, options, provider);
  };
}

/**
 * WebSocket metrics middleware for Socket.IO
 * @param {object} wsServer - WebSocket server instance
 * @param {object} options - Middleware options
 */
function setupWebSocketMetrics(wsServer, options = {}) {
  const defaultOptions = {
    trackEvents: true,
    ...options
  };
  
  // Track connections
  const originalAttach = wsServer.attach;
  wsServer.attach = function(server) {
    const result = originalAttach.call(this, server);
    
    const io = this.getServer();
    
    // Track connection count
    setInterval(() => {
      const metrics = wsServer.getMetrics();
      
      for (const [namespace, count] of Object.entries(metrics.activeConnections)) {
        metricsManager.metrics.websocket.connectionCount.set(
          { namespace },
          count
        );
      }
    }, 5000);
    
    // Wrap emit to track outgoing messages
    const originalEmit = wsServer.emit;
    wsServer.emit = async function(event, data, options, namespace) {
      const result = await originalEmit.call(this, event, data, options, namespace);
      
      if (defaultOptions.trackEvents) {
        metricsManager.metrics.websocket.messageCount.inc({
          direction: 'outgoing',
          event,
          namespace: namespace || '/'
        });
      }
      
      return result;
    };
    
    // Track incoming messages
    io.on('connection', socket => {
      // Save original on method
      const originalOn = socket.on;
      
      socket.on = function(event, callback) {
        if (event !== 'connection' && event !== 'disconnect' && 
            event !== 'error' && defaultOptions.trackEvents) {
          const wrapped = function(...args) {
            metricsManager.metrics.websocket.messageCount.inc({
              direction: 'incoming',
              event,
              namespace: socket.nsp.name
            });
            
            return callback.apply(this, args);
          };
          
          return originalOn.call(this, event, wrapped);
        }
        
        return originalOn.call(this, event, callback);
      };
    });
    
    return result;
  };
}

/**
 * Worker metrics middleware for worker manager
 * @param {object} workerManager - Worker manager instance
 * @param {object} options - Middleware options
 */
function setupWorkerMetrics(workerManager, options = {}) {
  // Monitor all workers
  workerManager.workers.forEach((worker, name) => {
    // Track job count
    worker.on('success', (job, result) => {
      metricsManager.metrics.worker.jobCount.inc({
        worker: name,
        status: 'success'
      });
    });
    
    worker.on('failure', (job, error) => {
      metricsManager.metrics.worker.jobCount.inc({
        worker: name,
        status: 'failure'
      });
    });
    
    worker.on('retry', (job, error, attempt) => {
      metricsManager.metrics.worker.jobCount.inc({
        worker: name,
        status: 'retry'
      });
    });
    
    // Wrap process method to track duration
    const originalProcess = worker._processWithRetry;
    worker._processWithRetry = async function(job, attempt = 1) {
      const start = Date.now();
      
      // Update active jobs gauge
      metricsManager.metrics.worker.activeJobs.inc({
        worker: name
      });
      
      try {
        const result = await originalProcess.call(this, job, attempt);
        const duration = (Date.now() - start) / 1000;
        
        metricsManager.metrics.worker.jobDuration.observe(
          { worker: name },
          duration
        );
        
        // Update active jobs gauge
        metricsManager.metrics.worker.activeJobs.dec({
          worker: name
        });
        
        return result;
      } catch (error) {
        // Update active jobs gauge
        metricsManager.metrics.worker.activeJobs.dec({
          worker: name
        });
        
        throw error;
      }
    };
  });
  
  // Track new workers
  const originalRegister = workerManager.registerWorker;
  workerManager.registerWorker = function(worker) {
    const result = originalRegister.call(this, worker);
    
    // Set up metrics for new worker
    const name = worker.name;
    
    // Track job count
    worker.on('success', (job, result) => {
      metricsManager.metrics.worker.jobCount.inc({
        worker: name,
        status: 'success'
      });
    });
    
    worker.on('failure', (job, error) => {
      metricsManager.metrics.worker.jobCount.inc({
        worker: name,
        status: 'failure'
      });
    });
    
    worker.on('retry', (job, error, attempt) => {
      metricsManager.metrics.worker.jobCount.inc({
        worker: name,
        status: 'retry'
      });
    });
    
    // Wrap process method to track duration
    const originalProcess = worker._processWithRetry;
    worker._processWithRetry = async function(job, attempt = 1) {
      const start = Date.now();
      
      // Update active jobs gauge
      metricsManager.metrics.worker.activeJobs.inc({
        worker: name
      });
      
      try {
        const result = await originalProcess.call(this, job, attempt);
        const duration = (Date.now() - start) / 1000;
        
        metricsManager.metrics.worker.jobDuration.observe(
          { worker: name },
          duration
        );
        
        // Update active jobs gauge
        metricsManager.metrics.worker.activeJobs.dec({
          worker: name
        });
        
        return result;
      } catch (error) {
        // Update active jobs gauge
        metricsManager.metrics.worker.activeJobs.dec({
          worker: name
        });
        
        throw error;
      }
    };
    
    return result;
  };
}

/**
 * Express middleware for metrics endpoint
 * @param {object} options - Middleware options
 * @returns {function} Express middleware
 */
function metricsEndpoint(options = {}) {
  const defaultOptions = {
    path: '/metrics',
    ...options
  };
  
  return (req, res, next) => {
    if (req.path === defaultOptions.path) {
      metricsManager.getMetrics()
        .then(metrics => {
          res.set('Content-Type', metricsManager.getContentType());
          res.end(metrics);
        })
        .catch(error => {
          next(error);
        });
    } else {
      next();
    }
  };
}

module.exports = {
  metricsMiddleware,
  setupDatabaseMetrics,
  setupCacheMetrics,
  setupQueueMetrics,
  setupWebSocketMetrics,
  setupWorkerMetrics,
  metricsEndpoint
};
