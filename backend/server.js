require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectDB } = require('./config/db');
const taskRoutes = require('./routes/taskRoutes');
const eventRoutes = require('./routes/eventRoutes');
const { errorHandler, simulateFailureMiddleware } = require('./middleware/errorHandler');
const { seedInitialData } = require('./seed');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*', // Allow all origins in dev, or configure via CLIENT_URL
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-simulate-failure'],
}));
app.use(express.json());

// Simulation hook for error handling & rollback testing
app.use(simulateFailureMiddleware);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api', taskRoutes);
app.use('/api', eventRoutes);

// Centralized error handling
app.use(errorHandler);

// Start server function for app export (useful in tests)
const startServer = async () => {
  try {
    await connectDB();
    
    // Automatically seed initial data if database is empty
    await seedInitialData();

    const server = app.listen(PORT, () => {
      console.log(`[Kanban Server] Running on http://localhost:${PORT}`);
      console.log(`[Kanban Server] SSE endpoint at http://localhost:${PORT}/api/events`);
    });

    return server;
  } catch (err) {
    console.error('[Kanban Server] Fatal start error:', err);
    process.exit(1);
  }
};

// If run directly, start the server
if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
