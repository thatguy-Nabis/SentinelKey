import mongoose from 'mongoose';
import { Domain } from '../models/domain.model.js';
import { Invoice, type IInvoiceDocument } from '../models/invoice.model.js';
import { UsageRollup } from '../models/usage-rollup.model.js';
import { BillingService } from './billing.service.js';
import { emitSecurityEvent } from './event-logger.service.js';
import {
  getPlanQuota,
  MINIMUM_PAYABLE_PAISA,
  USAGE_INVOICE_GRACE_PERIOD_DAYS,
} from '../config/metering.js';
import type { BillingPlanId } from '@sentinelkey/shared-types';

export function getBillingPeriodRange(
  periodStart?: string | Date,
  periodEnd?: string | Date,
): { startDate: string; endDate: string } {
  if (periodStart && periodEnd) {
    const start = new Date(periodStart).toISOString().slice(0, 10);
    const end = new Date(periodEnd).toISOString().slice(0, 10);
    return { startDate: start, endDate: end };
  }

  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0))
    .toISOString()
    .slice(0, 10);
  return { startDate: start, endDate: end };
}

export interface IAccruedOverageEstimate {
  domainId: string;
  label: string;
  origin: string;
  status: string;
  periodStart: string;
  periodEnd: string;
  totalUnits: number;
  includedUnits: number;
  overageUnits: number;
  overageRatePaisa: number;
  accruedOveragePaisa: number;
  isPayable: boolean;
}

export class UsageInvoicingService {
  private billingService = new BillingService();

  /**
   * Closes the current or specified billing period for a user and creates usage invoices.
   * Strictly idempotent: running twice for the same period yields exactly one invoice per domain.
   * Free plan never produces usage invoices.
   * Sub-minimum amounts (< MINIMUM_PAYABLE_PAISA) roll forward without creating an invoice.
   */
  async closeBillingPeriodForUser(
    userId: string,
    periodStartOverride?: Date,
    periodEndOverride?: Date,
  ): Promise<IInvoiceDocument[]> {
    const subscription = await this.billingService.getSubscription(userId);
    const planId = (subscription?.planId || 'free').toLowerCase();

    // Free plan never produces usage invoices
    if (planId === 'free') {
      return [];
    }

    const quotaConfig = getPlanQuota(planId);
    const periodStart = periodStartOverride || (subscription.currentPeriodStart ? new Date(subscription.currentPeriodStart) : new Date(Date.now() - 30 * 86400 * 1000));
    const periodEnd = periodEndOverride || (subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : new Date());

    const { startDate, endDate } = getBillingPeriodRange(periodStart, periodEnd);
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Find all non-deleted domains registered by the user
    const domains = await Domain.find({
      userId: userObjectId,
      status: { $ne: 'deleted' as const },
    });

    const createdInvoices: IInvoiceDocument[] = [];

    for (const domain of domains) {
      // Idempotency check: see if a usage invoice already exists for this domain & period
      const existing = await Invoice.findOne({
        type: 'usage',
        domainId: domain._id,
        periodStart: { $gte: new Date(startDate) },
        periodEnd: { $lte: new Date(endDate + 'T23:59:59.999Z') },
      });

      if (existing) {
        // Idempotency: skip already-invoiced period
        continue;
      }

      // Query usage rollups for this domain in the period
      const rollups = await UsageRollup.find({
        domainId: domain._id,
        date: { $gte: startDate, $lte: endDate },
      });

      let lightUnits = 0;
      let standardUnits = 0;
      let heavyUnits = 0;
      let totalUnits = 0;

      for (const r of rollups) {
        lightUnits += r.unitsByTier?.light || 0;
        standardUnits += r.unitsByTier?.standard || 0;
        heavyUnits += r.unitsByTier?.heavy || 0;
        totalUnits += r.unitsTotal || 0;
      }

      const includedUnits = quotaConfig.includedUnits;
      const overageUnits = Math.max(0, totalUnits - includedUnits);
      const overageRatePaisa = quotaConfig.overageRatePaisa;

      // Integer paisa math only
      const amountPaisa = overageUnits * overageRatePaisa;

      // Rule: Balances below the minimum payable amount roll into next period instead of creating an unpayable invoice
      if (amountPaisa < MINIMUM_PAYABLE_PAISA) {
        continue;
      }

      const dueDate = new Date(Date.now() + USAGE_INVOICE_GRACE_PERIOD_DAYS * 24 * 3600 * 1000);

      const invoiceDoc = (await Invoice.create({
        userId: domain.userId,
        type: 'usage' as const,
        domainId: domain._id,
        domainOrigin: domain.origin,
        periodStart: new Date(startDate),
        periodEnd: new Date(endDate + 'T23:59:59.999Z'),
        dueDate,
        amountPaisa,
        amountNpr: amountPaisa / 100,
        currency: 'NPR',
        status: 'Pending' as const,
        planId: planId as BillingPlanId,
        lineItems: [
          {
            tier: 'light',
            units: lightUnits,
            ratePaisa: 0,
            amountPaisa: 0,
            description: `Light Tier calls (${lightUnits.toLocaleString()} units)`,
          },
          {
            tier: 'standard',
            units: standardUnits,
            ratePaisa: 0,
            amountPaisa: 0,
            description: `Standard Tier calls (${standardUnits.toLocaleString()} units)`,
          },
          {
            tier: 'heavy',
            units: heavyUnits,
            ratePaisa: 0,
            amountPaisa: 0,
            description: `Heavy Tier calls (${heavyUnits.toLocaleString()} units)`,
          },
          {
            tier: 'total',
            units: overageUnits,
            ratePaisa: overageRatePaisa,
            amountPaisa,
            description: `Overage: ${overageUnits.toLocaleString()} units @ ${overageRatePaisa} paisa/unit (Included: ${includedUnits.toLocaleString()} units)`,
          },
        ],
      })) as unknown as IInvoiceDocument;

      try {
        await emitSecurityEvent({
          type: 'USAGE_INVOICE_CREATED',
          userId: domain.userId.toString(),
          domainId: domain._id.toString(),
          ip: '127.0.0.1',
          severity: 'info',
          metadata: {
            invoiceId: invoiceDoc._id.toString(),
            domainId: domain._id.toString(),
            domainOrigin: domain.origin,
            amountPaisa,
            overageUnits,
          },
        });
      } catch {
        // fail-safe: never block main flow
      }

      createdInvoices.push(invoiceDoc);
    }

    return createdInvoices;
  }

