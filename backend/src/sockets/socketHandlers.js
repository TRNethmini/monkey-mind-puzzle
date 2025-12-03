import { Server } from 'socket.io';
import { verifyToken } from '../middleware/auth.js';
import Lobby from '../models/Lobby.js';
import {
  initializeGame,
  getCurrentQuestion,
  submitAnswer,
  nextQuestion,
  getGameState,
} from '../services/gameEngine.js';
import logger from '../config/logger.js';

// Socket listeners that keep the multiplayer flow running

export function setupSocketHandlers(io) {
  io.on('connection', async (socket) => {
    logger.info(`New socket connection: ${socket.id}`);

    // Let the socket prove who they are
    socket.on('authenticate', async (data) => {
      try {
        const user = verifyToken(data.token);

        if (!user) {
          socket.emit('error', { message: 'Authentication failed' });
          socket.disconnect();
          return;
        }

        socket.userId = user.userId;
        socket.userName = user.name;
        socket.userAvatar = user.avatarUrl;

        logger.info(`Socket authenticated: ${socket.userName} (${socket.id})`);
        socket.emit('authenticated', { success: true });
      } catch (error) {
        logger.error('Socket authentication error:', error);
        socket.emit('error', { message: 'Authentication error' });
        socket.disconnect();
      }
    });

    // Add the socket to a lobby room
    socket.on('joinLobby', async (data) => {
      try {
        if (!socket.userId || !socket.userName) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }

        const { code } = data;
        const lobby = await Lobby.findOne({ code: code.toUpperCase() });

        if (!lobby) {
          socket.emit('error', { message: 'Lobby not found' });
          return;
        }

        // Remember the latest socket info
        const player = lobby.players.find((p) => p.userId === socket.userId);
        if (player) {
          player.socketId = socket.id;
          if (!player.avatarUrl && socket.userAvatar) {
            player.avatarUrl = socket.userAvatar;
          }
          await lobby.save();
        }

        // Subscribe to lobby updates
        socket.join(code.toUpperCase());

        logger.info(`${socket.userName} joined lobby ${code}`);

        // Share the current lobby data
        socket.emit('joinedLobby', { lobby });

        // Tell everyone else about the change
        io.to(code.toUpperCase()).emit('lobbyUpdate', { lobby });
      } catch (error) {
        logger.error('Join lobby error:', error);
        socket.emit('error', { message: 'Failed to join lobby' });
      }
    });

    // Handle a player backing out of a lobby
    socket.on('leaveLobby', async (data) => {
      try {
        if (!socket.userId) {
          return;
        }

        const { code } = data;
        const lobby = await Lobby.findOne({ code: code.toUpperCase() });

        if (!lobby) {
          return;
        }

        // Take the player out of the list
        lobby.players = lobby.players.filter((p) => p.userId !== socket.userId);

        // Stop sending lobby messages to that socket
        socket.leave(code.toUpperCase());

        // Promote someone else if the owner leaves
        if (lobby.ownerId.toString() === socket.userId && lobby.players.length > 0) {
          lobby.ownerId = lobby.players[0].userId;
        }

        // Drop the lobby if it is empty
        if (lobby.players.length === 0) {
          await Lobby.deleteOne({ _id: lobby._id });
          logger.info(`Lobby ${code} deleted (empty)`);
          return;
        }

        await lobby.save();

        logger.info(`${socket.userName} left lobby ${code}`);

        // Let everyone else know
        io.to(code.toUpperCase()).emit('lobbyUpdate', { lobby });
      } catch (error) {
        logger.error('Leave lobby error:', error);
      }
    });

    // Allow the owner to tweak lobby settings live
    socket.on('updateLobbySettings', async (data) => {
      try {
        if (!socket.userId) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }

        const { code, settings } = data;
        const lobby = await Lobby.findOne({ code: code.toUpperCase() });

        if (!lobby) {
          socket.emit('error', { message: 'Lobby not found' });
          return;
        }

        // Only owners can change these
        if (lobby.ownerId.toString() !== socket.userId) {
          socket.emit('error', { message: 'Only owner can update settings' });
          return;
        }

        // Update the settings with light checks
        if (settings.maxPlayers) lobby.settings.maxPlayers = settings.maxPlayers;
        if (settings.questionCount) lobby.settings.questionCount = settings.questionCount;
        if (settings.questionTimeLimit) lobby.settings.questionTimeLimit = settings.questionTimeLimit;
        if (settings.difficulty) lobby.settings.difficulty = settings.difficulty;
        if (settings.isPublic !== undefined) lobby.isPublic = settings.isPublic;

        await lobby.save();

        logger.info(`Lobby ${code} settings updated by ${socket.userName}`);

        // Share the new settings with the room
        io.to(code.toUpperCase()).emit('lobbyUpdate', { lobby });
      } catch (error) {
        logger.error('Update lobby settings error:', error);
        socket.emit('error', { message: 'Failed to update settings' });
      }
    });

    // Owner starts the game from sockets
    socket.on('startGame', async (data) => {
      try {
        if (!socket.userId) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }

        const { code } = data;
        const lobby = await Lobby.findOne({ code: code.toUpperCase() });

        if (!lobby) {
          socket.emit('error', { message: 'Lobby not found' });
          return;
        }

        // Only owners can hit start
        if (lobby.ownerId.toString() !== socket.userId) {
          socket.emit('error', { message: 'Only owner can start game' });
          return;
        }

        // Need at least two players
        if (lobby.players.length < 2) {
          socket.emit('error', { message: 'Need at least 2 players' });
          return;
        }

        // Kick off the server-side game setup
        logger.info(`Initializing game for lobby ${code}...`);
        const gameState = await initializeGame(code.toUpperCase());

        if (!gameState) {
          logger.error(`Failed to initialize game for lobby ${code}`);
          socket.emit('error', { message: 'Failed to start game' });
          io.to(code.toUpperCase()).emit('error', { message: 'Failed to start game' });
          return;
        }

        logger.info(`Game successfully started in lobby ${code} by ${socket.userName}`);

        // Let everyone know the game began
        io.to(code.toUpperCase()).emit('gameStart', {
          totalQuestions: gameState.questions.length,
          settings: lobby.settings,
        });

        logger.info(`Sending first question after 3 second delay...`);

        // Give a short countdown before the first question
        setTimeout(() => {
          sendCurrentQuestion(io, code.toUpperCase());
        }, 3000);
      } catch (error) {
        logger.error('Start game error:', error);
        socket.emit('error', { message: 'Failed to start game' });
      }
    });

    // Handle answers from players
    socket.on('submitAnswer', async (data) => {
      try {
        if (!socket.userId || !socket.userName) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }

        const { questionId, answer, timeToAnswer } = data;

        // Figure out the matching lobby
        const lobby = await Lobby.findOne({
          'players.socketId': socket.id,
          status: 'playing',
        });

        if (!lobby) {
          socket.emit('error', { message: 'Game not found' });
          return;
        }

        // Check the answer and update score
        const result = await submitAnswer(
          lobby.code,
          socket.userId,
          questionId,
          answer,
          timeToAnswer
        );

        // Tell the player how they did
        socket.emit('answerResult', {
          isCorrect: result.isCorrect,
          correctAnswer: result.correctAnswer,
          scoreGained: result.score,
          timeBonus: result.timeBonus,
        });

        // Grab the refreshed lobby info
        const updatedLobby = await Lobby.findOne({ code: lobby.code });

        if (updatedLobby) {
          // Share new scores with everyone
          io.to(lobby.code).emit('scoreUpdate', {
            players: updatedLobby.players.map((p) => ({
              userId: p.userId,
              name: p.name,
              score: p.score,
              avatarUrl: p.avatarUrl,
            })),
          });

          // See if we can move on early
          const currentQuestion = getCurrentQuestion(lobby.code);
          const gameState = getGameState(lobby.code);
          
          if (currentQuestion && gameState && !gameState.advancementScheduled) {
            const activePlayers = updatedLobby.players.filter((p) => p.socketId);
            const answeredPlayers = updatedLobby.players.filter((p) =>
              p.answers?.some((a) => a.questionId === questionId)
            );

            logger.info(
              `Question ${questionId}: ${answeredPlayers.length}/${activePlayers.length} players answered`
            );

            // Everyone is done, so start the next question soon
            if (answeredPlayers.length >= activePlayers.length && activePlayers.length > 0) {
              logger.info(
                `All players answered! Advancing to next question in 3 seconds...`
              );

              // Avoid scheduling again
              gameState.advancementScheduled = true;

              // Cancel any existing timers
              if (gameState.advancementTimer) {
                clearTimeout(gameState.advancementTimer);
              }

              // Wait a moment before sending the next question
              gameState.advancementTimer = setTimeout(() => {
                gameState.advancementTimer = undefined;
                sendNextQuestion(io, lobby.code);
              }, 3000);
            }
          }
        }

        logger.debug(
          `${socket.userName} submitted answer for ${questionId}: ${
            result.isCorrect ? 'correct' : 'incorrect'
          }`
        );
      } catch (error) {
        logger.error('Submit answer error:', error);
        socket.emit('error', { message: error.message || 'Failed to submit answer' });
      }
    });

    // Handy shortcut for moving ahead during tests
    socket.on('requestNextQuestion', async (data) => {
      try {
        const { code } = data;
        const lobby = await Lobby.findOne({ code: code.toUpperCase() });

        if (!lobby) {
          return;
        }

        // Only the owner can use this
        if (lobby.ownerId.toString() !== socket.userId) {
          return;
        }

        await sendNextQuestion(io, code.toUpperCase());
      } catch (error) {
        logger.error('Request next question error:', error);
      }
    });

    // Handle disconnect cleanup
    socket.on('disconnect', async () => {
      logger.info(`Socket disconnected: ${socket.id}`);

      if (!socket.userId) {
        return;
      }

      try {
        // Look for any lobbies tied to this socket
        const lobbies = await Lobby.find({
          'players.socketId': socket.id,
        });

        for (const lobby of lobbies) {
          // Clear their socket info but leave them listed
          const player = lobby.players.find((p) => p.socketId === socket.id);
          if (player) {
            player.socketId = undefined;
            await lobby.save();

            // Tell the room the player dropped
            io.to(lobby.code).emit('playerDisconnected', {
              userId: socket.userId,
              name: socket.userName,
            });
          }
        }
      } catch (error) {
        logger.error('Disconnect cleanup error:', error);
      }
    });
  });
}

