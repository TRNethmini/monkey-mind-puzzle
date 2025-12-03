import mongoose, { Schema } from 'mongoose';

const MatchPlayerSchema = new Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    score: {
      type: Number,
      required: true,
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

const MatchSchema = new Schema(
  {
    lobbyCode: {
      type: String,
      required: true,
    },
    players: [MatchPlayerSchema],
    winnerId: {
      type: String,
    },
    startedAt: {
      type: Date,
      required: true,
    },
    endedAt: {
      type: Date,
      required: true,
    },
    totalQuestions: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes to speed up common queries
MatchSchema.index({ lobbyCode: 1 });
MatchSchema.index({ 'players.userId': 1 });
MatchSchema.index({ startedAt: -1 });

export default mongoose.model('Match', MatchSchema);

