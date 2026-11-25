/**
 * Centralized error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  console.error(`[Error] ${req.method} ${req.url}:`, err.message);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      error: 'Validation Error',
      details: messages,
    });
  }

  // Mongoose CastError (e.g., invalid ID)
  if (err.name === 'CastError') {
    return res.status(400).json({
      error: `Invalid ${err.path}: ${err.value}`,
    });
  }

  // MongoDB duplicate key error
  if (err.code === 11000) {
    return res.status(409).json({
      error: 'Duplicate field value entered',
    });
  }

  // Fallback internal server error
  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  res.status(statusCode).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
};

/**
 * Middleware to simulate occasional API failures when requested
 */
const simulateFailureMiddleware = (req, res, next) => {
  const isHeaderSet = req.headers['x-simulate-failure'] === 'true';
  const isQuerySet = req.query.simulate_failure === 'true';
  const isEnvRandom = process.env.SIMULATE_FAILURE === 'true' && Math.random() < 0.2;

  if (isHeaderSet || isQuerySet || isEnvRandom) {
    console.warn(`[Simulation] Triggered deliberate failure on ${req.method} ${req.url}`);
    return res.status(500).json({
      error: 'Simulated API failure for rollback and resilience verification',
    });
  }

  next();
};

module.exports = { errorHandler, simulateFailureMiddleware };
