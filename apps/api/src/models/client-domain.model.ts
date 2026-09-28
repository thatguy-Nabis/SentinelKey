import mongoose, { Schema, type Document, type Model } from 'mongoose';
import type { DomainEnvironment, DomainHealthStatus } from '@sentinelkey/shared-types';

export interface IClientDomainDocument extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  domainUrl: string;
  environment: DomainEnvironment;
  apiKey: string;
  status: 'active' | 'paused' | 'revoked';
  healthStatus: DomainHealthStatus;
  lastPingAt?: Date;
  stats: {
    requestsTotal: number;
    threatsBlocked: number;
    lastEventAt?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const clientDomainSchema = new Schema<IClientDomainDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    domainUrl: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    environment: {
      type: String,
      enum: ['development', 'staging', 'production'],
      default: 'development',
      required: true,
    },
    apiKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'paused', 'revoked'],
      default: 'active',
      required: true,
    },
    healthStatus: {
      type: String,
      enum: ['healthy', 'degraded', 'offline', 'unverified'],
      default: 'unverified',
      required: true,
    },
    lastPingAt: {
      type: Date,
    },
    stats: {
      requestsTotal: { type: Number, default: 0 },
      threatsBlocked: { type: Number, default: 0 },
      lastEventAt: { type: Date },
    },
  },
  {
    timestamps: true,
  },
);

// Compound index so a user cannot register the exact same domain URL twice in the same environment
clientDomainSchema.index({ userId: 1, domainUrl: 1, environment: 1 }, { unique: true });

export const ClientDomain: Model<IClientDomainDocument> =
  mongoose.models.ClientDomain || mongoose.model<IClientDomainDocument>('ClientDomain', clientDomainSchema);
