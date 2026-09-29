import { Alert, type IAlertDocument } from '../models/alert.model.js';
import type {
  IAlert,
  AlertStatus,
  AlertSeverity,
  HeuristicRule,
  PaginatedResponse,
} from '@sentinelkey/shared-types';
import type { IAlertCandidate } from './heuristics.service.js';

export type AlertHook = (alert: IAlert) => void | Promise<void>;
const alertHooks: AlertHook[] = [];

/**
 * Register an alert hook (for webhooks, email/SMS notifications, or test assertions).
 */
export function registerAlertHook(hook: AlertHook): () => void {
  alertHooks.push(hook);
  return () => {
    const idx = alertHooks.indexOf(hook);
    if (idx !== -1) alertHooks.splice(idx, 1);
  };
}

/**
 * Persist a newly triggered alert to the database and notify registered hooks.
 */
export async function createAlert(candidate: IAlertCandidate): Promise<IAlertDocument> {
  const alert = await Alert.create({
    title: candidate.title,
    description: candidate.description,
    rule: candidate.rule,
    severity: candidate.severity,
    status: 'open',
    userId: candidate.userId,
    domainId: candidate.domainId,
    ip: candidate.ip,
    triggerEventIds: candidate.triggerEventIds,
    metadata: candidate.metadata,
  });

  const alertJson = alert.toJSON() as unknown as IAlert;

  // Fire registered alert hooks asynchronously
  for (const hook of alertHooks) {
    try {
      await hook(alertJson);
    } catch (err) {
      console.error('[ALERT_HOOK_ERROR]', err);
    }
  }

  return alert;
}

export interface IAlertQueryFilter {
  status?: AlertStatus;
  severity?: AlertSeverity;
  rule?: HeuristicRule;
  ip?: string;
  userId?: string;
  domainId?: string;
  page?: number;
  limit?: number;
}

/**
 * Query paginated alerts with optional filters.
 */
export async function getAlerts(
  filters: IAlertQueryFilter = {},
): Promise<PaginatedResponse<IAlert>> {
  const page = Math.max(1, Number(filters.page ?? 1));
  const limit = Math.min(100, Math.max(1, Number(filters.limit ?? 20)));
  const skip = (page - 1) * limit;

  const query: Record<string, unknown> = {};
  if (filters.status) query.status = filters.status;
  if (filters.severity) query.severity = filters.severity;
  if (filters.rule) query.rule = filters.rule;
  if (filters.ip) query.ip = filters.ip;
  if (filters.userId) query.userId = filters.userId;
  if (filters.domainId) query.domainId = filters.domainId;

  const [docs, total] = await Promise.all([
    Alert.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Alert.countDocuments(query),
  ]);

  const items = docs.map(d => d.toJSON() as unknown as IAlert);

  return {
    success: true,
    data: items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Acknowledge an alert.
 */
export async function acknowledgeAlert(alertId: string, userId: string): Promise<IAlert> {
  const alert = await Alert.findById(alertId);
  if (!alert) {
    throw Object.assign(new Error('Alert not found'), { statusCode: 404 });
  }

  alert.status = 'acknowledged';
  alert.acknowledgedBy = userId;
  alert.acknowledgedAt = new Date();
  await alert.save();

  return alert.toJSON() as unknown as IAlert;
}

/**
 * Resolve an alert.
 */
export async function resolveAlert(alertId: string, userId: string): Promise<IAlert> {
  const alert = await Alert.findById(alertId);
  if (!alert) {
    throw Object.assign(new Error('Alert not found'), { statusCode: 404 });
  }

  alert.status = 'resolved';
  alert.resolvedAt = new Date();
  if (!alert.acknowledgedBy) {
    alert.acknowledgedBy = userId;
    alert.acknowledgedAt = new Date();
  }
  await alert.save();

  return alert.toJSON() as unknown as IAlert;
}
