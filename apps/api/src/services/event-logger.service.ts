import { SecurityEvent, type ISecurityEventDocument } from '../models/security-event.model.js';
import type {
  ISecurityEvent,
  SecurityEventType,
  EventSeverity,
  ISecurityEventMetadata,
  PaginatedResponse,
} from '@sentinelkey/shared-types';
import { evaluateHeuristics } from './heuristics.service.js';
import { createAlert } from './alert.service.js';
import { mlAnomalyService } from './ml-anomaly.service.js';

export interface IEmitEventOptions {
  type: SecurityEventType;
  ip: string;
  userId?: string;
  domainId?: string;
  severity?: EventSeverity;
  timestamp?: Date;
  metadata?: ISecurityEventMetadata;
}

/**
 * Emit and persist a security event, and immediately evaluate heuristics against it.
 */
export async function emitSecurityEvent(
  options: IEmitEventOptions,
): Promise<ISecurityEventDocument | null> {
  try {
    const timestamp = options.timestamp ?? new Date();
    const severity = options.severity ?? inferSeverity(options.type);
    const domainId = options.domainId || (options.metadata?.domainId as string | undefined);

    const doc = await SecurityEvent.create({
      type: options.type,
      ip: options.ip,
      userId: options.userId,
      domainId,
      severity,
      timestamp,
      metadata: options.metadata ?? {},
    });

    const eventJson = doc.toJSON() as unknown as ISecurityEvent;

    // Run heuristics asynchronously (near real-time)
    processHeuristicsForEvent(eventJson).catch(err => {
      console.error('[HEURISTICS_EVALUATION_ERROR]', err);
    });

    return doc;
  } catch (err) {
    // Defense-in-depth: event emission failure should never bring down the primary auth flow
    console.error('[EVENT_LOGGER_ERROR] Failed to emit security event:', err);
    return null;
  }
}

/**
 * Fetch recent events and evaluate heuristics for an incoming event.
 */
async function processHeuristicsForEvent(event: ISecurityEvent): Promise<void> {
  const windowMs = 10 * 60 * 1000; // 10 minutes historical context
  const eventTime = new Date(event.timestamp).getTime();
  const startTime = new Date(eventTime - windowMs);

  // Fetch relevant recent events (same IP or same user)
  const orFilters: Record<string, unknown>[] = [{ ip: event.ip }];
  if (event.userId) orFilters.push({ userId: event.userId });
  if (event.metadata?.email) orFilters.push({ 'metadata.email': event.metadata.email });

  const recentDocs = await SecurityEvent.find({
    timestamp: { $gte: startTime, $lte: new Date(eventTime) },
    $or: orFilters,
  }).sort({ timestamp: -1 });

  const recentEvents = recentDocs.map(d => d.toJSON() as unknown as ISecurityEvent);

  const candidates = evaluateHeuristics(event, recentEvents);

  for (const candidate of candidates) {
    if (event.domainId && !candidate.domainId) {
      candidate.domainId = event.domainId;
    }
    await createAlert(candidate);
  }

  // Phase 6: Evaluate statistical ML anomaly model
  await mlAnomalyService.evaluateEvent(event).catch(err => {
    console.error('[ML_ANOMALY_ERROR]', err);
  });
}

/**
 * Infer default severity based on event type.
 */
function inferSeverity(type: SecurityEventType): EventSeverity {
  switch (type) {
    case 'AUTH_TOKEN_REUSE':
      return 'critical';
    case 'MFA_LOCKOUT':
      return 'high';
    case 'PERMISSION_DENIED':
    case 'RATE_LIMIT_EXCEEDED':
    case 'MFA_LOGIN_FAILED':
    case 'AUTH_LOGIN_FAILED':
      return 'medium';
    case 'MFA_DISABLED':
      return 'low';
    default:
      return 'info';
  }
}

export interface ISecurityEventFilter {
  type?: SecurityEventType;
  severity?: EventSeverity;
  ip?: string;
  userId?: string;
  domainId?: string;
  startDate?: string | Date;
  endDate?: string | Date;
  page?: number;
  limit?: number;
}

/**
 * Query paginated security events with optional filters.
 */
export async function getSecurityEvents(
  filters: ISecurityEventFilter = {},
): Promise<PaginatedResponse<ISecurityEvent>> {
  const page = Math.max(1, Number(filters.page ?? 1));
  const limit = Math.min(100, Math.max(1, Number(filters.limit ?? 25)));
  const skip = (page - 1) * limit;

  const query: Record<string, unknown> = {};

  if (filters.type) query.type = filters.type;
  if (filters.severity) query.severity = filters.severity;
  if (filters.ip) query.ip = filters.ip;
  if (filters.userId) query.userId = filters.userId;
  if (filters.domainId) query.domainId = filters.domainId;

  if (filters.startDate || filters.endDate) {
    const timestampQuery: Record<string, Date> = {};
    if (filters.startDate) timestampQuery.$gte = new Date(filters.startDate);
    if (filters.endDate) timestampQuery.$lte = new Date(filters.endDate);
    query.timestamp = timestampQuery;
  }

  const [docs, total] = await Promise.all([
    SecurityEvent.find(query).sort({ timestamp: -1 }).skip(skip).limit(limit),
    SecurityEvent.countDocuments(query),
  ]);

  const items = docs.map(d => d.toJSON() as unknown as ISecurityEvent);

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
