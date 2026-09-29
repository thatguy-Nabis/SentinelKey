import mongoose from 'mongoose';
import { UsageRollup } from '../models/usage-rollup.model.js';
import { Domain } from '../models/domain.model.js';
import type {
  IDomain,
  UnitTier,
  IUsageSummaryResponse,
  IDomainDailyUsageResponse,
  IDomainUsageSummary,
  IDailyUsageBreakdown,
  IUsageUnitsByTier,
} from '@sentinelkey/shared-types';
import { getUnitsForTier, getPlanQuota } from '../config/metering.js';
import { BillingService } from './billing.service.js';
import { emitSecurityEvent } from './event-logger.service.js';

/**
 * Returns current UTC date formatted as YYYY-MM-DD
 */
export function getUtcDateString(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Calculates current period date range.
 * Defaults to current calendar month (e.g. 2026-09-01 to 2026-09-30)
 */
export function getBillingPeriodRange(periodStart?: Date, periodEnd?: Date): {
  startDate: string;
  endDate: string;
} {
  if (periodStart && periodEnd) {
    return {
      startDate: getUtcDateString(periodStart),
      endDate: getUtcDateString(periodEnd),
    };
  }

  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));

  return {
    startDate: getUtcDateString(start),
    endDate: getUtcDateString(end),
  };
}

export class MeteringService {
  private billingService: BillingService;

  constructor() {
    this.billingService = new BillingService();
  }

  /**
   * Records API call units asynchronously and atomically on the day's rollup document.
   * Fail-safe: Any DB errors are caught and logged without affecting the HTTP response.
   */
  async recordUsage(
    domainId: string,
    userId: string,
    tier: UnitTier,
    isSuccess: boolean,
  ): Promise<void> {
    try {
      const today = getUtcDateString();
      const units = isSuccess ? getUnitsForTier(tier) : 0;

      await UsageRollup.findOneAndUpdate(
        {
          domainId: new mongoose.Types.ObjectId(domainId),
          date: today,
        },
        {
          $inc: {
            [`unitsByTier.${tier}`]: units,
            unitsTotal: units,
            requestsTotal: 1,
            requestsSuccess: isSuccess ? 1 : 0,
          },
          $setOnInsert: {
            userId: new mongoose.Types.ObjectId(userId),
          },
        },
        { upsert: true, returnDocument: 'after' },
      );
    } catch (err) {
      console.error('[METERING_ERROR] Failed to record usage rollup atomically:', err);
    }
  }

  /**
   * Validates if a request is allowed under plan quota limits.
   * Free plan: Enforces 10,000 units/period hard cap across user's domains.
   * Pro/Enterprise plan: Allows request (accrues overage beyond included units).
   */
  async checkQuota(
    domain: IDomain,
    tier: UnitTier,
    clientIp = '127.0.0.1',
  ): Promise<{
    allowed: boolean;
    reason?: string;
    currentUnits?: number;
    limit?: number;
  }> {
    const subscription = await this.billingService.getSubscription(domain.userId);
    const planId = subscription?.planId || 'free';
    const quotaConfig = getPlanQuota(planId);

    // Paid plans (Pro/Enterprise) do not hard block on quota; overage is billed.
    if (!quotaConfig.hardCap) {
      return { allowed: true };
    }

    const { startDate, endDate } = getBillingPeriodRange(
      subscription?.currentPeriodStart,
      subscription?.currentPeriodEnd,
    );

    // Sum all units used by this user in the period (across all domains, including deleted ones)
    const rollups = await UsageRollup.find({
      userId: new mongoose.Types.ObjectId(domain.userId),
      date: { $gte: startDate, $lte: endDate },
    });

    const userTotalUnits = rollups.reduce((sum, r) => sum + (r.unitsTotal || 0), 0);
    const callUnits = getUnitsForTier(tier);

    if (userTotalUnits + callUnits > quotaConfig.includedUnits) {
      emitSecurityEvent({
        type: 'QUOTA_EXCEEDED',
        userId: domain.userId,
        ip: clientIp,
        severity: 'medium',
        metadata: {
          domainId: domain.id || domain._id,
          origin: domain.origin,
          planId,
          currentUnits: userTotalUnits,
          limit: quotaConfig.includedUnits,
        },
      }).catch(() => {});

      return {
        allowed: false,
        reason: `Monthly quota of ${quotaConfig.includedUnits.toLocaleString()} units exceeded for Free plan. Upgrade to Pro for 25,000 included units per domain and pay-as-you-go overage.`,
        currentUnits: userTotalUnits,
        limit: quotaConfig.includedUnits,
      };
    }

    return { allowed: true, currentUnits: userTotalUnits, limit: quotaConfig.includedUnits };
  }

