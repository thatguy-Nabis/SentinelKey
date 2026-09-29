import mongoose, { Schema, type Document, type Model } from 'mongoose';
import type { BillingPlanId, PaymentStatus, InvoiceType, IUsageInvoiceLineItem } from '@sentinelkey/shared-types';

export interface IInvoiceDocument extends Document {
  userId: mongoose.Types.ObjectId;
  type: InvoiceType;
  domainId?: mongoose.Types.ObjectId;
  domainOrigin?: string;
  periodStart?: Date;
  periodEnd?: Date;
  lineItems?: IUsageInvoiceLineItem[];
  dueDate?: Date;
  amountPaisa: number;
  amountNpr: number;
  currency: string;
  status: PaymentStatus;
  planId: BillingPlanId;
  khaltiPidx?: string;
  transactionId?: string;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const lineItemSchema = new Schema<IUsageInvoiceLineItem>(
  {
    tier: { type: String },
    units: { type: Number },
    ratePaisa: { type: Number },
    amountPaisa: { type: Number, required: true },
    description: { type: String, required: true },
  },
  { _id: false },
);

const invoiceSchema = new Schema<IInvoiceDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['subscription', 'usage'],
      default: 'subscription',
      required: true,
      index: true,
    },
    domainId: {
      type: Schema.Types.ObjectId,
      ref: 'Domain',
      index: true,
      sparse: true,
    },
    domainOrigin: {
      type: String,
      trim: true,
    },
    periodStart: {
      type: Date,
      index: true,
    },
    periodEnd: {
      type: Date,
      index: true,
    },
    lineItems: [lineItemSchema],
    dueDate: {
      type: Date,
    },
    amountPaisa: {
      type: Number,
      required: true,
    },
    amountNpr: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'NPR',
      required: true,
    },
    status: {
      type: String,
      enum: [
        'Initiated',
        'Pending',
        'Completed',
        'Expired',
        'User canceled',
        'Refunded',
        'Partially Refunded',
      ],
      default: 'Initiated',
      required: true,
      index: true,
    },
    planId: {
      type: String,
      required: true,
    },
    khaltiPidx: {
      type: String,
      index: true,
    },
    transactionId: {
      type: String,
    },
    paidAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret: Record<string, unknown>) {
        ret.id = (ret._id as { toString?: () => string })?.toString?.();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

// Idempotency index: prevent duplicate usage invoices for the same domain and period
invoiceSchema.index(
  { domainId: 1, periodStart: 1, periodEnd: 1 },
  {
    unique: true,
    partialFilterExpression: {
      type: 'usage',
      domainId: { $exists: true },
    },
  },
);

export const Invoice: Model<IInvoiceDocument> =
  mongoose.models.Invoice || mongoose.model<IInvoiceDocument>('Invoice', invoiceSchema);
