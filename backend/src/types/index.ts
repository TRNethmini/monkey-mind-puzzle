import { Request } from 'express';
import { Socket } from 'socket.io';

// Adds user details to Express requests
export interface AuthRequest extends Request {
  user?: {
    userId: string;
    name: string;
    avatarUrl?: string;
  };
}

// Adds user details to socket connections
export interface AuthSocket extends Socket {
  userId?: string;
  userName?: string;
  userAvatar?: string;
}

// Shape of stored users
export interface IUserDocument {
  _id: string;
  name: string;
  pin: string;
  createdAt: Date;
  totalWins: number;
  totalGames: number;
  avatarUrl: string;
}

// Lobby and player shapes
export interface IPlayer {
  userId: string;
  name: string;
  socketId?: string;
  score: number;
  answers: IAnswer[];
  avatarUrl: string;
}

export interface IAnswer {
  questionId: string;
  answer: string;
  isCorrect: boolean;
  timeToAnswer: number;
}

export interface ILobbySettings {
  maxPlayers: number;
  questionCount: number;
  questionTimeLimit: number;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface ILobbyDocument {
  _id: string;
  code: string;
  name: string;
  ownerId: string;
  isPublic: boolean;
  maxPlayers: number;
  players: IPlayer[];
  settings: ILobbySettings;
  status: 'waiting' | 'playing' | 'finished';
  currentQuestionIndex: number;
  questions: IQuestion[];
  createdAt: Date;
  startedAt?: Date;
  endedAt?: Date;
}

// What a question looks like
export interface IQuestion {
  id: string;
  prompt?: string; // For fallback text questions
  questionImageUrl?: string; // For Banana API visual puzzles
  choices?: string[]; // For fallback multiple choice
  correctAnswer: string; // Answer from Banana API or fallback
  category?: string;
  difficulty?: string;
  timeLimit: number;
  type: 'visual' | 'text'; // Distinguish between Banana puzzles and fallback
}

// Stored match information
export interface IMatchDocument {
  _id: string;
  lobbyCode: string;
  players: {
    userId: string;
    name: string;
    score: number;
    answers: IAnswer[];
  }[];
  winnerId?: string;
  startedAt: Date;
  endedAt: Date;
  totalQuestions: number;
}

// Payloads for socket messages
export interface CreateLobbyPayload {
  name: string;
  isPublic: boolean;
  maxPlayers: number;
  settings: Partial<ILobbySettings>;
}

export interface JoinLobbyPayload {
  code: string;
}

export interface SubmitAnswerPayload {
  questionId: string;
  answer: string;
  timeToAnswer: number;
}

export interface SendDareSuggestionPayload {
  suggestion: string;
}

// Standard API response wrapper
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface LobbyListItem {
  code: string;
  name: string;
  ownerName: string;
  playerCount: number;
  maxPlayers: number;
  status: string;
}

// Data kept inside the rate limiter
export interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

