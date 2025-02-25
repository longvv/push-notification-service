# Technical Code Documentation

This document provides detailed technical documentation for the Push Notification Service codebase, explaining the architecture, patterns, and implementation details.

## Project Structure

```
push-notification-service/
├── docker-compose.yml       # Docker services configuration
├── init-scripts/            # Database initialization scripts
│   └── 01-init.sql          # SQL script for database setup
├── logstash/                # Logstash configuration
│   └── pipeline/            # Logstash pipeline config
├── prometheus/              # Prometheus configuration
├── src/                     # Main application code
│   ├── api/                 # REST API implementation
│   │   ├── controllers/     # API endpoint controllers
│   │   ├── index.js         # API server setup
│   │   └── routes.js        # API route definitions
│   ├── config/              # Service configurations
│   │   ├── database.js      # PostgreSQL connection
│   │   ├── logging.js       # Winston logger config
│   │   ├── metrics.js       # Prometheus metrics
│   │   ├── rabbitmq.js      # RabbitMQ connection and queues
│   │   └── redis.js         # Redis connection
│   ├── models/              # Database models
│   │   ├── device.js        # Device model
│   │   ├── index.js         # Model exports
│   │   ├── notification.js  # Notification model
│   │   └── user.js          # User model
│   ├── websocket/           # WebSocket implementation
│   │   └── index.js         # WebSocket server
│   ├── workers/             # Background workers
│   │   ├── index.js         # Worker initialization
│   │   └── notificationWorker.js # Notification processing
│   └── index.js             # Main application entry point
├── .env.example             # Example environment variables
├── .gitignore               # Git ignore file
├── package.json             # NPM package configuration
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

#### API Server Initialization:

```javascript
// src/api/index.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const router = require('./routes');

const createServer = () => {
  const app = express();
  
  // Security middleware
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  
  // Routes
  app.use('/api', router);
  
  // Error handling
  app.use((err, req, res, next) => {
    logger.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  });
  
  return app;
};
```

### 2. Database Models (src/models)

The application uses Sequelize ORM to interact with PostgreSQL. The models represent the database tables and their relationships.

#### Key Models:

- **User**: Represents application users
- **Device**: Represents user devices for notification delivery
- **Notification**: Stores notification data and delivery status

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
  // Additional fields...
});

// Define relationships
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });
```

### 3. WebSocket Server (src/websocket)

The WebSocket server enables real-time bidirectional communication with clients, primarily for delivering notifications instantly.

#### Key Features:

- Socket.IO implementation
- User authentication and room management
- Real-time notification delivery
- Connection tracking with metrics

#### WebSocket Implementation:

```javascript
// src/websocket/index.js
const socketIO = require('socket.io');
const logger = require('../config/logging');

const setupWebsocket = (server) => {
  const io = socketIO(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  // Track active connections
  const activeConnections = new Set();

  io.on('connection', (socket) => {
    logger.info(`New WebSocket connection: ${socket.id}`);
    
    // Add to active connections
    activeConnections.add(socket.id);
    metrics.activeWebsocketConnections.set(activeConnections.size);
    
    // Handle authentication
    socket.on('authenticate', async (data) => {
      // Authentication logic...
    });
    
    // Handle disconnection
    socket.on('disconnect', async () => {
      // Disconnection logic...
    });
  });

  return io;
};
```

### 4. Message Queue Workers (src/workers)

Workers process messages from RabbitMQ queues to deliver notifications through various channels.

#### Key Features:

- Immediate notification processing
- Scheduled notification processing
- Error handling and retry logic
- Delivery status tracking

#### Worker Implementation:

```javascript
// src/workers/notificationWorker.js
const { consumeMessages } = require('../config/rabbitmq');
const { User, Device, Notification } = require('../models');
const logger = require('../config/logging');

const processImmediateNotifications = async () => {
  logger.info('Starting immediate notification worker');
  
  await consumeMessages('immediate_notifications', async (message) => {
    try {
      const { notification_id, user_id, title, body, data } = message;
      
      // Process and send notification...
      
    } catch (error) {
      logger.error('Error processing notification:', error);
      // Error handling logic...
    }
  });
};
```

### 5. Configuration Modules (src/config)

Configuration modules handle connections to external services and define their usage throughout the application.

#### Key Configurations:

- **database.js**: PostgreSQL connection and Sequelize setup
- **redis.js**: Redis client configuration
- **rabbitmq.js**: RabbitMQ connection, exchanges, and queues
- **logging.js**: Winston logger configuration
- **metrics.js**: Prometheus metrics definition

#### Configuration Example:

