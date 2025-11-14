import { connectDatabase } from './config/database';
import { createApp, createSocketServer } from './app';
import config from './config/env';
import logger from './config/logger';

// Entry point for the backend server

async function startServer(): Promise<void> {
  try {
    // Connect to MongoDB
    await connectDatabase();

    // Set up the Express app
    const app = createApp();

    // Add Socket.IO on top of HTTP
    const { httpServer } = createSocketServer(app);

    // Start listening for requests
    httpServer.listen(config.port, () => {
      logger.info(`🚀 Server running on port ${config.port}`);
      logger.info(`📊 Environment: ${config.nodeEnv}`);
      logger.info(`🌐 Frontend URL: ${config.frontendUrl}`);
      logger.info(`🔌 Socket.IO ready for connections`);
      
      if (config.demo) {
        logger.info('🎮 DEMO MODE: Enabled');
        // Demo data is handled elsewhere
      }
      
      logger.info('🍌 Banana API ready (no auth required)');
    });

    // Clean shutdown on system signals
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM signal received: closing HTTP server');
      httpServer.close(() => {
        logger.info('HTTP server closed');
      });
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT signal received: closing HTTP server');
      httpServer.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Kick things off
startServer();

