import mongoose, { Schema, type Document, type Model } from 'mongoose';
import type { DomainStatus, DomainSuspensionReason } from '@sentinelkey/shared-types';

export interface IDomainDocument extends Document {
  userId: mongoose.Types.ObjectId;
  label: string;
  host: string;
  port: number;
  origin: string;
  status: DomainStatus;
  suspensionReason?: DomainSuspensionReason;
  siteKeyPrefix: string;
  siteKeyHash: string;
  keyCreatedAt: Date;
  keyRotatedAt?: Date;
  lastSeenAt?: Date;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const domainSchema = new Schema<IDomainDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    host: {
      type: String,
      required: true,
      enum: ['localhost', '127.0.0.1', '[::1]'],
    },
    port: {
      type: Number,
      required: true,
      min: 1,
      max: 65535,
    },
    origin: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'suspended', 'deleted'],
      default: 'active',
      required: true,
      index: true,
    },
    suspensionReason: {
      type: String,
      enum: ['plan_limit', 'unpaid', 'manual'],
      default: undefined,
    },
    siteKeyPrefix: {
      type: String,
      required: true,
      trim: true,
    },
    siteKeyHash: {
      type: String,
      required: true,
      select: false, // Critical: never included in query results unless explicitly requested
    },
    keyCreatedAt: {
      type: Date,
      default: Date.now,
    },
    keyRotatedAt: {
      type: Date,
    },
    lastSeenAt: {
      type: Date,
    },
    deletedAt: {
      type: Date,
      default: undefined,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.siteKeyHash;
        delete ret.__v;
        // Backward compatibility getters
        ret.name = ret.label;
        ret.domainUrl = ret.origin;
        return ret;
      },
    },
  },
);

// Virtual aliases for backwards compatibility with earlier prototypes
domainSchema.virtual('name').get(function (this: IDomainDocument) {
  return this.label;
});

domainSchema.virtual('domainUrl').get(function (this: IDomainDocument) {
  return this.origin;
});

// The normalized origin (host:port) is unique across the whole system among non-deleted domains
domainSchema.index(
  { origin: 1 },
  {
    unique: true,
    partialFilterExpression: { deletedAt: { $exists: false } },
  },
);

// Index for listing user domains quickly by status
domainSchema.index({ userId: 1, status: 1 });

export const Domain: Model<IDomainDocument> =
  mongoose.models.Domain || mongoose.model<IDomainDocument>('Domain', domainSchema);
