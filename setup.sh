#!/bin/bash

# Colors for prettier output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=====================================================${NC}"
echo -e "${BLUE}  Push Notification Service - Complete Setup Script${NC}"
echo -e "${BLUE}=====================================================${NC}"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js is not installed. Please install Node.js before continuing.${NC}"
    echo "Visit https://nodejs.org/ to download and install."
    exit 1
fi

echo -e "${GREEN}✓${NC} Node.js is installed: $(node -v)"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}npm is not installed. Please install npm before continuing.${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} npm is installed: $(npm -v)"

# Tạo thư mục gốc nếu chưa tồn tại
mkdir -p push-notification-service

# Di chuyển vào thư mục gốc
cd push-notification-service

echo -e "${YELLOW}Setting up project structure...${NC}"

# Tạo cấu trúc thư mục src và các thư mục con
mkdir -p src/{config,api,websocket,services,models,workers,utils}
mkdir -p data-generators
mkdir -p init-scripts
mkdir -p logstash/pipeline
mkdir -p prometheus

# Tạo file index.js
touch src/index.js

# Tạo package.json nếu chưa tồn tại
if [ ! -f package.json ]; then
    echo -e "${YELLOW}Creating package.json...${NC}"
    cat > package.json << EOF
{
  "name": "push-notification-service",
  "version": "1.0.0",
  "description": "Push Notification Service",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js",
    "seed": "node data-generators/data-generator.js",
    "seed:enhanced": "node data-generators/enhanced-data-generator.js",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [
    "notification",
    "push",
    "websocket",
    "nodejs"
  ],
  "author": "",
  "license": "MIT"
}
EOF
    echo -e "${GREEN}✓${NC} Created package.json"
fi

# Tạo Dockerfile
echo -e "${YELLOW}Creating Dockerfile...${NC}"
cat > Dockerfile << EOF
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
EOF
echo -e "${GREEN}✓${NC} Created Dockerfile"

# Tạo các file cấu hình cơ bản
echo -e "${YELLOW}Creating configuration files...${NC}"
mkdir -p src/config
touch src/config/{database.js,redis.js,rabbitmq.js,logging.js,metrics.js}

# Tạo file .gitignore
echo -e "${YELLOW}Creating .gitignore...${NC}"
cat > .gitignore << EOF
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Build
dist/
build/
out/
.next/

# Logs
logs/
*.log

# Runtime data
pids/
*.pid
*.seed
*.pid.lock

# Editors
.idea/
.vscode/
*.swp
*.swo
.DS_Store

# Generated data
generated-data/
EOF
echo -e "${GREEN}✓${NC} Created .gitignore"

# Tạo file .env mẫu
echo -e "${YELLOW}Creating .env.example...${NC}"
cat > .env.example << EOF
# Server Configuration
PORT=3000
NODE_ENV=development

# Database
DB_HOST=postgres
DB_PORT=5432
DB_NAME=notification_db
DB_USER=admin
DB_PASSWORD=admin123

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# RabbitMQ
RABBITMQ_HOST=rabbitmq
RABBITMQ_PORT=5672
RABBITMQ_USER=admin
RABBITMQ_PASSWORD=admin123

# Logging
LOG_LEVEL=info

# Data generation options
USER_COUNT=100
NOTIFICATION_COUNT=500
START_DATE=2023-01-01
TRUNCATE_FIRST=true

# Mode: 'sequelize' or 'sql'
MODE=sequelize
EXECUTE_SQL=false

# Output directory for SQL files
OUTPUT_DIR=./generated-data
EOF
echo -e "${GREEN}✓${NC} Created .env.example"

# Copy .env.example to .env if it doesn't exist
if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "${GREEN}✓${NC} Created .env from example"
fi

# Create Docker Compose file
echo -e "${YELLOW}Creating docker-compose.yml...${NC}"
cat > docker-compose.yml << EOF
version: '3.8'

