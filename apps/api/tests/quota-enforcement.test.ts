import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import crypto from 'crypto';
import type { Request, Response } from 'express';
import { Domain } from '../src/models/domain.model.js';
import { Subscription } from '../src/models/subscription.model.js';
import { UsageRollup } from '../src/models/usage-rollup.model.js';
import { SecurityEvent } from '../src/models/security-event.model.js';
import { meteringService } from '../src/services/metering.service.js';
import { authenticateOrSiteKey } from '../src/middleware/authenticate-site-key.js';
import type { IDomain } from '@sentinelkey/shared-types';

let mongoServer: MongoMemoryServer;

function mockRes() {
  const headers: Record<string, string> = {};
  const finishCallbacks: Array<() => void> = [];
  const res: Partial<Response> & { statusCode?: number; body?: any; finishCallbacks: Array<() => void> } = {
    statusCode: 200,
    body: null,
    finishCallbacks,
    set(key: string, val: string) {
      headers[key.toLowerCase()] = val;
      return this as Response;
    },
    status(code: number) {
      this.statusCode = code;
      return this as Response;
    },
    json(data: any) {
      this.body = data;
      return this as Response;
    },
    on(event: string, cb: () => void) {
      if (event === 'finish') finishCallbacks.push(cb);
      return this as Response;
    },
  };
  return res as Response & { statusCode?: number; body?: any; finishCallbacks: Array<() => void> };
}

