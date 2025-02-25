// src/config/database.js
const { Sequelize } = require('sequelize');
const config = {
  database: 'notification_db',  // Important: Use the correct database name
  username: 'admin',
  password: 'admin123',
  host: 'localhost',
  dialect: 'postgres',
  logging: console.log,
};

const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  {
    host: config.host,
    dialect: config.dialect,
    logging: config.logging,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
};

module.exports = {
  sequelize,
  testConnection
};