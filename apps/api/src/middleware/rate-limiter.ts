import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

/** In-memory store keyed by IP */
const store = new Map<string, RateLimitEntry>();

/** Clean up expired entries every 5 minutes */
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now - entry.windowStart > env.RATE_LIMIT_WINDOW_MS) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000).unref();

/**
 * Rate-limit middleware for login attempts.
 * Tracks by IP address. Configurable via RATE_LIMIT_WINDOW_MS and RATE_LIMIT_MAX.
 */
export function rateLimiter(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip ?? req.socket?.remoteAddress ?? 'unknown';
  const now = Date.now();

  let entry = store.get(ip);

  if (!entry || now - entry.windowStart > env.RATE_LIMIT_WINDOW_MS) {
    // New window
    entry = { count: 1, windowStart: now };
    store.set(ip, entry);
    next();
    return;
  }

  entry.count++;

  if (entry.count > env.RATE_LIMIT_MAX) {
    const retryAfterSec = Math.ceil(
      (entry.windowStart + env.RATE_LIMIT_WINDOW_MS - now) / 1000,
    );

    import('../services/event-logger.service.js')
      .then(({ emitSecurityEvent }) => {
        emitSecurityEvent({
          type: 'RATE_LIMIT_EXCEEDED',
          ip,
          severity: 'medium',
          metadata: {
            path: req.originalUrl || req.path,
            method: req.method,
            retryAfterSeconds: retryAfterSec,
            currentCount: entry?.count,
            limit: env.RATE_LIMIT_MAX,
          },
        }).catch(() => {});
      })
      .catch(() => {});

    res.set('Retry-After', String(retryAfterSec));
    res.status(429).json({
      success: false,
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many login attempts. Please try again later.',
        details: { retryAfterSeconds: retryAfterSec },
      },
    });
    return;
  }

  next();
}

/**
 * Reset rate limit for a specific IP (called on successful login).
 */
export function resetRateLimit(ip: string): void {
  store.delete(ip);
}

/** Exposed for testing */
export function _clearStore(): void {
  store.clear();
}
