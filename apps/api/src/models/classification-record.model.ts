import mongoose, { Document, Schema } from 'mongoose';
import type { IClassificationResult } from '@sentinelkey/shared-types';

export interface IClassificationRecordDocument
  extends Omit<IClassificationResult, 'id'>,
    Document {}

const MatchedRuleSchema = new Schema(
  {
    ruleId: { type: String, required: true },
    name: { type: String, required: true },
    score: { type: Number, required: true },
    description: { type: String, required: true },
    details: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

const ClassificationRecordSchema = new Schema<IClassificationRecordDocument>(
  {
    subjectType: {
      type: String,
      enum: ['event', 'file', 'email'],
      required: true,
      index: true,
    },
    subjectId: {
      type: String,
      required: true,
      index: true,
    },
    verdict: {
      type: String,
      enum: ['safe', 'flagged', 'quarantined', 'blocked'],
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      required: true,
      index: true,
    },
    score: {
      type: Number,
      required: true,
    },
    matchedRules: [MatchedRuleSchema],
    policyVersion: {
      type: Number,
      required: true,
      index: true,
    },
    policyId: {
      type: String,
      index: true,
    },
    domainId: {
      type: String,
      index: true,
      sparse: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const ClassificationRecord = mongoose.model<IClassificationRecordDocument>(
  'ClassificationRecord',
  ClassificationRecordSchema
);
