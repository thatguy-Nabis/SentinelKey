import mongoose, { Schema, type Document, type Model } from 'mongoose';
import type {
  HeuristicRule,
  AlertSeverity,
  AlertStatus,
} from '@sentinelkey/shared-types';

export interface IAlertDocument extends Document {
  title: string;
  description: string;
  rule: HeuristicRule;
  severity: AlertSeverity;
  status: AlertStatus;
  userId?: string;
  domainId?: string;
  ip: string;
  triggerEventIds: string[];
  metadata?: Record<string, unknown>;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const alertSchema = new Schema<IAlertDocument>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    rule: {
      type: String,
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
      index: true,
    },
    status: {
      type: String,
      enum: ['open', 'acknowledged', 'resolved'],
      default: 'open',
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
    triggerEventIds: {
      type: [String],
      default: [],
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    acknowledgedBy: {
      type: String,
      sparse: true,
    },
    acknowledgedAt: {
      type: Date,
    },
    resolvedAt: {
      type: Date,
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

alertSchema.index({ status: 1, createdAt: -1 });
alertSchema.index({ severity: 1, createdAt: -1 });
alertSchema.index({ rule: 1, createdAt: -1 });

export const Alert: Model<IAlertDocument> = mongoose.model<IAlertDocument>('Alert', alertSchema);
