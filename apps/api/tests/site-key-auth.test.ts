import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { Domain } from '../src/models/domain.model.js';
import { SecurityEvent } from '../src/models/security-event.model.js';
import { authenticateOrSiteKey } from '../src/middleware/authenticate-site-key.js';
import { signAccessToken } from '../src/services/token.service.js';

let mongoServer: MongoMemoryServer;

function mockReq(options: {
  headers?: Record<string, string>;
  method?: string;
  url?: string;
  ip?: string;
}): Partial<Request> {
  return {
    headers: options.headers || {},
    method: options.method || 'GET',
    url: options.url || '/classify/history',
    originalUrl: options.url || '/classify/history',
    path: options.url || '/classify/history',
    ip: options.ip || '127.0.0.1',
    socket: { remoteAddress: options.ip || '127.0.0.1' } as any,
  };
}

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
      if (event === 'finish') {
        finishCallbacks.push(cb);
      }
      return this as Response;
    },
  };
  return res as Response & { statusCode?: number; body?: any; finishCallbacks: Array<() => void> };
}

describe('Sub-Phase 10b: Site-Key Authentication & Middleware', () => {
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
    await SecurityEvent.deleteMany({});

    const doc = await Domain.create({
      userId: testUserId,
      label: 'Production Web App',
      host: 'localhost',
      port: 3000,
      origin: 'localhost:3000',
      status: 'pending',
      siteKeyPrefix: rawKey.slice(0, 12),
      siteKeyHash: keyHash,
      keyCreatedAt: new Date(),
    });
    testDomainId = doc._id.toString();
  });

  it('should authenticate via X-Site-Key header and transition pending -> active', async () => {
    const req = mockReq({
      headers: { 'x-site-key': rawKey },
      url: '/classify/history',
    }) as Request;
    const res = mockRes();
    let nextCalled = false;
    const next: NextFunction = () => { nextCalled = true; };

    await authenticateOrSiteKey(req, res, next);

    expect(nextCalled).toBe(true);
    expect(req.domain).toBeDefined();
    expect(req.domain?.label).toBe('Production Web App');
    expect(req.user).toBeDefined();
    expect(req.user?.sub).toBe(testUserId.toString());
    expect(req.tier).toBe('light');

    // Verify pending -> active transition
    const updated = await Domain.findById(testDomainId);
    expect(updated?.status).toBe('active');
    expect(updated?.lastSeenAt).toBeDefined();
  });

  it('should authenticate via Bearer sk_live_... Authorization header', async () => {
    const req = mockReq({
      headers: { authorization: `Bearer ${rawKey}` },
      url: '/classify/history',
    }) as Request;
    const res = mockRes();
    let nextCalled = false;
    const next: NextFunction = () => { nextCalled = true; };

    await authenticateOrSiteKey(req, res, next);

    expect(nextCalled).toBe(true);
    expect(req.domain).toBeDefined();
    expect(req.domain?.origin).toBe('localhost:3000');
  });

  it('should fall back to User JWT authentication without domain attribution', async () => {
    const userJwt = signAccessToken({
      sub: testUserId.toString(),
      email: 'test@sentinelkey.local',
      roles: ['admin'],
      permissions: ['classify:read'],
    });

    const req = mockReq({
      headers: { authorization: `Bearer ${userJwt}` },
      url: '/classify/history',
    }) as Request;
    const res = mockRes();
    let nextCalled = false;
    const next: NextFunction = () => { nextCalled = true; };

    await authenticateOrSiteKey(req, res, next);

    expect(nextCalled).toBe(true);
    expect(req.user?.sub).toBe(testUserId.toString());
    expect(req.domain).toBeUndefined(); // Dashboard calls are unmetered & unattributed
  });

  it('should reject request when neither site key nor JWT is provided', async () => {
    const req = mockReq({}) as Request;
    const res = mockRes();
    let nextCalled = false;
    const next: NextFunction = () => { nextCalled = true; };

    await authenticateOrSiteKey(req, res, next);

    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(401);
    expect(res.body?.error?.code).toBe('UNAUTHORIZED');
  });

  it('should reject unrecognized site key with 401 INVALID_SITE_KEY', async () => {
    const fakeKey = 'sk_live_' + crypto.randomBytes(24).toString('hex');
    const req = mockReq({
      headers: { 'x-site-key': fakeKey },
    }) as Request;
    const res = mockRes();
    let nextCalled = false;
    const next: NextFunction = () => { nextCalled = true; };

    await authenticateOrSiteKey(req, res, next);

    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(401);
    expect(res.body?.error?.code).toBe('INVALID_SITE_KEY');
  });

  it('should reject unpaid suspended domain with 402 DOMAIN_UNPAID', async () => {
    await Domain.updateOne({ _id: testDomainId }, { status: 'suspended', suspensionReason: 'unpaid' });

    const req = mockReq({
      headers: { 'x-site-key': rawKey },
    }) as Request;
    const res = mockRes();
    let nextCalled = false;
    const next: NextFunction = () => { nextCalled = true; };

    await authenticateOrSiteKey(req, res, next);

    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(402);
    expect(res.body?.error?.code).toBe('DOMAIN_UNPAID');
  });

  it('should reject plan_limit suspended domain with 403 DOMAIN_SUSPENDED', async () => {
    await Domain.updateOne({ _id: testDomainId }, { status: 'suspended', suspensionReason: 'plan_limit' });

    const req = mockReq({
      headers: { 'x-site-key': rawKey },
    }) as Request;
    const res = mockRes();
    let nextCalled = false;
    const next: NextFunction = () => { nextCalled = true; };

    await authenticateOrSiteKey(req, res, next);

    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(403);
    expect(res.body?.error?.code).toBe('DOMAIN_SUSPENDED');
  });

  it('should reject Origin mismatch with 403 and emit DOMAIN_ORIGIN_MISMATCH event', async () => {
    const req = mockReq({
      headers: {
        'x-site-key': rawKey,
        origin: 'https://evil-attacker.com:3000',
      },
    }) as Request;
    const res = mockRes();
    let nextCalled = false;
    const next: NextFunction = () => { nextCalled = true; };

    await authenticateOrSiteKey(req, res, next);

    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(403);
    expect(res.body?.error?.code).toBe('ORIGIN_MISMATCH');

    // Give asynchronous event logger a tick
    await new Promise((r) => setTimeout(r, 50));

    const events = await SecurityEvent.find({ type: 'DOMAIN_ORIGIN_MISMATCH' });
    expect(events.length).toBe(1);
    expect(events[0].metadata?.receivedOrigin).toBe('https://evil-attacker.com:3000');
    expect(events[0].metadata?.expectedOrigin).toBe('localhost:3000');
  });

  it('should allow valid Origin header matching domain origin', async () => {
    const req = mockReq({
      headers: {
        'x-site-key': rawKey,
        origin: 'http://localhost:3000',
      },
    }) as Request;
    const res = mockRes();
    let nextCalled = false;
    const next: NextFunction = () => { nextCalled = true; };

    await authenticateOrSiteKey(req, res, next);

    expect(nextCalled).toBe(true);
    expect(req.domain).toBeDefined();
  });

  it('should allow server-to-server calls where Origin header is absent', async () => {
    const req = mockReq({
      headers: { 'x-site-key': rawKey },
    }) as Request;
    const res = mockRes();
    let nextCalled = false;
    const next: NextFunction = () => { nextCalled = true; };

    await authenticateOrSiteKey(req, res, next);

    expect(nextCalled).toBe(true);
    expect(req.domain).toBeDefined();
  });
});
