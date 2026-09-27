/**
 * SentinelKey Security Stack SDK
 * Typed client for Authentication, MFA, Intrusion Detection, Field/File Encryption, and Compliance.
 */

export { SentinelKeyClient, createSentinelKeyClient } from './client.js';
export { SentinelKeyError } from './types.js';
export type {
  SentinelKeyConfig,
  RequestOptions,
  FileUploadPayload,
  FieldEncryptionResult,
  FieldDecryptionResult,
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
  SdkFileFilterQuery,
  IKeyRotationResult,
  ISecurityEvent,
  IAlert,
} from './types.js';

export const SDK_VERSION = '0.1.0';
