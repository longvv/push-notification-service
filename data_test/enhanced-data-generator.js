// enhanced-data-generator.js
// This script provides multiple options for generating sample data for the Push Notification Service database
// It supports both Sequelize ORM mode and raw SQL mode

require('dotenv').config();
const { Sequelize, DataTypes } = require('sequelize');
const { Client } = require('pg');
const faker = require('faker');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  mode: process.env.MODE || 'sequelize', // 'sequelize' or 'sql'
  userCount: process.env.USER_COUNT ? parseInt(process.env.USER_COUNT) : 100,
  notificationCount: process.env.NOTIFICATION_COUNT ? parseInt(process.env.NOTIFICATION_COUNT) : 500,
  startDate: new Date(process.env.START_DATE || '2023-01-01'),
  endDate: new Date(),
  outputDir: process.env.OUTPUT_DIR || './generated-data',
  truncateFirst: process.env.TRUNCATE_FIRST === 'true' || false,
  db: {
    name: process.env.DB_NAME || 'notification_db',
    user: process.env.DB_USER || 'admin',
    password: process.env.DB_PASSWORD || 'admin123',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
  }
};

// Initialize Sequelize connection
const sequelize = new Sequelize(
  config.db.name,
  config.db.user,
  config.db.password,
  {
    host: config.db.host,
    port: config.db.port,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development',
  }
);

// Define models
const defineModels = () => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'users',
    timestamps: false
  });

  const Device = sequelize.define('Device', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    device_token: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    device_type: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'devices',
    timestamps: false
  });

  const Notification = sequelize.define('Notification', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'notifications',
    timestamps: false
  });

  const UserPreferences = sequelize.define('UserPreferences', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    notification_type: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'user_preferences',
    timestamps: false
  });

  const SentNotifications = sequelize.define('SentNotifications', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    notification_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'notifications',
        key: 'id'
      }
    },
    sent_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'sent_notifications',
    timestamps: false
  });

  const NotificationLogs = sequelize.define('NotificationLogs', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    notification_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'notifications',
        key: 'id'
      }
    },
    log_type: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    log_message: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'notification_logs',
    timestamps: false
  });

  return {
    User,
    Device,
    Notification,
    UserPreferences,
    SentNotifications,
    NotificationLogs
  };
};

// Generate random date within range
const randomDate = (start, end) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