// Send the first question to everyone in the lobby
async function sendCurrentQuestion(io, lobbyCode) {
  try {
    const question = getCurrentQuestion(lobbyCode);

    if (!question) {
      logger.warn(`No current question for lobby ${lobbyCode}`);
      return;
    }

    // Figure out which question we are on
    const gameState = getGameState(lobbyCode);
    const currentNumber = (gameState?.currentQuestionIndex || 0) + 1;
    const totalQuestions = gameState?.questions.length || 0;

    // Share question details without the answer
    const questionData = {
      questionId: question.id,
      questionNumber: currentNumber,
      totalQuestions: totalQuestions,
      timeLimit: question.timeLimit,
      category: question.category,
      difficulty: question.difficulty,
      type: question.type,
    };

    if (question.type === 'visual') {
      questionData.questionImageUrl = question.questionImageUrl;
    } else {
      questionData.prompt = question.prompt;
      questionData.choices = question.choices;
    }

    io.to(lobbyCode).emit('newQuestion', questionData);

    logger.info(`Sent question ${currentNumber}/${totalQuestions} (${question.id}) to lobby ${lobbyCode}`);

    // Auto-advance to next question after time limit + buffer
    if (gameState && gameState.isActive) {
      // Reset helpers for the new question
      gameState.advancementScheduled = false;
      
      // Keep the timer so we can cancel it when needed
      gameState.advancementTimer = setTimeout(() => {
        // Make sure we have not already queued another advance
        if (!gameState.advancementScheduled) {
          sendNextQuestion(io, lobbyCode);
        }
        gameState.advancementTimer = undefined;
      }, (question.timeLimit + 5) * 1000);
    }
  } catch (error) {
    logger.error('Send current question error:', error);
  }
}

