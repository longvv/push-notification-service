# Technical Documentation

This document provides detailed technical documentation for the Push Notification Service codebase, explaining the current architecture, patterns, and implementation details.

## Current Implementation Status

For a detailed overview of which features are implemented vs. planned, please refer to the [Implementation Status](IMPLEMENTATION_STATUS.md) document.

## Project Structure

```
push-notification-service/
├── docker-compose.yml       # Docker services configuration
├── init-scripts/            # Database initialization scripts
│   └── 01-init.sql          # SQL script for database setup
├── logstash/                # Logstash configuration (for future use)
├── prometheus/              # Prometheus configuration
│   └── prometheus.yml       # Prometheus metrics configuration
├── src/                     # Main application code
│   ├── api/                 # REST API implementation
│   │   ├── controllers/     # API endpoint controllers
│   │   │   ├── devices.js   # Device controller
│   │   │   ├── notifications.js # Notification controller
│   │   │   └── users.js     # User controller
│   │   ├── index.js         # API server setup
│   │   └── routes.js        # API route definitions
│   ├── config/              # Service configurations
│   │   ├── database.js      # PostgreSQL connection
│   │   ├── logging.js       # Winston logger config
│   │   ├── metrics.js       # Prometheus metrics
│   │   ├── rabbitmq.js      # RabbitMQ connection and queues
│   │   └── redis.js         # Redis connection (partially implemented)
│   ├── models/              # Database models
│   │   ├── device.js        # Device model
│   │   ├── index.js         # Model exports
│   │   ├── notification.js  # Notification model
│   │   └── user.js          # User model (NEEDS UPDATE to match schema)
│   ├── websocket/           # WebSocket implementation
│   │   └── index.js         # WebSocket server
│   ├── workers/             # Background workers
│   │   ├── index.js         # Worker initialization
│   │   └── notificationWorker.js # Notification processing
│   └── index.js             # Main application entry point
├── data-generators/         # Test data generation tools
│   └── data-generator.js    # Database seeder script
├── .env.example             # Example environment variables
├── Dockerfile               # Docker image configuration
├── Makefile                 # Helper commands
└── README.md                # Project README
```

## Core Components

### 1. API Server (src/api)

The API server is built using Express.js and provides RESTful endpoints for interacting with the system.

#### Key Features:
- Route definitions (`routes.js`)
- Controller implementation (`controllers/`)
- Middleware configuration (`index.js`)
- Error handling and logging
- Prometheus metrics endpoint (`/metrics`)

#### Current Implementation Status:
- ✅ Core route handling
- ✅ Basic CRUD operations for users, devices, and notifications
- ✅ Error handling middleware
- ⚠️ Missing some endpoints like notification scheduling, user preferences

#### API Server Initialization:

```javascript
// src/api/index.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const router = require('./routes');
const { register } = require('../config/metrics');
const logger = require('../config/logging');

const createServer = () => {
  const app = express();
  
  // Middleware
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  
  // Logging middleware
  app.use((req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.info({
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        duration,
      });
    });
    
    next();
  });
  
  // Routes
  app.use('/api', router);
  
  // Prometheus metrics endpoint
  app.get('/metrics', async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  });
  
  // Error handling
  app.use((err, req, res, next) => {
    logger.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  });
  
  return app;
};

module.exports = createServer;
```

### 2. Database Models (src/models)

The application uses Sequelize ORM to interact with PostgreSQL. The models represent the database tables and their relationships.

#### Implemented Models:

- **User**: Represents application users
- **Device**: Represents user devices for notification delivery
- **Notification**: Stores notification data and delivery status

#### Model Implementation Issues:

- **User Model**: Missing `name` and `phone` fields that exist in the database schema
- **Missing Models**: Several tables defined in the database schema don't have corresponding model files (UserPreferences, SentNotifications, etc.)

#### Model Definition Example:

```javascript
// src/models/notification.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./user');

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
      model: User,
      key: 'id'
    }
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  body: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  data: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  status: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  sent_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'notifications',
  timestamps: false
});

// Define relationships
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });

module.exports = Notification;
```

### 3. WebSocket Server (src/websocket)

The WebSocket server enables real-time bidirectional communication with clients for delivering notifications instantly.

#### Key Features:

- Socket.IO implementation
- User authentication and room management
- Real-time notification delivery
- Connection tracking with metrics

#### WebSocket Implementation:

