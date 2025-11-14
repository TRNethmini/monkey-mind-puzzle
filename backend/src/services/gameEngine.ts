import Lobby from '../models/Lobby';
import Match from '../models/Match';
import User from '../models/User';
import { IQuestion, IPlayer, IAnswer } from '../types';
import { prefetchQuestions } from './bananaService';
import logger from '../config/logger';
import config from '../config/env';

// Core helpers that run the game round and keep scores fair

export interface GameState {
  lobbyCode: string;
  currentQuestionIndex: number;
  questions: IQuestion[];
  startTime: number;
  questionStartTime: number;
  isActive: boolean;
  advancementScheduled?: boolean; // Avoid moving twice
  advancementTimer?: NodeJS.Timeout; // Allow us to cancel timers
}

// Quick in-memory store of games in progress
const activeGames = new Map<string, GameState>();

// Set up a fresh game using lobby details
export async function initializeGame(lobbyCode: string): Promise<GameState | null> {
  try {
    const lobby = await Lobby.findOne({ code: lobbyCode });

    if (!lobby) {
      logger.error(`Cannot initialize game: Lobby ${lobbyCode} not found`);
      return null;
    }

    if (lobby.status !== 'waiting') {
      logger.error(`Cannot initialize game: Lobby ${lobbyCode} already started`);
      return null;
    }

    if (lobby.players.length < 2) {
      logger.error(`Cannot initialize game: Lobby ${lobbyCode} needs at least 2 players`);
      return null;
    }

    // Grab questions ahead of time
    const questions = await prefetchQuestions(
      lobby.settings.questionCount,
      lobby.settings.difficulty
    );

    // Save the questions and mark the lobby as playing
    lobby.questions = questions;
    lobby.status = 'playing';
    lobby.startedAt = new Date();
    lobby.currentQuestionIndex = 0;

    // Reset everyone before we start
    lobby.players.forEach((player) => {
      player.score = 0;
      player.answers = [];
    });

    await lobby.save();

    // Remember the game in memory
    const gameState: GameState = {
      lobbyCode,
      currentQuestionIndex: 0,
      questions,
      startTime: Date.now(),
      questionStartTime: Date.now(),
      isActive: true,
      advancementScheduled: false,
    };

    activeGames.set(lobbyCode, gameState);

    logger.info(`Game initialized in lobby ${lobbyCode} with ${questions.length} questions`);

    return gameState;
  } catch (error) {
    logger.error(`Error initializing game for lobby ${lobbyCode}:`, error);
    return null;
  }
}

// Return the question people should see right now
export function getCurrentQuestion(lobbyCode: string): IQuestion | null {
  const gameState = activeGames.get(lobbyCode);

  if (!gameState || !gameState.isActive) {
    return null;
  }

  if (gameState.currentQuestionIndex >= gameState.questions.length) {
    return null;
  }

  return gameState.questions[gameState.currentQuestionIndex];
}

// Check a player's answer and award points
export async function submitAnswer(
  lobbyCode: string,
  userId: string,
  questionId: string,
  answer: string,
  timeToAnswer: number
): Promise<{
  isCorrect: boolean;
  correctAnswer: string;
  score: number;
  timeBonus?: number;
}> {
  const gameState = activeGames.get(lobbyCode);

  if (!gameState || !gameState.isActive) {
    throw new Error('Game not active');
  }

  const lobby = await Lobby.findOne({ code: lobbyCode });

  if (!lobby) {
    throw new Error('Lobby not found');
  }

  const currentQuestion = gameState.questions[gameState.currentQuestionIndex];

  if (!currentQuestion || currentQuestion.id !== questionId) {
    throw new Error('Invalid question');
  }

  // Keep the time within the allowed window
  const maxTime = currentQuestion.timeLimit;
  if (timeToAnswer > maxTime * 1000) {
    timeToAnswer = maxTime * 1000;
  }

  // Compare the guess with the right answer
  const isCorrect = answer === currentQuestion.correctAnswer;

  // Work out the score and bonus
  let score = 0;
  let timeBonus = 0;

  if (isCorrect) {
    // Start with a base score
    score = 100;

    // Add a bonus for quick replies
    const timeFraction = 1 - timeToAnswer / (maxTime * 1000);
    timeBonus = Math.floor(timeFraction * 50); // Up to 50 bonus points
    score += timeBonus;
  }

  // Store the result on the player record
  const player = lobby.players.find((p) => p.userId === userId);

  if (player) {
    const answerRecord: IAnswer = {
      questionId,
      answer,
      isCorrect,
      timeToAnswer,
    };

    player.answers.push(answerRecord);
    player.score += score;

    await lobby.save();
  }

  logger.debug(
    `${userId} answered question ${questionId} in lobby ${lobbyCode}: ${
      isCorrect ? 'correct' : 'incorrect'
    } (+${score} points)`
  );

  return {
    isCorrect,
    correctAnswer: currentQuestion.correctAnswer,
    score,
    timeBonus,
  };
}

