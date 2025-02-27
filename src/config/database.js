// src/config/database.js
const { Sequelize } = require('sequelize');
const config = {
  database: process.env.DB_NAME || 'notification_db',
  username: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'admin123',
  host: process.env.DB_HOST || 'localhost',
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