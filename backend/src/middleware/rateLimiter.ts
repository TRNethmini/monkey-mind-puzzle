import { Request, Response, NextFunction } from 'express';
import { RateLimitStore } from '../types';
import logger from '../config/logger';

// Basic in-memory rate limiter for login attempts
class RateLimiter {
  private store: RateLimitStore = {};
  private windowMs: number;
  private maxRequests: number;

  constructor(windowMs: number = 15 * 60 * 1000, maxRequests: number = 5) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;

    // Every five minutes, drop old entries
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  // Check whether we should block this request
  check(key: string): boolean {
    const now = Date.now();
    const record = this.store[key];

    if (!record || now > record.resetTime) {
      // Start a new window
      this.store[key] = {
        count: 1,
        resetTime: now + this.windowMs,
      };
      return false;
    }

    if (record.count >= this.maxRequests) {
      return true; // Too many requests
    }

    record.count++;
    return false;
  }

  // Remove expired entries from the store
  private cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const key in this.store) {
      if (this.store[key].resetTime < now) {
        delete this.store[key];
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.debug(`Rate limiter cleanup: removed ${cleanedCount} expired entries`);
    }
  }

  // Clear the counter for a key
  reset(key: string): void {
    delete this.store[key];
  }
}

// Shared limiter for login attempts (5 tries every 15 minutes)
export const loginLimiter = new RateLimiter(15 * 60 * 1000, 5);

// Express middleware that uses the limiter
export const rateLimitLogin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const key = `${req.ip}:${req.body.name || 'unknown'}`;

  if (loginLimiter.check(key)) {
    logger.warn(`Rate limit exceeded for ${key}`);
    res.status(429).json({
      success: false,
      error: 'Too many login attempts. Please try again later.',
    });
    return;
  }

  next();
};

