import type { Request, Response, NextFunction } from 'express';
import { domainService } from '../services/domain.service.js';
import { sendSuccess, sendError } from '../utils/api-response.js';

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || '127.0.0.1';
}

function isAdminUser(req: Request): boolean {
  return Boolean(req.user?.roles?.includes('admin'));
}

function getUserId(req: Request): string | undefined {
  return req.user?.sub || (req.user as unknown as { id?: string })?.id;
}

/**
 * POST /domains — Register a new domain within plan limits
 */
export async function registerDomain(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getUserId(req);
    if (!userId) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }

    const clientIp = getClientIp(req);
    const result = await domainService.createDomain(userId, req.body, clientIp);

    sendSuccess(res, result, 201);
  } catch (err: unknown) {
    const status = (err as { status?: number }).status ?? 500;
    const message = err instanceof Error ? err.message : 'Failed to register domain';
    if (status < 500) {
      const code = status === 403 ? 'LIMIT_EXCEEDED' : status === 409 ? 'CONFLICT' : 'INVALID_REQUEST';
      sendError(res, status, code, message);
      return;
    }
    next(err);
  }
}

/**
 * GET /domains — List caller's active domains (or all if admin requested via admin query)
 */
export async function listDomains(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getUserId(req);
    if (!userId) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }

    const isAdmin = isAdminUser(req);
    const isAdminAll = isAdmin && req.query.all === 'true';

    const domains = await domainService.listDomains(userId, isAdminAll);
    sendSuccess(res, domains);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /domains/:id — Get details of a single domain
 */
export async function getDomain(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getUserId(req);
    if (!userId) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }

    const { id } = req.params;
    const domain = await domainService.getDomainById(id, userId, isAdminUser(req));
    sendSuccess(res, domain);
  } catch (err: unknown) {
    const status = (err as { status?: number }).status ?? 500;
    const message = err instanceof Error ? err.message : 'Failed to fetch domain';
    if (status < 500) {
      const code = status === 404 ? 'NOT_FOUND' : status === 403 ? 'FORBIDDEN' : 'BAD_REQUEST';
      sendError(res, status, code, message);
      return;
    }
    next(err);
  }
}

/**
 * PATCH /domains/:id — Update label only
 */
export async function updateDomain(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getUserId(req);
    if (!userId) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }

    const { id } = req.params;
    const label = req.body.label ?? req.body.name;
    const domain = await domainService.updateDomain(id, userId, label, isAdminUser(req));
    sendSuccess(res, domain);
  } catch (err: unknown) {
    const status = (err as { status?: number }).status ?? 500;
    const message = err instanceof Error ? err.message : 'Failed to update domain';
    if (status < 500) {
      const code = status === 404 ? 'NOT_FOUND' : status === 403 ? 'FORBIDDEN' : 'BAD_REQUEST';
      sendError(res, status, code, message);
      return;
    }
    next(err);
  }
}

/**
 * POST /domains/:id/rotate-key — Rotate site key
 */
export async function rotateKey(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getUserId(req);
    if (!userId) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }

    const { id } = req.params;
    const clientIp = getClientIp(req);
    const result = await domainService.rotateKey(id, userId, clientIp, isAdminUser(req));
    sendSuccess(res, result);
  } catch (err: unknown) {
    const status = (err as { status?: number }).status ?? 500;
    const message = err instanceof Error ? err.message : 'Failed to rotate key';
    if (status < 500) {
      const code = status === 404 ? 'NOT_FOUND' : status === 403 ? 'FORBIDDEN' : 'BAD_REQUEST';
      sendError(res, status, code, message);
      return;
    }
    next(err);
  }
}

/**
 * POST /domains/:id/suspend — Suspend a domain
 */
export async function suspendDomain(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getUserId(req);
    if (!userId) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }

    const { id } = req.params;
    const reason = req.body.reason ?? 'manual';
    const clientIp = getClientIp(req);
    const domain = await domainService.suspendDomain(id, userId, reason, clientIp, isAdminUser(req));
    sendSuccess(res, domain);
  } catch (err: unknown) {
    const status = (err as { status?: number }).status ?? 500;
    const message = err instanceof Error ? err.message : 'Failed to suspend domain';
    if (status < 500) {
      const code = status === 404 ? 'NOT_FOUND' : status === 403 ? 'FORBIDDEN' : 'BAD_REQUEST';
      sendError(res, status, code, message);
      return;
    }
    next(err);
  }
}

/**
 * POST /domains/:id/reactivate — Reactivate a suspended domain
 */
export async function reactivateDomain(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getUserId(req);
    if (!userId) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }

    const { id } = req.params;
    const clientIp = getClientIp(req);
    const domain = await domainService.reactivateDomain(id, userId, clientIp, isAdminUser(req));
    sendSuccess(res, domain);
  } catch (err: unknown) {
    const status = (err as { status?: number }).status ?? 500;
    const message = err instanceof Error ? err.message : 'Failed to reactivate domain';
    if (status < 500) {
      const code = status === 403 ? 'LIMIT_EXCEEDED' : status === 404 ? 'NOT_FOUND' : 'BAD_REQUEST';
      sendError(res, status, code, message);
      return;
    }
    next(err);
  }
}

/**
 * DELETE /domains/:id — Soft-delete domain
 */
export async function deleteDomain(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getUserId(req);
    if (!userId) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }

    const { id } = req.params;
    const clientIp = getClientIp(req);
    const result = await domainService.deleteDomain(id, userId, clientIp, isAdminUser(req));
    sendSuccess(res, result);
  } catch (err: unknown) {
    const status = (err as { status?: number }).status ?? 500;
    const message = err instanceof Error ? err.message : 'Failed to delete domain';
    if (status < 500) {
      const code = status === 404 ? 'NOT_FOUND' : status === 403 ? 'FORBIDDEN' : 'BAD_REQUEST';
      sendError(res, status, code, message);
      return;
    }
    next(err);
  }
}

/**
 * POST /domains/keep — Used on downgrade to choose which domains stay active
 */
export async function keepDomainsOnDowngrade(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getUserId(req);
    if (!userId) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }

    const { domainIds, targetPlanId = 'free' } = req.body;
    if (!Array.isArray(domainIds)) {
      sendError(res, 400, 'INVALID_REQUEST', 'domainIds must be an array of domain IDs to keep active');
      return;
    }

    const clientIp = getClientIp(req);
    const domains = await domainService.keepDomainsOnDowngrade(userId, domainIds, targetPlanId, clientIp);
    sendSuccess(res, domains);
  } catch (err: unknown) {
    const status = (err as { status?: number }).status ?? 500;
    const message = err instanceof Error ? err.message : 'Failed to process domain downgrade selections';
    if (status < 500) {
      const code = status === 400 ? 'INVALID_REQUEST' : status === 403 ? 'FORBIDDEN' : 'BAD_REQUEST';
      sendError(res, status, code, message);
      return;
    }
    next(err);
  }
}

/**
 * Backwards compatibility probe simulation helper
 */
export async function probeDomain(req: Request, res: Response): Promise<void> {
  sendSuccess(res, {
    reachable: true,
    statusCode: 200,
    latencyMs: 12,
    message: 'Local origin probe reachable',
  });
}

/**
 * Backwards compatibility telemetry simulation helper
 */
export async function simulateDomainTraffic(req: Request, res: Response): Promise<void> {
  sendSuccess(res, {
    success: true,
    message: 'Simulated telemetry ingested successfully',
  });
}
