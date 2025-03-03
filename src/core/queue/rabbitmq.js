// src/core/queue/rabbitmq.js
const amqp = require('amqplib');
const QueueProvider = require('./provider');
const logger = require('../logging');
const { maybeCompress, maybeDecompress } = require('../utils/compression');

/**
 * RabbitMQ implementation of the queue provider
 */
class RabbitMQProvider extends QueueProvider {
  /**
   * Create a new RabbitMQ provider
   * @param {object} options - Connection options
   */
  constructor(options = {}) {
    super();
    
    this.options = {
      host: process.env.RABBITMQ_HOST || 'localhost',
      port: process.env.RABBITMQ_PORT || 5672,
      user: process.env.RABBITMQ_USER || 'admin',
      password: process.env.RABBITMQ_PASSWORD || 'admin123',
      vhost: process.env.RABBITMQ_VHOST || '/',
      reconnectInterval: 5000,
      ...options
    };
    
    this.connection = null;
    this.channel = null;
    this.subscriptions = new Map();
    this.reconnecting = false;
  }
  
  /**
   * Get connection URL
   * @returns {string} RabbitMQ connection URL
   */
  getConnectionUrl() {
    const { host, port, user, password, vhost } = this.options;
    return `amqp://${user}:${password}@${host}:${port}${vhost === '/' ? '' : vhost}`;
  }
  
  /**
   * Initialize the RabbitMQ connection
   * @returns {Promise<any>} Connection and channel
   */
  async initialize() {
    if (this.connection && this.channel) {
      return { connection: this.connection, channel: this.channel };
    }
    
    try {
      logger.info('Connecting to RabbitMQ...');
      
      // Create connection
      this.connection = await amqp.connect(this.getConnectionUrl());
      
      // Set up reconnection handling
      this.connection.on('close', () => {
        logger.warn('RabbitMQ connection closed');
        
        if (!this.reconnecting) {
          this.reconnecting = true;
          
          setTimeout(async () => {
            try {
              await this.initialize();
              
              // Re-establish subscriptions after reconnection
              for (const [queue, handler] of this.subscriptions.entries()) {
                await this.subscribe(queue, handler.callback, handler.options);
              }
              
              this.reconnecting = false;
            } catch (error) {
              logger.error('Failed to reconnect to RabbitMQ:', error);
              this.reconnecting = false;
            }
          }, this.options.reconnectInterval);
        }
      });
      
      // Create channel
      this.channel = await this.connection.createChannel();
      
      logger.info('Connected to RabbitMQ successfully');
      return { connection: this.connection, channel: this.channel };
    } catch (error) {
      logger.error('Failed to connect to RabbitMQ:', error);
      throw error;
    }
  }
  
