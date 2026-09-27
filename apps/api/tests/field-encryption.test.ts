import { describe, it, expect, beforeEach } from 'vitest';
import { FieldEncryptionService } from '../src/services/field-encryption.service.js';
import { keyManager } from '../src/services/key-manager.service.js';

describe('FieldEncryptionService', () => {
  let service: FieldEncryptionService;

  beforeEach(() => {
    service = new FieldEncryptionService();
  });

  it('encrypts plaintext into the enc:v{version}:{iv}:{tag}:{ciphertext} format', () => {
    const plaintext = 'Confidential Patient SSN: 000-12-3456';
    const encrypted = service.encrypt(plaintext);

    expect(service.isEncrypted(encrypted)).toBe(true);
    expect(encrypted.startsWith('enc:v1:')).toBe(true);

    const parts = encrypted.split(':');
    expect(parts.length).toBe(5);
    expect(parts[2].length).toBe(24); // 12-byte IV in hex
    expect(parts[3].length).toBe(32); // 16-byte tag in hex

    // Raw plaintext must not appear anywhere in the ciphertext
    expect(encrypted).not.toContain(plaintext);
    expect(encrypted).not.toContain('Patient');
  });

  it('decrypts encrypted string back to identical plaintext', () => {
    const secret = 'Database Connection String with Password!@#123';
    const encrypted = service.encrypt(secret);
    const decrypted = service.decrypt(encrypted);

    expect(decrypted).toBe(secret);
  });

  it('encrypts and decrypts structured JSON objects', () => {
    const payload = {
      accountId: 'acc_8849204',
      taxId: 'US-99182371',
      creditScore: 780,
      notes: ['Confidential', 'Verified'],
    };

    const encrypted = service.encrypt(payload);
    const decrypted = service.decryptJson<typeof payload>(encrypted);

    expect(decrypted).toEqual(payload);
  });

  it('detects tampering with ciphertext or authentication tag', () => {
    const encrypted = service.encrypt('Sensitive Bank Account Balance');
    const parts = encrypted.split(':');

    // Tamper with ciphertext by flipping last character
    const lastChar = parts[4].slice(-1);
    const flippedChar = lastChar === 'a' ? 'b' : 'a';
    const tamperedCiphertext = `${parts[0]}:${parts[1]}:${parts[2]}:${parts[3]}:${parts[4].slice(0, -1)}${flippedChar}`;

    expect(() => service.decrypt(tamperedCiphertext)).toThrow(/tampered with/);

    // Tamper with authentication tag
    const tamperedTag = `${parts[0]}:${parts[1]}:${parts[2]}:00000000000000000000000000000000:${parts[4]}`;
    expect(() => service.decrypt(tamperedTag)).toThrow(/tampered with/);
  });

  it('rejects invalid non-encrypted strings gracefully', () => {
    expect(service.isEncrypted('plain text string')).toBe(false);
    expect(service.isEncrypted('enc:invalid')).toBe(false);
    expect(() => service.decrypt('not-an-encrypted-string')).toThrow(/Invalid encrypted field format/);
  });

  it('supports versioned key rotation for fields', () => {
    // Encrypt under v1
    const secret = 'Secret data created before key rotation';
    const encryptedV1 = service.encrypt(secret, 1);
    expect(service.getVersion(encryptedV1)).toBe(1);

    // Rotate active key
    const rotation = keyManager.rotateKey();
    expect(rotation.newVersion).toBeGreaterThan(1);

    // Legacy v1 field can still be decrypted under new active key
    const decryptedLegacy = service.decrypt(encryptedV1);
    expect(decryptedLegacy).toBe(secret);

    // Rotating the field upgrades it to the new active key version
    const encryptedV2 = service.rotate(encryptedV1);
    expect(service.getVersion(encryptedV2)).toBe(rotation.newVersion);
    expect(encryptedV2.startsWith(`enc:v${rotation.newVersion}:`)).toBe(true);

    // Decrypted rotated field is identical to original
    expect(service.decrypt(encryptedV2)).toBe(secret);
  });
});