```javascript
// src/config/rabbitmq.js
const amqp = require('amqplib');
let connection = null;
let channel = null;

const connectRabbitMQ = async () => {
  try {
    const host = process.env.RABBITMQ_HOST || 'localhost';
    const port = process.env.RABBITMQ_PORT || 5672;
    const user = process.env.RABBITMQ_USER || 'admin';
    const password = process.env.RABBITMQ_PASSWORD || 'admin123';
    
    const url = `amqp://${user}:${password}@${host}:${port}`;
    
    connection = await amqp.connect(url);
    channel = await connection.createChannel();
    
    // Define exchanges and queues...
    
    return { connection, channel };
  } catch (error) {
    console.error('Failed to connect to RabbitMQ:', error);
    setTimeout(connectRabbitMQ, 5000);
  }
};
```

## Database Schema

The database schema is defined in the `init-scripts/01-init.sql` file and implemented through Sequelize models.

### Tables Structure:

#### users
```sql
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### devices
```sql
CREATE TABLE IF NOT EXISTS devices (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    device_token TEXT NOT NULL,
    device_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### notifications
```sql
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

Additional tables support notification preferences, delivery tracking, and auditing.

## Message Queue Architecture

The service uses RabbitMQ for reliable message delivery, with the following components:

### Exchanges

- **notifications** (topic): Main exchange for notification routing

### Queues

- **immediate_notifications**: For notifications to be delivered immediately
- **scheduled_notifications**: For notifications scheduled for future delivery

### Routing Keys

- **notification.immediate**: Routes to immediate_notifications queue
- **notification.scheduled**: Routes to scheduled_notifications queue

### Message Structure

```javascript
{
  notification_id: 123,       // Database ID of the notification
  user_id: 456,               // Target user ID
  title: "Notification Title", // Notification title
  body: "Notification body",   // Notification message
  data: { ... },              // Additional data payload
  scheduled_time: "2023-05-01T12:00:00Z" // For scheduled notifications
}
```

## WebSocket Protocol

The WebSocket implementation uses Socket.IO and defines the following events:

### Server to Client Events

- **notification**: Sends notification data to a specific user
- **broadcast**: Sends announcement to all connected users
- **authenticated**: Confirms successful authentication
- **error**: Sends error information to client

### Client to Server Events

- **authenticate**: Client sends user ID to associate the socket with a user
- **disconnect**: Client disconnects from the server

### Event Data Examples

Authentication request:
```javascript
socket.emit('authenticate', { userId: 123 });
```

Notification event:
```javascript
// Server to client
socket.emit('notification', {
  id: 456,
  title: "New Message",
  body: "You have a new message",
  data: { ... }
});
```

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
- Failed message handling with RabbitMQ mechanisms

### Connection Error Handling

- Automatic reconnection for database, Redis, and RabbitMQ
- Exponential backoff for retry attempts
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

Metrics are exposed at the `/metrics` endpoint and collected by Prometheus.

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

In development: Console output
In production: Console + ELK stack integration

## Deployment Considerations

The service is designed for containerized deployment with Docker:

### Container Configuration

The `docker-compose.yml` file defines all required services:
- PostgreSQL
- Redis
- RabbitMQ
- ELK stack
- Prometheus and Grafana

### Resource Requirements

Recommended minimum resources:
- API Server: 256MB RAM
- Worker: 256MB RAM per worker
- Database: 1GB RAM
- Redis: 512MB RAM
- RabbitMQ: 512MB RAM

### Scaling Approach

- Horizontal scaling of API servers
- Horizontal scaling of workers
- Vertical scaling of database and message queue

## Code Style and Patterns

The codebase follows these patterns and conventions:

### Asynchronous Handling

Async/await is used throughout the codebase for asynchronous operations.

### Dependency Injection

External dependencies are passed to modules that need them, promoting testability.

### Error Handling

Consistent error handling with try/catch blocks for async code.

### Logging

Consistent logging format with appropriate log levels.

### Configuration

Environment-based configuration with sensible defaults.

## Security Considerations

The service implements several security measures:

### API Security

- Helmet.js for HTTP security headers
- CORS configuration
- Input validation on all endpoints

### Authentication

The code is prepared for authentication but actual implementation depends on integration requirements.

### Data Security

- Database credentials stored in environment variables
- Connection strings never logged
- Proper error handling to prevent information leakage

## Testing Approach

Though tests are not included in the current codebase, the architecture supports:

### Unit Testing

- Individual module testing
- Mocking of external dependencies

### Integration Testing

- API endpoint testing
- Database integration testing
- Message queue integration testing

### Load Testing

- Simulating high notification throughput
- WebSocket connection stress testing

## Development Workflow

### Local Development

1. Start dependencies with Docker Compose:
   ```bash
   docker-compose up -d postgres redis rabbitmq
   ```

2. Run the application in development mode:
   ```bash
   npm run dev
   ```

### Debugging

- Use standard Node.js debugging via `--inspect`
- Console logs are formatted for readability in development

### CI/CD Considerations

A typical CI/CD pipeline would include:
1. Code linting
2. Unit tests
3. Integration tests
4. Docker image building
5. Deployment to staging
6. Deployment to production