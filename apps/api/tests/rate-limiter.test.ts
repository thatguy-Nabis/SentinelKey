import { describe, it, expect, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { rateLimiter, _clearStore } from '../src/middleware/rate-limiter.js';

function mockReq(ip: string): Partial<Request> {
  return { ip, socket: { remoteAddress: ip } as any };
}

function mockRes() {
  const headers: Record<string, string> = {};
  const res: Partial<Response> = {
    set: function (key: string, value: string) {
      headers[key] = value;
      return this as Response;
    },
    status: function (code: number) {
      (this as any).statusCode = code;
      return this as Response;
    },
    json: function (body: unknown) {
      (this as any).body = body;
      return this as Response;
    },
  };
  return res as Response & { statusCode?: number; body?: any };
}

describe('rateLimiter middleware', () => {
  beforeEach(() => {
    _clearStore();
  });

  it('should allow requests under the limit', () => {
    const req = mockReq('192.168.1.1');
    const res = mockRes();
    let nextCalled = false;
    const next: NextFunction = () => { nextCalled = true; };

    rateLimiter(req as Request, res, next);

    expect(nextCalled).toBe(true);
    expect(res.statusCode).toBeUndefined();
  });

  it('should block after exceeding the limit', () => {
    const ip = '10.0.0.1';

    // Send 10 requests (the default limit)
    for (let i = 0; i < 10; i++) {
      const req = mockReq(ip);
      const res = mockRes();
      let nextCalled = false;
      rateLimiter(req as Request, res, () => { nextCalled = true; });
      expect(nextCalled).toBe(true);
    }

    // 11th request should be blocked
    const req = mockReq(ip);
    const res = mockRes();
    let nextCalled = false;
    rateLimiter(req as Request, res, () => { nextCalled = true; });

    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(429);
    expect(res.body?.error?.code).toBe('TOO_MANY_REQUESTS');
  });

  it('should track different IPs independently', () => {
    // Exhaust IP A
    for (let i = 0; i < 11; i++) {
      const req = mockReq('ip-a');
      const res = mockRes();
      rateLimiter(req as Request, res, () => {});
    }

    // IP B should still work
    const req = mockReq('ip-b');
    const res = mockRes();
    let nextCalled = false;
    rateLimiter(req as Request, res, () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
  });
});