// Generate data for all tables using Sequelize
const generateDataWithSequelize = async () => {
  try {
    // Get model definitions
    const models = defineModels();

    // Truncate tables if configured
    if (config.truncateFirst) {
      await sequelize.query('TRUNCATE TABLE notification_logs CASCADE');
      await sequelize.query('TRUNCATE TABLE sent_notifications CASCADE');
      await sequelize.query('TRUNCATE TABLE user_preferences CASCADE');
      await sequelize.query('TRUNCATE TABLE devices CASCADE');
      await sequelize.query('TRUNCATE TABLE notifications CASCADE');
      await sequelize.query('TRUNCATE TABLE users CASCADE');
      console.log('Truncated all tables');
    }

    // Set up constants for data generation
    const deviceTypes = ['android', 'ios', 'web'];
    const notificationTitles = [
      'New Message', 'Friend Request', 'Payment Received', 
      'Account Update', 'Security Alert', 'Event Reminder',
      'Special Offer', 'New Feature', 'System Update'
    ];
    const notificationTypes = ['message', 'friend_request', 'payment', 'security', 'marketing', 'system'];
    const logTypes = ['created', 'processed', 'sent', 'delivered', 'failed', 'clicked'];

    // 1. Generate Users
    console.log(`Generating ${config.userCount} users...`);
    const users = [];
    
    for (let i = 0; i < config.userCount; i++) {
      users.push({
        name: faker.name.findName(),
        email: faker.internet.email(),
        phone: faker.phone.phoneNumber(),
        created_at: randomDate(config.startDate, config.endDate)
      });
    }
    
    await models.User.bulkCreate(users);
    console.log(`Created ${users.length} users`);

    // 2. Generate Devices
    console.log('Generating devices...');
    const devices = [];
    
    for (let userId = 1; userId <= config.userCount; userId++) {
      const deviceCount = Math.floor(Math.random() * 3) + 1;
      
      for (let i = 0; i < deviceCount; i++) {
        devices.push({
          user_id: userId,
          device_token: uuidv4(),
          device_type: deviceTypes[Math.floor(Math.random() * deviceTypes.length)],
          created_at: randomDate(config.startDate, config.endDate)
        });
      }
    }
    
    await models.Device.bulkCreate(devices);
    console.log(`Created ${devices.length} devices`);

    // 3. Generate Notifications
    console.log(`Generating ${config.notificationCount} notifications...`);
    const notifications = [];
    
    for (let i = 0; i < config.notificationCount; i++) {
      const title = notificationTitles[Math.floor(Math.random() * notificationTitles.length)];
      notifications.push({
        user_id: Math.floor(Math.random() * config.userCount) + 1,
        title: title,
        body: faker.lorem.sentences(2),
        created_at: randomDate(config.startDate, config.endDate)
      });
    }
    
    await models.Notification.bulkCreate(notifications);
    console.log(`Created ${notifications.length} notifications`);

    // 4. Generate User Preferences
    console.log('Generating user preferences...');
    const userPreferences = [];
    
    for (let userId = 1; userId <= config.userCount; userId++) {
      const selectedTypes = new Set();
      const typeCount = Math.floor(Math.random() * 4) + 1;
      
      while (selectedTypes.size < typeCount) {
        selectedTypes.add(notificationTypes[Math.floor(Math.random() * notificationTypes.length)]);
      }
      
      for (const type of selectedTypes) {
        userPreferences.push({
          user_id: userId,
          notification_type: type,
          created_at: randomDate(config.startDate, config.endDate)
        });
      }
    }
    
    await models.UserPreferences.bulkCreate(userPreferences);
    console.log(`Created ${userPreferences.length} user preferences`);

    // 5. Generate Sent Notifications
    console.log('Generating sent notifications records...');
    const sentNotifications = [];
    
    for (let notificationId = 1; notificationId <= config.notificationCount; notificationId++) {
      if (Math.random() < 0.8) {
        sentNotifications.push({
          notification_id: notificationId,
          sent_at: randomDate(config.startDate, config.endDate)
        });
      }
    }
    
    await models.SentNotifications.bulkCreate(sentNotifications);
    console.log(`Created ${sentNotifications.length} sent notification records`);

    // 6. Generate Notification Logs
    console.log('Generating notification logs...');
    const notificationLogs = [];
    
    for (let notificationId = 1; notificationId <= config.notificationCount; notificationId++) {
      const logCount = Math.floor(Math.random() * 4) + 2;
      const createdDate = randomDate(config.startDate, config.endDate);
      
      for (let i = 0; i < logCount; i++) {
        const logType = logTypes[Math.min(i, logTypes.length - 1)];
        const logDate = new Date(createdDate.getTime() + i * 1000 * 60 * Math.random() * 60);
        
        notificationLogs.push({
          notification_id: notificationId,
          log_type: logType,
          log_message: `Notification ${logType} at ${logDate.toISOString()}`,
          created_at: logDate
        });
      }
    }
    
    await models.NotificationLogs.bulkCreate(notificationLogs);
    console.log(`Created ${notificationLogs.length} notification log entries`);

    return {
      users: users.length,
      devices: devices.length,
      notifications: notifications.length,
      userPreferences: userPreferences.length,
      sentNotifications: sentNotifications.length,
      notificationLogs: notificationLogs.length
    };
  } catch (error) {
    console.error('Error generating data with Sequelize:', error);
    throw error;
  }
};

