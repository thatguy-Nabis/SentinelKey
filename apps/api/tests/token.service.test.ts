import { describe, it, expect, beforeEach } from 'vitest';
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  signMfaToken,
  verifyMfaToken,
  hashToken,
  parseExpiryToMs,
} from '../src/services/token.service.js';

describe('Token Service', () => {
  const samplePayload = {
    sub: '507f1f77bcf86cd799439011',
    email: 'test@example.com',
    roles: ['admin' as const],
    permissions: ['users:read' as const, 'logs:read' as const],
  };

  describe('signAccessToken / verifyAccessToken', () => {
    it('should sign and verify an access token', () => {
      const token = signAccessToken(samplePayload);
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');

      const decoded = verifyAccessToken(token);
      expect(decoded.sub).toBe(samplePayload.sub);
      expect(decoded.email).toBe(samplePayload.email);
      expect(decoded.roles).toEqual(samplePayload.roles);
      expect(decoded.type).toBe('access');
    });

    it('should reject a refresh token passed to verifyAccessToken', () => {
      const { token } = signRefreshToken('507f1f77bcf86cd799439011');
      expect(() => verifyAccessToken(token)).toThrow();
    });
  });

  describe('signRefreshToken / verifyRefreshToken', () => {
    it('should sign and verify a refresh token with a JTI', () => {
      const { token, jti } = signRefreshToken('507f1f77bcf86cd799439011');
      expect(token).toBeTruthy();
      expect(jti).toBeTruthy();

      const decoded = verifyRefreshToken(token);
      expect(decoded.sub).toBe('507f1f77bcf86cd799439011');
      expect(decoded.type).toBe('refresh');
      expect(decoded.jti).toBe(jti);
    });

    it('should reject an access token passed to verifyRefreshToken', () => {
      const token = signAccessToken(samplePayload);
      expect(() => verifyRefreshToken(token)).toThrow();
    });
  });

  describe('hashToken', () => {
    it('should produce a deterministic SHA-256 hash', () => {
      const token = 'test-token-value';
      const hash1 = hashToken(token);
      const hash2 = hashToken(token);
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 hex
    });

    it('should produce different hashes for different tokens', () => {
      expect(hashToken('token-a')).not.toBe(hashToken('token-b'));
    });
  });

  describe('parseExpiryToMs', () => {
    it('should parse seconds', () => {
      expect(parseExpiryToMs('30s')).toBe(30_000);
    });

    it('should parse minutes', () => {
      expect(parseExpiryToMs('15m')).toBe(900_000);
    });

    it('should parse hours', () => {
      expect(parseExpiryToMs('2h')).toBe(7_200_000);
    });

    it('should parse days', () => {
      expect(parseExpiryToMs('7d')).toBe(604_800_000);
    });

    it('should throw on invalid format', () => {
      expect(() => parseExpiryToMs('invalid')).toThrow();
    });
  });

  describe('MFA challenge tokens', () => {
    it('signs and verifies an MFA pending token', () => {
      const token = signMfaToken('user-mfa-123');
      const payload = verifyMfaToken(token);

      expect(payload.sub).toBe('user-mfa-123');
      expect(payload.type).toBe('mfa_pending');
    });

    it('rejects access token passed to verifyMfaToken', () => {
      const accessToken = signAccessToken({
        sub: 'user-mfa-123',
        email: 'test@example.com',
        roles: ['viewer'],
        permissions: ['logs:read'],
      });

      expect(() => verifyMfaToken(accessToken)).toThrow('Invalid token type for MFA challenge');
    });
  });
});
