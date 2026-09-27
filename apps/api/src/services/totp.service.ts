import crypto from 'node:crypto';
import qrcode from 'qrcode';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Encode a Buffer into a RFC 4648 Base32 string (without padding).
 */
export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

/**
 * Decode an RFC 4648 Base32 string into a Buffer.
 * Ignores whitespace, hyphens, and '=' padding; case-insensitive.
 */
export function base32Decode(base32String: string): Buffer {
  const cleaned = base32String.toUpperCase().replace(/[\s-=]/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) {
      throw new Error(`Invalid base32 character: ${char}`);
    }

    value = (value << 5) | index;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

/**
 * Generate a new cryptographically secure random TOTP secret (160 bits / 20 bytes).
 * Returned as a 32-character Base32 string.
 */
export function generateMfaSecret(): string {
  const randomBytes = crypto.randomBytes(20);
  return base32Encode(randomBytes);
}

/**
 * Options for TOTP generation and verification.
 */
export interface ITotpOptions {
  stepSeconds?: number;
  digits?: number;
  timeMs?: number;
  window?: number;
  lastTimeStep?: number;
}

/**
 * Generate a 6-digit TOTP code for a given secret and timestamp (RFC 6238).
 */
export function generateTotpCode(secret: string, options: ITotpOptions = {}): string {
  const stepSeconds = options.stepSeconds ?? 30;
  const digits = options.digits ?? 6;
  const timeMs = options.timeMs ?? Date.now();

  const timeStep = Math.floor(timeMs / 1000 / stepSeconds);
  const keyBuffer = base32Decode(secret);

  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigInt64BE(BigInt(timeStep));

  const hmac = crypto.createHmac('sha1', keyBuffer);
  hmac.update(counterBuffer);
  const digest = hmac.digest();

  // Dynamic truncation
  const offset = digest[digest.length - 1] & 0x0f;
  const binaryCode =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  const codeNumber = binaryCode % Math.pow(10, digits);
  return codeNumber.toString().padStart(digits, '0');
}

export interface ITotpVerifyResult {
  valid: boolean;
  timeStep?: number;
  reason?: 'INVALID_CODE' | 'REUSED_CODE' | 'EXPIRED_CODE';
}

/**
 * Verify a TOTP code against a secret with time-drift tolerance (window)
 * and replay protection.
 *
 * @param code User submitted 6-digit code
 * @param secret User's base32 TOTP secret
 * @param options Time options, tolerance window, and last verified time step
 */
export function verifyTotpCode(
  code: string,
  secret: string,
  options: ITotpOptions = {},
): ITotpVerifyResult {
  if (!code || typeof code !== 'string') {
    return { valid: false, reason: 'INVALID_CODE' };
  }

  const cleanedCode = code.trim();
  const digits = options.digits ?? 6;
  if (cleanedCode.length !== digits || !/^\d+$/.test(cleanedCode)) {
    return { valid: false, reason: 'INVALID_CODE' };
  }

  const stepSeconds = options.stepSeconds ?? 30;
  const timeMs = options.timeMs ?? Date.now();
  const currentStep = Math.floor(timeMs / 1000 / stepSeconds);
  const window = options.window ?? 1; // default check current - 1, current, current + 1
  const lastTimeStep = options.lastTimeStep ?? -1;

  for (let offset = -window; offset <= window; offset++) {
    const step = currentStep + offset;
    const expected = generateTotpCode(secret, {
      ...options,
      timeMs: step * stepSeconds * 1000,
    });

    const isMatch =
      cleanedCode.length === expected.length &&
      crypto.timingSafeEqual(Buffer.from(cleanedCode), Buffer.from(expected));

    if (isMatch) {
      // Replay check: the same time step cannot be verified again
      if (step <= lastTimeStep) {
        return { valid: false, reason: 'REUSED_CODE' };
      }
      return { valid: true, timeStep: step };
    }
  }

  return { valid: false, reason: 'INVALID_CODE' };
}

/**
 * Generate a set of backup recovery codes (e.g. 8 codes formatted as "xxxx-xxxx").
 */
export function generateBackupCodes(count = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    // 8 random bytes = 64 bits of entropy per code (standard for recovery codes).
    const raw = crypto.randomBytes(8).toString('hex').toUpperCase();
    codes.push(`${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}`);
  }
  return codes;
}

/**
 * Hash a backup code using SHA-256 for secure storage.
 * Codes are normalized (stripped of dashes and spaces, lowercased) before hashing.
 */
export function hashBackupCode(code: string): string {
  const normalized = code.replace(/[\s-]/g, '').toLowerCase();
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * Verify and consume a backup code against an array of stored hashed codes.
 * Returns valid = true and the updated array with the used code removed.
 */
export function verifyAndConsumeBackupCode(
  submittedCode: string,
  storedHashedCodes: string[],
): { valid: boolean; remainingHashedCodes: string[] } {
  if (!submittedCode || !Array.isArray(storedHashedCodes)) {
    return { valid: false, remainingHashedCodes: storedHashedCodes ?? [] };
  }

  const hashedSubmitted = hashBackupCode(submittedCode);
  const index = storedHashedCodes.indexOf(hashedSubmitted);

  if (index !== -1) {
    const updated = [...storedHashedCodes];
    updated.splice(index, 1);
    return { valid: true, remainingHashedCodes: updated };
  }

  return { valid: false, remainingHashedCodes: storedHashedCodes };
}

/**
 * Generate standard otpauth URI.
 */
export function generateOtpAuthUri(email: string, secret: string, issuer = 'SentinelKey'): string {
  const label = encodeURIComponent(`${issuer}:${email}`);
  const encIssuer = encodeURIComponent(issuer);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encIssuer}&algorithm=SHA1&digits=6&period=30`;
}

/**
 * Generate a QR code as a base64 Data URL.
 */
export async function generateQrCode(uri: string): Promise<string> {
  return qrcode.toDataURL(uri, {
    errorCorrectionLevel: 'M',
    margin: 2,
    scale: 6,
  });
}
