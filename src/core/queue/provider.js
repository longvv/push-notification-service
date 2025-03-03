// src/core/queue/provider.js

/**
 * Abstract queue provider interface
 * All message queue implementations should extend this class
 */
class QueueProvider {
  /**
   * Initialize the queue provider
   * @returns {Promise<void>}
   */
  async initialize() {
    throw new Error('Method not implemented');
  }
  
  /**
   * Close the queue connection
   * @returns {Promise<void>}
   */
  async close() {
    throw new Error('Method not implemented');
  }
  
  /**
   * Check if the queue is connected and ready
   * @returns {boolean} True if connected
   */
  isConnected() {
    throw new Error('Method not implemented');
  }
  
  /**
   * Publish a message to a queue/topic
   * @param {string} queue - Queue or topic name
   * @param {any} message - Message to publish
   * @param {object} options - Additional options
   * @returns {Promise<boolean>} True if successful
   */
  async publish(queue, message, options = {}) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Subscribe to a queue/topic
   * @param {string} queue - Queue or topic name
   * @param {function} callback - Message handler function
   * @param {object} options - Additional options
   * @returns {Promise<any>} Subscription reference
   */
  async subscribe(queue, callback, options = {}) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Unsubscribe from a queue/topic
   * @param {any} subscription - Subscription reference
   * @returns {Promise<boolean>} True if successful
   */
  async unsubscribe(subscription) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Create a queue/topic
   * @param {string} queue - Queue or topic name
   * @param {object} options - Queue options
   * @returns {Promise<any>} Queue reference
   */
  async createQueue(queue, options = {}) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Delete a queue/topic
   * @param {string} queue - Queue or topic name
   * @returns {Promise<boolean>} True if successful
   */
  async deleteQueue(queue) {
    throw new Error('Method not implemented');
  }
}

module.exports = QueueProvider;
