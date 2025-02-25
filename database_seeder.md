# Push Notification Service - Database Seeder

This package provides tools to generate realistic sample data for the Push Notification Service database. It supports multiple approaches including direct ORM-based generation, SQL file generation, and Docker-based setup.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Installation](#installation)
4. [Usage](#usage)
   - [Basic Usage](#basic-usage)
   - [Advanced Usage](#advanced-usage)
   - [Docker-based Approach](#docker-based-approach)
   - [Make Commands](#make-commands)
5. [Configuration](#configuration)
6. [Generated Data](#generated-data)
7. [Troubleshooting](#troubleshooting)

## Overview

The database seeder creates the following sample data:

- **Users**: People who receive notifications
- **Devices**: Mobile, web, or other devices registered to users
- **Notifications**: Messages sent to users
- **User Preferences**: User-specific notification preferences
- **Sent Notifications**: Records of notifications that have been delivered
- **Notification Logs**: Detailed tracking of notification lifecycle

## Prerequisites

- Node.js 14+ and npm
- PostgreSQL 12+ (if using direct database insertion)
- Docker and Docker Compose (if using the Docker approach)

## Installation

### Option 1: Automated Setup

Run the installation script:

```bash
chmod +x setup-seed-tools.sh
./setup-seed-tools.sh
```

### Option 2: Manual Setup

1. Install dependencies:

```bash
npm install sequelize pg pg-hstore faker uuid dotenv
```

2. Create a `.env` file with your database configuration:

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=notification_db
DB_USER=admin
DB_PASSWORD=admin123

# Data generation options
USER_COUNT=100
NOTIFICATION_COUNT=500
START_DATE=2023-01-01
TRUNCATE_FIRST=true

# Mode: 'sequelize' or 'sql'
MODE=sequelize
EXECUTE_SQL=false
```

## Usage

### Basic Usage

To generate data using the Sequelize ORM (directly inserts into database):

```bash
node data-generator.js
```

### Advanced Usage

The enhanced data generator supports multiple modes and options:

#### Generate with Sequelize ORM

```bash
MODE=sequelize node enhanced-data-generator.js
```

#### Generate SQL File Only

```bash
MODE=sql EXECUTE_SQL=false node enhanced-data-generator.js
```

Generated SQL will be saved to `./generated-data/seed-data.sql`.

#### Generate and Execute SQL

```bash
MODE=sql EXECUTE_SQL=true node enhanced-data-generator.js
```

#### Customize Data Volume

```bash
USER_COUNT=500 NOTIFICATION_COUNT=2000 node enhanced-data-generator.js
```

### Docker-based Approach

Using Docker eliminates the need to install Node.js and dependencies locally:

1. Ensure Docker and Docker Compose are installed
2. Create necessary files (data-generator.js, docker-compose.yml)
3. Run:

```bash
docker-compose up
```

This will:
- Start a PostgreSQL container
- Initialize the database schema
- Run the data generator script

### Make Commands

If you've set up the Makefile, you can use these simplified commands:

```bash
# Install dependencies
make install

# Generate data using Sequelize ORM
make seed

# Generate SQL file only
make sql

# Generate and execute SQL
make execute-sql

# Run using Docker
make docker-seed

# Clean generated files
make clean

# Reset the database (drop and recreate)
make reset-db
```

## Configuration

The following environment variables can be set:

| Variable | Description | Default |
|----------|-------------|---------|
| `MODE` | Generation mode: 'sequelize' or 'sql' | 'sequelize' |
| `USER_COUNT` | Number of users to generate | 100 |
| `NOTIFICATION_COUNT` | Number of notifications to generate | 500 |
| `START_DATE` | Start date for random dates | '2023-01-01' |
| `TRUNCATE_FIRST` | Whether to truncate tables before inserting | false |
| `EXECUTE_SQL` | Execute generated SQL file | false |
| `OUTPUT_DIR` | Directory for SQL output files | './generated-data' |
| `DB_HOST` | Database host | 'localhost' |
| `DB_PORT` | Database port | 5432 |
| `DB_NAME` | Database name | 'notification_db' |
| `DB_USER` | Database user | 'admin' |
| `DB_PASSWORD` | Database password | 'admin123' |

## Generated Data

The data generator creates:

- 100 users (configurable)
- 1-3 devices per user
- 500 notifications (configurable)
- 1-4 notification preferences per user
- ~80% of notifications marked as sent
- 2-5 log entries per notification

Types of data included:

- Device types: android, iOS, web
- Notification types: message, friend_request, payment, security, marketing, system
- Log types: created, processed, sent, delivered, failed, clicked

## Troubleshooting

### Database Connection Issues

If you encounter connection errors:

1. Verify your database credentials in `.env`
2. Ensure PostgreSQL is running
3. Check if the database exists and is accessible

Example troubleshooting:

```bash
# Check PostgreSQL status
sudo service postgresql status

# Connect to database manually
psql -h localhost -U admin -d notification_db

# Check if tables exist
\dt
```

### Duplicate Key Errors

If you run the script multiple times, you may get unique constraint violations:

- Set `TRUNCATE_FIRST=true` to clear tables before inserting
- Or run `make reset-db` to completely reset the database

### Performance Issues

For large volumes of data:

- Use the SQL generation mode (`MODE=sql`) which is more efficient
- Increase Node.js memory if needed: `NODE_OPTIONS=--max-old-space-size=4096`
