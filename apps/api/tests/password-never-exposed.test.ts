import { describe, it, expect } from 'vitest';
import { toUserProfile } from '../src/services/auth.service.js';
import type { IUserDocument } from '../src/models/user.model.js';

describe('Auth Service — toUserProfile', () => {
  it('should never expose passwordHash in the returned profile', () => {
    const mockUser = {
      _id: { toString: () => 'user-123' },
      email: 'test@example.com',
      passwordHash: '$2b$12$hashedvalue',
      roles: ['admin' as const],
      refreshTokens: [
        { tokenHash: 'abc123', expiresAt: new Date(), createdAt: new Date() },
      ],
      mfaEnabled: false,
      lastLogin: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as IUserDocument;

    const profile = toUserProfile(mockUser);

    // The critical assertion: password must NEVER appear
    expect(profile).not.toHaveProperty('passwordHash');
    expect(profile).not.toHaveProperty('password');
    expect(JSON.stringify(profile)).not.toContain('hashedvalue');

    // refreshTokens must not leak either
    expect(profile).not.toHaveProperty('refreshTokens');
    expect(JSON.stringify(profile)).not.toContain('abc123');

    // MFA secrets must never leak
    expect(profile).not.toHaveProperty('mfaSecret');
    expect(profile).not.toHaveProperty('mfaPendingSecret');
    expect(profile).not.toHaveProperty('mfaBackupCodes');
    expect(profile).not.toHaveProperty('mfaLastTimeStep');

    // Profile should have expected fields
    expect(profile.id).toBe('user-123');
    expect(profile.email).toBe('test@example.com');
    expect(profile.roles).toEqual(['admin']);
    expect(profile.mfaEnabled).toBe(false);
  });
});
