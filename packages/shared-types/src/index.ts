/**
 * Shared types for SentinelKey.
 * Phase 1+ adds User, Role, Permission, SecurityEvent, Alert, ClassificationResult, etc.
 */
export const SHARED_TYPES_VERSION = '0.1.0';

// Auth types
export type {
  IUser,
  IStoredRefreshToken,
  IUserProfile,
  IAccessTokenPayload,
  IRefreshTokenPayload,
  IMfaTokenPayload,
  IRegisterRequest,
  ILoginRequest,
  IRefreshRequest,
  IMfaVerifyRequest,
  IMfaDisableRequest,
  IMfaSetupResponse,
  IAuthResponse,
} from './auth.js';
export type { RoleName } from './auth.js';

// RBAC types
export type { Permission, IRole } from './rbac.js';
export { DEFAULT_ROLE_PERMISSIONS } from './rbac.js';

// API response types
export type { ApiResponse, ApiErrorResponse, PaginatedResponse } from './api.js';

// Security event types
export type {
  SecurityEventType,
  EventSeverity,
  IGeoLocation,
  ISecurityEventMetadata,
  ISecurityEvent,
} from './events.js';

// Alert types
export type {
  AlertSeverity,
  AlertStatus,
  HeuristicRule,
  IAlert,
} from './alerts.js';

// Encryption types
export type {
  IEncryptedFile,
  IEncryptedFileMetadata,
  IKeyRotationResult,
  IFileFilterQuery,
} from './encryption.js';

// Classification & Compliance types
export type {
  ClassifierType,
  ClassificationVerdict,
  IMatchedRule,
  IClassificationResult,
  IPolicyRule,
  IPolicyThresholds,
  IPolicy,
  IClassifyEventRequest,
  IClassifyFileRequest,
  IEmailPayload,
  IClassifyEmailRequest,
} from './classification.js';

// Billing types
export type {
  BillingPlanId,
  PaymentStatus,
  SubscriptionStatus,
  IBillingPlan,
  ISubscription,
  IInvoice,
  ICheckoutSessionRequest,
  ICheckoutSessionResponse,
  IVerifyPaymentResponse,
} from './billing.js';

// Client Domain types
export type {
  DomainEnvironment,
  DomainHealthStatus,
  IClientDomain,
  IRegisterDomainRequest,
  IDomainProbeResult,
  IDomainTelemetryPayload,
} from './domain.js';
