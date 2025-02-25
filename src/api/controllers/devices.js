// src/api/controllers/devices.js
const { Device } = require('../../models');

const registerDevice = async (req, res) => {
  try {
    const { userId } = req.params;
    const { device_token, device_type } = req.body;
    
    if (!device_token || !device_type) {
      return res.status(400).json({ error: 'Device token and type are required' });
    }
    
    const newDevice = await Device.create({
      user_id: userId,
      device_token,
      device_type
    });
    
    return res.status(201).json(newDevice);
  } catch (error) {
    console.error('Error registering device:', error);
    return res.status(500).json({ error: 'Failed to register device' });
  }
};

const getUserDevices = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const devices = await Device.findAll({
      where: { user_id: userId }
    });
    
    return res.json(devices);
  } catch (error) {
    console.error('Error fetching devices:', error);
    return res.status(500).json({ error: 'Failed to fetch devices' });
  }
};

const unregisterDevice = async (req, res) => {
  try {
    const { userId, deviceId } = req.params;
    
    const deleted = await Device.destroy({
      where: {
        id: deviceId,
        user_id: userId
      }
    });
    
    if (!deleted) {
      return res.status(404).json({ error: 'Device not found' });
    }
    
    return res.status(204).send();
  } catch (error) {
    console.error('Error unregistering device:', error);
    return res.status(500).json({ error: 'Failed to unregister device' });
  }
};

module.exports = {
  registerDevice,
  getUserDevices,
  unregisterDevice
};