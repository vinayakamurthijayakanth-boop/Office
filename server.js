require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const app = express();

// Import routes
const authRoutes = require('./routes/authRoutes');
const flightRoutes = require('./routes/flightRoutes');
const shipmentRoutes = require('./routes/shipmentRoutes');

// Middleware
app.use(cors());
app.use(express.json()); // Body parser for JSON requests
app.use(morgan('dev')); // Logger

// Database Connection
const mongoUri = process.env.MONGODB_URI;
mongoose.connect(mongoUri)
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => console.error('MongoDB connection error:', err));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/flights', flightRoutes);
app.use('/api/shipments', shipmentRoutes);

// Basic route for testing
app.get('/', (req, res) => {
  res.send('Logistics Management System API is running!');
});

// Error handling middleware (basic example)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});