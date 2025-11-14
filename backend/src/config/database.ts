import mongoose from 'mongoose';
import config from './env';
import logger from './logger';

export const connectDatabase = async (): Promise<void> => {
  try {
    await mongoose.connect(config.mongoUri);
    logger.info('MongoDB connected successfully');
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

//if server accidentally gets disconnected from the MongoDB database. 
// It will write a warning
mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
});

//This code runs if a an error happens with the database connection.
//  It will write an error to your log file.
mongoose.connection.on('error', (error) => {
  logger.error('MongoDB error:', error);
});

// Close the connection when the app stops
//this code runs to politely close the database connection
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  logger.info('MongoDB connection closed through app termination');
  process.exit(0);
});

