// src/core/queue/index.js
const logger = require('../logging');
const rabbitmqProvider = require('./rabbitmq');

/**
 * Queue manager to handle multiple queue providers
 */
class QueueManager {
  constructor() {
    this.providers = new Map();
    this.defaultProvider = null;
  }
  
  /**
   * Register a queue provider
   * @param {string} name - Provider name
   * @param {QueueProvider} provider - Queue provider instance
   * @param {boolean} isDefault - Set as default provider
   * @returns {QueueManager} this for chaining
   */
  registerProvider(name, provider, isDefault = false) {
    this.providers.set(name, provider);
    
    if (isDefault || !this.defaultProvider) {
      this.defaultProvider = provider;
    }
    
    return this;
  }
  
  /**
   * Get a registered queue provider
   * @param {string} name - Provider name
   * @returns {QueueProvider} The requested provider
   */
  getProvider(name) {
    if (!name) {
      return this.defaultProvider;
    }
    
    return this.providers.get(name);
  }
  
  /**
   * Initialize all registered queue providers
   * @returns {Promise<void>}
   */
  async initialize() {
    const initPromises = [];
    
    for (const [name, provider] of this.providers.entries()) {
      logger.info(`Initializing queue provider: ${name}`);
      initPromises.push(provider.initialize());
    }
    
    await Promise.all(initPromises);
    logger.info('All queue providers initialized');
  }
  
  /**
   * Close all registered queue providers
   * @returns {Promise<void>}
   */
  async close() {
    const closePromises = [];
    
    for (const [name, provider] of this.providers.entries()) {
      logger.info(`Closing queue provider: ${name}`);
      closePromises.push(provider.close());
    }
    
    await Promise.all(closePromises);
    logger.info('All queue providers closed');
  }
  
  /**
   * Publish a message to a queue
   * @param {string} exchange - Exchange name
   * @param {string} routingKey - Routing key
   * @param {any} message - Message to publish
   * @param {object} options - Additional options
   * @param {string} provider - Provider name (optional)
   * @returns {Promise<boolean>} True if successful
   */
  async publish(exchange, routingKey, message, options = {}, provider) {
    const queueProvider = this.getProvider(provider);
    
    if (!queueProvider) {
      logger.warn(`Queue provider not found: ${provider}`);
      return false;
    }
    
    return queueProvider.publish(exchange, routingKey, message, options);
  }
  
  /**
   * Subscribe to a queue
   * @param {string} queue - Queue name
   * @param {function} callback - Message handler function
   * @param {object} options - Additional options
   * @param {string} provider - Provider name (optional)
   * @returns {Promise<any>} Subscription reference
   */
  async subscribe(queue, callback, options = {}, provider) {
    const queueProvider = this.getProvider(provider);
    
    if (!queueProvider) {
      logger.warn(`Queue provider not found: ${provider}`);
      return null;
    }
    
    return queueProvider.subscribe(queue, callback, options);
  }
  
  /**
   * Create a queue
   * @param {string} queue - Queue name
   * @param {object} options - Queue options
   * @param {string} provider - Provider name (optional)
   * @returns {Promise<any>} Queue reference
   */
  async createQueue(queue, options = {}, provider) {
    const queueProvider = this.getProvider(provider);
    
    if (!queueProvider) {
      logger.warn(`Queue provider not found: ${provider}`);
      return null;
    }
    
    return queueProvider.createQueue(queue, options);
  }
  
  /**
   * Create a standard set of queues
   * @param {string} name - Base name for queues
   * @param {object} options - Queue options
   * @param {string} provider - Provider name (optional)
   * @returns {Promise<object>} Created queues
   */
  async createStandardQueues(name, options = {}, provider) {
    const queueProvider = this.getProvider(provider);
    
    if (!queueProvider) {
      logger.warn(`Queue provider not found: ${provider}`);
      return null;
    }
    
    // Create standard exchange
    await queueProvider.createExchange(`${name}-exchange`, 'topic', options);
    
    // Create standard queues
    const immediateQueue = await queueProvider.createQueue(
      `${name}-immediate`, 
      options
    );
    
    const delayedQueue = await queueProvider.createQueue(
      `${name}-delayed`, 
      options
    );
    
    const deadLetterQueue = await queueProvider.createQueue(
      `${name}-dead-letter`, 
      options
    );
    
    // Bind queues to exchange
    await queueProvider.bindQueue(
      `${name}-immediate`, 
      `${name}-exchange`, 
      `${name}.immediate`
    );
    
    await queueProvider.bindQueue(
      `${name}-delayed`, 
      `${name}-exchange`, 
      `${name}.delayed`
    );
    
    await queueProvider.bindQueue(
      `${name}-dead-letter`, 
      `${name}-exchange`, 
      `${name}.dead-letter`
    );
    
    logger.info(`Created standard queues for ${name}`);
    
    return {
      exchange: `${name}-exchange`,
      immediateQueue,
      delayedQueue,
      deadLetterQueue,
      routingKeys: {
        immediate: `${name}.immediate`,
        delayed: `${name}.delayed`,
        deadLetter: `${name}.dead-letter`
      }
    };
  }
}

// Create instance and register providers
const queueManager = new QueueManager();
queueManager.registerProvider('rabbitmq', rabbitmqProvider, true);

module.exports = queueManager;
