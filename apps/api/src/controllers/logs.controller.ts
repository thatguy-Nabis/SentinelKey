import type { Request, Response, NextFunction } from 'express';
import { getSecurityEvents } from '../services/event-logger.service.js';
import type { SecurityEventType, EventSeverity } from '@sentinelkey/shared-types';

/**
 * GET /logs
 * Query paginated security events.
 */
export async function getLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const {
      page,
      limit,
      type,
      severity,
      ip,
      userId,
      startDate,
      endDate,
    } = req.query;

    const result = await getSecurityEvents({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      type: type as SecurityEventType | undefined,
      severity: severity as EventSeverity | undefined,
      ip: ip as string | undefined,
      userId: userId as string | undefined,
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
    });

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}
