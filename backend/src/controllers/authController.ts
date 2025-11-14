import { Request, Response } from 'express';
import User from '../models/User';
import { generateToken } from '../middleware/auth';
import { isValidPin, isValidName, sanitizeString } from '../utils/validators';
import logger from '../config/logger';
import { generateAvatarUrl, ensureAvatar } from '../utils/avatar';

// Handles login and registration with a name and simple PIN

// Register a new player
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, pin } = req.body;

    // Make sure we got both values
    if (!name || !pin) {
      res.status(400).json({
        success: false,
        error: 'Name and PIN are required',
      });
      return;
    }

    if (!isValidName(name)) {
      res.status(400).json({
        success: false,
        error: 'Name must be between 1 and 50 characters',
      });
      return;
    }

    if (!isValidPin(pin)) {
      res.status(400).json({
        success: false,
        error: 'PIN must be exactly 4 digits',
      });
      return;
    }

    // Clean up the name before use
    const sanitizedName = sanitizeString(name);

    // Stop if someone already picked that name
    const existingUser = await User.findOne({ name: sanitizedName });
    if (existingUser) {
      res.status(409).json({
        success: false,
        error: 'Username already taken',
      });
      return;
    }

    // Create the user; the model hashes the PIN for us
    const user = new User({
      name: sanitizedName,
      pin: pin, // Will be hashed automatically
      avatarUrl: generateAvatarUrl(),
    });

    await user.save();

    // Hand back a fresh token
    const token = generateToken((user._id as any).toString(), user.name, user.avatarUrl);

    logger.info(`New user registered: ${user.name}`);

    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          totalWins: user.totalWins,
          totalGames: user.totalGames,
          createdAt: user.createdAt,
          avatarUrl: user.avatarUrl,
        },
      },
      message: 'User registered successfully',
    });
  } catch (error: any) {
    logger.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed',
    });
  }
};

// Log a player in
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, pin } = req.body;

    // Check the basics first
    if (!name || !pin) {
      res.status(400).json({
        success: false,
        error: 'Name and PIN are required',
      });
      return;
    }

    if (!isValidPin(pin)) {
      res.status(400).json({
        success: false,
        error: 'Invalid PIN format',
      });
      return;
    }

    // Look up the user by name
    const user = await User.findOne({ name: sanitizeString(name) });
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
      return;
    }

    // Check the provided PIN
    const isValidPassword = await user.comparePin(pin);
    if (!isValidPassword) {
      res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
      return;
    }

    // Give older players an avatar if they lack one
    if (!user.avatarUrl) {
      user.avatarUrl = ensureAvatar();
      await user.save();
    }

    // Send back a token for the session
    const token = generateToken((user._id as any).toString(), user.name, user.avatarUrl);

    logger.info(`User logged in: ${user.name}`);

    res.status(200).json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          totalWins: user.totalWins,
          totalGames: user.totalGames,
          createdAt: user.createdAt,
          avatarUrl: user.avatarUrl,
        },
      },
      message: 'Login successful',
    });
  } catch (error: any) {
    logger.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed',
    });
  }
};

// Fetch the logged-in player's details
export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.userId;

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    if (!user.avatarUrl) {
      user.avatarUrl = ensureAvatar();
      await user.save();
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          totalWins: user.totalWins,
          totalGames: user.totalGames,
          createdAt: user.createdAt,
          avatarUrl: user.avatarUrl,
        },
      },
    });
  } catch (error: any) {
    logger.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch profile',
    });
  }
};

