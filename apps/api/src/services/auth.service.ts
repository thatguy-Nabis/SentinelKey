import bcrypt from 'bcrypt';
import { User, type IUserDocument } from '../models/user.model.js';
import { Role } from '../models/role.model.js';
import type {
  IUserProfile,
  IAuthResponse,
  IMfaSetupResponse,
  Permission,
  IGeoLocation,
} from '@sentinelkey/shared-types';
import {
  signAccessToken,
  signRefreshToken,
  signMfaToken,
  verifyMfaToken,
  hashToken,
  parseExpiryToMs,
} from './token.service.js';
import { encrypt, decrypt } from './crypto.service.js';
import {
  generateMfaSecret,
  verifyTotpCode,
  generateBackupCodes,
  hashBackupCode,
  verifyAndConsumeBackupCode,
  generateOtpAuthUri,
  generateQrCode,
} from './totp.service.js';
import { emitSecurityEvent } from './event-logger.service.js';
import { env } from '../config/env.js';

const SALT_ROUNDS = 12;

export interface IAuthRequestContext {
  ip?: string;
  userAgent?: string;
  location?: IGeoLocation;
}

/**
 * Convert a user document to a safe profile (no sensitive fields).
 */
export function toUserProfile(user: IUserDocument): IUserProfile {
  return {
    id: user._id.toString(),
    email: user.email,
    roles: user.roles,
    mfaEnabled: user.mfaEnabled,
    lastLogin: user.lastLogin?.toISOString(),
    createdAt: user.createdAt.toISOString(),
  };
}

/**
 * Resolve all permissions for a list of role names by querying the Role collection.
 */
async function resolvePermissions(roleNames: string[]): Promise<Permission[]> {
  const roles = await Role.find({ name: { $in: roleNames } });
  const permsSet = new Set<Permission>();
  for (const role of roles) {
    for (const perm of role.permissions) {
      permsSet.add(perm);
    }
  }
  return Array.from(permsSet);
}

/**
 * Issue a fresh access + refresh token pair and store the refresh hash on the user.
 */
async function issueTokenPair(user: IUserDocument): Promise<{ accessToken: string; refreshToken: string }> {
  const permissions = await resolvePermissions(user.roles);
  const accessToken = signAccessToken({
    sub: user._id.toString(),
    email: user.email,
    roles: user.roles,
    permissions,
  });

  const { token: refreshToken } = signRefreshToken(user._id.toString());
  const tokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + parseExpiryToMs(env.JWT_REFRESH_EXPIRES_IN));

  // Store hashed refresh token on the user. Cap the stored list so it cannot
  // grow without bound ($slice keeps only the most recent 20 tokens).
  await User.updateOne(
    { _id: user._id },
    {
      $push: {
        refreshTokens: {
          $each: [{ tokenHash, expiresAt, createdAt: new Date() }],
          $slice: -20,
        },
      },
    },
  );

  return { accessToken, refreshToken };
}

/**
 * Register a new user.
 * The first user in the system is automatically assigned the admin role.
 */
export async function register(email: string, password: string): Promise<IAuthResponse> {
  // Check for existing user
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw Object.assign(new Error('Email already registered'), { statusCode: 409 });
  }

  // Validate password strength
  if (password.length < 8) {
    throw Object.assign(new Error('Password must be at least 8 characters'), { statusCode: 400 });
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // First user gets admin role, subsequent users get viewer.
  // If a bootstrap admin is configured (seeded at startup), self-registration
  // never grants admin — closing the fresh-deployment admin-claim hole.
  const userCount = await User.countDocuments();
  const roles = userCount === 0 && !env.BOOTSTRAP_ADMIN_EMAIL
    ? ['admin' as const]
    : ['viewer' as const];

  const user = await User.create({
    email: email.toLowerCase(),
    passwordHash,
    roles,
  });

  const { accessToken, refreshToken } = await issueTokenPair(user);

  return {
    mfaRequired: false,
    user: toUserProfile(user),
    accessToken,
    refreshToken,
  };
}

/**
 * Authenticate a user with email + password.
 * If MFA is enabled, returns { mfaRequired: true, mfaToken }.
 * Otherwise returns full token pair.
 */
