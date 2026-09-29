import type { Request, Response, NextFunction } from 'express';
import { getAlerts, acknowledgeAlert, resolveAlert } from '../services/alert.service.js';
import { sendSuccess } from '../utils/api-response.js';
import type { AlertStatus, AlertSeverity, HeuristicRule } from '@sentinelkey/shared-types';

/**
 * GET /alerts
 * Query paginated intrusion detection alerts.
 */
export async function listAlerts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page, limit, status, severity, rule, ip, userId, domainId } = req.query;

    const isSecurityStaff = Boolean(
      req.user?.roles?.includes('admin') || req.user?.roles?.includes('analyst'),
    );
    let effectiveDomainId = domainId as string | undefined;
    let effectiveUserId = userId as string | undefined;

    if (req.domain) {
      effectiveDomainId = req.domain.id || (req.domain as unknown as { _id?: string })._id?.toString();
      effectiveUserId = undefined;
    } else if (!isSecurityStaff) {
      effectiveUserId = req.user?.sub;
    }

    const result = await getAlerts({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      status: status as AlertStatus | undefined,
      severity: severity as AlertSeverity | undefined,
      rule: rule as HeuristicRule | undefined,
      ip: ip as string | undefined,
      userId: effectiveUserId,
      domainId: effectiveDomainId,
    });

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /alerts/:id/acknowledge
 * Acknowledge an open alert.
 */
export async function acknowledge(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user!.sub;

    const updated = await acknowledgeAlert(id, userId);
    sendSuccess(res, updated, 200, 'Alert acknowledged successfully');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /alerts/:id/resolve
 * Resolve an alert.
 */
export async function resolve(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user!.sub;

    const updated = await resolveAlert(id, userId);
    sendSuccess(res, updated, 200, 'Alert resolved successfully');
  } catch (err) {
    next(err);
  }
}
