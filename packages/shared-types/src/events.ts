/**
 * Security Event types and schemas.
 */

export type SecurityEventType =
  | 'AUTH_LOGIN_SUCCESS'
  | 'AUTH_LOGIN_FAILED'
  | 'AUTH_LOGOUT'
  | 'AUTH_TOKEN_REFRESH'
  | 'AUTH_TOKEN_REUSE'
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
  | 'FILE_KEY_ROTATED';

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
  [key: string]: unknown;
}

export interface ISecurityEvent {
  _id: string;
  type: SecurityEventType;
  userId?: string;
  ip: string;
  timestamp: string | Date;
  severity: EventSeverity;
  metadata?: ISecurityEventMetadata;
  createdAt?: string | Date;
}
