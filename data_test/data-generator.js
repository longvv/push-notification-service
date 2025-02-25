// data-generator.js
// This script generates and inserts sample data for the Push Notification Service database
// Run with: node data-generator.js

require('dotenv').config();
const { Sequelize, DataTypes } = require('sequelize');
const faker = require('faker');
const { v4: uuidv4 } = require('uuid');

// Configure database connection
const sequelize = new Sequelize(
  process.env.DB_NAME || 'notification_db',
  process.env.DB_USER || 'admin',
  process.env.DB_PASSWORD || 'admin123',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: console.log,
  }
);

// Define models (simplified versions matching your actual models)
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

// Function to generate random date within a range
const randomDate = (start, end) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

// Function to generate random data
const generateData = async () => {
  try {
    // Connect to database
    await sequelize.authenticate();
    console.log('Connected to database');

    // Generate Users
    const userCount = 100;
    const users = [];
    
    for (let i = 0; i < userCount; i++) {
      users.push({
        name: faker.name.findName(),
        email: faker.internet.email(),
        phone: faker.phone.phoneNumber(),
        created_at: randomDate(new Date(2023, 0, 1), new Date())
      });
    }
    
    await User.bulkCreate(users);
    console.log(`Created ${userCount} users`);

    // Generate Devices
    const deviceTypes = ['android', 'ios', 'web'];
    const devices = [];
    
    // Each user has 1-3 devices
    for (let userId = 1; userId <= userCount; userId++) {
      const deviceCount = Math.floor(Math.random() * 3) + 1;
      
      for (let i = 0; i < deviceCount; i++) {
        devices.push({
          user_id: userId,
          device_token: uuidv4(),
          device_type: deviceTypes[Math.floor(Math.random() * deviceTypes.length)],
          created_at: randomDate(new Date(2023, 0, 1), new Date())
        });
      }
    }
    
    await Device.bulkCreate(devices);
    console.log(`Created ${devices.length} devices`);

    // Generate Notifications
    const notificationCount = 500;
    const notifications = [];
    const notificationTitles = [
      'New Message', 'Friend Request', 'Payment Received', 
      'Account Update', 'Security Alert', 'Event Reminder',
      'Special Offer', 'New Feature', 'System Update'
    ];
    
    for (let i = 0; i < notificationCount; i++) {
      const title = notificationTitles[Math.floor(Math.random() * notificationTitles.length)];
      notifications.push({
        user_id: Math.floor(Math.random() * userCount) + 1,
        title: title,
        body: faker.lorem.sentences(2),
        created_at: randomDate(new Date(2023, 0, 1), new Date())
      });
    }
    
    await Notification.bulkCreate(notifications);
    console.log(`Created ${notificationCount} notifications`);

    // Generate User Preferences
    const notificationTypes = ['message', 'friend_request', 'payment', 'security', 'marketing', 'system'];
    const userPreferences = [];
    
    // Each user has 1-4 notification preferences
    for (let userId = 1; userId <= userCount; userId++) {
      // Randomly select 1-4 notification types without duplicates
      const selectedTypes = new Set();
      const typeCount = Math.floor(Math.random() * 4) + 1;
      
      while (selectedTypes.size < typeCount) {
        selectedTypes.add(notificationTypes[Math.floor(Math.random() * notificationTypes.length)]);
      }
      
      for (const type of selectedTypes) {
        userPreferences.push({
          user_id: userId,
          notification_type: type,
          created_at: randomDate(new Date(2023, 0, 1), new Date())
        });
      }
    }
    
    await UserPreferences.bulkCreate(userPreferences);
    console.log(`Created ${userPreferences.length} user preferences`);

    // Generate Sent Notifications
    const sentNotifications = [];
    
    // About 80% of notifications are sent
    for (let notificationId = 1; notificationId <= notificationCount; notificationId++) {
      if (Math.random() < 0.8) {
        sentNotifications.push({
          notification_id: notificationId,
          sent_at: randomDate(new Date(2023, 0, 1), new Date())
        });
      }
    }
    
    await SentNotifications.bulkCreate(sentNotifications);
    console.log(`Created ${sentNotifications.length} sent notification records`);

    // Generate Notification Logs
    const logTypes = ['created', 'processed', 'sent', 'delivered', 'failed', 'clicked'];
    const notificationLogs = [];
    
    // Generate 2-5 logs for each notification
    for (let notificationId = 1; notificationId <= notificationCount; notificationId++) {
      const logCount = Math.floor(Math.random() * 4) + 2;
      const createdDate = new Date(2023, 0, 1);
      
      for (let i = 0; i < logCount; i++) {
        const logType = logTypes[Math.min(i, logTypes.length - 1)];
        const logDate = new Date(createdDate.getTime() + i * 1000 * 60 * Math.random() * 60); // Add random minutes
        
        notificationLogs.push({
          notification_id: notificationId,
          log_type: logType,
          log_message: `Notification ${logType} at ${logDate.toISOString()}`,
          created_at: logDate
        });
      }
    }
    
    await NotificationLogs.bulkCreate(notificationLogs);
    console.log(`Created ${notificationLogs.length} notification log entries`);

    console.log('Data generation completed successfully');
    
  } catch (error) {
    console.error('Error generating data:', error);
  } finally {
    await sequelize.close();
    console.log('Database connection closed');
  }
};

// Run the data generation
generateData();
