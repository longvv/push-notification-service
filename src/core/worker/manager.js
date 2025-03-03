// src/core/worker/manager.js
const logger = require('../logging');
const Worker = require('./worker');
const QueueWorker = require('./queue-worker');
const ScheduledWorker = require('./scheduled-worker');

/**
 * Worker manager to manage all workers
 */
class WorkerManager {
  constructor() {
    this.workers = new Map();
    this.running = false;
  }
  
  /**
   * Register a worker
   * @param {Worker} worker - Worker instance
   * @returns {WorkerManager} this for chaining
   */
  registerWorker(worker) {
    if (!(worker instanceof Worker)) {
      throw new Error('Worker must be an instance of Worker');
    }
    
    this.workers.set(worker.name, worker);
    
    // If manager is already running and worker has autoStart option,
    // start the worker automatically
    if (this.running && worker.options.autoStart) {
      worker.start().catch(error => {
        logger.error(`Error auto-starting worker ${worker.name}:`, error);
      });
    }
    
    return this;
  }
  
  /**
   * Create and register a queue worker
   * @param {string} name - Worker name
   * @param {function} handler - Job handler function
   * @param {object} options - Worker options
   * @returns {QueueWorker} Created worker
   */
  createQueueWorker(name, handler, options = {}) {
    const worker = new QueueWorker(name, options);
    
    // Set the handler function
    worker.handleWork = handler;
    
    // Register the worker
    this.registerWorker(worker);
    
    return worker;
  }
  
  /**
   * Create and register a scheduled worker
   * @param {string} name - Worker name
   * @param {function} handler - Task handler function
   * @param {object} options - Worker options
   * @returns {ScheduledWorker} Created worker
   */
  createScheduledWorker(name, handler, options = {}) {
    const worker = new ScheduledWorker(name, options);
    
    // Set the handler function
    worker.handleWork = handler;
    
    // Register the worker
    this.registerWorker(worker);
    
    return worker;
  }
  
  /**
   * Get a registered worker
   * @param {string} name - Worker name
   * @returns {Worker} Worker instance
   */
  getWorker(name) {
    return this.workers.get(name);
  }
  
  /**
   * Start all registered workers
   * @returns {Promise<void>}
   */
  async startAll() {
    logger.info('Starting all workers...');
    
    this.running = true;
    
    const startPromises = [];
    
    for (const [name, worker] of this.workers.entries()) {
      // Start worker if autoStart is enabled
      if (worker.options.autoStart !== false) {
        startPromises.push(
          worker.start().catch(error => {
            logger.error(`Error starting worker ${name}:`, error);
          })
        );
      }
    }
    
    await Promise.all(startPromises);
    
    logger.info(`Started ${startPromises.length} workers`);
  }
  
  /**
   * Stop all registered workers
   * @returns {Promise<void>}
   */
  async stopAll() {
    logger.info('Stopping all workers...');
    
    this.running = false;
    
    const stopPromises = [];
    
    for (const [name, worker] of this.workers.entries()) {
      if (worker.running) {
        stopPromises.push(
          worker.stop().catch(error => {
            logger.error(`Error stopping worker ${name}:`, error);
          })
        );
      }
    }
    
    await Promise.all(stopPromises);
    
    logger.info(`Stopped ${stopPromises.length} workers`);
  }
  
  /**
   * Start a specific worker by name
   * @param {string} name - Worker name
   * @returns {Promise<Worker>} Started worker
   */
  async startWorker(name) {
    const worker = this.getWorker(name);
    
    if (!worker) {
      throw new Error(`Worker ${name} not found`);
    }
    
    await worker.start();
    
    return worker;
  }
  
  /**
   * Stop a specific worker by name
   * @param {string} name - Worker name
   * @returns {Promise<Worker>} Stopped worker
   */
  async stopWorker(name) {
    const worker = this.getWorker(name);
    
    if (!worker) {
      throw new Error(`Worker ${name} not found`);
    }
    
    await worker.stop();
    
    return worker;
  }
  
  /**
   * Get statistics for all workers
   * @returns {object} Worker statistics
   */
  getStats() {
    const stats = {};
    
    for (const [name, worker] of this.workers.entries()) {
      stats[name] = worker.getStats();
    }
    
    return stats;
  }
  
  /**
   * Check if all workers are idle
   * @returns {boolean} True if all workers are idle
   */
  areAllIdle() {
    for (const worker of this.workers.values()) {
      if (!worker.isIdle()) {
        return false;
      }
    }
    
    return true;
  }
}

// Create and export singleton instance
const workerManager = new WorkerManager();

module.exports = workerManager;
