import mongoose from 'mongoose';
import {
  BillingPlanId,
  IBillingPlan,
  IInvoice,
  ISubscription,
  IVerifyPaymentResponse,
} from '@sentinelkey/shared-types';
import { BILLING_PLANS, getAllPlans, getPlanById } from '../config/plans.js';
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
  ): Promise<{ pidx: string; url: string; orderId: string }> {
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

    const amountPaisa = plan.priceNpr * 100;
    const provider = getPaymentProvider();

    const returnUrl = `${env.WEBSITE_URL}/app/billing`;
    const checkoutResult = await provider.initiateCheckout({
      planId,
      amountPaisa,
      orderName: `${plan.name} — Monthly`,
      customer: { email: userEmail },
      returnUrl,
      websiteUrl: env.WEBSITE_URL,
    });

    // Record invoice with 'Initiated' status
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
    const provider = getPaymentProvider();
    const verification = await provider.verifyPayment(pidx);

    const invoice = await Invoice.findOne({ khaltiPidx: pidx });
    const sub = await this.getSubscription(userId);

    if (verification.status === 'Completed') {
      if (invoice) {
        invoice.status = 'Completed';
        invoice.transactionId = verification.transactionId;
        invoice.paidAt = new Date();
        await invoice.save();
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
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const sub = await this.getSubscription(userId);

    sub.cancelAtPeriodEnd = true;
    await sub.save();

    const provider = getPaymentProvider();
    if (sub.khaltiPidx) {
      await provider.cancelSubscription(sub._id.toString());
    }

    return sub;
  }

  /** List billing invoices for a user */
  async listInvoices(userId: string): Promise<IInvoiceDocument[]> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    return Invoice.find({ userId: userObjectId }).sort({ createdAt: -1 }).exec();
  }
}

export const billingService = new BillingService();
