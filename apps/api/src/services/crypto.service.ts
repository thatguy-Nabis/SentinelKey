import crypto from 'node:crypto';
import { env } from '../config/env.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH_BYTES = 12; // 96 bits recommended for GCM

/**
 * Derives a consistent 32-byte key buffer from the configured encryption key.
 * Uses HKDF-SHA256 (RFC 5869) with a fixed, domain-specific salt/info — stronger
 * than a raw SHA-256 of the passphrase, and deterministic for round-tripping.
 */
function getDerivedKey(keyString: string = env.MFA_ENCRYPTION_KEY): Buffer {
  return Buffer.from(
    crypto.hkdfSync(
      'sha256',
      keyString,
      'sentinelkey:mfa:salt',
      'sentinelkey:mfa:key',
      32,
    ),
  );
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns formatted string: `${ivHex}:${authTagHex}:${ciphertextHex}`
 */
export function encrypt(plaintext: string, keyOverride?: string): string {
  const key = getDerivedKey(keyOverride);
  const iv = crypto.randomBytes(IV_LENGTH_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
  ciphertext += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext}`;
}

/**
 * Decrypt an AES-256-GCM encrypted string formatted as `${ivHex}:${authTagHex}:${ciphertextHex}`.
 * Throws if authentication fails or data was tampered with.
 */
export function decrypt(encryptedPayload: string, keyOverride?: string): string {
  const parts = encryptedPayload.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted payload format; expected iv:authTag:ciphertext');
  }

  const [ivHex, authTagHex, ciphertextHex] = parts;
  const key = getDerivedKey(keyOverride);
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
