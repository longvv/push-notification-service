// src/api/routes.js
const express = require('express');
const usersController = require('./controllers/users');
const notificationsController = require('./controllers/notifications');
const devicesController = require('./controllers/devices');

const router = express.Router();

// Users routes
router.post('/users', usersController.createUser);
router.get('/users', usersController.getUsers);
router.get('/users/:id', usersController.getUserById);

// Devices routes
router.post('/users/:userId/devices', devicesController.registerDevice);
router.get('/users/:userId/devices', devicesController.getUserDevices);
router.delete('/users/:userId/devices/:deviceId', devicesController.unregisterDevice);

// Notifications routes
router.post('/notifications', notificationsController.sendNotification);
router.get('/notifications/user/:userId', notificationsController.getUserNotifications);

module.exports = router;