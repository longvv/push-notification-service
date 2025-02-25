# Makefile for Push Notification Service Database Seeder

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
	@echo "Push Notification Service Database Seeder Commands"
	@echo "=================================================="
	@echo "make install        - Install required dependencies"
	@echo "make seed           - Generate data using Sequelize ORM"
	@echo "make sql            - Generate SQL file only (no database insertion)"
	@echo "make execute-sql    - Generate and execute SQL file"
	@echo "make docker-seed    - Run seeder in Docker (creates DB and seeds it)"
	@echo "make clean          - Remove generated files"
	@echo "make reset-db       - CAUTION: Drop and recreate the database schema"
	@echo "--------------------------------------------------"

# Install dependencies
.PHONY: install
install:
	@echo "Installing dependencies..."
	$(NPM) install sequelize pg pg-hstore faker uuid dotenv

# Generate data using Sequelize
.PHONY: seed
seed:
	@echo "Generating data using Sequelize..."
	MODE=sequelize $(NODE) enhanced-data-generator.js

# Generate SQL file only
.PHONY: sql
sql:
	@echo "Generating SQL file..."
	MODE=sql EXECUTE_SQL=false $(NODE) enhanced-data-generator.js

# Generate and execute SQL
.PHONY: execute-sql
execute-sql:
	@echo "Generating and executing SQL..."
	MODE=sql EXECUTE_SQL=true $(NODE) enhanced-data-generator.js

# Run using Docker
.PHONY: docker-seed
docker-seed:
	@echo "Running seeder in Docker..."
	$(DOCKER_COMPOSE) up

# Clean generated files
.PHONY: clean
clean:
	@echo "Cleaning generated files..."
	rm -rf generated-data
	rm -f *.sql

# Reset DB - CAUTION: This drops all tables
.PHONY: reset-db
reset-db:
	@echo "CAUTION: This will drop all tables and recreate the schema."
	@echo "All data will be lost. Press Ctrl+C to cancel or Enter to continue."
	@read confirmation
	@echo "Resetting database..."
	psql -h $(DB_HOST) -U $(DB_USER) -d $(DB_NAME) -f init-scripts/01-init.sql
