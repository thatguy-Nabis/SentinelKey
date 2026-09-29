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
      domainId,
      startDate,
      endDate,
    } = req.query;

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

    const result = await getSecurityEvents({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      type: type as SecurityEventType | undefined,
      severity: severity as EventSeverity | undefined,
      ip: ip as string | undefined,
      userId: effectiveUserId,
      domainId: effectiveDomainId,
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
    });

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}
