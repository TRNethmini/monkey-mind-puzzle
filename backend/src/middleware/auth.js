import jwt from 'jsonwebtoken';
import config from '../config/env.js';
import logger from '../config/logger.js';

// Checks the JWT and adds the user to the request
export const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Format: Bearer TOKEN

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    jwt.verify(token, config.jwtSecret, (err, decoded) => {
      if (err) {
        logger.warn('Invalid token attempt:', err.message);
        res.status(403).json({
          success: false,
          error: 'Invalid or expired token',
        });
        return;
      }

      req.user = {
        userId: decoded.userId,
        name: decoded.name,
        avatarUrl: decoded.avatarUrl,
      };

      next();
    });
  } catch (error) {
    logger.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

// Make a new JWT for the user
export function generateToken(userId, name, avatarUrl) {
  return jwt.sign(
    { userId, name, avatarUrl },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

// Decode a JWT when sockets need it
export function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    return {
      userId: decoded.userId,
      name: decoded.name,
      avatarUrl: decoded.avatarUrl,
    };
  } catch (error) {
    logger.warn('Token verification failed:', error);
    return null;
  }
}

