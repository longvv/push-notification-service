// src/core/database/model.js
const { DataTypes } = require('sequelize');
const dbConnection = require('./connection');

/**
 * Base Model class to provide common functionality
 * for all database models
 */
class BaseModel {
  /**
   * Define a new model with standard functionality
   * @param {string} name - Model name
   * @param {object} attributes - Model attributes
   * @param {object} options - Model options
   * @returns {object} The created Sequelize model
   */
  static define(name, attributes, options = {}) {
    const sequelize = dbConnection.getSequelize();
    
    // Add created_at and updated_at if timestamps are enabled
    if (options.timestamps !== false) {
      attributes.created_at = {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      };
      
      if (!options.updatedAt === false) {
        attributes.updated_at = {
          type: DataTypes.DATE,
          defaultValue: DataTypes.NOW
        };
      }
    }
    
    // Define the model
    const model = sequelize.define(name, attributes, {
      ...options,
      // Convert camelCase to snake_case for database fields
      underscored: options.underscored !== false,
      // Disable default timestamp fields if we're handling them manually
      timestamps: false,
    });
    
    // Register the model with our connection manager
    dbConnection.registerModel(name, model);
    
    return model;
  }
  
  /**
   * Add association helper methods to a model
   * @param {object} model - The Sequelize model
   */
  static addAssociationMethods(model) {
    // Helper for belongs-to-many associations
    model.belongsToMany = function(targetModel, options) {
      const association = model.Sequelize.Model.belongsToMany.call(
        model, 
        targetModel, 
        options
      );
      return association;
    };
    
    // Add other association helpers as needed
  }
}

module.exports = BaseModel;
