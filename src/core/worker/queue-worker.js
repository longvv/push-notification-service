// src/core/worker/queue-worker.js
const Worker = require('./worker');
const logger = require('../logging');
const queueManager = require('../queue');

/**
 * Queue worker that processes jobs from a message queue
 */
class QueueWorker extends Worker {
  /**
   * Create a new queue worker
   * @param {string} name - Worker name
   * @param {object} options - Worker options
   */
  constructor(name, options = {}) {
    super(name, options);
    
    this.options = {
      ...this.options,
      queueName: name,
      queueProvider: 'rabbitmq',
      exchangeName: options.exchangeName || 'default-exchange',
      routingKey: options.routingKey || `${name}.#`,
      requeue: true,
      ...options
    };
    
    this.subscription = null;
  }
  
  /**
   * Start processing jobs from the queue
   * @protected
   */
  async _startProcessing() {
    const provider = queueManager.getProvider(this.options.queueProvider);
    
    if (!provider) {
      throw new Error(`Queue provider not found: ${this.options.queueProvider}`);
    }
    
    logger.info(`Queue worker ${this.name} connecting to queue ${this.options.queueName}`);
    
    // Create subscription to the queue
    this.subscription = await queueManager.subscribe(
      this.options.queueName,
      this._handleQueueMessage.bind(this),
      {
        exchange: this.options.exchangeName,
        routingKey: this.options.routingKey,
        requeue: this.options.requeue,
        queueOptions: {
          durable: true
        },
        consumeOptions: {
          noAck: false
        }
      },
      this.options.queueProvider
    );
    
    logger.info(`Queue worker ${this.name} started processing jobs from ${this.options.queueName}`);
  }
  
  /**
   * Handle a message from the queue
   * @param {any} content - Message content
   * @param {object} message - Raw message object
   * @private
   */
  async _handleQueueMessage(content, message) {
    try {
      // Check if worker is still running
      if (!this.running) {
        logger.warn(`Queue worker ${this.name} received message while stopping, nacking message`);
        const channel = message.channel;
        channel.nack(message, false, this.options.requeue);
        return;
      }
      
      // Process the message with retry
      await this._processWithRetry(content);
      
      // Acknowledge the message
      const channel = message.channel;
      channel.ack(message);
    } catch (error) {
      // Job failed after retries, nack the message
      logger.error(`Queue worker ${this.name} failed to process message:`, error);
      
      const channel = message.channel;
      
      // If the job should be requeued, nack with requeue
      // Otherwise, nack without requeue (dead-letter)
      channel.nack(message, false, this.options.requeue);
    }
  }
  
  /**
   * Stop processing jobs
   * @protected
   */
  async _stopProcessing() {
    if (this.subscription) {
      const provider = queueManager.getProvider(this.options.queueProvider);
      
      if (provider) {
        await provider.unsubscribe(this.subscription);
      }
      
      this.subscription = null;
      logger.info(`Queue worker ${this.name} stopped processing jobs`);
    }
  }
}

module.exports = QueueWorker;
