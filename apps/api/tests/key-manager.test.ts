import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'crypto';
import { KeyManagerService } from '../src/services/key-manager.service.js';

describe('KeyManagerService', () => {
  let km: KeyManagerService;

  beforeEach(() => {
    km = new KeyManagerService();
  });

  it('initializes with active version 1 and 32-byte key', () => {
    expect(km.getActiveVersion()).toBe(1);
    const key = km.getKey();
    expect(Buffer.isBuffer(key)).toBe(true);
    expect(key.length).toBe(32);
  });

  it('derives distinct domain keys using HKDF-SHA256 for domain separation', () => {
    const fieldKey = km.deriveDomainKey('field-encryption');
    const fileKey = km.deriveDomainKey('file-storage');
    const mfaKey = km.deriveDomainKey('mfa-secrets');

    expect(fieldKey.length).toBe(32);
    expect(fileKey.length).toBe(32);
    expect(mfaKey.length).toBe(32);

    // Cryptographic domain separation check: all derived keys must be strictly unequal
    expect(fieldKey.equals(fileKey)).toBe(false);
    expect(fieldKey.equals(mfaKey)).toBe(false);
    expect(fileKey.equals(mfaKey)).toBe(false);

    // Deterministic derivation: same domain produces identical key
    const fieldKey2 = km.deriveDomainKey('field-encryption');
    expect(fieldKey.equals(fieldKey2)).toBe(true);
  });

  it('rotates master key to a new version and preserves previous key as decrypt_only', () => {
    const initialKey = km.getKey(1);
    expect(km.getActiveVersion()).toBe(1);

    const rotation = km.rotateKey();
    expect(rotation.oldVersion).toBe(1);
    expect(rotation.newVersion).toBe(2);
    expect(km.getActiveVersion()).toBe(2);

    const newKey = km.getKey(2);
    expect(newKey.length).toBe(32);
    expect(newKey.equals(initialKey)).toBe(false);

    // Version 1 still accessible for decryption of legacy data
    const legacyKey = km.getKey(1);
    expect(legacyKey.equals(initialKey)).toBe(true);

    const keyList = km.listKeys();
    const v1Entry = keyList.find(k => k.version === 1);
    const v2Entry = keyList.find(k => k.version === 2);

    expect(v1Entry?.status).toBe('decrypt_only');
    expect(v2Entry?.status).toBe('active');
  });

  it('rejects nonexistent key versions', () => {
    expect(() => km.getKey(99)).toThrow(/not found in key registry/);
  });
});
