import logger from '../config/logger.js';

// Catches errors and sends tidy responses
export const errorHandler = (err, req, res, _next) => {
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  // Handle validation problems from MongoDB
  if (err.name === 'ValidationError') {
    res.status(400).json({
      success: false,
      error: 'Validation error',
      details: err.message,
    });
    return;
  }

  // Handle duplicate records
  if (err.code === 11000) {
    res.status(409).json({
      success: false,
      error: 'Resource already exists',
    });
    return;
  }

  // Handle bad authentication tokens
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
    });
    return;
  }

  // Fallback for everything else
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
};

// Sends a friendly 404 message
export const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
};