// Move on to the next question or end the game
async function sendNextQuestion(io, lobbyCode) {
  try {
    const question = await nextQuestion(lobbyCode);

    if (!question) {
      // No question means the game is over
      const lobby = await Lobby.findOne({ code: lobbyCode });

      if (!lobby) {
        return;
      }

      const sortedPlayers = [...lobby.players].sort((a, b) => b.score - a.score);

      io.to(lobbyCode).emit('gameEnd', {
        results: sortedPlayers.map((p, index) => ({
          userId: p.userId,
          name: p.name,
          score: p.score,
          rank: index + 1,
          avatarUrl: p.avatarUrl,
        })),
        winner: sortedPlayers[0]
          ? {
              userId: sortedPlayers[0].userId,
              name: sortedPlayers[0].name,
              score: sortedPlayers[0].score,
              avatarUrl: sortedPlayers[0].avatarUrl,
            }
          : null,
      });

      logger.info(`Game ended in lobby ${lobbyCode}`);
      return;
    }

    // Figure out the numbering for this question
    const gameState = getGameState(lobbyCode);
    const currentNumber = (gameState?.currentQuestionIndex || 0) + 1;
    const totalQuestions = gameState?.questions.length || 0;

    // Share the question details without spoiling the answer
    const questionData = {
      questionId: question.id,
      questionNumber: currentNumber,
      totalQuestions: totalQuestions,
      timeLimit: question.timeLimit,
      category: question.category,
      difficulty: question.difficulty,
      type: question.type,
    };

    if (question.type === 'visual') {
      // Visual puzzle from the Banana API
      questionData.questionImageUrl = question.questionImageUrl;
    } else {
      // Plain text fallback question
      questionData.prompt = question.prompt;
      questionData.choices = question.choices;
    }

    io.to(lobbyCode).emit('newQuestion', questionData);

    logger.info(`Sent question ${currentNumber}/${totalQuestions} (${question.id}) to lobby ${lobbyCode}`);

    // Schedule the next move with a short buffer
    if (gameState && gameState.isActive) {
      // Reset the advance helpers
      gameState.advancementScheduled = false;
      
      // Keep the timer handy for early completion
      gameState.advancementTimer = setTimeout(() => {
        // Avoid double advancing
        if (!gameState.advancementScheduled) {
          sendNextQuestion(io, lobbyCode);
        }
        gameState.advancementTimer = undefined;
      }, (question.timeLimit + 5) * 1000); // 5 second buffer
    }
  } catch (error) {
    logger.error('Send next question error:', error);
  }
}

