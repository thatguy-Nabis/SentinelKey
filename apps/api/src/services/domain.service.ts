import crypto from 'crypto';
import mongoose from 'mongoose';
import { Domain, type IDomainDocument } from '../models/domain.model.js';
import type {
  IDomain,
  DomainSuspensionReason,
  ICreateDomainRequest,
  ICreateDomainResponse,
  IRotateKeyResponse,
} from '@sentinelkey/shared-types';
import { validateDomainRegistration } from '../config/domains.js';
import { getMaxDomainsForPlan, getPlanById } from '../config/plans.js';
import { BillingService } from './billing.service.js';
import { emitSecurityEvent } from './event-logger.service.js';

export interface SiteKeyResult {
  key: string;
  hash: string;
  prefix: string;
}

/**
 * Generate a high-entropy site key using Node.js crypto.
 * Returns the plain key (shown once), its SHA-256 hash (stored in DB),
 * and a short prefix for display.
 */
export function generateSiteKey(): SiteKeyResult {
  const randomBytes = crypto.randomBytes(32).toString('hex');
  const key = `sk_live_${randomBytes}`;
  const hash = crypto.createHash('sha256').update(key).digest('hex');
  const prefix = `${key.slice(0, 14)}...`;
  return { key, hash, prefix };
}

export class DomainService {
  private billingService: BillingService;

  constructor() {
    this.billingService = new BillingService();
  }

  /**
   * Register a new domain within the user's plan limits.
   */
  async createDomain(
    userId: string,
    data: ICreateDomainRequest,
    clientIp = '127.0.0.1',
  ): Promise<ICreateDomainResponse> {
    const validation = validateDomainRegistration(data);
    if (!validation.valid) {
      const err = new Error(validation.error);
      (err as unknown as { status: number }).status = 400;
      throw err;
    }

    const { normalizedHost, normalizedPort, normalizedLabel, normalizedOrigin } = validation;

    // Check duplicate origin across all non-deleted domains
    const existing = await Domain.findOne({
      origin: normalizedOrigin,
      status: { $ne: 'deleted' as const },
    });

    if (existing) {
      const err = new Error(`Domain with origin '${normalizedOrigin}' is already registered`);
      (err as unknown as { status: number }).status = 409;
      throw err;
    }

    // Check plan limits
    const subscription = await this.billingService.getSubscription(userId);
    const plan = getPlanById(subscription.planId) ?? getPlanById('free')!;
    const maxAllowed = getMaxDomainsForPlan(subscription.planId);

    const userActiveCount = await Domain.countDocuments({
      userId: new mongoose.Types.ObjectId(userId),
      status: { $in: ['active', 'pending'] },
    });

    if (userActiveCount >= maxAllowed) {
      const err = new Error(
        `Active domain limit of ${maxAllowed} reached for ${plan.name} plan. Upgrade your plan to register additional domains.`,
      );
      (err as unknown as { status: number }).status = 403;
      throw err;
    }

    // Generate cryptographic site key
    const { key, hash, prefix } = generateSiteKey();

    const domainDoc = await Domain.create({
      userId: new mongoose.Types.ObjectId(userId),
      label: normalizedLabel,
      host: normalizedHost,
      port: normalizedPort,
      origin: normalizedOrigin,
      status: 'active',
      siteKeyPrefix: prefix,
      siteKeyHash: hash,
      keyCreatedAt: new Date(),
    });

    // Emit security event
    emitSecurityEvent({
      type: 'DOMAIN_REGISTERED',
      userId,
      ip: clientIp,
      severity: 'info',
      metadata: {
        domainId: domainDoc._id.toString(),
        origin: normalizedOrigin,
        label: normalizedLabel,
      },
    }).catch(() => {});

    return {
      domain: domainDoc.toJSON() as unknown as IDomain,
      siteKey: key, // Returned exactly once
    };
  }

  /**
   * List non-deleted domains for a user (or all non-deleted domains if admin).
   */
  async listDomains(userId: string, isAdminAll = false): Promise<IDomain[]> {
    const filter = isAdminAll
      ? { status: { $ne: 'deleted' as const } }
      : { userId: new mongoose.Types.ObjectId(userId), status: { $ne: 'deleted' as const } };

    const docs = await Domain.find(filter).sort({ createdAt: -1 });
    return docs.map((d) => d.toJSON() as unknown as IDomain);
  }

