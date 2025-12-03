import { Router } from 'express';
import { register, login, getProfile, googleAuth } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';
import { rateLimitLogin } from '../middleware/rateLimiter.js';

const router = Router();

// Routes for signing up, logging in, and fetching the current user

// Anyone can hit these
router.post('/register', register);
router.post('/login', rateLimitLogin, login); // Slow down repeated attempts
router.post('/google', googleAuth); // Google OAuth login/register

// Only available with a valid token
router.get('/me', authenticateToken, getProfile);

export default router;

