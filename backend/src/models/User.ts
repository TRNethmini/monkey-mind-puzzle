import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcrypt';
import { generateAvatarUrl } from '../utils/avatar';

export interface IUser extends Document {
  name: string;
  pin: string;
  createdAt: Date;
  totalWins: number;
  totalGames: number;
  avatarUrl: string;
  comparePin(candidatePin: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
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
      required: [true, 'PIN is required'],
      validate: {
        validator: function (v: string) {
          // PIN is hashed before storage, so just make sure it exists
          return v && v.length > 0;
        },
        message: 'Invalid PIN',
      },
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

/* Makes searching users by name faster.
 When I search for a user by name, MongoDB will find it quicker.*/
UserSchema.index({ name: 1 });


/*Before saving the user to the database:Check if the PIN has changed,
If yes, generate a salt (a random string).Use that salt to encrypt/hash the PIN.
Save the encrypted PIN instead of the real one.If no change, just continue.
This makes sure no one can read the actual PIN from the database.*/
UserSchema.pre('save', async function (next) {
  if (!this.isModified('pin')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.pin = await bcrypt.hash(this.pin, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

/*Used for login: checks if entered PIN matches stored PIN.
bcrypt automatically knows how to match them.Returns true if PIN is correct, otherwise false.*/
UserSchema.methods.comparePin = async function (candidatePin: string): Promise<boolean> {
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

export default mongoose.model<IUser>('User', UserSchema);

