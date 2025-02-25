// Basic data generator
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

// Define models
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

// Generate random date within range
const randomDate = (start, end) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

// Generate test data
const generateData = async () => {
  try {
    // Connect to database
    await sequelize.authenticate();
    console.log('Connected to database');

    // Define parameters
    const userCount = parseInt(process.env.USER_COUNT) || 100;
    const notificationCount = parseInt(process.env.NOTIFICATION_COUNT) || 500;
    const startDate = new Date(process.env.START_DATE || '2023-01-01');
    const truncateFirst = process.env.TRUNCATE_FIRST === 'true' || false;

    // Truncate tables if configured
    if (truncateFirst) {
      await sequelize.query('TRUNCATE TABLE notification_logs CASCADE');
      await sequelize.query('TRUNCATE TABLE sent_notifications CASCADE');
      await sequelize.query('TRUNCATE TABLE user_preferences CASCADE');
      await sequelize.query('TRUNCATE TABLE devices CASCADE');
      await sequelize.query('TRUNCATE TABLE notifications CASCADE');
      await sequelize.query('TRUNCATE TABLE users CASCADE');
      console.log('Truncated all tables');
    }

    // Set up constants
    const deviceTypes = ['android', 'ios', 'web'];
    const notificationTitles = [
      'New Message', 'Friend Request', 'Payment Received', 
      'Account Update', 'Security Alert', 'Event Reminder',
      'Special Offer', 'New Feature', 'System Update'
    ];

    // Generate Users
    console.log(`Generating ${userCount} users...`);
    const users = [];
    
    for (let i = 0; i < userCount; i++) {
      users.push({
        name: faker.name.findName(),
        email: faker.internet.email(),
        phone: faker.phone.phoneNumber(),
        created_at: randomDate(startDate, new Date())
      });
    }
    
    await User.bulkCreate(users);
    console.log(`Created ${userCount} users`);

    // Generate Devices
    console.log('Generating devices...');
    const devices = [];
    
    for (let userId = 1; userId <= userCount; userId++) {
      const deviceCount = Math.floor(Math.random() * 3) + 1;
      
      for (let i = 0; i < deviceCount; i++) {
        devices.push({
          user_id: userId,
          device_token: uuidv4(),
          device_type: deviceTypes[Math.floor(Math.random() * deviceTypes.length)],
          created_at: randomDate(startDate, new Date())
        });
      }
    }
    
    await Device.bulkCreate(devices);
    console.log(`Created ${devices.length} devices`);

    // Generate Notifications
    console.log(`Generating ${notificationCount} notifications...`);
    const notifications = [];
    
    for (let i = 0; i < notificationCount; i++) {
      const title = notificationTitles[Math.floor(Math.random() * notificationTitles.length)];
      notifications.push({
        user_id: Math.floor(Math.random() * userCount) + 1,
        title: title,
        body: faker.lorem.sentences(2),
        created_at: randomDate(startDate, new Date())
      });
    }
    
    await Notification.bulkCreate(notifications);
    console.log(`Created ${notificationCount} notifications`);

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
