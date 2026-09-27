import mongoose, { Schema, type Document, type Model } from 'mongoose';
import type { BillingPlanId, SubscriptionStatus } from '@sentinelkey/shared-types';

export interface ISubscriptionDocument extends Document {
  userId: mongoose.Types.ObjectId;
  planId: BillingPlanId;
  status: SubscriptionStatus;
  khaltiPidx?: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionSchema = new Schema<ISubscriptionDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    planId: {
      type: String,
      enum: ['free', 'pro', 'enterprise'],
      default: 'free',
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'pending', 'canceled', 'expired'],
      default: 'active',
      required: true,
    },
    khaltiPidx: {
      type: String,
      index: true,
    },
    currentPeriodStart: {
      type: Date,
      default: Date.now,
    },
    currentPeriodEnd: {
      type: Date,
      default: () => new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year for free
    },
    cancelAtPeriodEnd: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

export const Subscription: Model<ISubscriptionDocument> =
  mongoose.models.Subscription || mongoose.model<ISubscriptionDocument>('Subscription', subscriptionSchema);
