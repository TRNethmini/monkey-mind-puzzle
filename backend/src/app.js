import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import config from './config/env.js';
import authRoutes from './routes/authRoutes.js';
import lobbyRoutes from './routes/lobbyRoutes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { setupSocketHandlers } from './sockets/socketHandlers.js';
import logger from './config/logger.js';

// Builds the Express app with all of our middleware
export function createApp() {
  const app = express();

  // Add basic security helpers
  app.use(helmet());

  // Allow the frontend to talk to the API
  app.use(
    cors({
      origin: config.frontendUrl,
      credentials: true,
    })
  );

  // Read JSON and form data
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Log each request for debugging
  app.use((req, _res, next) => {
    logger.debug(`${req.method} ${req.path}`);
    next();
  });

  // Simple health check route
  app.get('/health', (_req, res) => {
    res.status(200).json({
      success: true,
      message: 'Server is running',
      timestamp: new Date().toISOString(),
    });
  });

  // Wire up the main API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/lobbies', lobbyRoutes);

  // Catch 404s and other errors
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

// Builds the HTTP server and socket layer
export function createSocketServer(app) {
  const httpServer = createServer(app);

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: config.frontendUrl,
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Attach our socket event handlers
  setupSocketHandlers(io);

  logger.info('Socket.IO server configured');

  return { httpServer, io };
}

