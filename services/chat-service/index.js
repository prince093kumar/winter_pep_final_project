const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
const { Server } = require('socket.io');
const Redis = require('ioredis');
const { createAdapter } = require('@socket.io/redis-adapter');
const connectDB = require('./config/db');
const Room = require('./models/Room');
const chatRoutes = require('./routes/chatRoutes');
const socketHandler = require('./socket/socketHandler');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5002;

// Create HTTP Server
const server = http.createServer(app);

// Middlewares
app.use(helmet());
app.use(express.json());

// Routes
app.use('/api', chatRoutes);

// Base Route
app.get('/', (req, res) => {
  res.json({ service: 'Chat Service', status: 'Running' });
});

// Centralized error handling
app.use((err, req, res, next) => {
  console.error('Chat Service Error:', err);
  res.status(500).json({ message: 'Internal Chat Service Error' });
});

// 1. Setup Redis and Socket.IO Adapter
let io;
let redisClient;
let redisPub;

const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = process.env.REDIS_PORT || 6379;

const setupRealTime = async () => {
  // Create Socket.IO server with loose CORS since Gateway will handle external access
  io = new Server(server);

  try {
    console.log(`尝试连接 Redis @ redis://${REDIS_HOST}:${REDIS_PORT}`);
    
    // Create Redis Clients (for adapter and pub/sub)
    const pubClient = new Redis({ host: REDIS_HOST, port: REDIS_PORT, maxRetriesPerRequest: 1 });
    const subClient = pubClient.duplicate();
    redisClient = pubClient.duplicate();
    redisPub = pubClient.duplicate();

    // Event handlers to avoid crash on connection failures
    pubClient.on('error', (err) => console.error('Redis Pub Client Error:', err.message));
    subClient.on('error', (err) => console.error('Redis Sub Client Error:', err.message));
    redisClient.on('error', (err) => console.error('Redis Client Error:', err.message));
    redisPub.on('error', (err) => console.error('Redis PubSub Error:', err.message));

    // Wait for at least one Redis ping to decide if we use adapter
    await redisClient.ping();
    
    // Setup Socket.IO adapter for horizontal scaling
    io.adapter(createAdapter(pubClient, subClient));
    console.log('✅ Scalable Redis Adapter applied to Socket.IO successfully.');
  } catch (err) {
    console.warn('⚠️ Redis not running or connection failed. Proceeding with in-memory adapter.');
    // Set fallback to null so handler knows to use in-memory fallbacks
    redisClient = null;
    redisPub = null;
  }

  // Pass io and redis handles to the Socket event handler
  socketHandler(io, redisClient, redisPub);
};

// 2. Database Connection and Room Seeding
const startServer = async () => {
  // Connect DB
  await connectDB();

  // Seed default chat rooms
  try {
    const defaultRooms = [
      { name: 'General', description: 'The main lobby for open discussions' },
      { name: 'Tech', description: 'Web development, systems architecture, and engineering chat' },
      { name: 'DevOps', description: 'Docker, CI/CD, Jenkins, and orchestration topics' },
      { name: 'Random', description: 'Memes, jokes, and off-topic conversations' }
    ];

    for (const room of defaultRooms) {
      await Room.findOneAndUpdate(
        { name: room.name },
        room,
        { upsert: true, new: true }
      );
    }
    console.log('✅ Default rooms seeded/verified successfully.');
  } catch (err) {
    console.error('Error seeding default rooms:', err);
  }

  // Initialize Real-time socket systems
  await setupRealTime();

  // Start HTTP and WebSockets server
  if (process.env.NODE_ENV !== 'test') {
    server.listen(PORT, () => {
      console.log(`💬 Chat Service is running on port ${PORT}`);
    });
  }
};

startServer();

module.exports = { app, server }; // Export both for testing
