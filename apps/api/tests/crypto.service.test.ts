import { describe, it, expect } from 'vitest';
import { encrypt, decrypt } from '../src/services/crypto.service.js';

describe('CryptoService (AES-256-GCM)', () => {
  it('encrypts and decrypts a string successfully', () => {
    const secret = 'JBSWY3DPEHPK3PXP';
    const encrypted = encrypt(secret);

    expect(encrypted).not.toBe(secret);
    expect(encrypted.split(':')).toHaveLength(3);

    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(secret);
  });

  it('produces different ciphertexts for the same plaintext (random IV)', () => {
    const secret = 'JBSWY3DPEHPK3PXP';
    const encrypted1 = encrypt(secret);
    const encrypted2 = encrypt(secret);

    expect(encrypted1).not.toBe(encrypted2);
    expect(decrypt(encrypted1)).toBe(secret);
    expect(decrypt(encrypted2)).toBe(secret);
  });

  it('fails decryption if ciphertext is tampered with', () => {
    const secret = 'SUPER_SECRET_MFA_KEY';
    const encrypted = encrypt(secret);
    const [ivHex, authTagHex, ciphertextHex] = encrypted.split(':');

    // Tamper with ciphertext by altering last byte
    const tamperedCiphertext = ciphertextHex.slice(0, -2) + (ciphertextHex.endsWith('aa') ? 'bb' : 'aa');
    const tamperedPayload = `${ivHex}:${authTagHex}:${tamperedCiphertext}`;

    expect(() => decrypt(tamperedPayload)).toThrow();
  });

  it('fails decryption if authTag is tampered with', () => {
    const secret = 'SUPER_SECRET_MFA_KEY';
    const encrypted = encrypt(secret);
    const [ivHex, authTagHex, ciphertextHex] = encrypted.split(':');

    // Tamper with auth tag
    const tamperedAuthTag = authTagHex.slice(0, -2) + (authTagHex.endsWith('00') ? '11' : '00');
    const tamperedPayload = `${ivHex}:${tamperedAuthTag}:${ciphertextHex}`;

    expect(() => decrypt(tamperedPayload)).toThrow();
  });

  it('fails decryption with wrong key', () => {
    const secret = 'MY_TOTP_SECRET';
    const encrypted = encrypt(secret, 'original-key-12345');

    expect(() => decrypt(encrypted, 'different-wrong-key-67890')).toThrow();
  });

  it('throws on invalid payload format', () => {
    expect(() => decrypt('invalid-single-string')).toThrow(/expected iv:authTag:ciphertext/);
    expect(() => decrypt('iv:authTag')).toThrow(/expected iv:authTag:ciphertext/);
  });
});
