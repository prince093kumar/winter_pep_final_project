const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { rateLimit } = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const { createProxyMiddleware } = require('http-proxy-middleware');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:5001';
const CHAT_SERVICE_URL = process.env.CHAT_SERVICE_URL || 'http://localhost:5002';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:5003';
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// 1. Logging
app.use(morgan('combined'));

// 2. Security Headers (with adjustment for WebSocket/Socket.IO connections if served over gateway)
app.use(helmet({
  contentSecurityPolicy: false, // For easier dev setup
  crossOriginResourcePolicy: false
}));

// 3. CORS settings
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

// 4. Rate Limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000, // Increased limit to prevent IP blocking during testing
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests from this IP, please try again after 15 minutes.' }
});
app.use('/api', limiter);

// 5. JWT Verification Middleware
const verifyJWT = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    // If not a protected endpoint, we can proceed without user header
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    // Bind decoded info to request
    req.user = decoded;
    next();
  });
};

// Apply JWT parsing to all API requests
app.use('/api', verifyJWT);

// Helper function to inject user headers when proxying
const onProxyReq = (proxyReq, req, res) => {
  if (req.user) {
    proxyReq.setHeader('x-user-id', req.user.id);
    proxyReq.setHeader('x-user-email', req.user.email);
    proxyReq.setHeader('x-user-role', req.user.role);
    proxyReq.setHeader('x-user-username', req.user.username || '');
  }
};

// Health Check Endpoint for Jenkins / AWS
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', service: 'API Gateway' });
});

app.get('/', (req, res) => {
  res.status(200).json({ message: 'Welcome to the Micro-Chat API Gateway' });
});

// 6. Router Proxies

// Auth Service proxy
app.use('/api/auth', createProxyMiddleware({
  target: AUTH_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/': '/api/auth/'
  },
  on: {
    proxyReq: onProxyReq
  }
}));

// Chat Service REST APIs proxy
app.use('/api/messages', createProxyMiddleware({
  target: CHAT_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/': '/api/messages/'
  },
  on: {
    proxyReq: onProxyReq
  }
}));

app.use('/api/rooms', createProxyMiddleware({
  target: CHAT_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/': '/api/rooms/'
  },
  on: {
    proxyReq: onProxyReq
  }
}));

// Notification Service proxy
app.use('/api/notifications', createProxyMiddleware({
  target: NOTIFICATION_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/': '/api/notifications/'
  },
  on: {
    proxyReq: onProxyReq
  }
}));

// Socket.IO Websocket proxying (forwarding /socket.io requests to the Chat Service)
app.use('/socket.io', createProxyMiddleware({
  target: CHAT_SERVICE_URL,
  ws: true,
  changeOrigin: true
}));

// Centralized error handler
app.use((err, req, res, next) => {
  console.error('API Gateway Error:', err);
  res.status(500).json({ message: 'Internal Server Error' });
});

// Start Server
const server = app.listen(PORT, () => {
  console.log(`🚀 API Gateway is running on port ${PORT}`);
  console.log(`👉 Routing /api/auth -> ${AUTH_SERVICE_URL}`);
  console.log(`👉 Routing /api/messages -> ${CHAT_SERVICE_URL}`);
  console.log(`👉 Routing /api/rooms -> ${CHAT_SERVICE_URL}`);
  console.log(`👉 Routing /api/notifications -> ${NOTIFICATION_SERVICE_URL}`);
  console.log(`👉 Routing WS /socket.io -> ${CHAT_SERVICE_URL}`);
});
