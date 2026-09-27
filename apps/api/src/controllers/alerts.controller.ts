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
    const { page, limit, status, severity, rule, ip, userId } = req.query;

    const result = await getAlerts({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      status: status as AlertStatus | undefined,
      severity: severity as AlertSeverity | undefined,
      rule: rule as HeuristicRule | undefined,
      ip: ip as string | undefined,
      userId: userId as string | undefined,
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