export async function login(
  email: string,
  password: string,
  context?: IAuthRequestContext,
): Promise<IAuthResponse> {
  const ip = context?.ip ?? 'unknown';

  // Select password hash explicitly (excluded by default)
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  if (!user) {
    emitSecurityEvent({
      type: 'AUTH_LOGIN_FAILED',
      ip,
      severity: 'medium',
      metadata: { email: email.toLowerCase(), userAgent: context?.userAgent },
    }).catch(() => {});
    throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    emitSecurityEvent({
      type: 'AUTH_LOGIN_FAILED',
      ip,
      severity: 'medium',
      metadata: { email: email.toLowerCase(), userAgent: context?.userAgent },
    }).catch(() => {});
    throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });
  }

  // If MFA is enabled, challenge user with temporary MFA token
  if (user.mfaEnabled) {
    const mfaToken = signMfaToken(user._id.toString());
    return {
      mfaRequired: true,
      mfaToken,
    };
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  emitSecurityEvent({
    type: 'AUTH_LOGIN_SUCCESS',
    ip,
    userId: user._id.toString(),
    severity: 'info',
    metadata: {
      email: user.email,
      userAgent: context?.userAgent,
      location: context?.location,
    },
  }).catch(() => {});

  const { accessToken, refreshToken } = await issueTokenPair(user);

  return {
    mfaRequired: false,
    user: toUserProfile(user),
    accessToken,
    refreshToken,
  };
}

/**
 * Initiate MFA setup for an authenticated user.
 * Generates a new TOTP secret, backup codes, URI, and QR code data URL.
 * Stores encrypted pending secret on the user until confirmed.
 */
export async function setupMfa(userId: string): Promise<IMfaSetupResponse> {
  const user = await User.findById(userId);
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  if (user.mfaEnabled) {
    throw Object.assign(
      new Error('MFA is already enabled. Disable it first to reconfigure.'),
      { statusCode: 400 },
    );
  }

  const secret = generateMfaSecret();
  const plainBackupCodes = generateBackupCodes(8);
  const hashedBackupCodes = plainBackupCodes.map(hashBackupCode);

  const encryptedSecret = encrypt(secret);

  user.mfaPendingSecret = encryptedSecret;
  user.mfaBackupCodes = hashedBackupCodes;
  await user.save();

  const uri = generateOtpAuthUri(user.email, secret);
  const qrCode = await generateQrCode(uri);

  return {
    secret,
    uri,
    qrCode,
    backupCodes: plainBackupCodes,
  };
}

/**
 * Verify initial MFA setup with code from authenticator app.
 * Activates MFA on success.
 */
export async function verifyMfaSetup(userId: string, code: string): Promise<{ message: string }> {
  const user = await User.findById(userId).select('+mfaPendingSecret');
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  if (!user.mfaPendingSecret) {
    throw Object.assign(
      new Error('No pending MFA setup found. Please start MFA setup first.'),
      { statusCode: 400 },
    );
  }

  const secret = decrypt(user.mfaPendingSecret);
  const result = verifyTotpCode(code, secret);

  if (!result.valid) {
    throw Object.assign(new Error('Invalid MFA verification code'), { statusCode: 400 });
  }

  user.mfaSecret = user.mfaPendingSecret;
  user.mfaPendingSecret = undefined;
  user.mfaEnabled = true;
  user.mfaFailedAttempts = 0;
  user.mfaLockedUntil = null;
  user.mfaLastTimeStep = result.timeStep;
  await user.save();

  return { message: 'MFA enabled successfully' };
}

/**
 * Verify MFA challenge during login (using mfaToken + 6-digit TOTP or backup code).
 * Enforces attempt limits with backoff lockout and time-step replay rejection.
 */
