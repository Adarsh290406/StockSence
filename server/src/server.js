/**
 * StockSense - Main Express Server Entry Point
 * Implements REST APIs for Inventory Management with PostgreSQL backend.
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { initSchema, query } = require('./db/database');

// Import modular routes
const { router: authRouter } = require('./routes/auth');
const settingsRouter = require('./routes/settings');
const productsRouter = require('./routes/products');
const operationsRouter = require('./routes/operations');
const ledgerRouter = require('./routes/ledger');
const dashboardRouter = require('./routes/dashboard');

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================================================
// MIDDLEWARE CONFIGURATION
// ============================================================================
app.use(cors({
  origin: '*', // Allow frontend requests during hackathon demo
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logger for development
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`[${req.method}] ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
    });
    next();
  });
}

// ============================================================================
// API ROUTES
// ============================================================================
app.use('/api/auth', authRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/products', productsRouter);
app.use('/api/operations', operationsRouter);
app.use('/api/ledger', ledgerRouter);
app.use('/api/dashboard', dashboardRouter);

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const dbCheck = await query('SELECT NOW() as current_time, count(1) as total_users FROM users');
    res.json({
      status: 'healthy',
      service: 'StockSense API Engine',
      database: 'PostgreSQL Connected',
      timestamp: dbCheck.rows[0].current_time,
      users_count: dbCheck.rows[0].total_users
    });
  } catch (err) {
    res.status(500).json({ status: 'unhealthy', database: 'Disconnected', error: err.message });
  }
});

// Root route
app.get('/', (req, res) => {
  res.json({
    name: 'StockSense API Server',
    version: '1.0.0',
    description: 'Relational SQL ERP & Modular Inventory Management System',
    documentation: '/api/health'
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Endpoint '${req.originalUrl}' not found` });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Server Error]:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ============================================================================
// SERVER INITIALIZATION
// ============================================================================
async function startServer() {
  try {
    console.log('Verifying PostgreSQL schema synchronization...');
    await initSchema();

    app.listen(PORT, () => {
      console.log('====================================================');
      console.log(`🚀 StockSense Backend Server is LIVE on port ${PORT}`);
      console.log(`🌐 Base URL: http://localhost:${PORT}`);
      console.log(`🩺 Health Check: http://localhost:${PORT}/api/health`);
      console.log('====================================================');
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = app;
