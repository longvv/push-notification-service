// src/core/database/connection.js
const { Sequelize } = require('sequelize');
const logger = require('../logging');

/**
 * Database connection manager
 * Provides connection pooling and lifecycle management
 */
class DatabaseConnection {
  constructor(config = {}) {
    this.config = {
      database: process.env.DB_NAME || 'notification_db',
      username: process.env.DB_USER || 'admin',
      password: process.env.DB_PASSWORD || 'admin123',
      host: process.env.DB_HOST || 'localhost',
      dialect: 'postgres',
      logging: process.env.NODE_ENV !== 'production',
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      },
      ...config
    };
    
    this.sequelize = null;
    this.models = {};
  }
  
  /**
   * Initialize the database connection
   */
  initialize() {
    if (this.sequelize) {
      return this.sequelize;
    }
    
    this.sequelize = new Sequelize(
      this.config.database,
      this.config.username,
      this.config.password,
      {
        host: this.config.host,
        dialect: this.config.dialect,
        logging: this.config.logging ? msg => logger.debug(msg) : false,
        pool: this.config.pool
      }
    );
    
    return this.sequelize;
  }
  
  /**
   * Test the database connection
   * @returns {Promise<boolean>} True if connection successful
   */
  async testConnection() {
    try {
      const sequelize = this.initialize();
      await sequelize.authenticate();
      logger.info('Database connection has been established successfully.');
      return true;
    } catch (error) {
      logger.error('Unable to connect to the database:', error);
      return false;
    }
  }
  
  /**
   * Close the database connection
   */
  async close() {
    if (this.sequelize) {
      await this.sequelize.close();
      this.sequelize = null;
      logger.info('Database connection closed.');
    }
  }
  
  /**
   * Register a model with the connection
   * @param {string} name - Model name
   * @param {object} model - Sequelize model
   */
  registerModel(name, model) {
    this.models[name] = model;
    return model;
  }
  
  /**
   * Get a registered model
   * @param {string} name - Model name
   * @returns {object} The registered model
   */
  getModel(name) {
    return this.models[name];
  }
  
  /**
   * Get the Sequelize instance
   * @returns {Sequelize} The Sequelize instance
   */
  getSequelize() {
    return this.initialize();
  }
  
  /**
   * Sync all models with the database
   * @param {object} options - Sync options
   */
  async syncModels(options = {}) {
    const sequelize = this.initialize();
    await sequelize.sync(options);
    logger.info('Models synchronized successfully');
  }
}

// Create and export singleton instance
const dbConnection = new DatabaseConnection();

module.exports = dbConnection;
