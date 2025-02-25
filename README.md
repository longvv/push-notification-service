# Push Notification Service

A scalable and robust service for managing and delivering push notifications across multiple channels.

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Setup & Installation](#setup--installation)
4. [Services & Components](#services--components)
5. [API Reference](#api-reference)
6. [Webhooks & Events](#webhooks--events)
7. [Monitoring & Logging](#monitoring--logging)
8. [Data Schema](#data-schema)
9. [Scaling Considerations](#scaling-considerations)
10. [Configuration Guide](#configuration-guide)

## Overview

The Push Notification Service is a microservice-based platform designed to handle high-volume notification delivery across multiple channels including mobile push, web push, email, and SMS. It provides real-time delivery, scheduling capabilities, and detailed tracking of notification status.

### Key Features

- **Multi-channel delivery** - Send notifications via mobile push, WebSockets, and future expansion to email and SMS
- **Real-time notifications** - WebSocket support for instant delivery
- **Message queueing** - RabbitMQ for reliable message delivery
- **Notification scheduling** - Send notifications at a specific time in the future
- **Comprehensive tracking** - Track delivery status and user engagement
- **Scalable architecture** - Designed to scale horizontally
- **Monitoring and metrics** - Prometheus integration for system monitoring
- **Centralized logging** - ELK stack for log aggregation and analysis

## System Architecture

The Push Notification Service follows a microservice architecture with the following components:

### Infrastructure Components

- **PostgreSQL**: Primary database for storing user data, device information, and notification history
- **Redis**: Used for caching, rate limiting, and managing WebSocket connections
- **RabbitMQ**: Message broker for managing notification queues
- **ELK Stack**: Elasticsearch, Logstash, and Kibana for log management
- **Prometheus & Grafana**: For metrics collection and visualization

### Service Components

- **API Server**: RESTful API for managing users, devices, and notifications
- **WebSocket Server**: Real-time notification delivery
- **Notification Workers**: Process and send notifications from queues
- **Scheduler**: Manages scheduled notifications

### Architecture Diagram

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Clients   │────▶│  API Server │────▶│  PostgreSQL │
└─────────────┘     └─────────────┘     └─────────────┘
       ▲                  │
       │                  ▼
       │            ┌─────────────┐     ┌─────────────┐
       │            │   RabbitMQ  │────▶│ Notification│
       │            └─────────────┘     │   Workers   │
       │                  ▲             └─────────────┘
       │                  │                    │
┌─────────────┐     ┌─────────────┐           │
│  WebSocket  │◀───▶│    Redis    │◀──────────┘
│   Server    │     └─────────────┘
└─────────────┘
       ▲
       │
┌─────────────┐
│   Web/App   │
│   Clients   │
└─────────────┘
```

## Setup & Installation

### Prerequisites

- Docker and Docker Compose
- Node.js (v16+) for local development
- PostgreSQL client (optional, for direct DB access)

### Installation Steps

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/push-notification-service.git
   cd push-notification-service
   ```

2. Create environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. Start the services with Docker Compose:
   ```bash
   docker-compose up -d
   ```

4. Initialize the database (if needed):
   ```bash
   # Database initialization happens automatically via init scripts
   ```

5. Verify the installation:
   ```bash
   # Check if all services are running
   docker-compose ps
   
   # Check API availability
   curl http://localhost:3000/api/healthcheck
   ```

### Development Setup

For local development:

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start services in development mode:
   ```bash
   npm run dev
   ```

## Services & Components

### API Server

The API server provides RESTful endpoints for:
- User management
- Device registration
- Notification sending and management
- Webhook configurations

### WebSocket Server

Enables real-time bidirectional communication between the server and clients:
- Authenticates clients
- Delivers notifications in real-time
- Handles client presence (online/offline status)

### Notification Workers

Background processes that:
- Consume messages from RabbitMQ queues
- Send notifications to appropriate delivery channels
- Handle retries for failed deliveries
- Update notification status in the database

### Caching Layer (Redis)

Used for:
- Temporary data storage
- Rate limiting
- WebSocket session management
- User presence tracking

### Message Queue (RabbitMQ)

Manages:
- Immediate notification queue
- Scheduled notification queue
- Dead-letter queue for failed notifications

### Monitoring Stack

- **Prometheus**: Collects metrics
- **Grafana**: Visualizes metrics with customizable dashboards

### Logging Stack

- **Elasticsearch**: Stores logs
- **Logstash**: Processes and forwards logs
- **Kibana**: Visualizes and searches logs

## API Reference

### Authentication

All API requests require authentication using API keys:

```
Header: X-API-Key: your_api_key_here
```

### Users

#### Create User

```
POST /api/users
```

Request:
```json
{
  "email": "user@example.com",
  "name": "John Doe",
  "phone": "+1234567890"
}
```

Response:
```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "John Doe",
  "phone": "+1234567890",
  "created_at": "2023-04-28T12:00:00Z"
}
```

#### Get User

```
GET /api/users/:id
```

Response:
```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "John Doe",
  "phone": "+1234567890",
  "created_at": "2023-04-28T12:00:00Z"
}
```

### Devices

#### Register Device

```
POST /api/users/:userId/devices
```

Request:
```json
{
  "device_token": "fcm-token-here",
  "device_type": "android" // or "ios", "web"
}
```

Response:
```json
{
  "id": 1,
  "user_id": 1,
  "device_token": "fcm-token-here",
  "device_type": "android",
  "created_at": "2023-04-28T12:05:00Z"
}
```

#### Get User Devices

```
GET /api/users/:userId/devices
```

Response:
```json
[
  {
    "id": 1,
    "user_id": 1,
    "device_token": "fcm-token-here",
    "device_type": "android",
    "created_at": "2023-04-28T12:05:00Z"
  }
]
```

#### Unregister Device

```
DELETE /api/users/:userId/devices/:deviceId
```

### Notifications

#### Send Notification

```
POST /api/notifications
```

Request:
```json
{
  "user_id": 1,
  "title": "New Message",
  "body": "You have received a new message",
  "data": {
    "message_id": 123,
    "sender": "other_user"
  }
}
```

Response:
```json
{
  "id": 1,
  "user_id": 1,
  "title": "New Message",
  "body": "You have received a new message",
  "data": {
    "message_id": 123,
    "sender": "other_user"
  },
  "status": "pending",
  "created_at": "2023-04-28T12:10:00Z"
}
```

#### Schedule Notification

```
POST /api/notifications/schedule
```

Request:
```json
{
  "user_id": 1,
  "title": "Appointment Reminder",
  "body": "Your appointment is tomorrow",
  "data": {
    "appointment_id": 456
  },
  "scheduled_time": "2023-04-29T09:00:00Z"
}
```

Response:
```json
{
  "id": 2,
  "user_id": 1,
  "title": "Appointment Reminder",
  "body": "Your appointment is tomorrow",
  "data": {
    "appointment_id": 456
  },
  "status": "scheduled",
  "scheduled_time": "2023-04-29T09:00:00Z",
  "created_at": "2023-04-28T12:15:00Z"
}
```

#### Get User Notifications

```
GET /api/notifications/user/:userId
```

Response:
```json
[
  {
    "id": 1,
    "user_id": 1,
    "title": "New Message",
    "body": "You have received a new message",
    "data": {
      "message_id": 123,
      "sender": "other_user"
    },
    "status": "delivered",
    "sent_at": "2023-04-28T12:10:05Z",
    "created_at": "2023-04-28T12:10:00Z"
  }
]
```

## Webhooks & Events

The service can send webhook notifications for the following events:

- `notification.sent`: When a notification is successfully sent
- `notification.failed`: When a notification fails to send
- `notification.clicked`: When a user clicks/opens a notification
- `device.registered`: When a new device is registered
- `device.unregistered`: When a device is unregistered

### Webhook Format

```json
{
  "event": "notification.sent",
  "timestamp": "2023-04-28T12:10:05Z",
  "data": {
    "notification_id": 1,
    "user_id": 1,
    "status": "delivered"
  }
}
```

### WebSocket Events

Clients can listen for the following events:

- `notification`: Received when a notification is sent to the user
- `broadcast`: Received for general announcements to all users

## Monitoring & Logging

### Metrics

Prometheus metrics are available at `/metrics` endpoint:

- `notifications_sent_total`: Counter for total notifications sent
- `notification_latency_seconds`: Histogram for notification processing latency
- `active_websocket_connections`: Gauge for active WebSocket connections

### Grafana Dashboards

Grafana is available at `http://localhost:3000` with pre-configured dashboards:
- Notification Delivery Dashboard
- System Health Dashboard
- WebSocket Connections Dashboard

### Log Access

Kibana is available at `http://localhost:5601` for log exploration.

## Data Schema

### Database Tables

#### Users

| Column    | Type          | Description       |
|-----------|---------------|-------------------|
| id        | SERIAL (PK)   | Unique identifier |
| name      | VARCHAR(255)  | User's name       |
| email     | VARCHAR(255)  | User's email      |
| phone     | VARCHAR(255)  | User's phone      |
| created_at| TIMESTAMP     | Creation timestamp|

#### Devices

| Column       | Type         | Description         |
|--------------|--------------|---------------------|
| id           | SERIAL (PK)  | Unique identifier   |
| user_id      | INTEGER (FK) | Reference to user   |
| device_token | TEXT         | Device token        |
| device_type  | VARCHAR(50)  | Device type         |
| created_at   | TIMESTAMP    | Creation timestamp  |

#### Notifications

| Column     | Type          | Description         |
|------------|---------------|---------------------|
| id         | SERIAL (PK)   | Unique identifier   |
| user_id    | INTEGER (FK)  | Reference to user   |
| title      | VARCHAR(255)  | Notification title  |
| body       | TEXT          | Notification body   |
| data       | JSONB         | Additional data     |
| status     | VARCHAR(50)   | Delivery status     |
| sent_at    | TIMESTAMP     | Sent timestamp      |
| created_at | TIMESTAMP     | Creation timestamp  |

#### Additional Tables

The schema also includes tables for:
- `user_preferences`: User notification preferences
- `sent_notifications`: Detailed delivery tracking
- `failed_notifications`: Track failures and retries
- `notification_logs`: Audit logs for notifications
- `email_logs`, `sms_logs`, `push_notification_logs`: Channel-specific logs

## Scaling Considerations

The service is designed to scale horizontally:

### API Scaling

- Deploy multiple API server instances behind a load balancer
- Scale based on CPU/memory usage or request rate

### Worker Scaling

- Multiple worker instances can consume from the same queues
- Workers can be scaled independently based on queue length

### Database Scaling

- Consider read replicas for high-read scenarios
- Implement database sharding for very large deployments

### Caching Strategy

- Use Redis for frequent data access
- Implement cache invalidation strategies

## Configuration Guide

### Environment Variables

| Variable          | Description                   | Default     |
|-------------------|-------------------------------|-------------|
| PORT              | API server port               | 3000        |
| NODE_ENV          | Environment                   | development |
| DB_HOST           | PostgreSQL host               | postgres    |
| DB_PORT           | PostgreSQL port               | 5432        |
| DB_NAME           | PostgreSQL database name      | notification_db |
| DB_USER           | PostgreSQL username           | admin       |
| DB_PASSWORD       | PostgreSQL password           | admin123    |
| REDIS_HOST        | Redis host                    | redis       |
| REDIS_PORT        | Redis port                    | 6379        |
| RABBITMQ_HOST     | RabbitMQ host                 | rabbitmq    |
| RABBITMQ_PORT     | RabbitMQ port                 | 5672        |
| RABBITMQ_USER     | RabbitMQ username             | admin       |
| RABBITMQ_PASSWORD | RabbitMQ password             | admin123    |
| LOG_LEVEL         | Logging level                 | info        |

### Docker Compose Configuration

The `docker-compose.yml` file defines all required services:

- PostgreSQL for data storage
- Redis for caching
- RabbitMQ for message queuing
- ELK stack for logging
- Prometheus and Grafana for monitoring

Each service can be configured via the environment variables or by editing the Docker Compose file directly.

### Service Logs

View logs for each service:

```bash
# View logs for specific service
docker-compose logs -f api

# View logs for all services
docker-compose logs -f
```

### Backup & Restore

Database backup:

```bash
docker-compose exec postgres pg_dump -U admin notification_db > backup.sql
```

Database restore:

```bash
cat backup.sql | docker-compose exec -T postgres psql -U admin notification_db
```