  /**
   * Aggregates current-period usage for a user across all their domains.
   * Implements GET /billing/usage
   */
  async getUsageSummary(userId: string): Promise<IUsageSummaryResponse> {
    const subscription = await this.billingService.getSubscription(userId);
    const planId = subscription?.planId || 'free';
    const quotaConfig = getPlanQuota(planId);

    const { startDate, endDate } = getBillingPeriodRange(
      subscription?.currentPeriodStart,
      subscription?.currentPeriodEnd,
    );

    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Find all domains registered by the user
    const domains = await Domain.find({
      userId: userObjectId,
      status: { $ne: 'deleted' as const },
    });

    // Query all usage rollups for this user in the period
    const allRollups = await UsageRollup.find({
      userId: userObjectId,
      date: { $gte: startDate, $lte: endDate },
    });

    // Group rollups by domainId
    const rollupsByDomain = new Map<string, typeof allRollups>();
    for (const r of allRollups) {
      const dId = r.domainId.toString();
      if (!rollupsByDomain.has(dId)) {
        rollupsByDomain.set(dId, []);
      }
      rollupsByDomain.get(dId)!.push(r);
    }

    let overallTotalUnits = 0;
    const domainSummaries: IDomainUsageSummary[] = [];

    const isFree = quotaConfig.type === 'user_hard_cap';
    const perDomainIncluded = isFree ? quotaConfig.includedUnits : quotaConfig.includedUnits;

    for (const d of domains) {
      const dId = d._id.toString();
      const domainRollups = rollupsByDomain.get(dId) || [];

      const tierAccumulator: IUsageUnitsByTier = { light: 0, standard: 0, heavy: 0 };
      let domainTotal = 0;

      for (const r of domainRollups) {
        tierAccumulator.light += r.unitsByTier?.light || 0;
        tierAccumulator.standard += r.unitsByTier?.standard || 0;
        tierAccumulator.heavy += r.unitsByTier?.heavy || 0;
        domainTotal += r.unitsTotal || 0;
      }

      overallTotalUnits += domainTotal;

      const overageUnits = isFree ? 0 : Math.max(0, domainTotal - perDomainIncluded);
      const projectedOveragePaisa = isFree ? 0 : overageUnits * quotaConfig.overageRatePaisa;

      domainSummaries.push({
        domainId: dId,
        label: d.label,
        origin: d.origin,
        status: d.status,
        unitsByTier: tierAccumulator,
        unitsTotal: domainTotal,
        includedUnits: perDomainIncluded,
        overageUnits,
        projectedOveragePaisa,
      });
    }

    const totalIncluded = isFree ? quotaConfig.includedUnits : domains.length * quotaConfig.includedUnits;
    const remainingUnits = Math.max(0, totalIncluded - overallTotalUnits);
    const totalOverageUnits = domainSummaries.reduce((sum, d) => sum + d.overageUnits, 0);
    const totalProjectedOveragePaisa = domainSummaries.reduce((sum, d) => sum + d.projectedOveragePaisa, 0);

    return {
      periodStart: startDate,
      periodEnd: endDate,
      planId,
      totalUnits: overallTotalUnits,
      includedUnits: totalIncluded,
      remainingUnits,
      overageUnits: totalOverageUnits,
      overageRatePaisa: quotaConfig.overageRatePaisa,
      projectedOveragePaisa: totalProjectedOveragePaisa,
      domains: domainSummaries,
    };
  }

  /**
   * Daily breakdown of usage for a single domain.
   * Implements GET /billing/usage/domains/:id
   */
  async getDomainDailyUsage(
    domainId: string,
    userId: string,
    isAdmin = false,
  ): Promise<IDomainDailyUsageResponse> {
    if (!mongoose.Types.ObjectId.isValid(domainId)) {
      const err = new Error('Invalid domain ID');
      (err as unknown as { status: number }).status = 400;
      throw err;
    }

    const domain = await Domain.findById(domainId);
    if (!domain) {
      const err = new Error('Domain not found');
      (err as unknown as { status: number }).status = 404;
      throw err;
    }

    if (!isAdmin && domain.userId.toString() !== userId) {
      const err = new Error('Access denied: You do not own this domain');
      (err as unknown as { status: number }).status = 403;
      throw err;
    }

    const subscription = await this.billingService.getSubscription(domain.userId.toString());
    const { startDate, endDate } = getBillingPeriodRange(
      subscription?.currentPeriodStart,
      subscription?.currentPeriodEnd,
    );

    const rollups = await UsageRollup.find({
      domainId: new mongoose.Types.ObjectId(String(domain._id)),
      date: { $gte: startDate, $lte: endDate },
    }).sort({ date: 1 });

    const daily: IDailyUsageBreakdown[] = rollups.map((r) => ({
      date: r.date,
      unitsByTier: {
        light: r.unitsByTier?.light || 0,
        standard: r.unitsByTier?.standard || 0,
        heavy: r.unitsByTier?.heavy || 0,
      },
      unitsTotal: r.unitsTotal || 0,
      requestsTotal: r.requestsTotal || 0,
      requestsSuccess: r.requestsSuccess || 0,
    }));

    const totalUnits = daily.reduce((sum, d) => sum + d.unitsTotal, 0);

    return {
      domainId: domain._id.toString(),
      label: domain.label,
      origin: domain.origin,
      periodStart: startDate,
      periodEnd: endDate,
      totalUnits,
      daily,
    };
  }
}

export const meteringService = new MeteringService();
