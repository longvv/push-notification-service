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
	$(NPM) install

# Start in development mode
.PHONY: start
start:
	@echo "Starting service in development mode..."
	$(NPM) run dev

# Start all services with Docker Compose
.PHONY: docker-start
docker-start:
	@echo "Starting all services with Docker Compose..."
	$(DOCKER_COMPOSE) up -d

# Start only core services
.PHONY: docker-core
docker-core:
	@echo "Starting core services (Postgres, Redis, RabbitMQ)..."
	$(DOCKER_COMPOSE) up -d postgres redis rabbitmq

# Run database seeder in Docker
.PHONY: docker-seeder
docker-seeder:
	@echo "Running database seeder in Docker..."
	$(DOCKER_COMPOSE) --profile seeder up db-seeder

# Generate data using Sequelize
.PHONY: seed
seed:
	@echo "Generating data using Sequelize..."
	MODE=sequelize $(NODE) data-generators/data-generator.js

# Generate SQL file only
.PHONY: sql
sql:
	@echo "Generating SQL file..."
	MODE=sql EXECUTE_SQL=false $(NODE) data-generators/enhanced-data-generator.js

# Stop all Docker services
.PHONY: stop
stop:
	@echo "Stopping all Docker services..."
	$(DOCKER_COMPOSE) down

# Clean generated files
.PHONY: clean
clean:
	@echo "Cleaning generated files..."
	rm -rf generated-data

# View Docker logs
.PHONY: logs
logs:
	@echo "Viewing Docker logs..."
	$(DOCKER_COMPOSE) logs -f
