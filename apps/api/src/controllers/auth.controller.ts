import type { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service.js';
import { resetRateLimit } from '../middleware/rate-limiter.js';
import { sendSuccess } from '../utils/api-response.js';

function getRequestContext(req: Request): authService.IAuthRequestContext {
  const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
  const userAgent = req.headers['user-agent'];
  // ponytail: we intentionally do NOT read `location` from the request body —
  // client-supplied coordinates are attacker-controlled. Upgrade path: resolve
  // location server-side from the trusted IP (geoIP / Cloudflare headers).
  return { ip, userAgent };
}

/**
 * POST /auth/register
 */
export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body;
    const result = await authService.register(email, password);
    sendSuccess(res, result, 201, 'User registered successfully');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /auth/login
 */
export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body;
    const context = getRequestContext(req);
    const result = await authService.login(email, password, context);

    // Reset rate limiter on successful login
    resetRateLimit(context.ip ?? 'unknown');

    sendSuccess(res, result, 200, 'Login successful');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /auth/refresh
 */
export async function refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken || typeof refreshToken !== 'string') {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'refreshToken is required' },
      });
      return;
    }
    const context = getRequestContext(req);
    const result = await authService.refresh(refreshToken, context);
    sendSuccess(res, result, 200, 'Token refreshed');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /auth/logout
 */
export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken || typeof refreshToken !== 'string') {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'refreshToken is required to logout' },
      });
      return;
    }
    await authService.logout(req.user!.sub, refreshToken);
    sendSuccess(res, null, 200, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
}

/**
 * GET /auth/me
 */
export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const profile = await authService.getMe(req.user!.sub);
    sendSuccess(res, profile);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /auth/mfa/setup
 */
export async function mfaSetup(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.setupMfa(req.user!.sub);
    sendSuccess(res, result, 200, 'MFA setup initiated');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /auth/mfa/verify
 * Handles either:
 * 1. Login completion challenge (if mfaToken in body)
 * 2. Setup confirmation (if req.user present from Bearer token)
 */
export async function mfaVerify(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { code, mfaToken } = req.body;

    if (!code || typeof code !== 'string') {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Verification code is required' },
      });
      return;
    }

    if (mfaToken) {
      // Login flow completion
      const context = getRequestContext(req);
      const result = await authService.verifyMfaLogin(mfaToken, code, context);
      resetRateLimit(context.ip ?? 'unknown');
      sendSuccess(res, result, 200, 'MFA verification successful; login complete');
      return;
    }

    if (req.user) {
      // Setup confirmation flow
      const result = await authService.verifyMfaSetup(req.user.sub, code);
      sendSuccess(res, result, 200, 'MFA enabled successfully');
      return;
    }

    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Either mfaToken or Authorization header is required to verify MFA',
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /auth/mfa/disable
 */
export async function mfaDisable(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { password, code } = req.body;
    if (!password || typeof password !== 'string') {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Password is required to disable MFA' },
      });
      return;
    }

    const context = getRequestContext(req);
    const result = await authService.disableMfa(req.user!.sub, password, code, context);
    sendSuccess(res, result, 200, 'MFA disabled successfully');
  } catch (err) {
    next(err);
  }
}