export async function verifyMfaLogin(
  mfaToken: string,
  code: string,
  context?: IAuthRequestContext,
): Promise<IAuthResponse> {
  const ip = context?.ip ?? 'unknown';
  const payload = verifyMfaToken(mfaToken);
  const user = await User.findById(payload.sub).select(
    '+mfaSecret +mfaBackupCodes +refreshTokens',
  );

  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 401 });
  }

  if (!user.mfaEnabled || !user.mfaSecret) {
    throw Object.assign(new Error('MFA is not enabled for this user'), { statusCode: 400 });
  }

  // 1. Check if user is currently locked out
  if (user.mfaLockedUntil && user.mfaLockedUntil > new Date()) {
    const remainingSeconds = Math.ceil((user.mfaLockedUntil.getTime() - Date.now()) / 1000);
    throw Object.assign(
      new Error(
        `MFA verification temporarily locked due to too many failed attempts. Try again in ${remainingSeconds} seconds.`,
      ),
      { statusCode: 423 },
    );
  }

  // 2. Try TOTP code verification
  const secret = decrypt(user.mfaSecret);
  const totpResult = verifyTotpCode(code, secret, {
    lastTimeStep: user.mfaLastTimeStep,
  });

  if (totpResult.valid) {
    // Successful TOTP verification
    user.mfaFailedAttempts = 0;
    user.mfaLockedUntil = null;
    user.mfaLastTimeStep = totpResult.timeStep;
    user.lastLogin = new Date();
    await user.save();

    emitSecurityEvent({
      type: 'MFA_LOGIN_SUCCESS',
      ip,
      userId: user._id.toString(),
      severity: 'info',
      metadata: {
        email: user.email,
        location: context?.location,
        userAgent: context?.userAgent,
      },
    }).catch(() => {});

    const { accessToken, refreshToken } = await issueTokenPair(user);
    return {
      mfaRequired: false,
      user: toUserProfile(user),
      accessToken,
      refreshToken,
    };
  }

  if (totpResult.reason === 'REUSED_CODE') {
    // Replay attempt detected
    user.mfaFailedAttempts = (user.mfaFailedAttempts || 0) + 1;
    await user.save();

    emitSecurityEvent({
      type: 'MFA_LOGIN_FAILED',
      ip,
      userId: user._id.toString(),
      severity: 'medium',
      metadata: { email: user.email, reason: 'REUSED_CODE' },
    }).catch(() => {});

    throw Object.assign(
      new Error('MFA code has already been used. Please wait for the next 30-second code.'),
      { statusCode: 401 },
    );
  }

  // 3. Try backup code verification if TOTP was not valid
  const backupResult = verifyAndConsumeBackupCode(code, user.mfaBackupCodes || []);
  if (backupResult.valid) {
    user.mfaBackupCodes = backupResult.remainingHashedCodes;
    user.mfaFailedAttempts = 0;
    user.mfaLockedUntil = null;
    user.lastLogin = new Date();
    await user.save();

    emitSecurityEvent({
      type: 'MFA_LOGIN_SUCCESS',
      ip,
      userId: user._id.toString(),
      severity: 'info',
      metadata: {
        email: user.email,
        method: 'BACKUP_CODE',
        location: context?.location,
        userAgent: context?.userAgent,
      },
    }).catch(() => {});

    const { accessToken, refreshToken } = await issueTokenPair(user);
    return {
      mfaRequired: false,
      user: toUserProfile(user),
      accessToken,
      refreshToken,
    };
  }

  // 4. Verification failed — increment failed attempts and check lockout threshold
  user.mfaFailedAttempts = (user.mfaFailedAttempts || 0) + 1;

  if (user.mfaFailedAttempts >= env.MFA_MAX_FAILED_ATTEMPTS) {
    // Progressive backoff: base lockout * 2^(excess attempts, max 16x)
    const excess = user.mfaFailedAttempts - env.MFA_MAX_FAILED_ATTEMPTS;
    const multiplier = Math.pow(2, Math.min(excess, 4));
    const lockoutDurationMs = env.MFA_LOCKOUT_DURATION_MS * multiplier;

    user.mfaLockedUntil = new Date(Date.now() + lockoutDurationMs);
    console.warn(
      `[SECURITY] MFA lockout triggered for user ${user.email} (${user._id}) for ${lockoutDurationMs / 1000}s`,
    );

    emitSecurityEvent({
      type: 'MFA_LOCKOUT',
      ip,
      userId: user._id.toString(),
      severity: 'high',
      metadata: {
        email: user.email,
        failedAttempts: user.mfaFailedAttempts,
        lockoutDurationSeconds: Math.ceil(lockoutDurationMs / 1000),
      },
    }).catch(() => {});

    await user.save();

    throw Object.assign(
      new Error(
        `Too many failed MFA attempts. MFA verification locked for ${Math.ceil(lockoutDurationMs / 1000)} seconds.`,
      ),
      { statusCode: 423 },
    );
  }

  const remaining = env.MFA_MAX_FAILED_ATTEMPTS - user.mfaFailedAttempts;

  emitSecurityEvent({
    type: 'MFA_LOGIN_FAILED',
    ip,
    userId: user._id.toString(),
    severity: 'medium',
    metadata: {
      email: user.email,
      remainingAttempts: remaining,
      failedAttempts: user.mfaFailedAttempts,
    },
  }).catch(() => {});

  await user.save();

  throw Object.assign(
    new Error(`Invalid MFA verification code. ${remaining} attempts remaining before lockout.`),
    { statusCode: 401 },
  );
}

