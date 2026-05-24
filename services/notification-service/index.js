const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const Redis = require('ioredis');
const axios = require('axios');
const connectDB = require('./config/db');
const Notification = require('./models/Notification');
const notificationRoutes = require('./routes/notificationRoutes');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5003;

// Configs
const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = process.env.REDIS_PORT || 6379;
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:5001';

// Connect DB
connectDB();

// Middlewares
app.use(helmet());
app.use(express.json());

// Routes
app.use('/api/notifications', notificationRoutes);

// Base Route
app.get('/', (req, res) => {
  res.json({ service: 'Notification Service', status: 'Running' });
});

// Centralized error handler
app.use((err, req, res, next) => {
  console.error('Notification Service Error:', err);
  res.status(500).json({ message: 'Internal Notification Service Error' });
});

// Initialize Redis Subscriber
const setupNotificationSubscriber = async () => {
  try {
    console.log(`尝试连接 Redis Subscriber @ redis://${REDIS_HOST}:${REDIS_PORT}`);
    const redisSub = new Redis({ host: REDIS_HOST, port: REDIS_PORT, maxRetriesPerRequest: 1 });

    redisSub.on('error', (err) => {
      console.error('Redis Subscriber Connection Error:', err.message);
    });

    await redisSub.ping();
    console.log('✅ Redis Subscriber connected. Subscribing to "chat:notifications" channel...');

    // Subscribe to chat:notifications channel
    await redisSub.subscribe('chat:notifications');

    redisSub.on('message', async (channel, message) => {
      if (channel === 'chat:notifications') {
        try {
          const event = JSON.parse(message);
          console.log(`🔔 Received event from room #${event.roomId} sent by ${event.senderUsername}`);

          // Fetch all users from Auth Service to determine who needs a notification
          let users = [];
          try {
            const response = await axios.get(`${AUTH_SERVICE_URL}/api/auth/users`);
            users = response.data;
          } catch (apiErr) {
            console.error('⚠️ Could not connect to Auth Service to retrieve user list:', apiErr.message);
          }

          if (users.length > 0) {
            // Build notification records for all users except the sender, filtering by room authorization if private
            const notificationsToInsert = users
              .filter(u => {
                const userIdStr = u._id.toString();
                const isNotSender = userIdStr !== event.senderId;
                const isAuthorized = !event.authorizedUsers || event.authorizedUsers.includes(userIdStr);
                return isNotSender && isAuthorized;
              })
              .map(u => ({
                userId: u._id.toString(),
                message: `New message in #${event.roomName || 'chat'} by ${event.senderUsername}: "${event.message}"`,
                read: false
              }));

            if (notificationsToInsert.length > 0) {
              const result = await Notification.insertMany(notificationsToInsert);
              console.log(`✅ Saved ${result.length} notifications to database.`);
            }
          } else {
            console.warn('⚠️ No target users found (or Auth Service empty/down). Notification not saved.');
          }
        } catch (err) {
          console.error('Error handling notification event:', err);
        }
      }
    });

  } catch (err) {
    console.warn('⚠️ Redis not running or subscription failed. Real-time background notifications disabled.');
  }
};

// Start Server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🔔 Notification Service is running on port ${PORT}`);
    setupNotificationSubscriber();
  });
}

module.exports = app; // For testing
