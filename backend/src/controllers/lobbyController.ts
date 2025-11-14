import { Response } from 'express';
import Lobby from '../models/Lobby';
import User from '../models/User';
import { AuthRequest, LobbyListItem } from '../types';
import { generateLobbyCode } from '../utils/codeGenerator';
import { isValidMaxPlayers, isValidQuestionCount, sanitizeString } from '../utils/validators';
import logger from '../config/logger';
import { ensureAvatar } from '../utils/avatar';

// List public lobbies that are waiting for players
export const getPublicLobbies = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const lobbies = await Lobby.find({
      isPublic: true,
      status: 'waiting',
    })
      .populate('ownerId', 'name')
      .sort({ createdAt: -1 })
      .limit(50);

    const lobbyList: LobbyListItem[] = lobbies.map((lobby: any) => ({
      code: lobby.code,
      name: lobby.name,
      ownerName: lobby.ownerId?.name || 'Unknown',
      playerCount: lobby.players.length,
      maxPlayers: lobby.maxPlayers,
      status: lobby.status,
    }));

    res.status(200).json({
      success: true,
      data: { lobbies: lobbyList },
    });
  } catch (error: any) {
    logger.error('Get public lobbies error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch lobbies',
    });
  }
};

// Show info about a single lobby
export const getLobbyDetails = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { code } = req.params;

    const lobby = await Lobby.findOne({ code: code.toUpperCase() }).populate('ownerId', 'name');

    if (!lobby) {
      res.status(404).json({
        success: false,
        error: 'Lobby not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { lobby },
    });
  } catch (error: any) {
    logger.error('Get lobby details error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch lobby details',
    });
  }
};

// Make a new lobby for the player
export const createLobby = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, isPublic = true, maxPlayers = 8, settings = {} } = req.body;
    const userId = req.user?.userId;
    const userName = req.user?.name;

    if (!userId || !userName) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    let userAvatar = req.user?.avatarUrl;
    if (!userAvatar) {
      const userRecord = await User.findById(userId);
      if (userRecord) {
        const ensuredAvatar = ensureAvatar(userRecord.avatarUrl);
        if (ensuredAvatar !== userRecord.avatarUrl) {
          userRecord.avatarUrl = ensuredAvatar;
          await userRecord.save();
        }
        userAvatar = ensuredAvatar;
      } else {
        userAvatar = ensureAvatar();
      }
    }

    // Make sure the name looks fine
    if (!name || name.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'Lobby name is required',
      });
      return;
    }

    if (!isValidMaxPlayers(maxPlayers)) {
      res.status(400).json({
        success: false,
        error: 'Max players must be between 2 and 16',
      });
      return;
    }

    // Check the optional settings
    if (settings.questionCount && !isValidQuestionCount(settings.questionCount)) {
      res.status(400).json({
        success: false,
        error: 'Question count must be between 5 and 50',
      });
      return;
    }

    // Try to find a fresh lobby code
    let code: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      code = generateLobbyCode();
      const existing = await Lobby.findOne({ code });
      if (!existing) break;
      attempts++;
    } while (attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      res.status(500).json({
        success: false,
        error: 'Failed to generate unique lobby code',
      });
      return;
    }

    // Save the lobby with the owner already inside
    const lobby = new Lobby({
      code,
      name: sanitizeString(name),
      ownerId: userId,
      isPublic,
      maxPlayers,
      players: [
        {
          userId,
          name: userName,
          avatarUrl: ensureAvatar(userAvatar),
          score: 0,
          answers: [],
        },
      ],
      settings: {
        maxPlayers,
        questionCount: settings.questionCount || 10,
        questionTimeLimit: settings.questionTimeLimit || 30,
        difficulty: settings.difficulty || 'medium',
      },
      status: 'waiting',
    });

    await lobby.save();

    logger.info(`Lobby created: ${code} by ${userName}`);

    res.status(201).json({
      success: true,
      data: { lobby },
      message: 'Lobby created successfully',
    });
  } catch (error: any) {
    logger.error('Create lobby error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create lobby',
    });
  }
};

// Add the player to a lobby
export const joinLobby = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { code } = req.params;
    const userId = req.user?.userId;
    const userName = req.user?.name;

    if (!userId || !userName) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    const lobby = await Lobby.findOne({ code: code.toUpperCase() });

    if (!lobby) {
      res.status(404).json({
        success: false,
        error: 'Lobby not found',
      });
      return;
    }

    // Stop if the lobby is already full
    if (lobby.players.length >= lobby.maxPlayers) {
      res.status(400).json({
        success: false,
        error: 'Lobby is full',
      });
      return;
    }

    // Only waiting lobbies can be joined
    if (lobby.status !== 'waiting') {
      res.status(400).json({
        success: false,
        error: 'Game already in progress',
      });
      return;
    }

    // Skip if the player is already listed
    const existingPlayer = lobby.players.find((p) => p.userId === userId);
    let avatarUrl = ensureAvatar(req.user?.avatarUrl);
    if (!req.user?.avatarUrl) {
      const userRecord = await User.findById(userId);
      if (userRecord) {
        const ensuredAvatar = ensureAvatar(userRecord.avatarUrl);
        if (ensuredAvatar !== userRecord.avatarUrl) {
          userRecord.avatarUrl = ensuredAvatar;
          await userRecord.save();
        }
        avatarUrl = ensuredAvatar;
      }
    }

    if (existingPlayer) {
      if (!existingPlayer.avatarUrl && avatarUrl) {
        existingPlayer.avatarUrl = avatarUrl;
        await lobby.save();
      }
      res.status(200).json({
        success: true,
        data: { lobby },
        message: 'Already in lobby',
      });
      return;
    }

    // Add the player to the list
    lobby.players.push({
      userId,
      name: userName,
      avatarUrl,
      score: 0,
      answers: [],
    });

    await lobby.save();

    logger.info(`${userName} joined lobby ${code}`);

    res.status(200).json({
      success: true,
      data: { lobby },
      message: 'Joined lobby successfully',
    });
  } catch (error: any) {
    logger.error('Join lobby error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to join lobby',
    });
  }
};

