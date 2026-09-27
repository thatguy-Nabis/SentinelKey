import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../services/token.service.js';
import type { IAccessTokenPayload } from '@sentinelkey/shared-types';

/**
 * Extend Express Request to carry the authenticated user payload.
 */
/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Express {
    interface Request {
      user?: IAccessTokenPayload;
    }
  }
}
/* eslint-enable @typescript-eslint/no-namespace */

/**
 * Middleware: verify the access token from the Authorization header.
 * Sets req.user on success; returns 401 on failure.
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Missing or invalid Authorization header' },
    });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Invalid or expired access token' },
    });
  }
}

/**
 * Middleware: optionally verify the access token from the Authorization header if present.
 * If present and valid, sets req.user. If absent, proceeds without req.user.
 */
export function optionalAuthenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    next();
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Invalid or expired access token' },
    });
  }
}

