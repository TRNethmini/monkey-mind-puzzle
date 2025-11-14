import { Router } from 'express';
import { register, login, getProfile } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';
import { rateLimitLogin } from '../middleware/rateLimiter';

const router = Router();

// Routes for signing up, logging in, and fetching the current user

// Anyone can hit these
router.post('/register', register);
router.post('/login', rateLimitLogin, login); // Slow down repeated attempts

// Only available with a valid token
router.get('/me', authenticateToken, getProfile);

export default router;

