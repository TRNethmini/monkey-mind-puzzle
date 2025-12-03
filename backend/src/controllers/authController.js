import User from '../models/User.js';
import { generateToken } from '../middleware/auth.js';
import { isValidPin, isValidName, sanitizeString } from '../utils/validators.js';
import logger from '../config/logger.js';
import { generateAvatarUrl, ensureAvatar } from '../utils/avatar.js';
import { OAuth2Client } from 'google-auth-library';
import config from '../config/env.js';

// Handles login and registration with a name and simple PIN, plus Google OAuth

// Register a new player
export const register = async (req, res) => {
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
    const token = generateToken(user._id.toString(), user.name, user.avatarUrl);

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
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed',
    });
  }
};

// Log a player in
export const login = async (req, res) => {
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
    const token = generateToken(user._id.toString(), user.name, user.avatarUrl);

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
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed',
    });
  }
};

// Log in or register with Google OAuth
export const googleAuth = async (req, res) => {
  try {
    const { credential } = req.body; // Google ID token

    if (!credential) {
      res.status(400).json({
        success: false,
        error: 'Google credential is required',
      });
      return;
    }

    if (!config.googleClientId) {
      logger.error('Google Client ID not configured');
      res.status(500).json({
        success: false,
        error: 'Google authentication not configured',
      });
      return;
    }

    // Verify the Google ID token
    const client = new OAuth2Client(config.googleClientId);
    let ticket;
    try {
      ticket = await client.verifyIdToken({
        idToken: credential,
        audience: config.googleClientId,
      });
    } catch (error) {
      logger.warn('Invalid Google token:', error.message);
      res.status(401).json({
        success: false,
        error: 'Invalid Google credential',
      });
      return;
    }

    const payload = ticket.getPayload();
    if (!payload) {
      res.status(401).json({
        success: false,
        error: 'Invalid Google credential',
      });
      return;
    }

    const googleId = payload.sub;
    const googleName = payload.name || payload.email?.split('@')[0] || 'User';
    const googleEmail = payload.email;

    // Sanitize the name from Google
    const sanitizedName = sanitizeString(googleName);

    // Check if user already exists with this Google ID
    let user = await User.findOne({ googleId });

    if (user) {
      // Existing user - ensure they have a monkey avatar
      if (!user.avatarUrl) {
        user.avatarUrl = generateAvatarUrl();
        await user.save();
      }

      logger.info(`Google user logged in: ${user.name}`);
    } else {
      // Check if a user with this name already exists (non-Google user)
      const existingUser = await User.findOne({ name: sanitizedName });
      if (existingUser) {
        // If existing user doesn't have Google ID, add it
        if (!existingUser.googleId) {
          existingUser.googleId = googleId;
          // Keep existing avatar or generate monkey avatar if none
          if (!existingUser.avatarUrl) {
            existingUser.avatarUrl = generateAvatarUrl();
          }
          await existingUser.save();
          user = existingUser;
          logger.info(`Linked Google account to existing user: ${user.name}`);
        } else {
          // Name conflict with another Google user
          res.status(409).json({
            success: false,
            error: 'Username already taken. Please use a different name.',
          });
          return;
        }
      } else {
        // New user - create account with monkey avatar
        user = new User({
          name: sanitizedName,
          googleId: googleId,
          pin: undefined, // No PIN needed for Google users
          avatarUrl: generateAvatarUrl(), // Always use monkey avatar
        });

        await user.save();
        logger.info(`New Google user registered: ${user.name}`);
      }
    }

    // Generate token
    const token = generateToken(user._id.toString(), user.name, user.avatarUrl);

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
      message: 'Google authentication successful',
    });
    } catch (error) {
      logger.error('Google auth error:', error);
      logger.error('Error stack:', error.stack);
      res.status(500).json({
        success: false,
        error: 'Google authentication failed',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  };

// Fetch the logged-in player's details
export const getProfile = async (req, res) => {
  try {
    const userId = req.user?.userId;

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
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch profile',
    });
  }
};