// Advance to the next question or end the game
export async function nextQuestion(lobbyCode: string): Promise<IQuestion | null> {
  const gameState = activeGames.get(lobbyCode);

  if (!gameState || !gameState.isActive) {
    return null;
  }

  gameState.currentQuestionIndex++;
  gameState.questionStartTime = Date.now();

  const lobby = await Lobby.findOne({ code: lobbyCode });
  if (lobby) {
    lobby.currentQuestionIndex = gameState.currentQuestionIndex;
    await lobby.save();
  }

  // If we ran out of questions, end things
  if (gameState.currentQuestionIndex >= gameState.questions.length) {
    await endGame(lobbyCode);
    return null;
  }

  return gameState.questions[gameState.currentQuestionIndex];
}

// Wrap up the game and store the outcome
export async function endGame(lobbyCode: string): Promise<void> {
  try {
    const gameState = activeGames.get(lobbyCode);

    if (!gameState) {
      return;
    }

    const lobby = await Lobby.findOne({ code: lobbyCode });

    if (!lobby) {
      return;
    }

    // Mark the game as finished
    gameState.isActive = false;

    // Update and save the lobby
    lobby.status = 'finished';
    lobby.endedAt = new Date();
    await lobby.save();

    // Figure out who won
    const sortedPlayers = [...lobby.players].sort((a, b) => b.score - a.score);
    const winner = sortedPlayers[0];

    // Store the match in the database
    const match = new Match({
      lobbyCode,
      players: lobby.players.map((p) => ({
        userId: p.userId,
        name: p.name,
        score: p.score,
        answers: p.answers,
      })),
      winnerId: winner?.userId,
      startedAt: lobby.startedAt || new Date(),
      endedAt: new Date(),
      totalQuestions: gameState.questions.length,
    });

    await match.save();

    // Update each player's lifetime stats
    for (const player of lobby.players) {
      await User.findByIdAndUpdate(player.userId, {
        $inc: {
          totalGames: 1,
          totalWins: player.userId === winner?.userId ? 1 : 0,
        },
      });
    }

    // Forget the game from memory
    activeGames.delete(lobbyCode);

    logger.info(
      `Game ended in lobby ${lobbyCode}. Winner: ${winner?.name} with ${winner?.score} points`
    );
  } catch (error) {
    logger.error(`Error ending game for lobby ${lobbyCode}:`, error);
  }
}

// Peek at the in-memory game state
export function getGameState(lobbyCode: string): GameState | undefined {
  return activeGames.get(lobbyCode);
}

// Stop games that run longer than expected
export function checkGameTimeout(lobbyCode: string): boolean {
  const gameState = activeGames.get(lobbyCode);

  if (!gameState || !gameState.isActive) {
    return false;
  }

  const elapsedTime = Date.now() - gameState.startTime;
  const maxDuration = config.matchDuration * 1000;

  if (elapsedTime > maxDuration) {
    logger.info(`Game timeout in lobby ${lobbyCode}`);
    endGame(lobbyCode);
    return true;
  }

  return false;
}

// Manually kill a game if needed
export async function forceEndGame(lobbyCode: string): Promise<void> {
  const gameState = activeGames.get(lobbyCode);

  if (gameState) {
    await endGame(lobbyCode);
  }
}

// List the lobby codes currently running
export function getActiveGames(): string[] {
  return Array.from(activeGames.keys());
}

// Clear out games that have gone stale
export async function cleanupInactiveGames(): Promise<void> {
  const now = Date.now();
  const timeout = 30 * 60 * 1000; // 30 minutes

  for (const [lobbyCode, gameState] of activeGames.entries()) {
    if (now - gameState.startTime > timeout) {
      logger.info(`Cleaning up inactive game: ${lobbyCode}`);
      await forceEndGame(lobbyCode);
    }
  }
}

// Check for stale games every ten minutes
setInterval(cleanupInactiveGames, 10 * 60 * 1000);

