// src/core/worker/scheduled-worker.js
const Worker = require('./worker');
const logger = require('../logging');

/**
 * Scheduled worker that runs tasks on a schedule
 */
class ScheduledWorker extends Worker {
  /**
   * Create a new scheduled worker
   * @param {string} name - Worker name
   * @param {object} options - Worker options
   */
  constructor(name, options = {}) {
    super(name, options);
    
    this.options = {
      ...this.options,
      interval: 60000, // Default to 1 minute
      immediate: false, // Run immediately on start
      ...options
    };
    
    this.intervalId = null;
    this.running = false;
    this.nextRunTime = null;
  }
  
  /**
   * Start processing on schedule
   * @protected
   */
  async _startProcessing() {
    this.running = true;
    
    // Run immediately if configured
    if (this.options.immediate) {
      this._executeTask();
    }
    
    // Set next run time
    this.nextRunTime = Date.now() + this.options.interval;
    
    // Start the interval timer
    this.intervalId = setInterval(() => {
      this._executeTask();
    }, this.options.interval);
    
    logger.info(`Scheduled worker ${this.name} started with interval ${this.options.interval}ms`);
  }
  
  /**
   * Execute the scheduled task
   * @private
   */
  async _executeTask() {
    try {
      if (!this.running) {
        return;
      }
      
      // Update next run time
      this.nextRunTime = Date.now() + this.options.interval;
      
      logger.debug(`Scheduled worker ${this.name} executing task`);
      
      // Process with empty job (or can be configured to pass something)
      await this._processWithRetry({ timestamp: Date.now() });
    } catch (error) {
      logger.error(`Scheduled worker ${this.name} task execution failed:`, error);
    }
  }
  
  /**
   * Stop processing
   * @protected
   */
  async _stopProcessing() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    this.running = false;
    this.nextRunTime = null;
    
    logger.info(`Scheduled worker ${this.name} stopped`);
  }
  
  /**
   * Get worker statistics including schedule information
   * @returns {object} Worker statistics
   */
  getStats() {
    const baseStats = super.getStats();
    
    return {
      ...baseStats,
      nextRunTime: this.nextRunTime,
      timeUntilNextRun: this.nextRunTime ? this.nextRunTime - Date.now() : null,
      interval: this.options.interval
    };
  }
  
  /**
   * Run the task immediately, regardless of schedule
   * @returns {Promise<any>} Task result
   */
  async runNow() {
    if (!this.running) {
      logger.warn(`Cannot run ${this.name} now because worker is not running`);
      return null;
    }
    
    try {
      logger.info(`Running ${this.name} manually`);
      return await this._processWithRetry({ timestamp: Date.now(), manual: true });
    } catch (error) {
      logger.error(`Manual execution of ${this.name} failed:`, error);
      throw error;
    }
  }
  
  /**
   * Change the worker's schedule interval
   * @param {number} interval - New interval in milliseconds
   */
  setInterval(interval) {
    if (typeof interval !== 'number' || interval <= 0) {
      throw new Error('Interval must be a positive number');
    }
    
    this.options.interval = interval;
    
    // If running, restart the interval
    if (this.running && this.intervalId) {
      clearInterval(this.intervalId);
      
      this.nextRunTime = Date.now() + interval;
      
      this.intervalId = setInterval(() => {
        this._executeTask();
      }, interval);
      
      logger.info(`Scheduled worker ${this.name} interval changed to ${interval}ms`);
    }
  }
}

module.exports = ScheduledWorker;