  /**
   * Evaluates unpaid usage invoices past their grace period and suspends delinquent domains.
   */
  async checkDelinquency(userId?: string): Promise<{ suspendedDomainIds: string[] }> {
    const now = new Date();
    const filter: Record<string, unknown> = {
      type: 'usage',
      status: { $in: ['Initiated', 'Pending'] },
      dueDate: { $lt: now },
    };

    if (userId) {
      filter.userId = new mongoose.Types.ObjectId(userId);
    }

    const overdueInvoices = await Invoice.find(filter);
    const suspendedDomainIds: string[] = [];

    for (const inv of overdueInvoices) {
      if (!inv.domainId) continue;

      const domain = await Domain.findById(inv.domainId);
      if (domain && domain.status !== 'suspended' && domain.status !== 'deleted') {
        domain.status = 'suspended';
        domain.suspensionReason = 'unpaid';
        await domain.save();

        suspendedDomainIds.push(domain._id.toString());

        try {
          await emitSecurityEvent({
            type: 'DOMAIN_SUSPENDED_UNPAID',
            userId: domain.userId.toString(),
            domainId: domain._id.toString(),
            ip: '127.0.0.1',
            severity: 'high',
            metadata: {
              domainId: domain._id.toString(),
              origin: domain.origin,
              overdueInvoiceId: inv._id.toString(),
              amountPaisa: inv.amountPaisa,
              dueDate: inv.dueDate,
            },
          });
        } catch {
          // fail-safe
        }
      }
    }

    return { suspendedDomainIds };
  }

  /**
   * Calculates accrued open-period overage estimates per domain for GET /billing/usage/estimate.
   */
  async getAccruedOverageEstimate(userId: string): Promise<IAccruedOverageEstimate[]> {
    const subscription = await this.billingService.getSubscription(userId);
    const planId = (subscription?.planId || 'free').toLowerCase();
    const quotaConfig = getPlanQuota(planId);

    const { startDate, endDate } = getBillingPeriodRange(
      subscription?.currentPeriodStart,
      subscription?.currentPeriodEnd,
    );

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const domains = await Domain.find({
      userId: userObjectId,
      status: { $ne: 'deleted' as const },
    });

    const isFree = quotaConfig.type === 'user_hard_cap';
    const estimates: IAccruedOverageEstimate[] = [];

    for (const domain of domains) {
      const rollups = await UsageRollup.find({
        domainId: domain._id,
        date: { $gte: startDate, $lte: endDate },
      });

      const totalUnits = rollups.reduce((sum, r) => sum + (r.unitsTotal || 0), 0);
      const includedUnits = quotaConfig.includedUnits;
      const overageUnits = isFree ? 0 : Math.max(0, totalUnits - includedUnits);
      const overageRatePaisa = quotaConfig.overageRatePaisa;
      const accruedOveragePaisa = overageUnits * overageRatePaisa;

      estimates.push({
        domainId: domain._id.toString(),
        label: domain.label,
        origin: domain.origin,
        status: domain.status,
        periodStart: startDate,
        periodEnd: endDate,
        totalUnits,
        includedUnits,
        overageUnits,
        overageRatePaisa,
        accruedOveragePaisa,
        isPayable: accruedOveragePaisa >= MINIMUM_PAYABLE_PAISA,
      });
    }

    return estimates;
  }

  /**
   * Handles payment fulfillment for usage invoices: reactivates unpaid suspended domain.
   */
  async onUsageInvoicePaid(invoice: IInvoiceDocument): Promise<void> {
    if (invoice.type !== 'usage' || !invoice.domainId) {
      return;
    }

    const domain = await Domain.findById(invoice.domainId);
    if (domain && domain.status === 'suspended' && domain.suspensionReason === 'unpaid') {
      // Check if other overdue unpaid usage invoices remain for this domain
      const remainingOverdue = await Invoice.countDocuments({
        domainId: invoice.domainId,
        type: 'usage',
        status: { $in: ['Initiated', 'Pending'] },
        dueDate: { $lt: new Date() },
        _id: { $ne: invoice._id },
      });

      if (remainingOverdue > 0) {
        return;
      }

      domain.status = 'active';
      domain.suspensionReason = undefined;
      await domain.save();

      try {
        await emitSecurityEvent({
          type: 'DOMAIN_REACTIVATED_PAYMENT',
          userId: domain.userId.toString(),
          domainId: domain._id.toString(),
          ip: '127.0.0.1',
          severity: 'info',
          metadata: {
            domainId: domain._id.toString(),
            origin: domain.origin,
            paidInvoiceId: invoice._id.toString(),
            amountPaisa: invoice.amountPaisa,
          },
        });
      } catch {
        // fail-safe
      }
    }
  }
}

export const usageInvoicingService = new UsageInvoicingService();
