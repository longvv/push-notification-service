// src/api/controllers/notifications.js
const { Notification } = require('../../models');
const { publishMessage } = require('../../config/rabbitmq');

const sendNotification = async (req, res) => {
  try {
    const { user_id, title, body, data } = req.body;
    
    if (!user_id || !title) {
      return res.status(400).json({ error: 'User ID and title are required' });
    }
    
    // Lưu thông tin notification vào database
    const notification = await Notification.create({
      user_id,
      title,
      body,
      data,
      status: 'pending'
    });
    
    // Gửi message đến RabbitMQ để xử lý
    await publishMessage('notification.immediate', {
      notification_id: notification.id,
      user_id,
      title,
      body,
      data
    });
    
    return res.status(202).json(notification);
  } catch (error) {
    console.error('Error sending notification:', error);
    return res.status(500).json({ error: 'Failed to send notification' });
  }
};

const getUserNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const notifications = await Notification.findAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']]
    });
    
    return res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

module.exports = {
  sendNotification,
  getUserNotifications
};