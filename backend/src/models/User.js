import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcrypt';
import { generateAvatarUrl } from '../utils/avatar.js';

const UserSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [1, 'Name must be at least 1 character'],
      maxlength: [50, 'Name must be less than 50 characters'],
      unique: true,
    },
    pin: {
      type: String,
      required: function() {
        // PIN is only required if user doesn't have Google ID
        return !this.googleId;
      },
      validate: {
        validator: function (v) {
          // PIN is hashed before storage, so just make sure it exists if provided
          return !v || v.length > 0;
        },
        message: 'Invalid PIN',
      },
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true, // Allows multiple null values
    },
    totalWins: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalGames: {
      type: Number,
      default: 0,
      min: 0,
    },
    avatarUrl: {
      type: String,
      default: generateAvatarUrl,
    },
  },
  {
    timestamps: true,
  }
);

// Speed up queries by name and Google ID
UserSchema.index({ name: 1 });
UserSchema.index({ googleId: 1 });

// Hash the PIN whenever it changes (only if PIN exists)
UserSchema.pre('save', async function (next) {
  if (!this.isModified('pin') || !this.pin) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.pin = await bcrypt.hash(this.pin, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Helper to check a PIN against the stored hash
UserSchema.methods.comparePin = async function (candidatePin) {
  // If user doesn't have a PIN (e.g., Google user), return false
  if (!this.pin) {
    return false;
  }
  return bcrypt.compare(candidatePin, this.pin);
};

// Hide the PIN field when sending responses
UserSchema.set('toJSON', {
  transform: function (_doc, ret) {
    delete ret.pin;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model('User', UserSchema);

