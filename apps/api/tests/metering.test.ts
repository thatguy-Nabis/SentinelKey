import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { Domain } from '../src/models/domain.model.js';
import { UsageRollup } from '../src/models/usage-rollup.model.js';
import { meteringService } from '../src/services/metering.service.js';
import { authenticateOrSiteKey } from '../src/middleware/authenticate-site-key.js';
import { signAccessToken } from '../src/services/token.service.js';

let mongoServer: MongoMemoryServer;

function mockReq(options: {
  headers?: Record<string, string>;
  method?: string;
  url?: string;
}): Partial<Request> {
  return {
    headers: options.headers || {},
    method: options.method || 'POST',
    url: options.url || '/classify/event',
    originalUrl: options.url || '/classify/event',
    path: options.url || '/classify/event',
    ip: '127.0.0.1',
    socket: { remoteAddress: '127.0.0.1' } as any,
  };
}

function mockRes(statusCode = 200) {
  const finishCallbacks: Array<() => void> = [];
  const res: Partial<Response> & { statusCode: number; finishCallbacks: Array<() => void>; triggerFinish: () => void } = {
    statusCode,
    finishCallbacks,
    set() { return this as Response; },
    status(code: number) {
      this.statusCode = code;
      return this as Response;
    },
    json() { return this as Response; },
    on(event: string, cb: () => void) {
      if (event === 'finish') {
        finishCallbacks.push(cb);
      }
      return this as Response;
    },
    triggerFinish() {
      for (const cb of finishCallbacks) {
        cb();
      }
    },
  };
  return res;
}

describe('Sub-Phase 10b: Metering & Atomic Rollups', () => {
  const testUserId = new mongoose.Types.ObjectId();
  const rawKey = 'sk_live_' + crypto.randomBytes(24).toString('hex');
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
  let testDomainId: string;

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
    await UsageRollup.deleteMany({});

    const doc = await Domain.create({
      userId: testUserId,
      label: 'API Metering Domain',
      host: 'localhost',
      port: 8080,
      origin: 'localhost:8080',
      status: 'active',
      siteKeyPrefix: rawKey.slice(0, 12),
      siteKeyHash: keyHash,
      keyCreatedAt: new Date(),
    });
    testDomainId = doc._id.toString();
  });

  it('should atomically record units and requests on a single daily rollup', async () => {
    const today = new Date().toISOString().slice(0, 10);

    // Call 1: Light (1 unit)
    await meteringService.recordUsage(testDomainId, testUserId.toString(), 'light', true);

    // Call 2: Standard (3 units)
    await meteringService.recordUsage(testDomainId, testUserId.toString(), 'standard', true);

    // Call 3: Heavy (10 units)
    await meteringService.recordUsage(testDomainId, testUserId.toString(), 'heavy', true);

    // Verify exactly ONE document exists for this domain on this date
    const rollups = await UsageRollup.find({ domainId: new mongoose.Types.ObjectId(testDomainId) });
    expect(rollups.length).toBe(1);

    const doc = rollups[0];
    expect(doc.date).toBe(today);
    expect(doc.unitsByTier.light).toBe(1);
    expect(doc.unitsByTier.standard).toBe(3);
    expect(doc.unitsByTier.heavy).toBe(10);
    expect(doc.unitsTotal).toBe(14); // 1 + 3 + 10 = 14 units
    expect(doc.requestsTotal).toBe(3);
    expect(doc.requestsSuccess).toBe(3);
  });

  it('should track error requests without incrementing billable tier units', async () => {
    // 2xx success: 3 units
    await meteringService.recordUsage(testDomainId, testUserId.toString(), 'standard', true);

    // 4xx/5xx failure: 0 billable units, but requestsTotal incremented
    await meteringService.recordUsage(testDomainId, testUserId.toString(), 'heavy', false);

    const doc = await UsageRollup.findOne({ domainId: new mongoose.Types.ObjectId(testDomainId) });
    expect(doc).toBeDefined();
    expect(doc?.unitsTotal).toBe(3); // only success units
    expect(doc?.unitsByTier.standard).toBe(3);
    expect(doc?.unitsByTier.heavy).toBe(0);
    expect(doc?.requestsTotal).toBe(2);
    expect(doc?.requestsSuccess).toBe(1);
  });

  it('should be fail-safe when database write encounters an error', async () => {
    const spy = vi.spyOn(UsageRollup, 'findOneAndUpdate').mockRejectedValueOnce(new Error('DB Timeout'));

    // Should not throw
    await expect(
      meteringService.recordUsage(testDomainId, testUserId.toString(), 'light', true),
    ).resolves.not.toThrow();

    spy.mockRestore();
  });

  it('should meter 2xx responses via middleware response interceptor', async () => {
    const req = mockReq({
      headers: { 'x-site-key': rawKey },
      method: 'POST',
      url: '/classify/event', // standard tier = 3 units
    }) as Request;

    const res = mockRes(200);
    let nextCalled = false;
    await authenticateOrSiteKey(req, res, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(true);
    expect(req.tier).toBe('standard');

    // Trigger response finish
    res.triggerFinish();

    // Give microtask tick to complete async DB operation
    await new Promise((r) => setTimeout(r, 60));

    const rollups = await UsageRollup.find({ domainId: new mongoose.Types.ObjectId(testDomainId) });
    expect(rollups.length).toBe(1);
    expect(rollups[0].unitsTotal).toBe(3);
    expect(rollups[0].unitsByTier.standard).toBe(3);
  });

  it('should NOT meter requests authenticated with User JWT', async () => {
    const userJwt = signAccessToken({
      sub: testUserId.toString(),
      email: 'admin@sentinelkey.local',
      roles: ['admin'],
      permissions: ['classify:write'],
    });

    const req = mockReq({
      headers: { authorization: `Bearer ${userJwt}` },
      method: 'POST',
      url: '/classify/event',
    }) as Request;

    const res = mockRes(200);
    await authenticateOrSiteKey(req, res, () => {});

    res.triggerFinish();
    await new Promise((r) => setTimeout(r, 60));

    const rollups = await UsageRollup.find({});
    expect(rollups.length).toBe(0); // JWT dashboard calls are never metered
  });
});
