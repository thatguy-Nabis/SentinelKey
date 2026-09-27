import jwt, { type SignOptions } from 'jsonwebtoken';
import crypto from 'node:crypto';
import { env } from '../config/env.js';
import type { IAccessTokenPayload, IRefreshTokenPayload } from '@sentinelkey/shared-types';

/**
 * Sign an access token.
 */
export function signAccessToken(payload: Omit<IAccessTokenPayload, 'type'>): string {
  const options: SignOptions = { expiresIn: env.JWT_ACCESS_EXPIRES_IN as unknown as SignOptions['expiresIn'] };
  return jwt.sign(
    { ...payload, type: 'access' },
    env.JWT_ACCESS_SECRET,
    options,
  );
}

/**
 * Sign a refresh token with a unique JTI for reuse detection.
 */
export function signRefreshToken(userId: string): { token: string; jti: string } {
  const jti = crypto.randomUUID();
  const options: SignOptions = { expiresIn: env.JWT_REFRESH_EXPIRES_IN as unknown as SignOptions['expiresIn'] };
  const token = jwt.sign(
    { sub: userId, type: 'refresh', jti } satisfies IRefreshTokenPayload,
    env.JWT_REFRESH_SECRET,
    options,
  );
  return { token, jti };
}

/**
 * Verify and decode an access token.
 * Throws on invalid/expired tokens.
 */
export function verifyAccessToken(token: string): IAccessTokenPayload {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as IAccessTokenPayload;
  if (payload.type !== 'access') {
    throw new Error('Invalid token type');
  }
  return payload;
}

/**
 * Verify and decode a refresh token.
 * Throws on invalid/expired tokens.
 */
export function verifyRefreshToken(token: string): IRefreshTokenPayload {
  const payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as IRefreshTokenPayload;
  if (payload.type !== 'refresh') {
    throw new Error('Invalid token type');
  }
  return payload;
}

/**
 * Sign a short-lived temporary token for completing an MFA login challenge.
 */
export function signMfaToken(userId: string): string {
  const options: SignOptions = { expiresIn: env.MFA_TOKEN_EXPIRES_IN as unknown as SignOptions['expiresIn'] };
  return jwt.sign(
    { sub: userId, type: 'mfa_pending' },
    env.JWT_ACCESS_SECRET,
    options,
  );
}

/**
 * Verify and decode an MFA challenge token.
 */
export function verifyMfaToken(token: string): { sub: string; type: 'mfa_pending' } {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as { sub: string; type: string };
  if (payload.type !== 'mfa_pending') {
    throw new Error('Invalid token type for MFA challenge');
  }
  return payload as { sub: string; type: 'mfa_pending' };
}

/**
 * Hash a refresh token for storage (SHA-256).
 * We never store raw refresh tokens — only their hash.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Parse expiry string (e.g. "7d", "15m") to milliseconds.
 */
export function parseExpiryToMs(expiry: string): number {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) throw new Error(`Invalid expiry format: ${expiry}`);

  const value = Number(match[1]);
  const unit = match[2];

  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: throw new Error(`Unknown time unit: ${unit}`);
  }
}