/**
 * Disable MFA for an authenticated user.
 * Requires verifying the user's password.
 */
export async function disableMfa(
  userId: string,
  password: string,
  code?: string,
  context?: IAuthRequestContext,
): Promise<{ message: string }> {
  const ip = context?.ip ?? 'unknown';
  const user = await User.findById(userId).select('+passwordHash +mfaSecret');
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  if (!user.mfaEnabled) {
    throw Object.assign(new Error('MFA is not enabled'), { statusCode: 400 });
  }

  const validPassword = await bcrypt.compare(password, user.passwordHash);
  if (!validPassword) {
    throw Object.assign(new Error('Invalid password'), { statusCode: 401 });
  }

  if (code && user.mfaSecret) {
    const secret = decrypt(user.mfaSecret);
    const result = verifyTotpCode(code, secret);
    if (!result.valid) {
      throw Object.assign(new Error('Invalid MFA verification code'), { statusCode: 401 });
    }
  }

  user.mfaEnabled = false;
  user.mfaSecret = undefined;
  user.mfaPendingSecret = undefined;
  user.mfaBackupCodes = [];
  user.mfaFailedAttempts = 0;
  user.mfaLockedUntil = null;
  user.mfaLastTimeStep = undefined;
  await user.save();

  emitSecurityEvent({
    type: 'MFA_DISABLED',
    ip,
    userId: user._id.toString(),
    severity: 'low',
    metadata: { email: user.email },
  }).catch(() => {});

  return { message: 'MFA disabled successfully' };
}

/**
 * Rotate a refresh token.
 * - Validates the old refresh token
 * - Deletes its hash from the user's stored tokens
 * - Issues a new token pair
 * - If the old hash is not found (reuse detected), invalidates ALL refresh tokens
 */
export async function refresh(
  oldRefreshToken: string,
  context?: IAuthRequestContext,
): Promise<IAuthResponse> {
  const ip = context?.ip ?? 'unknown';

  // Verify token signature and expiry
  const { verifyRefreshToken } = await import('./token.service.js');
  const payload = verifyRefreshToken(oldRefreshToken);
  const oldHash = hashToken(oldRefreshToken);

  // Atomically rotate: only succeed if this exact hash is still present.
  // findOneAndUpdate avoids the read-modify-write race where two concurrent
  // refreshes of the same token both pass the reuse check.
  const rotated = await User.findOneAndUpdate(
    { _id: payload.sub, 'refreshTokens.tokenHash': oldHash },
    { $pull: { refreshTokens: { tokenHash: oldHash } } },
    { new: true, select: '+refreshTokens' },
  );

  if (!rotated) {
    const userExists = await User.exists({ _id: payload.sub });
    if (!userExists) {
      throw Object.assign(new Error('User not found'), { statusCode: 401 });
    }

    // REUSE DETECTED: This token was already consumed.
    // Security escalation: invalidate ALL refresh tokens for this user.
    console.warn(`[SECURITY] Refresh token reuse detected for user ${payload.sub}`);
    await User.updateOne({ _id: payload.sub }, { $set: { refreshTokens: [] } });

    emitSecurityEvent({
      type: 'AUTH_TOKEN_REUSE',
      ip,
      userId: payload.sub,
      severity: 'critical',
    }).catch(() => {});

    throw Object.assign(
      new Error('Refresh token reuse detected — all sessions invalidated'),
      { statusCode: 401 },
    );
  }

  // Clean up expired tokens while we're here
  await User.updateOne(
    { _id: payload.sub },
    { $pull: { refreshTokens: { expiresAt: { $lte: new Date() } } } },
  );

  // Issue fresh pair
  const { accessToken, refreshToken } = await issueTokenPair(rotated);

  return {
    user: toUserProfile(rotated),
    accessToken,
    refreshToken,
  };
}

/**
 * Logout: remove a specific refresh token hash.
 */
export async function logout(userId: string, refreshToken: string): Promise<void> {
  const tokenHash = hashToken(refreshToken);
  await User.updateOne(
    { _id: userId },
    { $pull: { refreshTokens: { tokenHash } } },
  );
}

/**
 * Get the current user's profile.
 */
export async function getMe(userId: string): Promise<IUserProfile> {
  const user = await User.findById(userId);
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }
  return toUserProfile(user);
}
