import mongoose, { Schema, type Document, type Model } from 'mongoose';
import type { RoleName } from '@sentinelkey/shared-types';

/** Stored refresh token sub-document */
export interface IRefreshTokenSub {
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
}

/** User document interface */
export interface IUserDocument extends Document {
  email: string;
  passwordHash: string;
  roles: RoleName[];
  refreshTokens: IRefreshTokenSub[];
  mfaEnabled: boolean;
  mfaSecret?: string;
  mfaPendingSecret?: string;
  mfaBackupCodes: string[];
  mfaFailedAttempts: number;
  mfaLockedUntil?: Date | null;
  mfaLastTimeStep?: number;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const refreshTokenSubSchema = new Schema<IRefreshTokenSub>(
  {
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const userSchema = new Schema<IUserDocument>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false, // Never returned by default in queries
    },
    roles: {
      type: [String],
      required: true,
      default: ['viewer'],
    },
    refreshTokens: {
      type: [refreshTokenSubSchema],
      default: [],
      select: false, // Never returned by default in queries
    },
    mfaEnabled: {
      type: Boolean,
      default: false,
    },
    mfaSecret: {
      type: String,
      select: false,
    },
    mfaPendingSecret: {
      type: String,
      select: false,
    },
    mfaBackupCodes: {
      type: [String],
      default: [],
      select: false,
    },
    mfaFailedAttempts: {
      type: Number,
      default: 0,
    },
    mfaLockedUntil: {
      type: Date,
      default: null,
    },
    mfaLastTimeStep: {
      type: Number,
      default: null,
    },
    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: {
      // Ensure sensitive security fields are stripped even if selected
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.passwordHash;
        delete ret.refreshTokens;
        delete ret.mfaSecret;
        delete ret.mfaPendingSecret;
        delete ret.mfaBackupCodes;
        delete ret.mfaLastTimeStep;
        delete ret.__v;
        return ret;
      },
    },
  },
);

export const User: Model<IUserDocument> = mongoose.model<IUserDocument>('User', userSchema);
