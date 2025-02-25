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

**Endpoint:** `GET /users`

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "name": "John Doe",
    "email": "john.doe@example.com",
    "phone": "+1234567890",
    "created_at": "2023-05-01T12:00:00Z"
  },
  {
    "id": 2,
    "name": "Jane Smith",
    "email": "jane.smith@example.com",
    "phone": "+1987654321",
    "created_at": "2023-05-02T10:30:00Z"
  }
]
```

**Error Responses:**
- `500 Internal Server Error`: Server error

#### Get User by ID

Retrieves a specific user by their ID.

**Endpoint:** `GET /users/:id`

**URL Parameters:**
- `id`: User ID (required)

**Response:** `200 OK`
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
- `404 Not Found`: User not found
- `500 Internal Server Error`: Server error

#### Update User

Updates an existing user.

**Endpoint:** `PUT /users/:id`

**URL Parameters:**
- `id`: User ID (required)

**Request Body:**
```json
{
  "name": "John Doe Updated",
  "phone": "+1234567899"
}
```

**Response:** `200 OK`
```json
{
  "id": 1,
  "name": "John Doe Updated",
  "email": "john.doe@example.com",
  "phone": "+1234567899",
  "updated_at": "2023-05-05T14:20:00Z",
  "created_at": "2023-05-01T12:00:00Z"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid input
- `404 Not Found`: User not found
- `500 Internal Server Error`: Server error

#### Delete User

Deletes a user from the system.

**Endpoint:** `DELETE /users/:id`

**URL Parameters:**
- `id`: User ID (required)

**Response:** `204 No Content`

**Error Responses:**
- `404 Not Found`: User not found
- `500 Internal Server Error`: Server error

### Device Management

#### Register Device

Registers a new device for a user.

**Endpoint:** `POST /users/:userId/devices`

**URL Parameters:**
- `userId`: User ID (required)

**Request Body:**
```json
{
  "device_token": "fcm-token-abc123",
  "device_type": "android"  // Supported types: "android", "ios", "web"
}
```

**Response:** `201 Created`
```json
{
  "id": 1,
  "user_id": 1,
  "device_token": "fcm-token-abc123",
  "device_type": "android",
  "created_at": "2023-05-01T12:30:00Z"
}
```

**Error Responses:**
- `400 Bad Request`: Missing required fields or invalid device type
- `404 Not Found`: User not found
- `500 Internal Server Error`: Server error

#### Get User's Devices

Retrieves all devices registered for a specific user.

**Endpoint:** `GET /users/:userId/devices`

**URL Parameters:**
- `userId`: User ID (required)

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "user_id": 1,
    "device_token": "fcm-token-abc123",
    "device_type": "android",
    "created_at": "2023-05-01T12:30:00Z"
  },
  {
    "id": 2,
    "user_id": 1,
    "device_token": "apns-token-xyz987",
    "device_type": "ios",
    "created_at": "2023-05-02T15:45:00Z"
  }
]
```

**Error Responses:**
- `404 Not Found`: User not found
- `500 Internal Server Error`: Server error

#### Get Device by ID

Retrieves a specific device.

**Endpoint:** `GET /users/:userId/devices/:deviceId`

**URL Parameters:**
- `userId`: User ID (required)
- `deviceId`: Device ID (required)

**Response:** `200 OK`
```json
{
  "id": 1,
  "user_id": 1,
  "device_token": "fcm-token-abc123",
  "device_type": "android",
  "created_at": "2023-05-01T12:30:00Z"
}
```

**Error Responses:**
- `404 Not Found`: User or device not found
- `500 Internal Server Error`: Server error

#### Update Device

Updates an existing device.

**Endpoint:** `PUT /users/:userId/devices/:deviceId`

**URL Parameters:**
- `userId`: User ID (required)
- `deviceId`: Device ID (required)

**Request Body:**
```json
{
  "device_token": "fcm-token-updated456"
}
```

**Response:** `200 OK`
```json
{
  "id": 1,
  "user_id": 1,
  "device_token": "fcm-token-updated456",
  "device_type": "android",
  "updated_at": "2023-05-10T09:15:00Z",
  "created_at": "2023-05-01T12:30:00Z"
}
```

**Error Responses:**
- `404 Not Found`: User or device not found
- `500 Internal Server Error`: Server error

#### Unregister Device

Removes a device from the system.

**Endpoint:** `DELETE /users/:userId/devices/:deviceId`

**URL Parameters:**
- `userId`: User ID (required)
- `deviceId`: Device ID (required)

**Response:** `204 No Content`

**Error Responses:**
- `404 Not Found`: User or device not found
- `500 Internal Server Error`: Server error

### Notification Management

#### Send Immediate Notification

Sends a notification immediately to a user.

**Endpoint:** `POST /notifications`

**Request Body:**
```json
{
  "user_id": 1,
  "title": "New Message",
  "body": "You have received a new message from Jane",
  "data": {
    "message_id": 123,
    "sender_id": 2,
    "sender_name": "Jane Smith",
    "thread_id": 456
  }
}
```

**Response:** `202 Accepted`
```json
{
  "id": 1,
  "user_id": 1,
  "title": "New Message",
  "body": "You have received a new message from Jane",
  "data": {
    "message_id": 123,
    "sender_id": 2,
    "sender_name": "Jane Smith",
    "thread_id": 456
  },
  "status": "pending",
  "created_at": "2023-05-05T13:40:00Z"
}
```

**Error Responses:**
- `400 Bad Request`: Missing required fields
- `404 Not Found`: User not found
- `500 Internal Server Error`: Server error

#### Schedule Notification

Schedules a notification to be sent at a future time.

**Endpoint:** `POST /notifications/schedule`

**Request Body:**
```json
{
  "user_id": 1,
  "title": "Meeting Reminder",
  "body": "Your meeting with the team starts in 15 minutes",
  "data": {
    "meeting_id": 789,
    "meeting_link": "https://meet.example.com/abc123"
  },
  "scheduled_time": "2023-05-10T15:45:00Z"
}
```

**Response:** `202 Accepted`
```json
{
  "id": 2,
  "user_id": 1,
  "title": "Meeting Reminder",
  "body": "Your meeting with the team starts in 15 minutes",
  "data": {
    "meeting_id": 789,
    "meeting_link": "https://meet.example.com/abc123"
  },
  "status": "scheduled",
  "scheduled_time": "2023-05-10T15:45:00Z",
  "created_at": "2023-05-05T14:00:00Z"
}
```

**Error Responses:**
- `400 Bad Request`: Missing required fields or invalid scheduled time
- `404 Not Found`: User not found
- `500 Internal Server Error`: Server error

#### Broadcast Notification

Sends a notification to all users in the system.

**Endpoint:** `POST /notifications/broadcast`

**Request Body:**
```json
{
  "title": "System Maintenance",
  "body": "The system will be down for maintenance tonight from 2:00 AM to 4:00 AM",
  "data": {
    "maintenance_id": 55,
    "more_info": "https://status.example.com"
  }
}
```

**Response:** `202 Accepted`
```json
{
  "id": 3,
  "title": "System Maintenance",
  "body": "The system will be down for maintenance tonight from 2:00 AM to 4:00 AM",
  "data": {
    "maintenance_id": 55,
    "more_info": "https://status.example.com"
  },
  "status": "pending",
  "broadcast": true,
  "created_at": "2023-05-05T16:20:00Z"
}
```

**Error Responses:**
- `400 Bad Request`: Missing required fields
- `500 Internal Server Error`: Server error

#### Get User's Notifications

Retrieves all notifications for a specific user.

**Endpoint:** `GET /notifications/user/:userId`

**URL Parameters:**
- `userId`: User ID (required)

**Query Parameters:**
- `limit`: Maximum number of notifications to return (default: 20)
- `offset`: Number of notifications to skip (default: 0)
- `status`: Filter by status (optional, e.g., "delivered", "failed", "pending")

**Response:** `200 OK`
```json
{
  "total": 2,
  "limit": 20,
  "offset": 0,
  "notifications": [
    {
      "id": 2,
      "user_id": 1,
      "title": "Meeting Reminder",
      "body": "Your meeting with the team starts in 15 minutes",
      "data": {
        "meeting_id": 789,
        "meeting_link": "https://meet.example.com/abc123"
      },
      "status": "scheduled",
      "scheduled_time": "2023-05-10T15:45:00Z",
      "created_at": "2023-05-05T14:00:00Z"
    },
    {
      "id": 1,
      "user_id": 1,
      "title": "New Message",
      "body": "You have received a new message from Jane",
      "data": {
        "message_id": 123,
        "sender_id": 2,
        "sender_name": "Jane Smith",
        "thread_id": 456
      },
      "status": "delivered",
      "sent_at": "2023-05-05T13:40:10Z",
      "created_at": "2023-05-05T13:40:00Z"
    }
  ]
}
```

**Error Responses:**
- `404 Not Found`: User not found
- `500 Internal Server Error`: Server error

#### Get Notification by ID

Retrieves a specific notification.

**Endpoint:** `GET /notifications/:id`

**URL Parameters:**
- `id`: Notification ID (required)

**Response:** `200 OK`
```json
{
  "id": 1,
  "user_id": 1,
  "title": "New Message",
  "body": "You have received a new message from Jane",
  "data": {
    "message_id": 123,
    "sender_id": 2,
    "sender_name": "Jane Smith",
    "thread_id": 456
  },
  "status": "delivered",
  "sent_at": "2023-05-05T13:40:10Z",
  "created_at": "2023-05-05T13:40:00Z"
}
```

**Error Responses:**
- `404 Not Found`: Notification not found
- `500 Internal Server Error`: Server error

#### Cancel Scheduled Notification

Cancels a scheduled notification that hasn't been sent yet.

**Endpoint:** `DELETE /notifications/:id`

**URL Parameters:**
- `id`: Notification ID (required)

**Response:** `204 No Content`

**Error Responses:**
- `404 Not Found`: Notification not found
- `409 Conflict`: Notification already sent
- `500 Internal Server Error`: Server error

### User Preferences

#### Set User Preferences

Sets notification preferences for a user.

**Endpoint:** `POST /users/:userId/preferences`

**URL Parameters:**
- `userId`: User ID (required)

**Request Body:**
```json
{
  "notification_types": [
    "message",
    "reminder",
    "system_announcement"
  ],
  "quiet_hours": {
    "enabled": true,
    "start_time": "22:00",
    "end_time": "08:00",
    "timezone": "America/New_York"
  },
  "delivery_channels": {
    "push": true,
    "email": true,
    "sms": false
  }
}
```

**Response:** `200 OK`
```json
{
  "user_id": 1,
  "notification_types": [
    "message",
    "reminder",
    "system_announcement"
  ],
  "quiet_hours": {
    "enabled": true,
    "start_time": "22:00",
    "end_time": "08:00",
    "timezone": "America/New_York"
  },
  "delivery_channels": {
    "push": true,
    "email": true,
    "sms": false
  },
  "updated_at": "2023-05-06T10:15:00Z"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid preferences format
- `404 Not Found`: User not found
- `500 Internal Server Error`: Server error

#### Get User Preferences

Retrieves notification preferences for a user.

**Endpoint:** `GET /users/:userId/preferences`

**URL Parameters:**
- `userId`: User ID (required)

**Response:** `200 OK`
```json
{
  "user_id": 1,
  "notification_types": [
    "message",
    "reminder",
    "system_announcement"
  ],
  "quiet_hours": {
    "enabled": true,
    "start_time": "22:00",
    "end_time": "08:00",
    "timezone": "America/New_York"
  },
  "delivery_channels": {
    "push": true,
    "email": true,
    "sms": false
  },
  "updated_at": "2023-05-06T10:15:00Z",
  "created_at": "2023-05-06T10:15:00Z"
}
```

**Error Responses:**
- `404 Not Found`: User or preferences not found
- `500 Internal Server Error`: Server error

## WebSocket API

The Push Notification Service also provides a WebSocket API for real-time notifications. This is especially useful for web applications that need to display notifications instantly without polling.

### Connection

Connect to the WebSocket server:

```
ws://your-domain.com/socket.io
```

For local development:
```
ws://localhost:3000/socket.io
```

### Authentication

After connecting, authenticate the WebSocket connection:

```javascript
// Client-side example
const socket = io('http://localhost:3000');

socket.emit('authenticate', { userId: 1 });

socket.on('authenticated', (response) => {
  console.log('Authentication successful', response);
});

socket.on('error', (error) => {
  console.error('Authentication failed', error);
});
```

### Receiving Notifications

Listen for notification events:

```javascript
// Client-side example
socket.on('notification', (notification) => {
  console.log('New notification received', notification);
  // Handle the notification in your UI
});

// For broadcast messages to all users
socket.on('broadcast', (notification) => {
  console.log('Broadcast notification received', notification);
  // Handle the broadcast notification in your UI
});
```

### Disconnection

Handle disconnection events:

```javascript
// Client-side example
socket.on('disconnect', (reason) => {
  console.log('Disconnected from WebSocket server', reason);
  
  // Attempt to reconnect if appropriate
  setTimeout(() => {
    socket.connect();
  }, 5000);
});
```

## Error Codes and Messages

The API may return the following error codes:

| HTTP Status | Error Code | Description |
|-------------|------------|-------------|
| 400 | INVALID_REQUEST | The request is malformed or missing required fields |
| 401 | UNAUTHORIZED | Authentication failed |
| 403 | FORBIDDEN | The authenticated user doesn't have permission |
| 404 | NOT_FOUND | The requested resource was not found |
| 409 | CONFLICT | The request conflicts with the current state of the server |
| 422 | VALIDATION_ERROR | The request data failed validation |
| 429 | RATE_LIMITED | Too many requests, try again later |
| 500 | SERVER_ERROR | An internal server error occurred |

Error response format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Device token is required",
    "details": {
      "device_token": "This field is required"
    }
  }
}
```

## Rate Limiting

The API implements rate limiting to prevent abuse. The current limits are:

- 100 requests per minute per API key for general endpoints
- 10 requests per minute per API key for notification sending endpoints

When rate limited, the API will return a `429 Too Many Requests` response with a `Retry-After` header indicating when you can resume making requests.

## Webhook Integration

The Push Notification Service can send webhook notifications for various events. To set up webhooks:

1. Register a webhook endpoint:

**Endpoint:** `POST /webhooks`

**Request Body:**
```json
{
  "url": "https://your-app.com/webhook/notifications",
  "events": [
    "notification.sent",
    "notification.failed",
    "notification.clicked"
  ],
  "secret": "your-webhook-secret"
}
```

**Response:** `201 Created`
```json
{
  "id": "wh_123abc",
  "url": "https://your-app.com/webhook/notifications",
  "events": [
    "notification.sent",
    "notification.failed",
    "notification.clicked"
  ],
  "created_at": "2023-05-07T09:30:00Z"
}
```

2. Webhook payload format:

```json
{
  "event": "notification.sent",
  "timestamp": "2023-05-07T09:35:00Z",
  "data": {
    "notification_id": 1,
    "user_id": 1,
    "title": "New Message",
    "status": "delivered",
    "sent_at": "2023-05-07T09:35:00Z"
  }
}
```

3. Verify webhook authenticity using the signature in the `X-Webhook-Signature` header.