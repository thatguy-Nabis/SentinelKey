import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

/** In-memory store keyed by tracking key */
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

function checkKeyLimit(
  key: string,
  now: number,
  windowMs: number,
  max: number,
): { allowed: boolean; count: number; retryAfterSec: number } {
  let entry = store.get(key);
  if (!entry || now - entry.windowStart > windowMs) {
    entry = { count: 1, windowStart: now };
    store.set(key, entry);
    return { allowed: true, count: 1, retryAfterSec: 0 };
  }

  entry.count++;
  if (entry.count > max) {
    const retryAfterSec = Math.ceil((entry.windowStart + windowMs - now) / 1000);
    return { allowed: false, count: entry.count, retryAfterSec };
  }

  return { allowed: true, count: entry.count, retryAfterSec: 0 };
}

/**
 * Rate-limit middleware.
 * Tracks by IP address (default) and also by Domain ID when `req.domain` is present.
 */
export function rateLimiter(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip ?? req.socket?.remoteAddress ?? 'unknown';
  const now = Date.now();
  const windowMs = env.RATE_LIMIT_WINDOW_MS;
  const max = env.RATE_LIMIT_MAX;
  const targetDomainId = req.domain ? String(req.domain.id || req.domain._id) : undefined;

  // 1. Check IP limit
  const ipResult = checkKeyLimit(`ip:${ip}`, now, windowMs, max);
  if (!ipResult.allowed) {
    import('../services/event-logger.service.js')
      .then(({ emitSecurityEvent }) => {
        emitSecurityEvent({
          type: 'RATE_LIMIT_EXCEEDED',
          ip,
          domainId: targetDomainId,
          severity: 'medium',
          metadata: {
            path: req.originalUrl || req.path,
            method: req.method,
            retryAfterSeconds: ipResult.retryAfterSec,
            currentCount: ipResult.count,
            limit: max,
            target: 'ip',
          },
        }).catch(() => {});
      })
      .catch(() => {});

    res.set('Retry-After', String(ipResult.retryAfterSec));
    res.status(429).json({
      success: false,
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many requests. Please try again later.',
        details: { retryAfterSeconds: ipResult.retryAfterSec },
      },
    });
    return;
  }

  // 2. Check Domain limit (if authenticated via site key)
  if (targetDomainId) {
    const domainKey = `domain:${targetDomainId}`;
    const domainMax = (req as unknown as { domainRateLimitMax?: number }).domainRateLimitMax ?? max;
    const domainResult = checkKeyLimit(domainKey, now, windowMs, domainMax);

    if (!domainResult.allowed) {
      import('../services/event-logger.service.js')
        .then(({ emitSecurityEvent }) => {
          emitSecurityEvent({
            type: 'RATE_LIMIT_EXCEEDED',
            ip,
            domainId: targetDomainId,
            severity: 'medium',
            metadata: {
              path: req.originalUrl || req.path,
              method: req.method,
              retryAfterSeconds: domainResult.retryAfterSec,
              currentCount: domainResult.count,
              limit: domainMax,
              domainId: targetDomainId,
              target: 'domain',
            },
          }).catch(() => {});
        })
        .catch(() => {});

      res.set('Retry-After', String(domainResult.retryAfterSec));
      res.status(429).json({
        success: false,
        error: {
          code: 'TOO_MANY_REQUESTS',
          message: 'Too many requests for domain. Please try again later.',
          details: { retryAfterSeconds: domainResult.retryAfterSec, domainId: targetDomainId },
        },
      });
      return;
    }
  }

  next();
}

/**
 * Factory to create custom rate limiters.
 */
export function createRateLimiter(options: {
  windowMs?: number;
  max?: number;
  domainMax?: number;
  message?: string;
}) {
  const windowMs = options.windowMs ?? env.RATE_LIMIT_WINDOW_MS;
  const max = options.max ?? env.RATE_LIMIT_MAX;
  const domainMax = options.domainMax ?? max;

  return function (req: Request, res: Response, next: NextFunction): void {
    const ip = req.ip ?? req.socket?.remoteAddress ?? 'unknown';
    const now = Date.now();

    const ipResult = checkKeyLimit(`ip:${ip}`, now, windowMs, max);
    if (!ipResult.allowed) {
      res.set('Retry-After', String(ipResult.retryAfterSec));
      res.status(429).json({
        success: false,
        error: {
          code: 'TOO_MANY_REQUESTS',
          message: options.message ?? 'Too many requests. Please try again later.',
          details: { retryAfterSeconds: ipResult.retryAfterSec },
        },
      });
      return;
    }

    const targetDomainId = req.domain ? String(req.domain.id || req.domain._id) : undefined;
    if (targetDomainId) {
      const domainKey = `domain:${targetDomainId}`;
      const domainResult = checkKeyLimit(domainKey, now, windowMs, domainMax);
      if (!domainResult.allowed) {
        res.set('Retry-After', String(domainResult.retryAfterSec));
        res.status(429).json({
          success: false,
          error: {
            code: 'TOO_MANY_REQUESTS',
            message: 'Too many requests for domain. Please try again later.',
            details: { retryAfterSeconds: domainResult.retryAfterSec, domainId: targetDomainId },
          },
        });
        return;
      }
    }

    next();
  };
}

/**
 * Standard rate limiter for SDK-facing API routes (keys by domain & IP).
 */
export const apiRateLimiter = createRateLimiter({
  windowMs: 60_000,
  max: env.RATE_LIMIT_API_MAX,
  domainMax: env.RATE_LIMIT_API_MAX,
});

/**
 * Reset rate limit for a specific key (IP or domain).
 */
export function resetRateLimit(key: string): void {
  store.delete(key);
  store.delete(`ip:${key}`);
  store.delete(`domain:${key}`);
}

/** Exposed for testing */
export function _clearStore(): void {
  store.clear();
}
