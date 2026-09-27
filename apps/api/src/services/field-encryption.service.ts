import crypto from 'crypto';
import { keyManager } from './key-manager.service.js';

const FIELD_DOMAIN = 'field-encryption';
const ENCRYPTED_PREFIX = 'enc:';
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV
const TAG_LENGTH = 16; // 128-bit auth tag

export class FieldEncryptionService {
  /**
   * Determine if a string is already encrypted in SentinelKey format
   * Format: enc:v{version}:{iv_hex}:{tag_hex}:{ciphertext_hex}
   */
  public isEncrypted(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    if (!value.startsWith(ENCRYPTED_PREFIX)) return false;

    const parts = value.split(':');
    // enc, v{num}, iv, tag, ciphertext
    return (
      parts.length === 5 &&
      parts[0] === 'enc' &&
      /^v\d+$/.test(parts[1]) &&
      /^[0-9a-fA-F]{24}$/.test(parts[2]) &&
      /^[0-9a-fA-F]{32}$/.test(parts[3]) &&
      /^[0-9a-fA-F]+$/.test(parts[4])
    );
  }

  /**
   * Encrypt a plaintext string or object using active (or specified) key version
   */
  public encrypt(plaintext: string | object | number, targetVersion?: number): string {
    const version = targetVersion ?? keyManager.getActiveVersion();
    const key = keyManager.deriveDomainKey(FIELD_DOMAIN, version);

    const serialized = typeof plaintext === 'string' ? plaintext : JSON.stringify(plaintext);
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
    const encrypted = Buffer.concat([cipher.update(serialized, 'utf-8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    return `enc:v${version}:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  /**
   * Decrypt an encrypted field value.
   * Parses version, retrieves corresponding key, verifies tag.
   */
  public decrypt(encryptedValue: string): string {
    if (!this.isEncrypted(encryptedValue)) {
      throw new Error('Invalid encrypted field format. Expected enc:v{version}:{iv}:{tag}:{ciphertext}');
    }

    const parts = encryptedValue.split(':');
    const version = parseInt(parts[1].slice(1), 10);
    const iv = Buffer.from(parts[2], 'hex');
    const tag = Buffer.from(parts[3], 'hex');
    const ciphertext = Buffer.from(parts[4], 'hex');

    const key = keyManager.deriveDomainKey(FIELD_DOMAIN, version);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
    decipher.setAuthTag(tag);

    try {
      const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
      return decrypted.toString('utf-8');
    } catch {
      throw new Error(`Decryption failed for field (version ${version}): data or authentication tag has been tampered with`);
    }
  }

  /**
   * Decrypt and parse JSON object if possible, otherwise return raw string
   */
  public decryptJson<T = unknown>(encryptedValue: string): T {
    const decrypted = this.decrypt(encryptedValue);
    try {
      return JSON.parse(decrypted) as T;
    } catch {
      return decrypted as unknown as T;
    }
  }

  /**
   * Re-encrypts an encrypted field to the current active key version
   * Returns same string if already on active version.
   */
  public rotate(encryptedValue: string): string {
    if (!this.isEncrypted(encryptedValue)) {
      throw new Error('Cannot rotate unencrypted value');
    }
    const currentVersion = parseInt(encryptedValue.split(':')[1].slice(1), 10);
    const activeVersion = keyManager.getActiveVersion();

    if (currentVersion === activeVersion) {
      return encryptedValue; // Already on active version
    }

    const plaintext = this.decrypt(encryptedValue);
    return this.encrypt(plaintext, activeVersion);
  }

  /**
   * Extract key version from encrypted string
   */
  public getVersion(encryptedValue: string): number {
    if (!this.isEncrypted(encryptedValue)) {
      throw new Error('Cannot extract version from unencrypted string');
    }
    return parseInt(encryptedValue.split(':')[1].slice(1), 10);
  }
}

export const fieldEncryption = new FieldEncryptionService();
