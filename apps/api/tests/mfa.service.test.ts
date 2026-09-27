import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcrypt';
import { User, type IUserDocument } from '../src/models/user.model.js';
import { Role } from '../src/models/role.model.js';
import {
  login,
  setupMfa,
  verifyMfaSetup,
  verifyMfaLogin,
  disableMfa,
} from '../src/services/auth.service.js';
import { signMfaToken } from '../src/services/token.service.js';
import { encrypt } from '../src/services/crypto.service.js';
import {
  generateMfaSecret,
  generateTotpCode,
  generateBackupCodes,
  hashBackupCode,
} from '../src/services/totp.service.js';

describe('MFA Service Integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('login() with MFA branching', () => {
    it('returns tokens directly when mfaEnabled is false', async () => {
      const passwordHash = await bcrypt.hash('validPassword123', 10);
      const mockUser = {
        _id: { toString: () => 'user-mfa-off' },
        email: 'user@example.com',
        roles: ['viewer' as const],
        passwordHash,
        mfaEnabled: false,
        lastLogin: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
        save: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(User, 'findOne').mockReturnValue({
        select: vi.fn().mockResolvedValue(mockUser),
      } as any);

      vi.spyOn(Role, 'find').mockResolvedValue([
        { name: 'viewer', permissions: ['logs:read'] },
      ] as any);

      vi.spyOn(User, 'updateOne').mockResolvedValue({} as any);

      const res = await login('user@example.com', 'validPassword123');

      expect(res.mfaRequired).toBe(false);
      expect(res.accessToken).toBeDefined();
      expect(res.refreshToken).toBeDefined();
      expect(res.user?.email).toBe('user@example.com');
      expect(res.mfaToken).toBeUndefined();
    });

    it('returns mfaRequired and mfaToken (no tokens) when mfaEnabled is true', async () => {
      const passwordHash = await bcrypt.hash('validPassword123', 10);
      const mockUser = {
        _id: { toString: () => 'user-mfa-on' },
        email: 'mfa-user@example.com',
        roles: ['admin' as const],
        passwordHash,
        mfaEnabled: true,
        save: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(User, 'findOne').mockReturnValue({
        select: vi.fn().mockResolvedValue(mockUser),
      } as any);

      const res = await login('mfa-user@example.com', 'validPassword123');

      expect(res.mfaRequired).toBe(true);
      expect(res.mfaToken).toBeDefined();
      expect(res.accessToken).toBeUndefined();
      expect(res.refreshToken).toBeUndefined();
    });
  });

  describe('setupMfa()', () => {
    it('generates secret, backup codes, URI, and QR data URL for user', async () => {
      const mockUser = {
        _id: 'user-setup-1',
        email: 'analyst@sentinelkey.local',
        mfaEnabled: false,
        mfaPendingSecret: undefined,
        mfaBackupCodes: [] as string[],
        save: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(User, 'findById').mockResolvedValue(mockUser as any);

      const setupRes = await setupMfa('user-setup-1');

      expect(setupRes.secret).toHaveLength(32);
      expect(setupRes.backupCodes).toHaveLength(8);
      expect(setupRes.uri).toContain('otpauth://totp/');
      expect(setupRes.qrCode).toMatch(/^data:image\/png;base64,/);

      expect(mockUser.save).toHaveBeenCalled();
      expect(mockUser.mfaPendingSecret).toBeDefined();
      expect(mockUser.mfaBackupCodes).toHaveLength(8);
    });

    it('rejects setup if MFA is already enabled', async () => {
      const mockUser = {
        _id: 'user-setup-2',
        email: 'already-enabled@sentinelkey.local',
        mfaEnabled: true,
      };

      vi.spyOn(User, 'findById').mockResolvedValue(mockUser as any);

      await expect(setupMfa('user-setup-2')).rejects.toThrow(
        /MFA is already enabled/
      );
    });
  });

  describe('verifyMfaSetup()', () => {
    it('activates MFA with valid code against pending secret', async () => {
      const plainSecret = generateMfaSecret();
      const encryptedSecret = encrypt(plainSecret);
      const code = generateTotpCode(plainSecret);

      const mockUser = {
        _id: 'user-confirm-1',
        mfaEnabled: false,
        mfaPendingSecret: encryptedSecret,
        mfaSecret: undefined,
        mfaFailedAttempts: 3,
        mfaLockedUntil: new Date(),
        mfaLastTimeStep: undefined,
        save: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(User, 'findById').mockReturnValue({
        select: vi.fn().mockResolvedValue(mockUser),
      } as any);

      const res = await verifyMfaSetup('user-confirm-1', code);

      expect(res.message).toBe('MFA enabled successfully');
      expect(mockUser.mfaEnabled).toBe(true);
      expect(mockUser.mfaSecret).toBe(encryptedSecret);
      expect(mockUser.mfaPendingSecret).toBeUndefined();
      expect(mockUser.mfaFailedAttempts).toBe(0);
      expect(mockUser.mfaLockedUntil).toBeNull();
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('rejects setup verification with invalid TOTP code', async () => {
      const plainSecret = generateMfaSecret();
      const encryptedSecret = encrypt(plainSecret);

      const mockUser = {
        _id: 'user-confirm-2',
        mfaEnabled: false,
        mfaPendingSecret: encryptedSecret,
        save: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(User, 'findById').mockReturnValue({
        select: vi.fn().mockResolvedValue(mockUser),
      } as any);

      await expect(verifyMfaSetup('user-confirm-2', '000000')).rejects.toThrow(
        /Invalid MFA verification code/
      );
      expect(mockUser.mfaEnabled).toBe(false);
    });
  });

  describe('verifyMfaLogin()', () => {
    it('verifies TOTP code and returns token pair', async () => {
      const plainSecret = generateMfaSecret();
      const encryptedSecret = encrypt(plainSecret);
      const code = generateTotpCode(plainSecret);
      const mfaToken = signMfaToken('user-login-1');

      const mockUser = {
        _id: { toString: () => 'user-login-1' },
        email: 'user-login-1@example.com',
        roles: ['admin' as const],
        mfaEnabled: true,
        mfaSecret: encryptedSecret,
        mfaBackupCodes: [] as string[],
        mfaFailedAttempts: 2,
        mfaLockedUntil: null,
        mfaLastTimeStep: undefined,
        lastLogin: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
        save: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(User, 'findById').mockReturnValue({
        select: vi.fn().mockResolvedValue(mockUser),
      } as any);

      vi.spyOn(Role, 'find').mockResolvedValue([
        { name: 'admin', permissions: ['users:read', 'users:manage'] },
      ] as any);

      vi.spyOn(User, 'updateOne').mockResolvedValue({} as any);

      const res = await verifyMfaLogin(mfaToken, code);

      expect(res.mfaRequired).toBe(false);
      expect(res.accessToken).toBeDefined();
      expect(res.refreshToken).toBeDefined();
      expect(mockUser.mfaFailedAttempts).toBe(0);
      expect(mockUser.mfaLockedUntil).toBeNull();
      expect(mockUser.mfaLastTimeStep).toBeDefined();
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('rejects reused TOTP code (replay protection)', async () => {
      const plainSecret = generateMfaSecret();
      const encryptedSecret = encrypt(plainSecret);
      const now = Date.now();
      const timeStep = Math.floor(now / 1000 / 30);
      const code = generateTotpCode(plainSecret, { timeMs: now });
      const mfaToken = signMfaToken('user-login-replay');

      const mockUser = {
        _id: { toString: () => 'user-login-replay' },
        email: 'replay@example.com',
        roles: ['viewer' as const],
        mfaEnabled: true,
        mfaSecret: encryptedSecret,
        mfaBackupCodes: [] as string[],
        mfaFailedAttempts: 0,
        mfaLockedUntil: null,
        mfaLastTimeStep: timeStep, // already verified for this time step!
        save: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(User, 'findById').mockReturnValue({
        select: vi.fn().mockResolvedValue(mockUser),
      } as any);

      await expect(verifyMfaLogin(mfaToken, code)).rejects.toThrow(
        /MFA code has already been used/
      );
      expect(mockUser.mfaFailedAttempts).toBe(1);
    });

    it('verifies and consumes a backup recovery code', async () => {
      const plainSecret = generateMfaSecret();
      const encryptedSecret = encrypt(plainSecret);
      const backupCodes = generateBackupCodes(3);
      const hashedBackupCodes = backupCodes.map(hashBackupCode);
      const mfaToken = signMfaToken('user-backup-code');

      const mockUser = {
        _id: { toString: () => 'user-backup-code' },
        email: 'backup@example.com',
        roles: ['viewer' as const],
        mfaEnabled: true,
        mfaSecret: encryptedSecret,
        mfaBackupCodes: [...hashedBackupCodes],
        mfaFailedAttempts: 1,
        mfaLockedUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        save: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(User, 'findById').mockReturnValue({
        select: vi.fn().mockResolvedValue(mockUser),
      } as any);

      vi.spyOn(Role, 'find').mockResolvedValue([{ name: 'viewer', permissions: [] }] as any);
      vi.spyOn(User, 'updateOne').mockResolvedValue({} as any);

      // Verify with the first backup code
      const res = await verifyMfaLogin(mfaToken, backupCodes[0]);

      expect(res.accessToken).toBeDefined();
      expect(mockUser.mfaBackupCodes).toHaveLength(2); // One consumed!
      expect(mockUser.mfaFailedAttempts).toBe(0);
    });

    it('locks out user after reaching maximum failed attempts', async () => {
      const plainSecret = generateMfaSecret();
      const encryptedSecret = encrypt(plainSecret);
      const mfaToken = signMfaToken('user-lockout');

      const mockUser = {
        _id: { toString: () => 'user-lockout' },
        email: 'lockout@example.com',
        roles: ['viewer' as const],
        mfaEnabled: true,
        mfaSecret: encryptedSecret,
        mfaBackupCodes: [] as string[],
        mfaFailedAttempts: 4, // 1 away from default threshold of 5
        mfaLockedUntil: null,
        save: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(User, 'findById').mockReturnValue({
        select: vi.fn().mockResolvedValue(mockUser),
      } as any);

      // 5th attempt fails: triggers lockout!
      await expect(verifyMfaLogin(mfaToken, '999999')).rejects.toThrow(
        /Too many failed MFA attempts. MFA verification locked/
      );

      expect(mockUser.mfaFailedAttempts).toBe(5);
      expect(mockUser.mfaLockedUntil).toBeInstanceOf(Date);
      expect(mockUser.mfaLockedUntil!.getTime()).toBeGreaterThan(Date.now());
    });

    it('rejects verification if user is currently locked out', async () => {
      const plainSecret = generateMfaSecret();
      const encryptedSecret = encrypt(plainSecret);
      const mfaToken = signMfaToken('user-already-locked');

      const mockUser = {
        _id: { toString: () => 'user-already-locked' },
        email: 'locked@example.com',
        roles: ['viewer' as const],
        mfaEnabled: true,
        mfaSecret: encryptedSecret,
        mfaBackupCodes: [] as string[],
        mfaFailedAttempts: 5,
        mfaLockedUntil: new Date(Date.now() + 60000), // locked for 60s
        save: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(User, 'findById').mockReturnValue({
        select: vi.fn().mockResolvedValue(mockUser),
      } as any);

      await expect(verifyMfaLogin(mfaToken, '123456')).rejects.toThrow(
        /MFA verification temporarily locked/
      );
    });
  });

  describe('disableMfa()', () => {
    it('disables MFA when valid password is provided', async () => {
      const passwordHash = await bcrypt.hash('validPass123', 10);
      const mockUser = {
        _id: 'user-disable-1',
        passwordHash,
        mfaEnabled: true,
        mfaSecret: 'encrypted-secret',
        mfaPendingSecret: 'pending',
        mfaBackupCodes: ['hash1'],
        mfaFailedAttempts: 2,
        mfaLockedUntil: new Date(),
        mfaLastTimeStep: 12345,
        save: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(User, 'findById').mockReturnValue({
        select: vi.fn().mockResolvedValue(mockUser),
      } as any);

      const res = await disableMfa('user-disable-1', 'validPass123');

      expect(res.message).toBe('MFA disabled successfully');
      expect(mockUser.mfaEnabled).toBe(false);
      expect(mockUser.mfaSecret).toBeUndefined();
      expect(mockUser.mfaPendingSecret).toBeUndefined();
      expect(mockUser.mfaBackupCodes).toEqual([]);
      expect(mockUser.mfaFailedAttempts).toBe(0);
      expect(mockUser.mfaLockedUntil).toBeNull();
      expect(mockUser.mfaLastTimeStep).toBeUndefined();
    });

    it('rejects disable when password is wrong', async () => {
      const passwordHash = await bcrypt.hash('correctPassword', 10);
      const mockUser = {
        _id: 'user-disable-2',
        passwordHash,
        mfaEnabled: true,
      };

      vi.spyOn(User, 'findById').mockReturnValue({
        select: vi.fn().mockResolvedValue(mockUser),
      } as any);

      await expect(disableMfa('user-disable-2', 'wrongPassword')).rejects.toThrow(
        /Invalid password/
      );
    });
  });
});
