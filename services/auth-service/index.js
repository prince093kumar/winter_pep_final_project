const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./config/db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

// Connect to Database (skip if running in Jest tests)
if (process.env.NODE_ENV !== 'test' && !process.env.JEST_WORKER_ID) {
  connectDB();
}

// Middlewares
app.use(helmet());
app.use(express.json());

// Routes
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

// Base Route
app.get('/', (req, res) => {
  res.json({ service: 'Auth Service', status: 'Running' });
});

// Centralized error handling
app.use((err, req, res, next) => {
  console.error('Auth Service Error:', err);
  res.status(500).json({ message: 'Internal Service Error' });
});

// Start Server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🔒 Auth Service is running on port ${PORT}`);
  });
}

module.exports = app; // For testing