describe('Sub-Phase 10b: Quota Enforcement & Aggregation', () => {
  const freeUserId = new mongoose.Types.ObjectId();
  const proUserId = new mongoose.Types.ObjectId();
  const otherUserId = new mongoose.Types.ObjectId();

  const freeKey = 'sk_live_' + crypto.randomBytes(24).toString('hex');
  const freeKeyHash = crypto.createHash('sha256').update(freeKey).digest('hex');

  const proKey = 'sk_live_' + crypto.randomBytes(24).toString('hex');
  const proKeyHash = crypto.createHash('sha256').update(proKey).digest('hex');

  let freeDomainDoc: any;
  let proDomainDoc: any;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Domain.deleteMany({});
    await Subscription.deleteMany({});
    await UsageRollup.deleteMany({});
    await SecurityEvent.deleteMany({});

    // Free User & Subscription
    await Subscription.create({
      userId: freeUserId,
      planId: 'free',
      status: 'active',
      currentPeriodStart: new Date(Date.now() - 5 * 24 * 3600 * 1000),
      currentPeriodEnd: new Date(Date.now() + 25 * 24 * 3600 * 1000),
    });

    freeDomainDoc = await Domain.create({
      userId: freeUserId,
      label: 'Free Tier Client',
      host: 'localhost',
      port: 3000,
      origin: 'localhost:3000',
      status: 'active',
      siteKeyPrefix: freeKey.slice(0, 12),
      siteKeyHash: freeKeyHash,
      keyCreatedAt: new Date(),
    });

    // Pro User & Subscription
    await Subscription.create({
      userId: proUserId,
      planId: 'pro',
      status: 'active',
      currentPeriodStart: new Date(Date.now() - 10 * 24 * 3600 * 1000),
      currentPeriodEnd: new Date(Date.now() + 20 * 24 * 3600 * 1000),
    });

    proDomainDoc = await Domain.create({
      userId: proUserId,
      label: 'Pro Client App',
      host: 'localhost',
      port: 4000,
      origin: 'localhost:4000',
      status: 'active',
      siteKeyPrefix: proKey.slice(0, 12),
      siteKeyHash: proKeyHash,
      keyCreatedAt: new Date(),
    });
  });

  it('should enforce 10,000 units hard cap on Free plan and emit QUOTA_EXCEEDED event', async () => {
    const today = new Date().toISOString().slice(0, 10);

    // Seed usage at 9,998 units
    await UsageRollup.create({
      domainId: freeDomainDoc._id,
      userId: freeUserId,
      date: today,
      unitsTotal: 9_998,
      unitsByTier: { light: 9998, standard: 0, heavy: 0 },
      requestsTotal: 9998,
      requestsSuccess: 9998,
    });

    const domain = freeDomainDoc.toJSON() as unknown as IDomain;
    domain.id = freeDomainDoc._id.toString();

    // Light call (1 unit): total becomes 9,999 <= 10,000 -> allowed
    const check1 = await meteringService.checkQuota(domain, 'light', '127.0.0.1');
    expect(check1.allowed).toBe(true);

    // Standard call (3 units): 9,998 + 3 = 10,001 > 10,000 -> hard block
    const check2 = await meteringService.checkQuota(domain, 'standard', '127.0.0.1');
    expect(check2.allowed).toBe(false);
    expect(check2.reason).toContain('Monthly quota of 10,000 units exceeded');

    // Give asynchronous event emission a tick
    await new Promise((r) => setTimeout(r, 50));

    const events = await SecurityEvent.find({ type: 'QUOTA_EXCEEDED' });
    expect(events.length).toBe(1);
    expect(events[0].metadata?.planId).toBe('free');
    expect(events[0].metadata?.limit).toBe(10_000);
  });

  it('should return 429 QUOTA_EXCEEDED via middleware when Free limit is breached', async () => {
    const today = new Date().toISOString().slice(0, 10);

    // Seed maxed usage
    await UsageRollup.create({
      domainId: freeDomainDoc._id,
      userId: freeUserId,
      date: today,
      unitsTotal: 10_000,
      unitsByTier: { light: 10000, standard: 0, heavy: 0 },
      requestsTotal: 10000,
      requestsSuccess: 10000,
    });

    const req = {
      headers: { 'x-site-key': freeKey },
      method: 'POST',
      url: '/classify/event',
      originalUrl: '/classify/event',
      path: '/classify/event',
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' },
    } as unknown as Request;

    const res = mockRes();
    let nextCalled = false;
    await authenticateOrSiteKey(req, res, () => { nextCalled = true; });

    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(429);
    expect(res.body?.error?.code).toBe('QUOTA_EXCEEDED');
  });

  it('should never hard-block Pro plan users above included allowance (accrues overage)', async () => {
    const today = new Date().toISOString().slice(0, 10);

    // Seed usage at 30,000 units (included is 25,000)
    await UsageRollup.create({
      domainId: proDomainDoc._id,
      userId: proUserId,
      date: today,
      unitsTotal: 30_000,
      unitsByTier: { light: 0, standard: 10000, heavy: 0 },
      requestsTotal: 10000,
      requestsSuccess: 10000,
    });

    const domain = proDomainDoc.toJSON() as unknown as IDomain;
    domain.id = proDomainDoc._id.toString();

    // Heavy call (10 units) -> allowed!
    const check = await meteringService.checkQuota(domain, 'heavy', '127.0.0.1');
    expect(check.allowed).toBe(true);
  });

  it('should NOT reset Free-tier usage when deleting and re-registering a domain', async () => {
    const today = new Date().toISOString().slice(0, 10);

    // Consume 8,000 units on first domain
    await UsageRollup.create({
      domainId: freeDomainDoc._id,
      userId: freeUserId,
      date: today,
      unitsTotal: 8_000,
      unitsByTier: { light: 8000, standard: 0, heavy: 0 },
      requestsTotal: 8000,
      requestsSuccess: 8000,
    });

    // Soft delete the first domain
    await Domain.updateOne({ _id: freeDomainDoc._id }, { status: 'deleted' });

    // Register a new domain for the same free user
    const newKey = 'sk_live_' + crypto.randomBytes(24).toString('hex');
    const newDomainDoc = await Domain.create({
      userId: freeUserId,
      label: 'Second Free Domain',
      host: '127.0.0.1',
      port: 8081,
      origin: '127.0.0.1:8081',
      status: 'active',
      siteKeyPrefix: newKey.slice(0, 12),
      siteKeyHash: crypto.createHash('sha256').update(newKey).digest('hex'),
      keyCreatedAt: new Date(),
    });

    const newDomain = newDomainDoc.toJSON() as unknown as IDomain;
    newDomain.id = newDomainDoc._id.toString();

    // Try standard call (3 units): 8,000 + 3 = 8,003 <= 10,000 -> allowed
    const check1 = await meteringService.checkQuota(newDomain, 'standard', '127.0.0.1');
    expect(check1.allowed).toBe(true);
    expect(check1.currentUnits).toBe(8_000);

    // Seed 2,000 more units on new domain
    await UsageRollup.create({
      domainId: newDomainDoc._id,
      userId: freeUserId,
      date: today,
      unitsTotal: 2_000,
      unitsByTier: { light: 2000, standard: 0, heavy: 0 },
      requestsTotal: 2000,
      requestsSuccess: 2000,
    });

    // Now total is 8,000 + 2,000 = 10,000. Any further call exceeds 10,000 and is rejected!
    const check2 = await meteringService.checkQuota(newDomain, 'light', '127.0.0.1');
    expect(check2.allowed).toBe(false);
    expect(check2.currentUnits).toBe(10_000);
  });

  it('should compute accurate usage summary and projected overage via getUsageSummary', async () => {
    const today = new Date().toISOString().slice(0, 10);

    // Pro domain: 40,000 units total (25,000 included, 15,000 overage at 4 paisa/unit = 60,000 paisa)
    await UsageRollup.create({
      domainId: proDomainDoc._id,
      userId: proUserId,
      date: today,
      unitsTotal: 40_000,
      unitsByTier: { light: 10000, standard: 10000, heavy: 0 },
      requestsTotal: 20000,
      requestsSuccess: 20000,
    });

    const summary = await meteringService.getUsageSummary(proUserId.toString());

    expect(summary.planId).toBe('pro');
    expect(summary.totalUnits).toBe(40_000);
    expect(summary.includedUnits).toBe(25_000);
    expect(summary.overageUnits).toBe(15_000);
    expect(summary.overageRatePaisa).toBe(4);
    // 15,000 units * 4 paisa = 60,000 paisa (NPR 600)
    expect(summary.projectedOveragePaisa).toBe(60_000);
    expect(summary.domains.length).toBe(1);
    expect(summary.domains[0].projectedOveragePaisa).toBe(60_000);
  });

  it('should return domain daily usage for owner and reject non-owner access', async () => {
    const today = new Date().toISOString().slice(0, 10);

    await UsageRollup.create({
      domainId: proDomainDoc._id,
      userId: proUserId,
      date: today,
      unitsTotal: 500,
      unitsByTier: { light: 200, standard: 100, heavy: 0 },
      requestsTotal: 300,
      requestsSuccess: 300,
    });

    // Owner access -> succeeds
    const ownerResult = await meteringService.getDomainDailyUsage(
      proDomainDoc._id.toString(),
      proUserId.toString(),
      false,
    );
    expect(ownerResult.domainId).toBe(proDomainDoc._id.toString());
    expect(ownerResult.daily.length).toBe(1);
    expect(ownerResult.daily[0].unitsTotal).toBe(500);

    // Admin access for another user's domain -> succeeds
    const adminResult = await meteringService.getDomainDailyUsage(
      proDomainDoc._id.toString(),
      otherUserId.toString(),
      true, // isAdmin
    );
    expect(adminResult.domainId).toBe(proDomainDoc._id.toString());

    // Unauthorized non-owner access -> throws 403
    await expect(
      meteringService.getDomainDailyUsage(
        proDomainDoc._id.toString(),
        otherUserId.toString(),
        false, // not admin
      ),
    ).rejects.toThrow('Access denied');
  });
});
