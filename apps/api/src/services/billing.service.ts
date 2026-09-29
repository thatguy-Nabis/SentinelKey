import mongoose from 'mongoose';
import {
  BillingPlanId,
  IBillingPlan,
  IVerifyPaymentResponse,
} from '@sentinelkey/shared-types';
import { getAllPlans, getPlanById } from '../config/plans.js';
import { env } from '../config/env.js';
import { Subscription, ISubscriptionDocument } from '../models/subscription.model.js';
import { Invoice, IInvoiceDocument } from '../models/invoice.model.js';
import { getPaymentProvider } from './payment-provider.js';

export class BillingService {
  /** Get all available billing plans */
  getPlans(): IBillingPlan[] {
    return getAllPlans();
  }

  /** Get or initialize default free subscription for a user */
  async getSubscription(userId: string): Promise<ISubscriptionDocument> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    let sub = await Subscription.findOne({ userId: userObjectId });

    if (!sub) {
      sub = await Subscription.create({
        userId: userObjectId,
        planId: 'free',
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        cancelAtPeriodEnd: false,
      });
    }

    return sub;
  }

  /** Initiate checkout with Khalti (or mock in dev) */
  async checkout(
    userId: string,
    planId: BillingPlanId,
    userEmail: string,
    customerDetails?: { phone?: string; customerName?: string },
  ): Promise<{ pidx: string; url: string; orderId: string; expiresAt?: string; expiresIn?: number }> {
    const plan = getPlanById(planId);
    if (!plan) {
      throw new Error(`Invalid plan ID: ${planId}`);
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Free plan does not need payment gateway
    if (plan.priceNpr === 0 || planId === 'free') {
      const sub = await this.getSubscription(userId);
      sub.planId = 'free';
      sub.status = 'active';
      sub.currentPeriodEnd = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      await sub.save();

      return {
        pidx: 'free',
        url: `${env.WEBSITE_URL}/app/billing?plan=free`,
        orderId: `free_${Date.now()}`,
      };
    }

    const amountPaisa = Math.round(plan.priceNpr * 100);
    const provider = getPaymentProvider();

    const returnUrl = `${env.WEBSITE_URL}/app/billing`;
    const checkoutResult = await provider.initiateCheckout({
      planId,
      amountPaisa,
      orderName: `${plan.name} — Monthly`,
      customer: {
        email: userEmail,
        name: customerDetails?.customerName,
        phone: customerDetails?.phone,
      },
      returnUrl,
      websiteUrl: env.WEBSITE_URL,
    });

    // Record invoice with 'Initiated' status before customer redirection
    await Invoice.create({
      userId: userObjectId,
      amountPaisa,
      amountNpr: plan.priceNpr,
      currency: 'NPR',
      status: 'Initiated',
      planId,
      khaltiPidx: checkoutResult.pidx,
    });

    // Update subscription with pending pidx
    await Subscription.findOneAndUpdate(
      { userId: userObjectId },
      {
        userId: userObjectId,
        khaltiPidx: checkoutResult.pidx,
      },
      { upsert: true, new: true },
    );

    return checkoutResult;
  }

  /** Verify Khalti payment status by pidx */
  async verifyPayment(userId: string, pidx: string): Promise<IVerifyPaymentResponse> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const sub = await this.getSubscription(userId);

    // 1. Ownership & existence check
    const invoice = await Invoice.findOne({ khaltiPidx: pidx, userId: userObjectId });
    if (!invoice) {
      const foreignInvoice = await Invoice.findOne({ khaltiPidx: pidx });
      if (foreignInvoice) {
        throw new Error('Unauthorized: payment transaction belongs to another account');
      }
    }

    // 2. Idempotency guard: If order is already completed for this pidx, do not re-fulfill
    if (invoice && invoice.status === 'Completed') {
      if (invoice.type === 'usage') {
        return {
          success: true,
          status: 'Completed',
          transactionId: invoice.transactionId,
          amountPaisa: invoice.amountPaisa,
          message: 'Usage invoice already verified and paid',
          subscription: {
            id: sub._id.toString(),
            userId: sub.userId.toString(),
            planId: sub.planId,
            status: sub.status,
            khaltiPidx: sub.khaltiPidx,
            currentPeriodStart: sub.currentPeriodStart,
            currentPeriodEnd: sub.currentPeriodEnd,
            cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
          },
        };
      }

      return {
        success: true,
        status: 'Completed',
        transactionId: invoice.transactionId,
        amountPaisa: invoice.amountPaisa,
        message: 'Payment already verified and subscription is active',
        subscription: {
          id: sub._id.toString(),
          userId: sub.userId.toString(),
          planId: sub.planId,
          status: sub.status,
          khaltiPidx: sub.khaltiPidx,
          currentPeriodStart: sub.currentPeriodStart,
          currentPeriodEnd: sub.currentPeriodEnd,
          cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
        },
      };
    }

    // 3. Server-side lookup against Khalti ePayment v2
    const provider = getPaymentProvider();
    const verification = await provider.verifyPayment(pidx);

    // 4. Amount integrity check: verify paid total_amount matches invoice
    if (
      verification.status === 'Completed' &&
      invoice &&
      verification.amountPaisa &&
      verification.amountPaisa !== invoice.amountPaisa
    ) {
      invoice.status = 'Pending';
      await invoice.save();

      return {
        success: false,
        status: 'Pending',
        message: `Payment amount mismatch: expected ${invoice.amountPaisa} paisa, received ${verification.amountPaisa} paisa`,
        subscription: {
          id: sub._id.toString(),
          userId: sub.userId.toString(),
          planId: sub.planId,
          status: sub.status,
          khaltiPidx: sub.khaltiPidx,
          currentPeriodStart: sub.currentPeriodStart,
          currentPeriodEnd: sub.currentPeriodEnd,
          cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
        },
      };
    }

    // 5. Fulfill order if completed
    if (verification.status === 'Completed') {
      if (invoice) {
        invoice.status = 'Completed';
        invoice.transactionId = verification.transactionId;
        invoice.paidAt = new Date();
        await invoice.save();
      }

      // If this is a usage invoice, reactivate domain if suspended for non-payment
      if (invoice && invoice.type === 'usage') {
        const { usageInvoicingService } = await import('./usage-invoicing.service.js');
        await usageInvoicingService.onUsageInvoicePaid(invoice);

        return {
          success: true,
          status: 'Completed',
          transactionId: verification.transactionId,
          amountPaisa: verification.amountPaisa ?? invoice.amountPaisa,
          message: 'Usage invoice payment verified successfully',
          subscription: {
            id: sub._id.toString(),
            userId: sub.userId.toString(),
            planId: sub.planId,
            status: sub.status,
            khaltiPidx: sub.khaltiPidx,
            currentPeriodStart: sub.currentPeriodStart,
            currentPeriodEnd: sub.currentPeriodEnd,
            cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
          },
        };
      }

      const planId = (invoice?.planId as BillingPlanId) || 'pro';
      sub.planId = planId;
      sub.status = 'active';
      sub.khaltiPidx = pidx;
      sub.currentPeriodStart = new Date();
      sub.currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      sub.cancelAtPeriodEnd = false;
      await sub.save();

      return {
        success: true,
        status: 'Completed',
        transactionId: verification.transactionId,
        amountPaisa: verification.amountPaisa ?? invoice?.amountPaisa,
        subscription: {
          id: sub._id.toString(),
          userId: sub.userId.toString(),
          planId: sub.planId,
          status: sub.status,
          khaltiPidx: sub.khaltiPidx,
          currentPeriodStart: sub.currentPeriodStart,
          currentPeriodEnd: sub.currentPeriodEnd,
          cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
        },
      };
    } else {
      if (invoice) {
        invoice.status = verification.status;
        await invoice.save();
      }

      return {
        success: false,
        status: verification.status,
        subscription: {
          id: sub._id.toString(),
          userId: sub.userId.toString(),
          planId: sub.planId,
          status: sub.status,
          khaltiPidx: sub.khaltiPidx,
          currentPeriodStart: sub.currentPeriodStart,
          currentPeriodEnd: sub.currentPeriodEnd,
          cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
        },
      };
    }
  }

  /** Cancel active subscription */
  async cancelSubscription(userId: string): Promise<ISubscriptionDocument> {
    const sub = await this.getSubscription(userId);

    sub.cancelAtPeriodEnd = true;
    await sub.save();

    const provider = getPaymentProvider();
    if (sub.khaltiPidx) {
      await provider.cancelSubscription(sub._id.toString());
    }

    return sub;
  }

  /** Initiate checkout with Khalti (or mock in dev) for a usage invoice */
  async checkoutUsageInvoice(
    userId: string,
    invoiceId: string,
    userEmail: string,
    customerDetails?: { phone?: string; customerName?: string },
  ): Promise<{ pidx: string; url: string; orderId: string; expiresAt?: string; expiresIn?: number }> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const invoiceObjectId = new mongoose.Types.ObjectId(invoiceId);

    const invoice = await Invoice.findOne({
      _id: invoiceObjectId,
      userId: userObjectId,
      type: 'usage',
    });

    if (!invoice) {
      throw new Error('Usage invoice not found');
    }

    if (invoice.status === 'Completed') {
      throw new Error('Invoice is already paid');
    }

    const provider = getPaymentProvider();
    const returnUrl = `${env.WEBSITE_URL}/app/billing?invoiceId=${invoice._id.toString()}`;
    const checkoutResult = await provider.initiateCheckout({
      planId: (invoice.planId as BillingPlanId) || 'pro',
      amountPaisa: invoice.amountPaisa,
      orderName: `SentinelKey Usage — ${invoice.domainOrigin || 'Domain Usage'}`,
      customer: {
        email: userEmail,
        name: customerDetails?.customerName,
        phone: customerDetails?.phone,
      },
      returnUrl,
      websiteUrl: env.WEBSITE_URL,
    });

    invoice.khaltiPidx = checkoutResult.pidx;
    invoice.status = 'Initiated';
    await invoice.save();

    return checkoutResult;
  }

  /** List billing invoices for a user with optional type and domainId filters */
  async listInvoices(
    userId: string,
    filters?: { type?: 'subscription' | 'usage'; domainId?: string },
  ): Promise<IInvoiceDocument[]> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const query: Record<string, unknown> = { userId: userObjectId };
    if (filters?.type) {
      query.type = filters.type;
    }
    if (filters?.domainId) {
      query.domainId = new mongoose.Types.ObjectId(filters.domainId);
    }
    return Invoice.find(query).sort({ createdAt: -1 }).exec();
  }
}

export const billingService = new BillingService();
