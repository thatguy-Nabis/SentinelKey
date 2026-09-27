import { describe, it, expect, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { authorize } from '../src/middleware/authorize.js';
import type { IAccessTokenPayload, Permission } from '@sentinelkey/shared-types';

/** Helper: create a mock request with user payload */
function mockReq(permissions: Permission[]): Partial<Request> {
  return {
    user: {
      sub: 'user-123',
      email: 'test@example.com',
      roles: ['admin'],
      permissions,
      type: 'access',
    } as IAccessTokenPayload,
  };
}

/** Helper: create a mock response */
function mockRes() {
  const res: Partial<Response> = {
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

describe('authorize middleware', () => {
  it('should call next() when user has the required permission', () => {
    const req = mockReq(['logs:read', 'users:read']);
    const res = mockRes();
    let nextCalled = false;
    const next: NextFunction = () => { nextCalled = true; };

    authorize('logs:read')(req as Request, res, next);

    expect(nextCalled).toBe(true);
  });

  it('should return 403 when user lacks the required permission', () => {
    const req = mockReq(['logs:read']);
    const res = mockRes();
    let nextCalled = false;
    const next: NextFunction = () => { nextCalled = true; };

    authorize('settings:manage')(req as Request, res, next);

    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(403);
    expect(res.body?.success).toBe(false);
    expect(res.body?.error?.code).toBe('FORBIDDEN');
  });

  it('should return 403 with details about missing permissions', () => {
    const req = mockReq(['logs:read']);
    const res = mockRes();
    const next: NextFunction = () => {};

    authorize('settings:manage', 'users:delete')(req as Request, res, next);

    expect(res.statusCode).toBe(403);
    expect(res.body?.error?.details?.missing).toEqual(['settings:manage', 'users:delete']);
  });

  it('should return 401 when req.user is missing', () => {
    const req: Partial<Request> = {};
    const res = mockRes();
    let nextCalled = false;
    const next: NextFunction = () => { nextCalled = true; };

    authorize('logs:read')(req as Request, res, next);

    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(401);
  });

  it('should pass when multiple required permissions are all present', () => {
    const req = mockReq(['logs:read', 'users:read', 'settings:manage']);
    const res = mockRes();
    let nextCalled = false;
    const next: NextFunction = () => { nextCalled = true; };

    authorize('logs:read', 'settings:manage')(req as Request, res, next);

    expect(nextCalled).toBe(true);
  });
});
