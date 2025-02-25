#!/bin/bash

# Tạo thư mục gốc nếu chưa tồn tại
mkdir -p notification-service

# Di chuyển vào thư mục gốc
cd notification-service

# Tạo cấu trúc thư mục src và các thư mục con
mkdir -p src/{config,api,websocket,services,models,workers,utils}

# Tạo file index.js
touch src/index.js

# Tạo package.json nếu chưa tồn tại
if [ ! -f package.json ]; then
    echo '{
  "name": "notification-service",
  "version": "1.0.0",
  "description": "Push Notification Service",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js",
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
}' > package.json
fi

# Tạo Dockerfile
echo 'FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "start"]' > Dockerfile

# Tạo các file cấu hình cơ bản
touch src/config/{database.js,redis.js,rabbitmq.js,logging.js,metrics.js}

# Tạo file .gitignore
echo 'node_modules
.env
npm-debug.log
.DS_Store
.vscode/' > .gitignore

# Tạo file .env mẫu
echo 'PORT=3000
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
LOG_LEVEL=info' > .env.example

echo "Cấu trúc project đã được tạo thành công trong thư mục notification-service"