services:
  # API Server
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_NAME=notification_db
      - DB_USER=admin
      - DB_PASSWORD=admin123
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - RABBITMQ_HOST=rabbitmq
      - RABBITMQ_PORT=5672
      - RABBITMQ_USER=admin
      - RABBITMQ_PASSWORD=admin123
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy
    volumes:
      - ./:/app
      - node_modules:/app/node_modules

  # Database seeder container
  db-seeder:
    image: node:18-alpine
    volumes:
      - ./:/app
      - node_modules:/app/node_modules
    working_dir: /app
    environment:
      # Database connection
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_NAME=notification_db
      - DB_USER=admin
      - DB_PASSWORD=admin123
      # Data generation options
      - USER_COUNT=100
      - NOTIFICATION_COUNT=500
      - TRUNCATE_FIRST=true
      - MODE=sequelize
    depends_on:
      postgres:
        condition: service_healthy
    command: >
      sh -c "cd /app && npm install && node data-generators/data-generator.js"
    profiles:
      - seeder

  # PostgreSQL - Database for storing user data and notification history
  postgres:
    image: postgres:latest
    environment:
      POSTGRES_DB: notification_db
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: admin123
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      # Mount init scripts for schema creation
      - ./init-scripts:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U admin"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis - For caching and rate limiting
  redis:
    image: redis:latest
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # RabbitMQ - Message broker for notification system
  rabbitmq:
    image: rabbitmq:3-management
    ports:
      - "5672:5672"    # AMQP protocol
      - "15672:15672"  # Management UI
    environment:
      - RABBITMQ_DEFAULT_USER=admin
      - RABBITMQ_DEFAULT_PASS=admin123
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "check_port_connectivity"]
      interval: 30s
      timeout: 10s
      retries: 5

  # Monitoring and Logging services (optional - comment out if not needed)
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.12.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    ports:
      - "9200:9200"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    healthcheck:
      test: ["CMD-SHELL", "curl -s http://localhost:9200 >/dev/null || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 5
    profiles:
      - monitoring

  kibana:
    image: docker.elastic.co/kibana/kibana:8.12.0
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    depends_on:
      elasticsearch:
        condition: service_healthy
    profiles:
      - monitoring

  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
    profiles:
      - monitoring

  grafana:
    image: grafana/grafana
    ports:
      - "3001:3000"
    volumes:
      - grafana_data:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=admin123
    depends_on:
      - prometheus
    profiles:
      - monitoring

volumes:
  postgres_data:
  redis_data:
  rabbitmq_data:
  elasticsearch_data:
  prometheus_data:
  grafana_data:
  node_modules:
EOF
echo -e "${GREEN}✓${NC} Created docker-compose.yml"

# Create basic database schema
echo -e "${YELLOW}Creating database schema...${NC}"
cat > init-scripts/01-init.sql << EOF
\c notification_db;

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS devices (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    device_token TEXT NOT NULL,
    device_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sent_notifications (
    id SERIAL PRIMARY KEY,
    notification_id INTEGER REFERENCES notifications(id) ON DELETE CASCADE,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS failed_notifications (
    id SERIAL PRIMARY KEY,
    notification_id INTEGER REFERENCES notifications(id) ON DELETE CASCADE,
    error_message TEXT NOT NULL,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notification_logs (
    id SERIAL PRIMARY KEY,
    notification_id INTEGER REFERENCES notifications(id) ON DELETE CASCADE,
    log_type VARCHAR(255) NOT NULL,
    log_message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS email_logs (
    id SERIAL PRIMARY KEY,
    notification_id INTEGER REFERENCES notifications(id) ON DELETE CASCADE,
    email_address VARCHAR(255) NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sms_logs (
    id SERIAL PRIMARY KEY,
    notification_id INTEGER REFERENCES notifications(id) ON DELETE CASCADE,
    phone_number VARCHAR(255) NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS push_notification_logs (
    id SERIAL PRIMARY KEY,
    notification_id INTEGER REFERENCES notifications(id) ON DELETE CASCADE,
    device_token VARCHAR(255) NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS webhook_logs (
    id SERIAL PRIMARY KEY,
    notification_id INTEGER REFERENCES notifications(id) ON DELETE CASCADE,
    webhook_url VARCHAR(255) NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
EOF
echo -e "${GREEN}✓${NC} Created database schema"

# Create Prometheus config
echo -e "${YELLOW}Creating Prometheus configuration...${NC}"
cat > prometheus/prometheus.yml << EOF
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'notification-service'
    static_configs:
      - targets: ['api:3000']
    metrics_path: '/metrics'
EOF
echo -e "${GREEN}✓${NC} Created Prometheus configuration"

# Create a Makefile for common commands
echo -e "${YELLOW}Creating Makefile...${NC}"
cat > Makefile << EOF
# Makefile for Push Notification Service

# Variables
NODE = node
NPM = npm
DOCKER = docker
DOCKER_COMPOSE = docker-compose

# Default goal
.PHONY: all
all: help

# Help command
.PHONY: help
help:
	@echo "Push Notification Service Commands"
	@echo "=================================================="
	@echo "make install        - Install required dependencies"
	@echo "make start          - Start the service in development mode"
	@echo "make docker-start   - Start all services with Docker Compose"
	@echo "make docker-core    - Start only core services (Postgres, Redis, RabbitMQ)"
	@echo "make docker-seeder  - Run database seeder in Docker"
	@echo "make seed           - Generate data using Sequelize ORM"
	@echo "make sql            - Generate SQL file only (no database insertion)"
	@echo "make stop           - Stop all Docker services"
	@echo "make clean          - Remove generated files"
	@echo "make logs           - View Docker logs"
	@echo "--------------------------------------------------"

# Install dependencies
.PHONY: install
install:
	@echo "Installing dependencies..."
	\$(NPM) install

# Start in development mode
.PHONY: start
start:
	@echo "Starting service in development mode..."
	\$(NPM) run dev

# Start all services with Docker Compose
.PHONY: docker-start
docker-start:
	@echo "Starting all services with Docker Compose..."
	\$(DOCKER_COMPOSE) up -d

# Start only core services
.PHONY: docker-core
docker-core:
	@echo "Starting core services (Postgres, Redis, RabbitMQ)..."
	\$(DOCKER_COMPOSE) up -d postgres redis rabbitmq

# Run database seeder in Docker
.PHONY: docker-seeder
docker-seeder:
	@echo "Running database seeder in Docker..."
	\$(DOCKER_COMPOSE) --profile seeder up db-seeder

# Generate data using Sequelize
.PHONY: seed
seed:
	@echo "Generating data using Sequelize..."
	MODE=sequelize \$(NODE) data-generators/data-generator.js

# Generate SQL file only
.PHONY: sql
sql:
	@echo "Generating SQL file..."
	MODE=sql EXECUTE_SQL=false \$(NODE) data-generators/enhanced-data-generator.js

# Stop all Docker services
.PHONY: stop
stop:
	@echo "Stopping all Docker services..."
	\$(DOCKER_COMPOSE) down

# Clean generated files
.PHONY: clean
clean:
	@echo "Cleaning generated files..."
	rm -rf generated-data

# View Docker logs
.PHONY: logs
logs:
	@echo "Viewing Docker logs..."
	\$(DOCKER_COMPOSE) logs -f
EOF
echo -e "${GREEN}✓${NC} Created Makefile"

# Set up basic data generator
echo -e "${YELLOW}Setting up data generators...${NC}"
cat > data-generators/data-generator.js << EOF
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
    console.log(\`Generating \${userCount} users...\`);
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
    console.log(\`Created \${userCount} users\`);

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
    console.log(\`Created \${devices.length} devices\`);

    // Generate Notifications
    console.log(\`Generating \${notificationCount} notifications...\`);
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
    console.log(\`Created \${notificationCount} notifications\`);

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
EOF
echo -e "${GREEN}✓${NC} Created basic data generator"

# Install required dependencies
echo -e "${YELLOW}Installing required dependencies...${NC}"
npm install --save express helmet cors sequelize pg socket.io amqplib redis winston prom-client dotenv
npm install --save-dev nodemon
echo -e "${GREEN}✓${NC} Installed core dependencies"

# Install data generation dependencies
echo -e "${YELLOW}Installing data generation dependencies...${NC}"
npm install --save-dev faker uuid
echo -e "${GREEN}✓${NC} Installed data generation dependencies"

echo -e "${BLUE}=====================================================${NC}"
echo -e "${GREEN}Setup completed!${NC}"
echo ""
echo -e "To start the development server: ${YELLOW}npm run dev${NC}"
echo -e "To generate test data: ${YELLOW}npm run seed${NC}"
echo -e "To start with Docker: ${YELLOW}docker-compose up -d${NC}"
echo -e "To run seeder in Docker: ${YELLOW}docker-compose --profile seeder up db-seeder${NC}"
echo ""
echo -e "${BLUE}Note:${NC} Make sure to update the .env file with your database settings"
echo -e "      before running the application or data generator."
echo -e "${BLUE}=====================================================${NC}"