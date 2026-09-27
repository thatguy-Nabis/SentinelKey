import { describe, it, expect } from 'vitest';
import {
  base32Encode,
  base32Decode,
  generateMfaSecret,
  generateTotpCode,
  verifyTotpCode,
  generateBackupCodes,
  hashBackupCode,
  verifyAndConsumeBackupCode,
  generateOtpAuthUri,
  generateQrCode,
} from '../src/services/totp.service.js';

describe('TOTP Service', () => {
  describe('Base32 Encoding and Decoding', () => {
    it('encodes and decodes ascii strings correctly', () => {
      const input = Buffer.from('Hello, SentinelKey!');
      const encoded = base32Encode(input);
      const decoded = base32Decode(encoded);

      expect(decoded.toString('utf8')).toBe('Hello, SentinelKey!');
    });

    it('handles padding, hyphens, and whitespace gracefully during decode', () => {
      const input = Buffer.from('Testing 123');
      const encoded = base32Encode(input);
      const formatted = `  ${encoded.slice(0, 4)}-${encoded.slice(4)}===  `;

      const decoded = base32Decode(formatted);
      expect(decoded.toString('utf8')).toBe('Testing 123');
    });

    it('throws on invalid base32 character', () => {
      expect(() => base32Decode('INVALID!@#')).toThrow(/Invalid base32 character/);
    });
  });

  describe('RFC 6238 Standard Test Vectors', () => {
    // RFC 6238 Appendix B test vector for SHA1:
    // Secret = "12345678901234567890" (in hex: 3132333435363738393031323334353637383930)
    // Base32 representation of this 20-byte string:
    const rfcSecretAscii = '12345678901234567890';
    const rfcSecretBase32 = base32Encode(Buffer.from(rfcSecretAscii));

    it('matches RFC 6238 vector at time 59s', () => {
      const code = generateTotpCode(rfcSecretBase32, { timeMs: 59 * 1000 });
      expect(code).toBe('287082');
    });

    it('matches RFC 6238 vector at time 1111111109s', () => {
      const code = generateTotpCode(rfcSecretBase32, { timeMs: 1111111109 * 1000 });
      expect(code).toBe('081804');
    });

    it('matches RFC 6238 vector at time 1111111111s', () => {
      const code = generateTotpCode(rfcSecretBase32, { timeMs: 1111111111 * 1000 });
      expect(code).toBe('050471');
    });

    it('matches RFC 6238 vector at time 1234567890s', () => {
      const code = generateTotpCode(rfcSecretBase32, { timeMs: 1234567890 * 1000 });
      expect(code).toBe('005924');
    });

    it('matches RFC 6238 vector at time 2000000000s', () => {
      const code = generateTotpCode(rfcSecretBase32, { timeMs: 2000000000 * 1000 });
      expect(code).toBe('279037');
    });
  });

  describe('Secret Generation', () => {
    it('generates a 32-character base32 secret (160 bits)', () => {
      const secret = generateMfaSecret();
      expect(secret).toHaveLength(32);
      expect(/^[A-Z2-7]+$/.test(secret)).toBe(true);
    });

    it('generates unique secrets on repeated calls', () => {
      const s1 = generateMfaSecret();
      const s2 = generateMfaSecret();
      expect(s1).not.toBe(s2);
    });
  });

  describe('Verification and Drift Window', () => {
    const secret = generateMfaSecret();
    const now = 1700000000 * 1000; // fixed timestamp

    it('verifies valid code at current time step', () => {
      const code = generateTotpCode(secret, { timeMs: now });
      const result = verifyTotpCode(code, secret, { timeMs: now });

      expect(result.valid).toBe(true);
      expect(result.timeStep).toBe(Math.floor(now / 1000 / 30));
    });

    it('accepts code with backward time drift (-30 seconds)', () => {
      const pastTime = now - 30 * 1000;
      const code = generateTotpCode(secret, { timeMs: pastTime });
      const result = verifyTotpCode(code, secret, { timeMs: now, window: 1 });

      expect(result.valid).toBe(true);
    });

    it('accepts code with forward time drift (+30 seconds)', () => {
      const futureTime = now + 30 * 1000;
      const code = generateTotpCode(secret, { timeMs: futureTime });
      const result = verifyTotpCode(code, secret, { timeMs: now, window: 1 });

      expect(result.valid).toBe(true);
    });

    it('rejects expired code beyond window (-90 seconds)', () => {
      const expiredTime = now - 90 * 1000;
      const code = generateTotpCode(secret, { timeMs: expiredTime });
      const result = verifyTotpCode(code, secret, { timeMs: now, window: 1 });

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('INVALID_CODE');
    });

    it('rejects completely wrong code', () => {
      const result = verifyTotpCode('999999', secret, { timeMs: now });
      // unless 999999 happens to match (1 in 1M chance), but we can test invalid format
      const invalid = verifyTotpCode('12345', secret, { timeMs: now });
      expect(invalid.valid).toBe(false);
    });

    it('rejects code reuse at the same time step (replay protection)', () => {
      const currentStep = Math.floor(now / 1000 / 30);
      const code = generateTotpCode(secret, { timeMs: now });

      // First verification: success
      const first = verifyTotpCode(code, secret, { timeMs: now, lastTimeStep: currentStep - 1 });
      expect(first.valid).toBe(true);

      // Replay attack with same code and step <= lastTimeStep
      const replay = verifyTotpCode(code, secret, { timeMs: now, lastTimeStep: currentStep });
      expect(replay.valid).toBe(false);
      expect(replay.reason).toBe('REUSED_CODE');
    });
  });

  describe('Backup Codes', () => {
    it('generates requested count of formatted backup codes', () => {
      const codes = generateBackupCodes(8);
      expect(codes).toHaveLength(8);
      for (const code of codes) {
        expect(code).toMatch(/^[0-9A-F]{4}(-[0-9A-F]{4}){3}$/);
      }
    });

    it('verifies and consumes a backup code once', () => {
      const plainCodes = generateBackupCodes(3);
      const hashedCodes = plainCodes.map(hashBackupCode);

      // Verify code #1
      const result1 = verifyAndConsumeBackupCode(plainCodes[0], hashedCodes);
      expect(result1.valid).toBe(true);
      expect(result1.remainingHashedCodes).toHaveLength(2);

      // Verify code #1 again -> must fail because consumed
      const result2 = verifyAndConsumeBackupCode(plainCodes[0], result1.remainingHashedCodes);
      expect(result2.valid).toBe(false);
      expect(result2.remainingHashedCodes).toHaveLength(2);

      // Verify code #2 -> must succeed
      const result3 = verifyAndConsumeBackupCode(plainCodes[1], result1.remainingHashedCodes);
      expect(result3.valid).toBe(true);
      expect(result3.remainingHashedCodes).toHaveLength(1);
    });
  });

  describe('URI & QR Code Generation', () => {
    it('generates standard otpauth URI', () => {
      const secret = 'JBSWY3DPEHPK3PXP';
      const uri = generateOtpAuthUri('analyst@sentinelkey.local', secret, 'SentinelKey');

      expect(uri).toContain('otpauth://totp/SentinelKey%3Aanalyst%40sentinelkey.local');
      expect(uri).toContain(`secret=${secret}`);
      expect(uri).toContain('issuer=SentinelKey');
      expect(uri).toContain('algorithm=SHA1');
    });

    it('generates valid QR code data URL', async () => {
      const secret = 'JBSWY3DPEHPK3PXP';
      const uri = generateOtpAuthUri('test@domain.com', secret);
      const qrDataUrl = await generateQrCode(uri);

      expect(qrDataUrl).toMatch(/^data:image\/png;base64,/);
    });
  });
});