```javascript
// src/websocket/index.js (partial)
const socketIO = require('socket.io');
const logger = require('../config/logging');
const { metrics } = require('../config/metrics');

const setupWebsocket = (server) => {
  // Initialize Socket.IO with CORS settings
  const io = socketIO(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  // Track active connections for metrics
  const activeConnections = new Set();

  io.on('connection', (socket) => {
    logger.info(`New WebSocket connection: ${socket.id}`);
    
    // Add to active connections
    activeConnections.add(socket.id);
    metrics.activeWebsocketConnections.set(activeConnections.size);
    
    // Handle user authentication
    socket.on('authenticate', async (data) => {
      try {
        const { userId } = data;
        if (!userId) {
          return socket.emit('error', { message: 'User ID is required' });
        }

        // Associate socket with user
        socket.userId = userId;
        await socket.join(`user:${userId}`);
        
        socket.emit('authenticated', { success: true });
        logger.info(`User ${userId} authenticated on socket ${socket.id}`);
      } catch (error) {
        logger.error('Authentication error:', error);
        socket.emit('error', { message: 'Authentication failed' });
      }
    });
    
    // Handle disconnection
    socket.on('disconnect', async () => {
      // Implementation details
    });
  });

  return io;
};
```

### 4. Message Queue Workers (src/workers)

Workers process messages from RabbitMQ queues to deliver notifications to users.

#### Key Features:

- Immediate notification processing (fully implemented)
- Scheduled notification processing (partially implemented)
- Error handling
- WebSocket notification delivery
- Metrics tracking

#### Worker Implementation:

```javascript
// src/workers/notificationWorker.js (partial)
const { consumeMessages } = require('../config/rabbitmq');
const { User, Device, Notification } = require('../models');
const logger = require('../config/logging');
const { metrics } = require('../config/metrics');
const websocket = require('../websocket');

const processImmediateNotifications = async () => {
  logger.info('Starting immediate notification worker');
  
  await consumeMessages('immediate_notifications', async (message) => {
    const startTime = Date.now();
    
    try {
      const { notification_id, user_id, title, body, data } = message;
      logger.info(`Processing notification ${notification_id} for user ${user_id}`);
      
      // Get user devices to send notification to
      const devices = await Device.findAll({
        where: { user_id }
      });
      
      // Send via WebSocket
      const socketSent = await websocket.sendNotificationToUser(user_id, {
        id: notification_id,
        title,
        body,
        data
      });
      
      // Update notification status
      await Notification.update(
        { 
          status: 'delivered',
          sent_at: new Date()
        },
        { where: { id: notification_id } }
      );
      
      // Metrics
      metrics.notificationsSent.inc({ status: 'success', type: 'immediate' });
      const latency = (Date.now() - startTime) / 1000;
      metrics.notificationLatency.observe({ type: 'immediate' }, latency);
      
    } catch (error) {
      logger.error('Error processing notification:', error);
      metrics.notificationsSent.inc({ status: 'error', type: 'immediate' });
    }
  });
};
```

### 5. Configuration Modules (src/config)

Configuration modules handle connections to external services and define their usage throughout the application.

#### Key Configurations:

- **database.js**: PostgreSQL connection and Sequelize setup
- **redis.js**: Redis client configuration (partial implementation)
- **rabbitmq.js**: RabbitMQ connection, exchanges, and queues
- **logging.js**: Winston logger configuration
- **metrics.js**: Prometheus metrics definition

#### Implementation Issues:

- **database.js**: Uses hardcoded configuration values instead of environment variables
- **redis.js**: Limited functionality, not fully integrated with caching and rate limiting features

## Database Schema

The current database schema is defined in the `init-scripts/01-init.sql` file and implemented through Sequelize models.

### Schema vs. Model Discrepancies:

