/**
 * Auth-related types shared across API, dashboard, and SDK.
 */

/** Roles a user can hold */
export type RoleName = 'admin' | 'analyst' | 'viewer';

/** Stored user shape (password hash is NEVER exposed via API) */
export interface IUser {
  _id: string;
  email: string;
  passwordHash: string;
  roles: RoleName[];
  refreshTokens: IStoredRefreshToken[];
  mfaEnabled: boolean;
  mfaSecret?: string;
  mfaPendingSecret?: string;
  mfaBackupCodes?: string[];
  mfaFailedAttempts?: number;
  mfaLockedUntil?: Date | null;
  mfaLastTimeStep?: number;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/** A hashed refresh token stored on the user document */
export interface IStoredRefreshToken {
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
}

/** Safe user profile returned by API (never includes password or token hashes) */
export interface IUserProfile {
  id: string;
  email: string;
  roles: RoleName[];
  mfaEnabled: boolean;
  lastLogin?: string;
  createdAt: string;
}

/** JWT access-token payload */
export interface IAccessTokenPayload {
  sub: string;
  email: string;
  roles: RoleName[];
  permissions: string[];
  type: 'access';
}

/** JWT refresh-token payload */
export interface IRefreshTokenPayload {
  sub: string;
  type: 'refresh';
  jti: string; // unique token ID for reuse detection
}

/** JWT MFA-pending token payload (for 2FA login challenge) */
export interface IMfaTokenPayload {
  sub: string;
  type: 'mfa_pending';
}

/** POST /auth/register body */
export interface IRegisterRequest {
  email: string;
  password: string;
}

/** POST /auth/login body */
export interface ILoginRequest {
  email: string;
  password: string;
}

/** POST /auth/refresh body */
export interface IRefreshRequest {
  refreshToken: string;
}

/** POST /auth/mfa/verify body */
export interface IMfaVerifyRequest {
  code: string;
  mfaToken?: string;
}

/** POST /auth/mfa/disable body */
export interface IMfaDisableRequest {
  password: string;
  code?: string;
}

/** Response from POST /auth/mfa/setup */
export interface IMfaSetupResponse {
  secret: string;
  uri: string;
  qrCode: string;
  backupCodes: string[];
}

/** Successful auth response (login / register / refresh / mfa-verify) */
export interface IAuthResponse {
  user?: IUserProfile;
  accessToken?: string;
  refreshToken?: string;
  mfaRequired?: boolean;
  mfaToken?: string;
}

