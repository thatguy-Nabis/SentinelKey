import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import type { IDomain, UnitTier } from '@sentinelkey/shared-types';
import { Domain } from '../models/domain.model.js';
import { verifyAccessToken } from '../services/token.service.js';
import { getTierForRoute } from '../config/metering.js';
import { meteringService } from '../services/metering.service.js';
import { emitSecurityEvent } from '../services/event-logger.service.js';
import { sendError } from '../utils/api-response.js';

/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Express {
    interface Request {
      domain?: IDomain;
      tier?: UnitTier;
    }
  }
}
/* eslint-enable @typescript-eslint/no-namespace */

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || '127.0.0.1';
}

function normalizeHeaderOrigin(rawOrigin?: string): string | null {
  if (!rawOrigin) return null;
  return rawOrigin
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/$/, '')
    .toLowerCase();
}

/**
 * Universal Authentication & Metering Middleware for SDK-facing routes.
 * Accepts:
 * 1. Site Key via X-Site-Key header or Authorization: Bearer sk_live_...
 *    -> Attributed to domain, checks quotas, and meters 2xx responses.
 * 2. User JWT via Authorization: Bearer <jwt>
 *    -> Authenticated as user, unmetered (dashboards/website).
 */
export async function authenticateOrSiteKey(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const clientIp = getClientIp(req);

  // 1. Check for dedicated X-Site-Key header
  let rawSiteKey = (req.headers['x-site-key'] as string | undefined)?.trim();

  // 2. Check Authorization header
  const authHeader = req.headers.authorization;

  if (!rawSiteKey && authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token.startsWith('sk_live_')) {
      rawSiteKey = token;
    } else {
      // Normal user JWT
      try {
        const payload = verifyAccessToken(token);
        req.user = payload;
        return next();
      } catch {
        sendError(res, 401, 'UNAUTHORIZED', 'Invalid or expired access token');
        return;
      }
    }
  }

  // If no credentials provided at all
  if (!rawSiteKey) {
    sendError(res, 401, 'UNAUTHORIZED', 'Authentication required via User JWT or X-Site-Key');
    return;
  }

  // 3. Authenticate Site Key
  try {
    const keyHash = crypto.createHash('sha256').update(rawSiteKey).digest('hex');

    const domainDoc = await Domain.findOne({
      siteKeyHash: keyHash,
      status: { $ne: 'deleted' as const },
    }).select('+siteKeyHash');

    if (!domainDoc) {
      sendError(res, 401, 'INVALID_SITE_KEY', 'Invalid or unrecognized site key');
      return;
    }

    // Check domain suspension / payment status
    if (domainDoc.status === 'suspended') {
      if (domainDoc.suspensionReason === 'unpaid') {
        sendError(res, 402, 'DOMAIN_UNPAID', 'Domain is suspended due to unpaid usage invoices');
        return;
      }
      sendError(
        res,
        403,
        'DOMAIN_SUSPENDED',
        `Domain is suspended (${domainDoc.suspensionReason || 'manual'})`,
      );
      return;
    }

    if (domainDoc.status !== 'active' && domainDoc.status !== 'pending') {
      sendError(res, 403, 'DOMAIN_INACTIVE', 'Domain is inactive');
      return;
    }

    // 4. Validate Browser Origin (if present)
    const rawOrigin = req.headers.origin as string | undefined;
    if (rawOrigin) {
      const normalizedOrigin = normalizeHeaderOrigin(rawOrigin);
      if (normalizedOrigin && normalizedOrigin !== domainDoc.origin) {
        emitSecurityEvent({
          type: 'DOMAIN_ORIGIN_MISMATCH',
          userId: domainDoc.userId.toString(),
          ip: clientIp,
          severity: 'high',
          metadata: {
            domainId: domainDoc._id.toString(),
            expectedOrigin: domainDoc.origin,
            receivedOrigin: rawOrigin,
            path: req.originalUrl || req.path,
          },
        }).catch(() => {});

        sendError(
          res,
          403,
          'ORIGIN_MISMATCH',
          `Origin '${rawOrigin}' does not match registered domain origin '${domainDoc.origin}'`,
        );
        return;
      }
    }

    // 5. Throttled lastSeenAt update & move from pending -> active
    const now = new Date();
    const lastSeen = domainDoc.lastSeenAt;
    const shouldUpdateLastSeen = !lastSeen || now.getTime() - lastSeen.getTime() > 60_000;
    if (domainDoc.status === 'pending') {
      await Domain.updateOne(
        { _id: domainDoc._id },
        { $set: { lastSeenAt: now, status: 'active' } },
      ).catch(() => {});
      domainDoc.status = 'active';
    } else if (shouldUpdateLastSeen) {
      Domain.updateOne(
        { _id: domainDoc._id },
        { $set: { lastSeenAt: now } },
      ).catch(() => {});
    }

    const domain = domainDoc.toJSON() as unknown as IDomain;
    domain.id = domainDoc._id.toString();
    req.domain = domain;
    const domainId = domainDoc._id.toString();

    // Attach synthetic user payload so downstream controllers and services can attribute userId
    req.user = {
      sub: domainDoc.userId.toString(),
      email: `domain_${domainId}@sentinelkey.local`,
      roles: ['viewer'],
      permissions: [
        'classify:read',
        'classify:write',
        'files:read',
        'files:write',
        'encryption:read',
        'encryption:write',
        'logs:read',
        'alerts:read',
      ],
      type: 'access',
    };

    // 6. Quota check & Tier resolution
    const routePath = req.originalUrl || req.path;
    const tier = getTierForRoute(req.method, routePath);

    if (tier) {
      req.tier = tier;
      const quotaCheck = await meteringService.checkQuota(domain, tier, clientIp);
      if (!quotaCheck.allowed) {
        sendError(res, 429, 'QUOTA_EXCEEDED', quotaCheck.reason || 'Plan quota exceeded');
        return;
      }
    }

    // 7. Metering Response Interceptor
    res.on('finish', () => {
      if (req.domain && req.tier) {
        const isSuccess = res.statusCode >= 200 && res.statusCode < 300;
        meteringService
          .recordUsage(domainId, domainDoc.userId.toString(), req.tier, isSuccess)
          .catch(() => {});
      }
    });

    next();
  } catch (err) {
    next(err);
  }
}
