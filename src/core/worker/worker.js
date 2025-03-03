// src/core/worker/worker.js
const logger = require('../logging');
const EventEmitter = require('events');

/**
 * Base worker class for background processing
 */
class Worker extends EventEmitter {
  /**
   * Create a new worker
   * @param {string} name - Worker name
   * @param {object} options - Worker options
   */
  constructor(name, options = {}) {
    super();
    
    this.name = name;
    this.options = {
      autoStart: false,
      concurrency: 1,
      maxRetries: 3,
      retryDelay: 1000,
      ...options
    };
    
    this.running = false;
    this.processing = 0;
    this.stats = {
      processed: 0,
      failed: 0,
      succeeded: 0,
      retried: 0,
      startTime: null,
      lastJobTime: null
    };
  }
  
  /**
   * Start the worker
   * @returns {Promise<void>}
   */
  async start() {
    if (this.running) {
      logger.warn(`Worker ${this.name} already running`);
      return;
    }
    
    this.running = true;
    this.stats.startTime = Date.now();
    
    logger.info(`Worker ${this.name} started`);
    this.emit('start');
    
    // If handleWork is not implemented, warn and stop
    if (typeof this.handleWork !== 'function') {
      logger.error(`Worker ${this.name} does not implement handleWork()`);
      await this.stop();
      return;
    }
    
    // Worker implementation must be provided by subclasses
    try {
      await this._startProcessing();
    } catch (error) {
      logger.error(`Error starting worker ${this.name}:`, error);
      await this.stop();
    }
  }
  
  /**
   * Process work items
   * This method should be implemented by subclasses
   * @protected
   */
  async _startProcessing() {
    throw new Error('_startProcessing must be implemented by subclass');
  }
  
  /**
   * Handle a work item
   * This method should be implemented by subclasses
   * @param {any} job - Job to process
   * @returns {Promise<any>} Processing result
   */
  async handleWork(job) {
    throw new Error('handleWork must be implemented by subclass');
  }
  
  /**
   * Stop the worker
   * @returns {Promise<void>}
   */
  async stop() {
    if (!this.running) {
      return;
    }
    
    this.running = false;
    
    // If _stopProcessing is implemented, call it
    if (typeof this._stopProcessing === 'function') {
      await this._stopProcessing();
    }
    
    logger.info(`Worker ${this.name} stopped`);
    this.emit('stop');
  }
  
  /**
   * Process a job with retry logic
   * @param {any} job - Job to process
   * @param {number} attempt - Current attempt number
   * @returns {Promise<any>} Processing result
   * @protected
   */
  async _processWithRetry(job, attempt = 1) {
    this.processing++;
    this.stats.lastJobTime = Date.now();
    
    try {
      // Try to process the job
      const result = await this.handleWork(job);
      
      // Job succeeded
      this.stats.processed++;
      this.stats.succeeded++;
      this.emit('success', job, result);
      
      return result;
    } catch (error) {
      // Job failed
      this.stats.processed++;
      this.stats.failed++;
      
      // Check if we should retry
      if (attempt < this.options.maxRetries) {
        this.stats.retried++;
        
        // Calculate retry delay with exponential backoff
        const delay = this.options.retryDelay * Math.pow(2, attempt - 1);
        
        logger.warn(`Worker ${this.name} job failed, retrying in ${delay}ms (attempt ${attempt}/${this.options.maxRetries}):`, error);
        this.emit('retry', job, error, attempt, delay);
        
        // Wait for retry delay
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Retry the job
        return this._processWithRetry(job, attempt + 1);
      }
      
      // Max retries reached, job failed permanently
      logger.error(`Worker ${this.name} job failed permanently after ${attempt} attempts:`, error);
      this.emit('failure', job, error);
      
      throw error;
    } finally {
      this.processing--;
    }
  }
  
  /**
   * Check if the worker is idle (not processing any jobs)
   * @returns {boolean} True if idle
   */
  isIdle() {
    return this.processing === 0;
  }
  
  /**
   * Get worker statistics
   * @returns {object} Worker statistics
   */
  getStats() {
    return {
      ...this.stats,
      name: this.name,
      running: this.running,
      processing: this.processing,
      uptime: this.stats.startTime ? Date.now() - this.stats.startTime : 0
    };
  }
  
  /**
   * Reset worker statistics
   */
  resetStats() {
    this.stats = {
      processed: 0,
      failed: 0,
      succeeded: 0,
      retried: 0,
      startTime: this.stats.startTime,
      lastJobTime: this.stats.lastJobTime
    };
  }
}

module.exports = Worker;