#### Schema Tables
```sql
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### User Model (Missing Fields)
```javascript
const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'users',
  timestamps: false
});
```

### Missing Models:
The following tables have schema definitions but no corresponding models:
- user_preferences
- sent_notifications
- failed_notifications
- notification_logs
- email_logs
- sms_logs
- push_notification_logs
- webhook_logs

## Message Queue Architecture

The service uses RabbitMQ for reliable message delivery, with the following components:

### Exchanges

- **notifications** (topic): Main exchange for notification routing

### Queues

- **immediate_notifications**: For notifications to be delivered immediately
- **scheduled_notifications**: For notifications scheduled for future delivery (partially implemented)

### Routing Keys

- **notification.immediate**: Routes to immediate_notifications queue
- **notification.scheduled**: Routes to scheduled_notifications queue (partially implemented)

### Message Structure

```javascript
{
  notification_id: 123,       // Database ID of the notification
  user_id: 456,               // Target user ID
  title: "Notification Title", // Notification title
  body: "Notification body",   // Notification message
  data: { ... },              // Additional data payload
  scheduled_time: "2023-05-01T12:00:00Z" // For scheduled notifications (partially implemented)
}
```

## WebSocket Protocol

The WebSocket implementation uses Socket.IO and defines the following events:

### Server to Client Events

- **notification**: Sends notification data to a specific user
- **authenticated**: Confirms successful authentication
- **error**: Sends error information to client

### Client to Server Events

- **authenticate**: Client sends user ID to associate the socket with a user
- **disconnect**: Client disconnects from the server

## Error Handling Approach

The service implements multiple layers of error handling:

### API Error Handling

- Try/catch blocks in controllers
- Express error middleware for uncaught errors
- HTTP status codes for different error types

### Worker Error Handling

- Try/catch blocks for message processing
- Error logging to the centralized logging system
- Message acknowledgement only after successful processing

### Connection Error Handling

- Basic reconnection logic for database and message queue
- Graceful degradation when services are unavailable

## Metrics and Monitoring

The service exposes Prometheus metrics for monitoring:

### Custom Metrics

- **notifications_sent_total**: Counter for total sent notifications
  - Labels: status, type
- **notification_latency_seconds**: Histogram for processing latency
  - Labels: type
- **active_websocket_connections**: Gauge for active connections

### Integration

Metrics are exposed at the `/metrics` endpoint for collection by Prometheus.

## Logging Strategy

The service uses a structured logging approach with Winston:

### Log Levels

- **error**: Application errors and exceptions
- **warn**: Warnings and non-critical issues
- **info**: Important application events
- **debug**: Detailed debug information

### Log Format

JSON-formatted logs with standardized fields:
- timestamp
- level
- message
- service
- additional context

### Log Transport

Currently, logs are output to the console. Future implementation will add ELK stack integration.

## Deployment Considerations

The service is designed for containerized deployment with Docker:

### Container Configuration

The `docker-compose.yml` file defines the required services:
- API Server
- PostgreSQL
- RabbitMQ
- Redis
- Prometheus (optional profile)
- ELK stack (optional profile, planned for future)

### Resource Requirements

Recommended minimum resources for current implementation:
- API Server: 256MB RAM
- Database: 1GB RAM
- RabbitMQ: 512MB RAM

## Known Issues and Improvement Areas

1. **User Model Discrepancy**:
   - The User model is missing `name` and `phone` fields that exist in the database schema
   - **Fix**: Update the User model to include all fields from the schema

2. **Missing Model Files**:
   - Several tables defined in the schema don't have corresponding model files
   - **Fix**: Create model files for UserPreference, SentNotification, NotificationLog, etc.

3. **Scheduled Notifications**:
   - Worker logic exists but API endpoint is not implemented
   - **Fix**: Implement the scheduled notifications API endpoint and controller

4. **Hardcoded Configuration**:
   - Database configuration uses hardcoded values instead of environment variables
   - **Fix**: Use environment variables throughout the configuration files

5. **Redis Integration**:
   - Limited Redis functionality
   - **Fix**: Expand Redis integration for caching, rate limiting, and more robust presence tracking

6. **API Documentation Alignment**:
   - Some API documentation doesn't accurately reflect implementation status
   - **Fix**: Update API documentation to match actual implementation

## Code Style and Patterns

The codebase follows these patterns and conventions:

### Asynchronous Handling

Async/await is used throughout the codebase for asynchronous operations.

### Error Handling

Consistent error handling with try/catch blocks for async code.

### Logging

Consistent logging format with appropriate log levels.

### Configuration

Environment-based configuration with sensible defaults.

## Security Considerations

The service implements several basic security measures:

### API Security

- Helmet.js for HTTP security headers
- CORS configuration
- Input validation on key endpoints

### Authentication

Basic authentication for WebSocket connections. More robust authentication is planned for future implementation.

## Testing Approach

Test suite is planned for future implementation. The current architecture supports:

### Unit Testing

- Individual module testing
- Mocking of external dependencies

### Integration Testing

- API endpoint testing
- Database integration testing
- Message queue integration testing

## Development Workflow

### Local Development

1. Start dependencies with Docker Compose:
   ```bash
   docker-compose up -d postgres rabbitmq
   ```

2. Run the application in development mode:
   ```bash
   npm run dev
   ```

### Debugging

- Use standard Node.js debugging via `--inspect`
- Console logs are formatted for readability in development

## Roadmap and Future Enhancements

### Short-term (Next Release)

1. Fix User model to match database schema (add name and phone fields)
2. Implement scheduled notifications API endpoint
3. Create models for user preferences and notification logs
4. Improve Redis integration for better caching and rate limiting

### Mid-term

1. Implement multi-channel delivery (email, SMS)
2. Add user preferences functionality
3. Implement notification templates
4. Complete ELK stack integration

### Long-term

1. Implement webhook integration
2. Add advanced analytics
3. Implement notification batching
4. Add A/B testing capabilities