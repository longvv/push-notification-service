// src/config/rabbitmq.js
const amqp = require('amqplib');
const { maybeCompress, maybeDecompress } = require('../utils/compression');

let connection = null;
let channel = null;

const connectRabbitMQ = async () => {
  try {
    const host = process.env.RABBITMQ_HOST || 'localhost';
    const port = process.env.RABBITMQ_PORT || 5672;
    const user = process.env.RABBITMQ_USER || 'admin';
    const password = process.env.RABBITMQ_PASSWORD || 'admin123';
    
    const url = `amqp://${user}:${password}@${host}:${port}`;
    
    connection = await amqp.connect(url);
    channel = await connection.createChannel();
    
    // Định nghĩa exchanges và queues
    await channel.assertExchange('notifications', 'topic', { durable: true });
    
    await channel.assertQueue('immediate_notifications', { durable: true });
    await channel.assertQueue('scheduled_notifications', { durable: true });
    
    // Bind queues to exchange với routing keys
    await channel.bindQueue('immediate_notifications', 'notifications', 'notification.immediate');
    await channel.bindQueue('scheduled_notifications', 'notifications', 'notification.scheduled');
    
    console.log('Connected to RabbitMQ successfully');
    
    // Xử lý sự kiện đóng kết nối
    connection.on('close', () => {
      console.log('RabbitMQ connection closed');
      setTimeout(connectRabbitMQ, 5000);
    });
    
    return { connection, channel };
  } catch (error) {
    console.error('Failed to connect to RabbitMQ:', error);
    setTimeout(connectRabbitMQ, 5000);
  }
};

const publishMessage = async (routingKey, message) => {
  try {
    if (!channel) await connectRabbitMQ();
    
    // Áp dụng nén có điều kiện
    const { data: messageData, metadata } = await maybeCompress(message);
    
    return channel.publish(
      'notifications',
      routingKey,
      messageData,
      { 
        persistent: true,
        headers: {
          // Thêm metadata để biết cách xử lý khi nhận
          compressionMetadata: metadata
        }
      }
    );
  } catch (error) {
    console.error('Error publishing message:', error);
    throw error;
  }
};

const consumeMessages = async (queueName, callback) => {
  try {
    if (!channel) await connectRabbitMQ();
    
    await channel.consume(queueName, async (message) => {
      if (message) {
        try {
          // Lấy metadata nén từ headers
          const metadata = message.properties.headers?.compressionMetadata;
          
          // Xử lý dữ liệu theo trạng thái nén
          let content;
          if (metadata) {
            // Giải nén nếu cần
            content = await maybeDecompress({ 
              data: message.content, 
              metadata 
            });
          } else {
            // Xử lý theo cách thông thường nếu không có metadata
            content = JSON.parse(message.content.toString());
          }
          
          await callback(content);
          channel.ack(message);
        } catch (error) {
          console.error(`Error processing message from ${queueName}:`, error);
          channel.nack(message);
        }
      }
    });
  } catch (error) {
    console.error(`Error consuming messages from ${queueName}:`, error);
    throw error;
  }
};

module.exports = {
  connectRabbitMQ,
  publishMessage,
  consumeMessages
};