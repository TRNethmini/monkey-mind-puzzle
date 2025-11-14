import dotenv from 'dotenv';

dotenv.config();

interface Config {
  nodeEnv: string;
  port: number;
  frontendUrl: string;
  mongoUri: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  bananaApiKey?: string;
  bananaApiUrl?: string;
  demo: boolean;
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
  questionTimeLimit: number;
  matchDuration: number;
}

const config: Config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/monkey-mind',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  bananaApiKey: process.env.BANANA_API_KEY, // Optional so older setups still work
  bananaApiUrl: process.env.BANANA_API_URL || 'https://marcconrad.com/uob/banana/api.php',
  demo: process.env.DEMO === 'true',
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  questionTimeLimit: parseInt(process.env.QUESTION_TIME_LIMIT || '30', 10),
  matchDuration: parseInt(process.env.MATCH_DURATION || '300', 10),
};

export default config;

