# Push Notification Service API Documentation

## Introduction

This document provides detailed information about the Push Notification Service API, which allows you to manage users, devices, and send notifications through various channels.

## Base URL

```
https://your-domain.com/api
```

For local development:
```
http://localhost:3000/api
```

## Authentication

All API requests must include an API key in the header:

```
X-API-Key: your_api_key_here
```

> Note: The authentication mechanism can be customized based on your requirements.

## API Endpoints

### User Management

#### Create User

Creates a new user in the system.

**Endpoint:** `POST /users`

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "phone": "+1234567890"
}
```

**Response:** `201 Created`
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john.doe@example.com",
  "phone": "+1234567890",
  "created_at": "2023-05-01T12:00:00Z"
}
```

**Error Responses:**
- `400 Bad Request`: Missing required fields
- `409 Conflict`: Email or phone already exists
- `500 Internal Server Error`: Server error

#### Get All Users

Retrieves a list of all users.

**Endpoint:** `GET