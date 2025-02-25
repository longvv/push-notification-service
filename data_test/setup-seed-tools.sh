#!/bin/bash
# setup-seed-tools.sh
# This script installs dependencies needed for the data generator

# Colors for prettier output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=====================================================${NC}"
echo -e "${BLUE}  Push Notification Service - Data Generator Setup${NC}"
echo -e "${BLUE}=====================================================${NC}"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}Node.js is not installed. Please install Node.js before continuing.${NC}"
    echo "Visit https://nodejs.org/ to download and install."
    exit 1
fi

echo -e "${GREEN}✓${NC} Node.js is installed: $(node -v)"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${YELLOW}npm is not installed. Please install npm before continuing.${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} npm is installed: $(npm -v)"

# Create package.json if it doesn't exist
if [ ! -f "package.json" ]; then
    echo -e "${YELLOW}Creating package.json...${NC}"
    cat > package.json << EOF
{
  "name": "push-notification-service-seed",
  "version": "1.0.0",
  "description": "Data generator for Push Notification Service",
  "main": "data-generator.js",
  "scripts": {
    "seed": "node data-generator.js",
    "seed:enhanced": "node enhanced-data-generator.js"
  },
  "author": "",
  "license": "ISC"
}
EOF
    echo -e "${GREEN}✓${NC} Created package.json"
fi

# Install required dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
npm install sequelize pg pg-hstore faker uuid dotenv

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Creating .env file...${NC}"
    cat > .env << EOF
# Database configuration
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

# Output directory for SQL files
OUTPUT_DIR=./generated-data
EOF
    echo -e "${GREEN}✓${NC} Created .env file with default settings"
fi

# Download data generator script
echo -e "${YELLOW}Downloading data generator script...${NC}"
curl -o data-generator.js https://raw.githubusercontent.com/yourgithub/push-notification-service/main/data-generator.js 2>/dev/null || {
    # If curl fails, create a basic script
    echo -e "${YELLOW}Could not download script. Creating basic template...${NC}"
    cat > data-generator.js << EOF
// Basic data generator template
// Replace this with the full script content
require('dotenv').config();
const { Sequelize } = require('sequelize');
const faker = require('faker');

console.log('This is a placeholder. Please replace with the actual data generator script.');
console.log('Check your environment variables:');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('DB_NAME:', process.env.DB_NAME);
EOF
}
echo -e "${GREEN}✓${NC} Data generator script is ready"

echo -e "${BLUE}=====================================================${NC}"
echo -e "${GREEN}Setup completed!${NC}"
echo ""
echo -e "To generate data, run: ${YELLOW}npm run seed${NC}"
echo ""
echo -e "${BLUE}Note:${NC} Make sure to update the .env file with your database settings"
echo -e "      before running the data generator."
echo -e "${BLUE}=====================================================${NC}"