  /**
   * Get single domain by ID.
   */
  async getDomainById(domainId: string, userId: string, isAdmin = false): Promise<IDomain> {
    if (!mongoose.Types.ObjectId.isValid(domainId)) {
      const err = new Error('Invalid domain ID');
      (err as unknown as { status: number }).status = 400;
      throw err;
    }

    const domain = await Domain.findById(domainId);
    if (!domain || domain.status === 'deleted') {
      const err = new Error('Domain not found');
      (err as unknown as { status: number }).status = 404;
      throw err;
    }

    if (!isAdmin && domain.userId.toString() !== userId) {
      const err = new Error('Access denied: You do not own this domain');
      (err as unknown as { status: number }).status = 403;
      throw err;
    }

    return domain.toJSON() as unknown as IDomain;
  }

  /**
   * Update domain label only.
   */
  async updateDomain(
    domainId: string,
    userId: string,
    label: string,
    isAdmin = false,
  ): Promise<IDomain> {
    if (!mongoose.Types.ObjectId.isValid(domainId)) {
      const err = new Error('Invalid domain ID');
      (err as unknown as { status: number }).status = 400;
      throw err;
    }

    const trimmed = (label ?? '').trim();
    if (!trimmed) {
      const err = new Error('Domain label cannot be empty');
      (err as unknown as { status: number }).status = 400;
      throw err;
    }
    if (trimmed.length > 100) {
      const err = new Error('Domain label must not exceed 100 characters');
      (err as unknown as { status: number }).status = 400;
      throw err;
    }

    const domain = await Domain.findById(domainId);
    if (!domain || domain.status === 'deleted') {
      const err = new Error('Domain not found');
      (err as unknown as { status: number }).status = 404;
      throw err;
    }

    if (!isAdmin && domain.userId.toString() !== userId) {
      const err = new Error('Access denied: You do not own this domain');
      (err as unknown as { status: number }).status = 403;
      throw err;
    }

    domain.label = trimmed;
    await domain.save();

    return domain.toJSON() as unknown as IDomain;
  }

  /**
   * Rotate a domain's site key.
   * Generates a new key, returns it once, and invalidates the previous key immediately.
   */
  async rotateKey(
    domainId: string,
    userId: string,
    clientIp = '127.0.0.1',
    isAdmin = false,
  ): Promise<IRotateKeyResponse> {
    if (!mongoose.Types.ObjectId.isValid(domainId)) {
      const err = new Error('Invalid domain ID');
      (err as unknown as { status: number }).status = 400;
      throw err;
    }

    const domain = await Domain.findById(domainId);
    if (!domain || domain.status === 'deleted') {
      const err = new Error('Domain not found');
      (err as unknown as { status: number }).status = 404;
      throw err;
    }

    if (!isAdmin && domain.userId.toString() !== userId) {
      const err = new Error('Access denied: You do not own this domain');
      (err as unknown as { status: number }).status = 403;
      throw err;
    }

    const { key, hash, prefix } = generateSiteKey();

    domain.siteKeyPrefix = prefix;
    domain.siteKeyHash = hash;
    domain.keyRotatedAt = new Date();
    await domain.save();

    emitSecurityEvent({
      type: 'DOMAIN_KEY_ROTATED',
      userId,
      ip: clientIp,
      severity: 'info',
      metadata: {
        domainId: domain._id.toString(),
        origin: domain.origin,
      },
    }).catch(() => {});

    return {
      domain: domain.toJSON() as unknown as IDomain,
      siteKey: key, // Returned exactly once
    };
  }

  /**
   * Suspend a domain (status -> suspended).
   */
  async suspendDomain(
    domainId: string,
    userId: string,
    reason: DomainSuspensionReason = 'manual',
    clientIp = '127.0.0.1',
    isAdmin = false,
  ): Promise<IDomain> {
    if (!mongoose.Types.ObjectId.isValid(domainId)) {
      const err = new Error('Invalid domain ID');
      (err as unknown as { status: number }).status = 400;
      throw err;
    }

    const domain = await Domain.findById(domainId);
    if (!domain || domain.status === 'deleted') {
      const err = new Error('Domain not found');
      (err as unknown as { status: number }).status = 404;
      throw err;
    }

    if (!isAdmin && domain.userId.toString() !== userId) {
      const err = new Error('Access denied: You do not own this domain');
      (err as unknown as { status: number }).status = 403;
      throw err;
    }

    domain.status = 'suspended';
    domain.suspensionReason = reason;
    await domain.save();

    emitSecurityEvent({
      type: 'DOMAIN_SUSPENDED',
      userId,
      ip: clientIp,
      severity: 'info',
      metadata: {
        domainId: domain._id.toString(),
        origin: domain.origin,
        reason,
      },
    }).catch(() => {});

    return domain.toJSON() as unknown as IDomain;
  }

