import { describe, it, expect, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { rateLimiter, _clearStore } from '../src/middleware/rate-limiter.js';

function mockReq(options: { ip: string; domainId?: string; domainRateLimitMax?: number }): Partial<Request> {
  const req: Partial<Request> & { domainRateLimitMax?: number } = {
    ip: options.ip,
    socket: { remoteAddress: options.ip } as any,
    domainRateLimitMax: options.domainRateLimitMax,
  };
  if (options.domainId) {
    req.domain = {
      _id: options.domainId,
      id: options.domainId,
      userId: 'user-1',
      label: 'Test Domain',
      host: 'localhost',
      port: 3000,
      origin: 'localhost:3000',
      status: 'active',
      siteKeyPrefix: 'sk_live_1234',
      keyCreatedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
  return req;
}

function mockRes() {
  const headers: Record<string, string> = {};
  const res: Partial<Response> = {
    set(key: string, value: string) {
      headers[key.toLowerCase()] = value;
      return this as Response;
    },
    status(code: number) {
      (this as any).statusCode = code;
      return this as Response;
    },
    json(body: unknown) {
      (this as any).body = body;
      return this as Response;
    },
  };
  return res as Response & { statusCode?: number; body?: any };
}

describe('Sub-Phase 10b: Per-Domain Rate Limiting', () => {
  beforeEach(() => {
    _clearStore();
  });

  it('should enforce rate limits across different IPs for the same domain', () => {
    const domainId = 'domain-shared-abc';
    const limit = 5;

    // Send requests from 5 different IPs for the same domain
    for (let i = 1; i <= limit; i++) {
      const req = mockReq({ ip: `192.168.1.${i}`, domainId, domainRateLimitMax: limit });
      const res = mockRes();
      let nextCalled = false;
      rateLimiter(req as Request, res, () => { nextCalled = true; });
      expect(nextCalled).toBe(true);
    }

    // 6th request from yet another new IP for the same domain should be blocked by domain limit!
    const reqBlocked = mockReq({ ip: '10.0.0.99', domainId, domainRateLimitMax: limit });
    const resBlocked = mockRes();
    let nextCalled = false;
    rateLimiter(reqBlocked as Request, resBlocked, () => { nextCalled = true; });

    expect(nextCalled).toBe(false);
    expect(resBlocked.statusCode).toBe(429);
    expect(resBlocked.body?.error?.code).toBe('TOO_MANY_REQUESTS');
    expect(resBlocked.body?.error?.message).toContain('domain');
    expect(resBlocked.body?.error?.details?.domainId).toBe(domainId);
  });

  it('should isolate rate limits between different domains', () => {
    const limit = 3;

    // Exhaust Domain A
    for (let i = 0; i < limit; i++) {
      const req = mockReq({ ip: `172.16.0.${i + 1}`, domainId: 'domain-a', domainRateLimitMax: limit });
      const res = mockRes();
      rateLimiter(req as Request, res, () => {});
    }

    // Domain A is now blocked
    const reqA = mockReq({ ip: '172.16.0.99', domainId: 'domain-a', domainRateLimitMax: limit });
    const resA = mockRes();
    let nextA = false;
    rateLimiter(reqA as Request, resA, () => { nextA = true; });
    expect(nextA).toBe(false);
    expect(resA.statusCode).toBe(429);

    // Domain B with distinct IP should still be allowed
    const reqB = mockReq({ ip: '198.51.100.1', domainId: 'domain-b', domainRateLimitMax: limit });
    const resB = mockRes();
    let nextB = false;
    rateLimiter(reqB as Request, resB, () => { nextB = true; });
    expect(nextB).toBe(true);
  });
});
