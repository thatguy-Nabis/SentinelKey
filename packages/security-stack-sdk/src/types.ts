import type {
  IAuthResponse,
  ILoginRequest,
  IRegisterRequest,
  IMfaSetupResponse,
  IMfaVerifyRequest,
  IUserProfile,
  IClassifyEventRequest,
  IClassifyFileRequest,
  IClassifyEmailRequest,
  IClassificationResult,
  IPolicy,
  IEncryptedFile,
  IFileFilterQuery,
  IKeyRotationResult,
  ISecurityEvent,
  IAlert,
} from '@sentinelkey/shared-types';

export interface SentinelKeyConfig {
  /** Base URL for the SentinelKey API (e.g. 'http://localhost:4000') */
  baseUrl?: string;
  /** Initial JWT access token */
  token?: string;
  /** Initial refresh token for automatic rotation */
  refreshToken?: string;
  /**
   * If true (default), when API is unreachable or returns a server error,
   * classification calls return a fail-safe BLOCKED verdict instead of allowing actions through.
   */
  failSafe?: boolean;
  /** Request timeout in milliseconds (default: 5000ms) */
  timeoutMs?: number;
  /** Optional callback fired when the access token is automatically refreshed */
  onTokenRefresh?: (newAccessToken: string) => void;
  /** Optional custom fetch implementation (defaults to globalThis.fetch) */
  fetch?: typeof fetch;
}

export interface RequestOptions extends RequestInit {
  timeoutMs?: number;
  skipAuth?: boolean;
  skipAutoRefresh?: boolean;
}

export class SentinelKeyError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, statusCode: number = 500, code: string = 'ERROR', details?: unknown) {
    super(message);
    this.name = 'SentinelKeyError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, SentinelKeyError.prototype);
  }
}

export interface FileUploadPayload {
  originalName: string;
  mimeType?: string;
  contentBase64?: string;
  buffer?: Uint8Array | ArrayBuffer | Buffer;
}

export interface SdkFileFilterQuery extends IFileFilterQuery {
  keyVersion?: number;
  search?: string;
}

export interface FieldEncryptionResult {
  ciphertext: string;
  version: number;
}

export interface FieldDecryptionResult {
  plaintext: string;
  version: number;
}

export type {
  IAuthResponse,
  ILoginRequest,
  IRegisterRequest,
  IMfaSetupResponse,
  IMfaVerifyRequest,
  IUserProfile,
  IClassifyEventRequest,
  IClassifyFileRequest,
  IClassifyEmailRequest,
  IClassificationResult,
  IPolicy,
  IEncryptedFile,
  IFileFilterQuery,
  IKeyRotationResult,
  ISecurityEvent,
  IAlert,
};
