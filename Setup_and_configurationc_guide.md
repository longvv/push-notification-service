# Push Notification Service Setup Guide

This guide provides detailed instructions for setting up, configuring, and running the Push Notification Service on your local or production environment.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Environment Configuration](#environment-configuration)
4. [Database Setup](#database-setup)
5. [Running the Service](#running-the-service)
6. [Docker Deployment](#docker-deployment)
7. [Testing](#testing)
8. [Production Considerations](#production-considerations)
9. [Troubleshooting](#troubleshooting)

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js:** Version 16.x or later
- **npm:** Version 8.x or later
- **Docker & Docker Compose:** For containerized deployment
- **PostgreSQL client** (optional): For direct database access

## Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/yourusername/push-notification-service.git
   cd push-notification-service
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

## Environment Configuration

1. **Create environment file:**

   ```bash
   cp .env.example .env
   ```

2. **Configure environment variables:**

   Edit the `.env` file with your specific settings:

   ```
   # Server Configuration
   PORT=3000
   NODE_ENV=development

   # Database
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=notification_db
   DB_USER=admin
   DB_PASSWORD=admin123

   # Redis
   REDIS_HOST=localhost
   REDIS_PORT=6379

   # RabbitMQ
   RABBITMQ_HOST=localhost
   RABBITMQ_PORT=5672
   RABBITMQ_USER=admin
   RABBITMQ_PASSWORD=admin123

   # Logging
   LOG_LEVEL=info
   ```

   For development with Docker Compose, use the service names as hosts:

   ```
   DB_HOST=postgres
   REDIS_HOST=redis
   RABBITMQ_HOST=rabbitmq
   ```

## Database Setup

1. **Using Docker Compose (Recommended):**

   Run PostgreSQL container with pre-configured initialization scripts:

   ```bash
   docker-compose up -d postgres
   ```

   The initialization scripts in the `init-scripts` directory will automatically create the required tables.

2. **Manual Setup:**

   If you're using an existing PostgreSQL instance:

   ```bash
   psql -U your_username -d your_database -f init-scripts/01-init.sql
   ```

## Running the Service

### Development Mode

Run the service in development mode with auto-restart on file changes:

```bash
npm run dev
```

### Production Mode

For production environments:

```bash
npm start
```

### Starting Specific Components

You can start individual components separately:

```bash
# Start only the API server
node src/api/index.js

# Start only the notification workers
node src/workers/index.js
```

## Docker Deployment

The project includes Docker configuration for easy deployment of all required services.

### Running with Docker Compose

1. **Start all services:**

   ```bash
   docker-compose up -d
   ```

2. **Start only specific services:**

   ```bash
   docker-compose up -d postgres redis rabbitmq
   ```

3. **View logs:**

   ```bash
   docker-compose logs -f
   ```

4. **Stop all services:**

   ```bash
   docker-compose down
   ```

### Container Services

The `docker-compose.yml` file defines the following services:

- **postgres:** PostgreSQL database
- **redis:** Redis for caching and WebSocket state
- **rabbitmq:** RabbitMQ message broker
- **elasticsearch:** Part of ELK stack for logging
- **logstash:** Log processor
- **kibana:** Log visualization
- **prometheus:** Metrics collection
- **grafana:** Metrics visualization

### Accessing Service UIs

After starting the containers, you can access:

- **RabbitMQ Management:** http://localhost:15672 (admin/admin123)
- **Kibana:** http://localhost:5601
- **Prometheus:** http://localhost:9090
- **Grafana:** http://localhost:3000 (admin/admin123)

## Testing

### API Testing

You can test the API endpoints using tools like Postman or curl:

```bash
# Test health endpoint
curl http://localhost:3000/api/health

# Create a user
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test User","phone":"+1234567890"}'
```

### WebSocket Testing

To test WebSocket connections, you can use a tool like `wscat`:

```bash
# Install wscat
npm install -g wscat

# Connect to WebSocket server
wscat -c ws://localhost:3000
```

After connecting, authenticate:

```json
{"event":"authenticate","data":{"userId":1}}
```

## Production Considerations

### Security

1. **API Authentication:**
   
   Implement a proper authentication mechanism, such as JWT tokens, API keys, or OAuth.

2. **Environment Variables:**
   
   Ensure all sensitive information is stored in environment variables, not in code.

3. **CORS Configuration:**
   
   Update the CORS settings in `src/api/index.js` to restrict access to your domains.

4. **Rate Limiting:**
   
   Enable rate limiting for public endpoints to prevent abuse.

### Scaling

1. **Horizontal Scaling:**
   
   The service is designed to scale horizontally. You can run multiple instances behind a load balancer.

2. **Database Scaling:**
   
   For high-traffic scenarios, consider database read replicas and connection pooling.

3. **Worker Scaling:**
   
   You can run multiple worker instances to process notifications in parallel.

### Monitoring

1. **Set Up Alerts:**
   
   Configure alerts in Prometheus/Grafana for key metrics:
   - High error rates
   - Increased latency
   - Queue backlog growth
   - System resource usage

2. **Health Checks:**
   
   Implement comprehensive health checks for each component.

### Backup and Recovery

1. **Database Backups:**
   
   Set up regular PostgreSQL backups:

   ```bash
   docker-compose exec postgres pg_dump -U admin notification_db > backup.sql
   ```

2. **Configuration Backups:**
   
   Back up your environment configurations and any custom settings.

## Troubleshooting

### Service Connection Issues

If you encounter connection issues between services:

1. **Check service status:**

   ```bash
   docker-compose ps
   ```

2. **Verify network connectivity:**

   ```bash
   docker-compose exec api ping postgres
   ```

3. **Check service logs:**

   ```bash
   docker-compose logs postgres
   ```

### Database Issues

1. **Connection failures:**

   Ensure the database is running and credentials are correct:

   ```bash
   docker-compose exec postgres psql -U admin -d notification_db -c "SELECT 1"
   ```

2. **Schema issues:**

   Verify the database schema:

   ```bash
   docker-compose exec postgres psql -U admin -d notification_db -c "\dt"
   ```

### RabbitMQ Issues

1. **Connection failures:**

   Check RabbitMQ status:

   ```bash
   docker-compose exec rabbitmq rabbitmqctl status
   ```

2. **Queue issues:**

   List queues and their status:

   ```bash
   docker-compose exec rabbitmq rabbitmqctl list_queues
   ```

### Common Error Solutions

1. **"ECONNREFUSED" errors:**
   
   Usually indicates that a service isn't running or isn't accepting connections. Check the service status and logs.

2. **"Authentication failed" errors:**
   
   Verify that the credentials in your `.env` file match those expected by the service.

3. **Database "relation does not exist" errors:**
   
   Ensure that the database initialization scripts have been run successfully.

## Next Steps

After successfully setting up the Push Notification Service, you might want to:

1. **Integrate with your application**
   - Add API calls to your backend
   - Implement WebSocket connections in your frontend

2. **Customize the service**
   - Add new notification channels
   - Extend the API with additional endpoints
   - Customize notification templates

3. **Set up CI/CD**
   - Automate testing and deployment
   - Set up staging and production environments