/**
 * Alert types and schemas for the Intrusion Detection System (IDS).
 */

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AlertStatus = 'open' | 'acknowledged' | 'resolved';

export type HeuristicRule =
  | 'FAILED_LOGIN_BURST'
  | 'GEO_VELOCITY_IMPOSSIBLE_TRAVEL'
  | 'PRIVILEGE_ESCALATION_BURST'
  | 'TOKEN_REUSE_ANOMALY'
  | 'MFA_LOCKOUT_ANOMALY'
  | 'RATE_LIMIT_ANOMALY'
  | 'ML_ANOMALY_DETECTION'
  | 'EVENT_CLASSIFICATION_ALERT'
  | 'FILE_CLASSIFICATION_BLOCKED'
  | 'EMAIL_CLASSIFICATION_PHISHING';

export interface IAlert {
  _id: string;
  title: string;
  description: string;
  rule: HeuristicRule;
  severity: AlertSeverity;
  status: AlertStatus;
  userId?: string;
  domainId?: string;
  ip: string;
  triggerEventIds: string[];
  metadata?: Record<string, unknown>;
  acknowledgedBy?: string;
  acknowledgedAt?: string | Date;
  resolvedAt?: string | Date;
  createdAt: string | Date;
  updatedAt: string | Date;
}