// Generate SQL statements
const generateSqlStatements = async () => {
  try {
    // Ensure output directory exists
    if (!fs.existsSync(config.outputDir)) {
      fs.mkdirSync(config.outputDir, { recursive: true });
    }

    const sqlFilePath = path.join(config.outputDir, 'seed-data.sql');
    const stream = fs.createWriteStream(sqlFilePath);

    // Write header
    stream.write(`-- Push Notification Service - Sample Data\n`);
    stream.write(`-- Generated on ${new Date().toISOString()}\n\n`);

    // Write truncate statements if configured
    if (config.truncateFirst) {
      stream.write(`-- Truncate tables\n`);
      stream.write(`TRUNCATE TABLE notification_logs CASCADE;\n`);
      stream.write(`TRUNCATE TABLE sent_notifications CASCADE;\n`);
      stream.write(`TRUNCATE TABLE user_preferences CASCADE;\n`);
      stream.write(`TRUNCATE TABLE devices CASCADE;\n`);
      stream.write(`TRUNCATE TABLE notifications CASCADE;\n`);
      stream.write(`TRUNCATE TABLE users CASCADE;\n\n`);
    }

    // Set up constants for data generation
    const deviceTypes = ['android', 'ios', 'web'];
    const notificationTitles = [
      'New Message', 'Friend Request', 'Payment Received', 
      'Account Update', 'Security Alert', 'Event Reminder',
      'Special Offer', 'New Feature', 'System Update'
    ];
    const notificationTypes = ['message', 'friend_request', 'payment', 'security', 'marketing', 'system'];
    const logTypes = ['created', 'processed', 'sent', 'delivered', 'failed', 'clicked'];

    // 1. Generate Users
    console.log(`Generating SQL for ${config.userCount} users...`);
    stream.write(`-- Users\n`);
    stream.write(`INSERT INTO users (name, email, phone, created_at) VALUES\n`);
    
    for (let i = 0; i < config.userCount; i++) {
      const name = faker.name.findName().replace(/'/g, "''");
      const email = faker.internet.email().replace(/'/g, "''");
      const phone = faker.phone.phoneNumber().replace(/'/g, "''");
      const createdAt = randomDate(config.startDate, config.endDate).toISOString();
      
      stream.write(`  ('${name}', '${email}', '${phone}', '${createdAt}')`);
      stream.write(i < config.userCount - 1 ? ',\n' : ';\n\n');
    }

    // 2. Generate Devices
    console.log('Generating SQL for devices...');
    stream.write(`-- Devices\n`);
    stream.write(`INSERT INTO devices (user_id, device_token, device_type, created_at) VALUES\n`);
    
    let deviceCount = 0;
    let deviceValues = [];
    
    for (let userId = 1; userId <= config.userCount; userId++) {
      const userDeviceCount = Math.floor(Math.random() * 3) + 1;
      
      for (let i = 0; i < userDeviceCount; i++) {
        const deviceToken = uuidv4();
        const deviceType = deviceTypes[Math.floor(Math.random() * deviceTypes.length)];
        const createdAt = randomDate(config.startDate, config.endDate).toISOString();
        
        deviceValues.push(`  (${userId}, '${deviceToken}', '${deviceType}', '${createdAt}')`);
        deviceCount++;
      }
    }
    
    stream.write(deviceValues.join(',\n'));
    stream.write(';\n\n');
    console.log(`Generated SQL for ${deviceCount} devices`);

    // 3. Generate Notifications
    console.log(`Generating SQL for ${config.notificationCount} notifications...`);
    stream.write(`-- Notifications\n`);
    stream.write(`INSERT INTO notifications (user_id, title, body, created_at) VALUES\n`);
    
    for (let i = 0; i < config.notificationCount; i++) {
      const userId = Math.floor(Math.random() * config.userCount) + 1;
      const title = notificationTitles[Math.floor(Math.random() * notificationTitles.length)].replace(/'/g, "''");
      const body = faker.lorem.sentences(2).replace(/'/g, "''");
      const createdAt = randomDate(config.startDate, config.endDate).toISOString();
      
      stream.write(`  (${userId}, '${title}', '${body}', '${createdAt}')`);
      stream.write(i < config.notificationCount - 1 ? ',\n' : ';\n\n');
    }

    // 4. Generate User Preferences
    console.log('Generating SQL for user preferences...');
    stream.write(`-- User Preferences\n`);
    stream.write(`INSERT INTO user_preferences (user_id, notification_type, created_at) VALUES\n`);
    
    let prefCount = 0;
    let prefValues = [];
    
    for (let userId = 1; userId <= config.userCount; userId++) {
      const selectedTypes = new Set();
      const typeCount = Math.floor(Math.random() * 4) + 1;
      
      while (selectedTypes.size < typeCount) {
        selectedTypes.add(notificationTypes[Math.floor(Math.random() * notificationTypes.length)]);
      }
      
      for (const type of selectedTypes) {
        const createdAt = randomDate(config.startDate, config.endDate).toISOString();
        prefValues.push(`  (${userId}, '${type}', '${createdAt}')`);
        prefCount++;
      }
    }
    
    stream.write(prefValues.join(',\n'));
    stream.write(';\n\n');
    console.log(`Generated SQL for ${prefCount} user preferences`);

    // 5. Generate Sent Notifications
    console.log('Generating SQL for sent notifications...');
    stream.write(`-- Sent Notifications\n`);
    stream.write(`INSERT INTO sent_notifications (notification_id, sent_at) VALUES\n`);
    
    let sentCount = 0;
    let sentValues = [];
    
    for (let notificationId = 1; notificationId <= config.notificationCount; notificationId++) {
      if (Math.random() < 0.8) {
        const sentAt = randomDate(config.startDate, config.endDate).toISOString();
        sentValues.push(`  (${notificationId}, '${sentAt}')`);
        sentCount++;
      }
    }
    
    stream.write(sentValues.join(',\n'));
    stream.write(';\n\n');
    console.log(`Generated SQL for ${sentCount} sent notifications`);

    // 6. Generate Notification Logs
    console.log('Generating SQL for notification logs...');
    stream.write(`-- Notification Logs\n`);
    stream.write(`INSERT INTO notification_logs (notification_id, log_type, log_message, created_at) VALUES\n`);
    
    let logCount = 0;
    let logValues = [];
    
    for (let notificationId = 1; notificationId <= config.notificationCount; notificationId++) {
      const logsPerNotification = Math.floor(Math.random() * 4) + 2;
      const baseDate = randomDate(config.startDate, config.endDate);
      
      for (let i = 0; i < logsPerNotification; i++) {
        const logType = logTypes[Math.min(i, logTypes.length - 1)];
        const logDate = new Date(baseDate.getTime() + i * 1000 * 60 * Math.random() * 60);
        const logMessage = `Notification ${logType} at ${logDate.toISOString()}`.replace(/'/g, "''");
        
        logValues.push(`  (${notificationId}, '${logType}', '${logMessage}', '${logDate.toISOString()}')`);
        logCount++;
      }
    }
    
    stream.write(logValues.join(',\n'));
    stream.write(';\n\n');
    console.log(`Generated SQL for ${logCount} notification logs`);

    // Close the file stream
    stream.end();
    console.log(`SQL generation completed. File saved to: ${sqlFilePath}`);
    
    return {
      filePath: sqlFilePath,
      userCount: config.userCount,
      deviceCount: deviceCount,
      notificationCount: config.notificationCount,
      preferenceCount: prefCount,
      sentNotificationCount: sentCount,
      logCount: logCount
    };
  } catch (error) {
    console.error('Error generating SQL statements:', error);
    throw error;
  }
};

// Execute SQL directly to the database
const executeSqlFile = async (filePath) => {
  const client = new Client({
    host: config.db.host,
    port: config.db.port,
    database: config.db.name,
    user: config.db.user,
    password: config.db.password
  });

  try {
    await client.connect();
    console.log('Connected to database for SQL execution');
    
    const sql = fs.readFileSync(filePath, 'utf8');
    await client.query(sql);
    
    console.log('SQL file executed successfully');
  } catch (error) {
    console.error('Error executing SQL file:', error);
    throw error;
  } finally {
    await client.end();
    console.log('Database connection closed');
  }
};

// Main function
const main = async () => {
  try {
    console.log('Starting data generation process...');
    console.log(`Mode: ${config.mode}`);
    console.log(`Database: ${config.db.name} on ${config.db.host}:${config.db.port}`);
    
    let result;
    
    if (config.mode === 'sequelize') {
      // Connect to database
      await sequelize.authenticate();
      console.log('Connected to database');
      
      result = await generateDataWithSequelize();
      
      // Close database connection
      await sequelize.close();
      console.log('Database connection closed');
    } else {
      // Generate SQL statements
      result = await generateSqlStatements();
      
      // If execute flag is set, run the SQL
      if (process.env.EXECUTE_SQL === 'true') {
        console.log('Executing generated SQL...');
        await executeSqlFile(result.filePath);
      } else {
        console.log('SQL execution skipped. Set EXECUTE_SQL=true to execute the SQL file.');
      }
    }
    
    console.log('Data generation completed successfully');
    console.log('Summary:');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error in data generation process:', error);
    process.exit(1);
  }
};

// Run the script
main();