import mongoose, { Schema, type Document, type Model } from 'mongoose';
import type { BillingPlanId, PaymentStatus } from '@sentinelkey/shared-types';

export interface IInvoiceDocument extends Document {
  userId: mongoose.Types.ObjectId;
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

const invoiceSchema = new Schema<IInvoiceDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
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
  },
);

export const Invoice: Model<IInvoiceDocument> =
  mongoose.models.Invoice || mongoose.model<IInvoiceDocument>('Invoice', invoiceSchema);
