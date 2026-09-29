import mongoose, { Schema, type Document, type Model } from 'mongoose';
import type {
  SecurityEventType,
  EventSeverity,
  ISecurityEventMetadata,
} from '@sentinelkey/shared-types';

export interface ISecurityEventDocument extends Document {
  type: SecurityEventType;
  userId?: string;
  domainId?: string;
  ip: string;
  timestamp: Date;
  severity: EventSeverity;
  metadata?: ISecurityEventMetadata;
  createdAt: Date;
  updatedAt: Date;
}

const securityEventSchema = new Schema<ISecurityEventDocument>(
  {
    type: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      index: true,
      sparse: true,
    },
    domainId: {
      type: String,
      index: true,
      sparse: true,
    },
    ip: {
      type: String,
      required: true,
      index: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    severity: {
      type: String,
      enum: ['info', 'low', 'medium', 'high', 'critical'],
      default: 'info',
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        ret.id = ret._id?.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

// Compound indexes for time-window queries in heuristics and log filtering
securityEventSchema.index({ type: 1, timestamp: -1 });
securityEventSchema.index({ ip: 1, timestamp: -1 });
securityEventSchema.index({ userId: 1, timestamp: -1 });
securityEventSchema.index({ severity: 1, timestamp: -1 });

export const SecurityEvent: Model<ISecurityEventDocument> =
  mongoose.model<ISecurityEventDocument>('SecurityEvent', securityEventSchema);