// Remove the player from the lobby
export const leaveLobby = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { code } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    const lobby = await Lobby.findOne({ code: code.toUpperCase() });

    if (!lobby) {
      res.status(404).json({
        success: false,
        error: 'Lobby not found',
      });
      return;
    }

    // Drop the player from the roster
    lobby.players = lobby.players.filter((p) => p.userId !== userId);

    // Pick a new owner if the old one leaves
    if (lobby.ownerId.toString() === userId && lobby.players.length > 0) {
      lobby.ownerId = lobby.players[0].userId as any;
      logger.info(`Lobby ${code} ownership transferred to ${lobby.players[0].name}`);
    }

    // Clean up the lobby if everyone left
    if (lobby.players.length === 0) {
      await Lobby.deleteOne({ _id: lobby._id });
      logger.info(`Lobby ${code} deleted (no players left)`);
      res.status(200).json({
        success: true,
        message: 'Left lobby and lobby deleted',
      });
      return;
    }

    await lobby.save();

    logger.info(`User ${userId} left lobby ${code}`);

    res.status(200).json({
      success: true,
      data: { lobby },
      message: 'Left lobby successfully',
    });
  } catch (error: any) {
    logger.error('Leave lobby error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to leave lobby',
    });
  }
};

// Let the owner kick off the game
export const startGame = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { code } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    const lobby = await Lobby.findOne({ code: code.toUpperCase() });

    if (!lobby) {
      res.status(404).json({
        success: false,
        error: 'Lobby not found',
      });
      return;
    }

    // Only the owner can start the game
    if (lobby.ownerId.toString() !== userId) {
      res.status(403).json({
        success: false,
        error: 'Only lobby owner can start the game',
      });
      return;
    }

    // Make sure there are enough people to play
    if (lobby.players.length < 2) {
      res.status(400).json({
        success: false,
        error: 'Need at least 2 players to start',
      });
      return;
    }

    // Do nothing if the game already moved on
    if (lobby.status !== 'waiting') {
      res.status(400).json({
        success: false,
        error: 'Game already started or finished',
      });
      return;
    }

    // We only validate here; sockets handle the actual start
    logger.info(`Game start requested for lobby ${code}`);

    res.status(200).json({
      success: true,
      data: { lobby },
      message: 'Game starting',
    });
  } catch (error: any) {
    logger.error('Start game error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start game',
    });
  }
};

// Let the owner tweak lobby settings
export const updateLobby = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { code } = req.params;
    const userId = req.user?.userId;
    const { maxPlayers, questionCount, questionTimeLimit, difficulty, isPublic, name } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
      return;
    }

    const lobby = await Lobby.findOne({ code });

    if (!lobby) {
      res.status(404).json({
        success: false,
        error: 'Lobby not found',
      });
      return;
    }

    // Only the owner can touch settings
    if (lobby.ownerId.toString() !== userId) {
      res.status(403).json({
        success: false,
        error: 'Only lobby owner can update settings',
      });
      return;
    }

    // No edits once the game begins
    if (lobby.status !== 'waiting') {
      res.status(400).json({
        success: false,
        error: 'Cannot update settings after game has started',
      });
      return;
    }

    // Update whichever settings were sent
    if (name !== undefined) {
      lobby.name = sanitizeString(name).substring(0, 50);
    }

    if (maxPlayers !== undefined) {
      if (!isValidMaxPlayers(maxPlayers)) {
        res.status(400).json({
          success: false,
          error: 'Invalid max players (must be 2-8)',
        });
        return;
      }
      lobby.maxPlayers = maxPlayers;
      lobby.settings.maxPlayers = maxPlayers;
    }

    if (questionCount !== undefined) {
      if (!isValidQuestionCount(questionCount)) {
        res.status(400).json({
          success: false,
          error: 'Invalid question count (must be 3-20)',
        });
        return;
      }
      lobby.settings.questionCount = questionCount;
    }

    if (questionTimeLimit !== undefined) {
      if (questionTimeLimit < 5 || questionTimeLimit > 60) {
        res.status(400).json({
          success: false,
          error: 'Invalid time limit (must be 5-60 seconds)',
        });
        return;
      }
      lobby.settings.questionTimeLimit = questionTimeLimit;
    }

    if (difficulty !== undefined) {
      const validDifficulties = ['easy', 'medium', 'hard'];
      if (!validDifficulties.includes(difficulty)) {
        res.status(400).json({
          success: false,
          error: 'Invalid difficulty (must be easy, medium, or hard)',
        });
        return;
      }
      lobby.settings.difficulty = difficulty;
    }

    if (isPublic !== undefined) {
      lobby.isPublic = Boolean(isPublic);
    }

    await lobby.save();

    logger.info(`Lobby ${code} settings updated by owner`);

    res.status(200).json({
      success: true,
      data: { lobby },
      message: 'Lobby settings updated',
    });
  } catch (error: any) {
    logger.error('Update lobby error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
};