  /**
   * Close the RabbitMQ connection
   * @returns {Promise<void>}
   */
  async close() {
    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }
      
      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }
      
      logger.info('RabbitMQ connection closed');
    } catch (error) {
      logger.error('Error closing RabbitMQ connection:', error);
    }
  }
  
  /**
   * Check if RabbitMQ is connected
   * @returns {boolean} True if connected
   */
  isConnected() {
    return this.connection !== null && this.channel !== null;
  }
  
  /**
   * Ensure channel is available
   * @returns {Promise<any>} RabbitMQ channel
   */
  async ensureChannel() {
    if (!this.isConnected()) {
      await this.initialize();
    }
    
    return this.channel;
  }
  
  /**
   * Publish a message to an exchange
   * @param {string} exchange - Exchange name
   * @param {string} routingKey - Routing key
   * @param {any} message - Message to publish
   * @param {object} options - Additional options
   * @returns {Promise<boolean>} True if successful
   */
  async publish(exchange, routingKey, message, options = {}) {
    try {
      const channel = await this.ensureChannel();
      
      // Ensure exchange exists
      await channel.assertExchange(exchange, options.exchangeType || 'topic', {
        durable: options.durable !== false,
        ...options.exchangeOptions
      });
      
      // Apply compression if configured
      const { data: messageData, metadata } = await maybeCompress(message);
      
      // Publish the message
      return channel.publish(
        exchange,
        routingKey,
        Buffer.isBuffer(messageData) ? messageData : Buffer.from(JSON.stringify(messageData)),
        {
          persistent: options.persistent !== false,
          contentType: options.contentType || 'application/json',
          ...options.messageOptions,
          headers: {
            ...(options.messageOptions?.headers || {}),
            compressionMetadata: metadata
          }
        }
      );
    } catch (error) {
      logger.error(`Error publishing message to ${exchange}:${routingKey}:`, error);
      throw error;
    }
  }
  
  /**
   * Subscribe to a queue
   * @param {string} queueName - Queue name
   * @param {function} callback - Message handler function
   * @param {object} options - Additional options
   * @returns {Promise<any>} Subscription reference
   */
  async subscribe(queueName, callback, options = {}) {
    try {
      const channel = await this.ensureChannel();
      
      // Ensure queue exists
      await channel.assertQueue(queueName, {
        durable: options.durable !== false,
        ...options.queueOptions
      });
      
      // If binding to an exchange is specified
      if (options.exchange) {
        // Ensure exchange exists
        await channel.assertExchange(options.exchange, options.exchangeType || 'topic', {
          durable: options.durable !== false,
          ...options.exchangeOptions
        });
        
        // Bind queue to exchange
        await channel.bindQueue(
          queueName,
          options.exchange,
          options.routingKey || '#'
        );
      }
      
      // Set up consumer
      const { consumerTag } = await channel.consume(queueName, async (message) => {
        if (message) {
          try {
            // Extract compression metadata if present
            const metadata = message.properties.headers?.compressionMetadata;
            
            // Process message content
            let content;
            if (metadata) {
              // Decompress if needed
              content = await maybeDecompress({
                data: message.content,
                metadata
              });
            } else {
              // Parse as JSON if not compressed
              content = JSON.parse(message.content.toString());
            }
            
            // Call handler function
            await callback(content, message);
            
            // Acknowledge message
            channel.ack(message);
          } catch (error) {
            logger.error(`Error processing message from ${queueName}:`, error);
            
            // Negative acknowledgment with requeue option
            if (options.requeue !== false) {
              channel.nack(message, false, true);
            } else {
              channel.nack(message, false, false);
            }
          }
        }
      }, options.consumeOptions);
      
      // Store subscription
      this.subscriptions.set(queueName, { 
        callback, 
        options, 
        consumerTag 
      });
      
      logger.info(`Subscribed to queue: ${queueName}`);
      return { queue: queueName, consumerTag };
    } catch (error) {
      logger.error(`Error subscribing to queue ${queueName}:`, error);
      throw error;
    }
  }
  
  /**
   * Unsubscribe from a queue
   * @param {any} subscription - Subscription reference
   * @returns {Promise<boolean>} True if successful
   */
  async unsubscribe(subscription) {
    try {
      const channel = await this.ensureChannel();
      
      if (typeof subscription === 'string') {
        // If subscription is a queue name
        const sub = this.subscriptions.get(subscription);
        if (sub) {
          await channel.cancel(sub.consumerTag);
          this.subscriptions.delete(subscription);
          logger.info(`Unsubscribed from queue: ${subscription}`);
          return true;
        }
      } else if (subscription && subscription.consumerTag) {
        // If subscription is a subscription object
        await channel.cancel(subscription.consumerTag);
        this.subscriptions.delete(subscription.queue);
        logger.info(`Unsubscribed from queue: ${subscription.queue}`);
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error('Error unsubscribing from queue:', error);
      return false;
    }
  }
  
  /**
   * Create a queue
   * @param {string} queueName - Queue name
   * @param {object} options - Queue options
   * @returns {Promise<any>} Queue reference
   */
  async createQueue(queueName, options = {}) {
    try {
      const channel = await this.ensureChannel();
      
      const result = await channel.assertQueue(queueName, {
        durable: options.durable !== false,
        ...options
      });
      
      logger.info(`Created queue: ${queueName}`);
      return result;
    } catch (error) {
      logger.error(`Error creating queue ${queueName}:`, error);
      throw error;
    }
  }
  
  /**
   * Delete a queue
   * @param {string} queueName - Queue name
   * @returns {Promise<boolean>} True if successful
   */
  async deleteQueue(queueName) {
    try {
      const channel = await this.ensureChannel();
      
      await channel.deleteQueue(queueName);
      logger.info(`Deleted queue: ${queueName}`);
      return true;
    } catch (error) {
      logger.error(`Error deleting queue ${queueName}:`, error);
      return false;
    }
  }
  
  /**
   * Create an exchange
   * @param {string} exchangeName - Exchange name
   * @param {string} type - Exchange type
   * @param {object} options - Exchange options
   * @returns {Promise<any>} Exchange reference
   */
  async createExchange(exchangeName, type = 'topic', options = {}) {
    try {
      const channel = await this.ensureChannel();
      
      const result = await channel.assertExchange(exchangeName, type, {
        durable: options.durable !== false,
        ...options
      });
      
      logger.info(`Created exchange: ${exchangeName} (${type})`);
      return result;
    } catch (error) {
      logger.error(`Error creating exchange ${exchangeName}:`, error);
      throw error;
    }
  }
  
  /**
   * Bind a queue to an exchange
   * @param {string} queueName - Queue name
   * @param {string} exchangeName - Exchange name
   * @param {string} routingKey - Routing key
   * @returns {Promise<boolean>} True if successful
   */
  async bindQueue(queueName, exchangeName, routingKey = '#') {
    try {
      const channel = await this.ensureChannel();
      
      await channel.bindQueue(queueName, exchangeName, routingKey);
      logger.info(`Bound queue ${queueName} to exchange ${exchangeName} with routing key ${routingKey}`);
      return true;
    } catch (error) {
      logger.error(`Error binding queue ${queueName} to exchange ${exchangeName}:`, error);
      return false;
    }
  }
}

// Create and export singleton instance
const rabbitmqProvider = new RabbitMQProvider();

module.exports = rabbitmqProvider;
