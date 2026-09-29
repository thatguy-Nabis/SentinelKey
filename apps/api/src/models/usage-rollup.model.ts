import mongoose, { Schema, Document } from 'mongoose';
import type { IUsageUnitsByTier } from '@sentinelkey/shared-types';

export interface IUsageRollupDocument extends Document {
  domainId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  date: string;
  unitsByTier: IUsageUnitsByTier;
  unitsTotal: number;
  requestsTotal: number;
  requestsSuccess: number;
  createdAt: Date;
  updatedAt: Date;
}

const usageRollupSchema = new Schema<IUsageRollupDocument>(
  {
    domainId: {
      type: Schema.Types.ObjectId,
      ref: 'Domain',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    date: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
      index: true,
    },
    unitsByTier: {
      light: { type: Number, default: 0, min: 0 },
      standard: { type: Number, default: 0, min: 0 },
      heavy: { type: Number, default: 0, min: 0 },
    },
    unitsTotal: {
      type: Number,
      default: 0,
      min: 0,
    },
    requestsTotal: {
      type: Number,
      default: 0,
      min: 0,
    },
    requestsSuccess: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.__v;
        return ret;
      },
    },
  },
);

// Compound unique index: exactly one document per domain per calendar day
usageRollupSchema.index({ domainId: 1, date: 1 }, { unique: true });

// User index for aggregating across domains during billing periods
usageRollupSchema.index({ userId: 1, date: 1 });

export const UsageRollup = mongoose.model<IUsageRollupDocument>('UsageRollup', usageRollupSchema);
