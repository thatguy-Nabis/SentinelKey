/**
 * Security Event types and schemas.
 */

export type SecurityEventType =
  | 'AUTH_LOGIN_SUCCESS'
  | 'AUTH_LOGIN_FAILED'
  | 'AUTH_LOGOUT'
  | 'AUTH_TOKEN_REFRESH'
  | 'AUTH_TOKEN_REUSE'
  | 'AUTH_PASSWORD_CHANGED'
  | 'MFA_SETUP_INIT'
  | 'MFA_SETUP_SUCCESS'
  | 'MFA_LOGIN_SUCCESS'
  | 'MFA_LOGIN_FAILED'
  | 'MFA_LOCKOUT'
  | 'MFA_DISABLED'
  | 'PERMISSION_DENIED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'FILE_DECRYPT_ACCESSED'
  | 'FILE_UPLOADED'
  | 'FILE_DOWNLOADED'
  | 'FILE_KEY_ROTATED'
  | 'DOMAIN_REGISTERED'
  | 'DOMAIN_KEY_ROTATED'
  | 'DOMAIN_SUSPENDED'
  | 'DOMAIN_REACTIVATED'
  | 'DOMAIN_DELETED'
  | 'DOMAIN_ORIGIN_MISMATCH'
  | 'QUOTA_EXCEEDED'
  | 'USAGE_INVOICE_CREATED'
  | 'DOMAIN_SUSPENDED_UNPAID'
  | 'DOMAIN_REACTIVATED_PAYMENT';

export type EventSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';

export interface IGeoLocation {
  city?: string;
  country?: string;
  latitude: number;
  longitude: number;
}

export interface ISecurityEventMetadata {
  email?: string;
  userAgent?: string;
  path?: string;
  method?: string;
  requiredPermission?: string;
  failedAttempts?: number;
  location?: IGeoLocation;
  domainId?: string;
  domainOrigin?: string;
  [key: string]: unknown;
}

export interface ISecurityEvent {
  _id: string;
  type: SecurityEventType;
  userId?: string;
  domainId?: string;
  ip: string;
  timestamp: string | Date;
  severity: EventSeverity;
  metadata?: ISecurityEventMetadata;
}
