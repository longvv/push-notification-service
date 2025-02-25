# Push Notification Service

A scalable and robust service for managing and delivering push notifications across multiple channels.

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [System Architecture](#system-architecture)
4. [Documentation Guide](#documentation-guide)
5. [Getting Started](#getting-started)
6. [API Reference](#api-reference)
7. [WebSocket Interface](#websocket-interface)
8. [Monitoring & Logging](#monitoring--logging)
9. [Configuration](#configuration)
10. [Contributing](#contributing)

## Overview

The Push Notification Service is a microservice-based platform designed to handle high-volume notification delivery across multiple channels including mobile push, web push, email, and SMS. It provides real-time delivery, scheduling capabilities, and detailed tracking of notification status.

## Features

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

### Components

#### Infrastructure Components

- **PostgreSQL**: Primary database for storing user data, device information, and notification history
- **Redis**: Used for caching, rate limiting, and managing WebSocket connections
- **RabbitMQ**: Message broker for managing notification queues
- **ELK Stack**: Elasticsearch, Logstash, and Kibana for log management
- **Prometheus & Grafana**: For metrics collection and visualization

#### Service Components

- **API Server**: RESTful API for managing users, devices, and notifications
- **WebSocket Server**: Real-time notification delivery
- **Notification Workers**: Process and send notifications from queues
- **Scheduler**: Manages scheduled notifications

## Documentation Guide

The documentation for this project is organized into several documents to help you understand and use the system effectively:

1. **README.md** (this file) - Overview and gateway to other documentation
2. **[Setup Guide](Setup_and_configuration_guide.md)** - Detailed installation and configuration instructions
3. **[API Documentation](API_docs.md)** - Complete API reference for all endpoints
4. **[Technical Documentation](Technical_docs.md)** - Detailed technical implementation details

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Node.js (v16+) for local development
- PostgreSQL client (optional, for direct DB access)

### Quick Start

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

4. Verify the installation:
   ```bash
   # Check if all services are running
   docker-compose ps
   
   # Check API availability
   curl http://localhost:3000/api/healthcheck
   ```

For more detailed setup instructions, refer to the [Setup Guide](Setup_and_configuration_guide.md).

## API Reference

The service provides a RESTful API for managing users, devices, and notifications. Below are some key endpoints:

### Authentication

All API requests require authentication using API keys:

```
Header: X-API-Key: your_api_key_here
```

### Sample Endpoints

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

For complete API documentation, refer to the [API Documentation](API_docs.md).

## WebSocket Interface

The service provides a WebSocket interface for real-time notifications.

### Connection

Connect to the WebSocket server:

```
ws://your-domain.com/socket.io
```

### Authentication

After connecting, authenticate the WebSocket connection:

```javascript
// Client-side example
const socket = io('http://localhost:3000');
socket.emit('authenticate', { userId: 1 });
```

### Receiving Notifications

Listen for notification events:

```javascript
// Client-side example
socket.on('notification', (notification) => {
  console.log('New notification received', notification);
});
```

For more details, see the WebSocket section in the [API Documentation](API_docs.md).

## Monitoring & Logging

### Metrics

Prometheus metrics are available at `/metrics` endpoint:

- `notifications_sent_total`: Counter for total notifications sent
- `notification_latency_seconds`: Histogram for notification processing latency
- `active_websocket_connections`: Gauge for active WebSocket connections

### Dashboards

- Grafana is available at `http://localhost:3000` with pre-configured dashboards
- Kibana is available at `http://localhost:5601` for log exploration

## Configuration

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

For more configuration options, refer to the [Setup Guide](Setup_and_configuration_guide.md).

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting pull requests.

### Development Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start necessary services in development mode:
   ```bash
   docker-compose up -d postgres redis rabbitmq
   npm run dev
   ```

For more information on development workflow, check the [Technical Documentation](Technical_docs.md).