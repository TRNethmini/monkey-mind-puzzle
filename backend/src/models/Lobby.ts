import mongoose, { Schema, Document } from 'mongoose';
import { IPlayer, ILobbySettings, IQuestion } from '../types';

export interface ILobby extends Document {
  code: string;
  name: string;
  ownerId: mongoose.Types.ObjectId;
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

const PlayerSchema = new Schema<IPlayer>(
  {
    userId: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    socketId: {
      type: String,
    },
    avatarUrl: {
      type: String,
      required: false,
    },
    score: {
      type: Number,
      default: 0,
    },
    answers: [
      {
        questionId: String,
        answer: String,
        isCorrect: Boolean,
        timeToAnswer: Number,
      },
    ],
  },
  { _id: false }
);

const QuestionSchema = new Schema<IQuestion>(
  {
    id: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['visual', 'text'],
      required: true,
    },
    // Used when we have an image puzzle
    questionImageUrl: {
      type: String,
      required: false,
    },
    // Used for plain text questions
    prompt: {
      type: String,
      required: false,
    },
    choices: {
      type: [String],
      required: false,
    },
    correctAnswer: {
      type: String,
      required: true,
    },
    category: String,
    difficulty: String,
    timeLimit: {
      type: Number,
      default: 30,
    },
  },
  { _id: false }
);

const LobbySettingsSchema = new Schema<ILobbySettings>(
  {
    maxPlayers: {
      type: Number,
      default: 8,
      min: 2,
      max: 16,
    },
    questionCount: {
      type: Number,
      default: 10,
      min: 5,
      max: 50,
    },
    questionTimeLimit: {
      type: Number,
      default: 30,
      min: 10,
      max: 120,
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
    },
  },
  { _id: false }
);

const LobbySchema = new Schema<ILobby>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      length: 6,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
    maxPlayers: {
      type: Number,
      default: 8,
      min: 2,
      max: 16,
    },
    players: [PlayerSchema],
    settings: {
      type: LobbySettingsSchema,
      default: {},
    },
    status: {
      type: String,
      enum: ['waiting', 'playing', 'finished'],
      default: 'waiting',
    },
    currentQuestionIndex: {
      type: Number,
      default: 0,
    },
    questions: [QuestionSchema],
    startedAt: Date,
    endedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Helpful indexes for quick lookups
LobbySchema.index({ code: 1 });
LobbySchema.index({ status: 1, isPublic: 1 });
LobbySchema.index({ ownerId: 1 });
LobbySchema.index({ createdAt: -1 });

// Helper for clearing out stale finished lobbies
LobbySchema.statics.cleanupOldLobbies = async function () {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return this.deleteMany({
    status: 'finished',
    endedAt: { $lt: oneDayAgo },
  });
};

export default mongoose.model<ILobby>('Lobby', LobbySchema);