  /**
   * Reactivate a suspended domain (re-checks user plan limit).
   */
  async reactivateDomain(
    domainId: string,
    userId: string,
    clientIp = '127.0.0.1',
    isAdmin = false,
  ): Promise<IDomain> {
    if (!mongoose.Types.ObjectId.isValid(domainId)) {
      const err = new Error('Invalid domain ID');
      (err as unknown as { status: number }).status = 400;
      throw err;
    }

    const domain = await Domain.findById(domainId);
    if (!domain || domain.status === 'deleted') {
      const err = new Error('Domain not found');
      (err as unknown as { status: number }).status = 404;
      throw err;
    }

    if (!isAdmin && domain.userId.toString() !== userId) {
      const err = new Error('Access denied: You do not own this domain');
      (err as unknown as { status: number }).status = 403;
      throw err;
    }

    // Re-check plan limit across active domains
    const subscription = await this.billingService.getSubscription(domain.userId.toString());
    const maxAllowed = getMaxDomainsForPlan(subscription.planId);
    const activeCount = await Domain.countDocuments({
      userId: domain.userId,
      status: { $in: ['active', 'pending'] },
      _id: { $ne: domain._id },
    });

    if (activeCount >= maxAllowed) {
      const err = new Error(
        `Cannot reactivate domain. Plan limit of ${maxAllowed} active domains reached. Upgrade your plan or suspend another domain first.`,
      );
      (err as unknown as { status: number }).status = 403;
      throw err;
    }

    domain.status = 'active';
    domain.suspensionReason = undefined;
    await domain.save();

    emitSecurityEvent({
      type: 'DOMAIN_REACTIVATED',
      userId,
      ip: clientIp,
      severity: 'info',
      metadata: {
        domainId: domain._id.toString(),
        origin: domain.origin,
      },
    }).catch(() => {});

    return domain.toJSON() as unknown as IDomain;
  }

  /**
   * Soft-delete a domain.
   */
  async deleteDomain(
    domainId: string,
    userId: string,
    clientIp = '127.0.0.1',
    isAdmin = false,
  ): Promise<{ success: boolean; message: string }> {
    if (!mongoose.Types.ObjectId.isValid(domainId)) {
      const err = new Error('Invalid domain ID');
      (err as unknown as { status: number }).status = 400;
      throw err;
    }

    const domain = await Domain.findById(domainId);
    if (!domain || domain.status === 'deleted') {
      const err = new Error('Domain not found');
      (err as unknown as { status: number }).status = 404;
      throw err;
    }

    if (!isAdmin && domain.userId.toString() !== userId) {
      const err = new Error('Access denied: You do not own this domain');
      (err as unknown as { status: number }).status = 403;
      throw err;
    }

    domain.status = 'deleted';
    domain.deletedAt = new Date();
    await domain.save();

    emitSecurityEvent({
      type: 'DOMAIN_DELETED',
      userId,
      ip: clientIp,
      severity: 'info',
      metadata: {
        domainId: domain._id.toString(),
        origin: domain.origin,
      },
    }).catch(() => {});

    return { success: true, message: 'Domain deleted successfully' };
  }

  /**
   * Keep selected domains active on plan downgrade; suspend any extra domains with reason 'plan_limit'.
   */
  async keepDomainsOnDowngrade(
    userId: string,
    keepDomainIds: string[],
    targetPlanId: string,
    clientIp = '127.0.0.1',
  ): Promise<IDomain[]> {
    const maxAllowed = getMaxDomainsForPlan(targetPlanId);
    if (keepDomainIds.length > maxAllowed) {
      const err = new Error(
        `You can only keep up to ${maxAllowed} active domains on the ${targetPlanId} plan`,
      );
      (err as unknown as { status: number }).status = 400;
      throw err;
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const domains = await Domain.find({
      userId: userObjectId,
      status: { $ne: 'deleted' as const },
    });

    const keepSet = new Set(keepDomainIds);
    const updated: IDomainDocument[] = [];

    for (const d of domains) {
      const isKept = keepSet.has(d._id.toString());
      if (isKept) {
        if (d.status === 'suspended' && d.suspensionReason === 'plan_limit') {
          d.status = 'active';
          d.suspensionReason = undefined;
          await d.save();
        }
      } else {
        if (d.status === 'active' || d.status === 'pending') {
          d.status = 'suspended';
          d.suspensionReason = 'plan_limit';
          await d.save();

          emitSecurityEvent({
            type: 'DOMAIN_SUSPENDED',
            userId,
            ip: clientIp,
            severity: 'info',
            metadata: {
              domainId: d._id.toString(),
              origin: d.origin,
              reason: 'plan_limit',
            },
          }).catch(() => {});
        }
      }
      updated.push(d);
    }

    return updated.map((d) => d.toJSON() as unknown as IDomain);
  }
}

export const domainService = new DomainService();
