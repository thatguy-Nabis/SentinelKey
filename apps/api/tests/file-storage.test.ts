import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';
import { FileStorageService } from '../src/services/file-storage.service.js';
import { keyManager } from '../src/services/key-manager.service.js';
import { EncryptedFile } from '../src/models/encrypted-file.model.js';
import * as eventLogger from '../src/services/event-logger.service.js';

describe('FileStorageService', () => {
  let service: FileStorageService;

  beforeEach(() => {
    service = new FileStorageService();
    vi.restoreAllMocks();
  });

  describe('SKF1 Envelope Encryption & Decryption', () => {
    it('creates an SKF1 envelope with 34-byte header and valid metadata', () => {
      const plaintext = Buffer.from('Top Secret Cyber Defense Briefing 2026', 'utf-8');
      const { envelope, keyVersion } = service.encryptBuffer(plaintext);

      expect(keyVersion).toBe(keyManager.getActiveVersion());
      expect(envelope.length).toBeGreaterThan(34);

      // Verify 4-byte magic header "SKF1"
      const magic = envelope.subarray(0, 4).toString('ascii');
      expect(magic).toBe('SKF1');

      // Verify 2-byte version number
      const version = envelope.readUInt16BE(4);
      expect(version).toBe(keyVersion);

      // Verify 12-byte IV and 16-byte tag exist
      const iv = envelope.subarray(6, 18);
      const tag = envelope.subarray(18, 34);
      expect(iv.length).toBe(12);
      expect(tag.length).toBe(16);

      // Verify ciphertext is not plaintext
      const ciphertext = envelope.subarray(34);
      expect(ciphertext.includes(plaintext)).toBe(false);
    });

    it('roundtrips binary files and produces byte-for-byte identical output', () => {
      // 64 KB of random binary data (simulating image / PDF upload)
      const binaryPayload = crypto.randomBytes(65536);
      const { envelope } = service.encryptBuffer(binaryPayload);
      const { data, keyVersion } = service.decryptBuffer(envelope);

      expect(keyVersion).toBe(keyManager.getActiveVersion());
      expect(data.length).toBe(binaryPayload.length);
      expect(data.equals(binaryPayload)).toBe(true);
    });

    it('rejects envelope with missing or corrupted magic bytes', () => {
      const { envelope } = service.encryptBuffer(Buffer.from('Test Data'));
      const corrupted = Buffer.from(envelope);

      // Corrupt magic bytes from "SKF1" to "FAIL"
      corrupted.write('FAIL', 0, 4, 'ascii');

      expect(() => service.decryptBuffer(corrupted)).toThrow(/missing SentinelKey SKF1 magic bytes/);
    });

    it('rejects truncated envelopes shorter than the 34-byte header', () => {
      const truncated = Buffer.from('SKF1_short_data');
      expect(() => service.decryptBuffer(truncated)).toThrow(/truncated data/);
    });

    it('detects tampering with ciphertext or auth tag', () => {
      const { envelope } = service.encryptBuffer(Buffer.from('Confidential Employee Records'));
      const tampered = Buffer.from(envelope);

      // Flip byte in ciphertext payload
      tampered[tampered.length - 1] ^= 0xff;

      expect(() => service.decryptBuffer(tampered)).toThrow(/file integrity tag mismatch/);
    });
  });

  describe('Key Rotation Compatibility', () => {
    it('decrypts legacy file envelopes after master key rotation', () => {
      const initialPayload = Buffer.from('Archival security report created in 2025');

      // 1. Encrypt with v1
      const { envelope: envelopeV1 } = service.encryptBuffer(initialPayload, 1);
      expect(envelopeV1.readUInt16BE(4)).toBe(1);

      // 2. Rotate master key
      const rotation = keyManager.rotateKey();
      expect(rotation.newVersion).toBeGreaterThan(1);
      expect(keyManager.getActiveVersion()).toBe(rotation.newVersion);

      // 3. Confirm old v1 envelope still decrypts seamlessly
      const { data: decryptedLegacy, keyVersion: legacyVersion } = service.decryptBuffer(envelopeV1);
      expect(legacyVersion).toBe(1);
      expect(decryptedLegacy.equals(initialPayload)).toBe(true);

      // 4. Encrypt new file under rotated active version
      const { envelope: envelopeV2, keyVersion: newActiveVersion } = service.encryptBuffer(initialPayload);
      expect(newActiveVersion).toBe(rotation.newVersion);
      expect(envelopeV2.readUInt16BE(4)).toBe(rotation.newVersion);

      const { data: decryptedNew } = service.decryptBuffer(envelopeV2);
      expect(decryptedNew.equals(initialPayload)).toBe(true);
    });
  });

  describe('Access Control & Audit Telemetry', () => {
    it('rejects unauthorized download attempts and emits PERMISSION_DENIED security event', async () => {
      const emitSpy = vi.spyOn(eventLogger, 'emitSecurityEvent').mockResolvedValue({} as any);

      vi.spyOn(EncryptedFile, 'findById').mockResolvedValue({
        _id: 'file-123',
        filename: 'file-123.skenc',
        originalName: 'classified.docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        uploadedBy: 'user-admin',
        storagePath: '/mock/path/classified.skenc',
        keyVersion: 1,
        checksumSha256: 'mock-hash',
      } as any);

      // Request from an unprivileged user who is not the owner
      await expect(
        service.retrieveFile({
          fileId: 'file-123',
          requestingUserId: 'user-intruder',
          userRoles: ['viewer'],
          ip: '198.51.100.44',
        })
      ).rejects.toThrow(/Access denied/);

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'PERMISSION_DENIED',
          userId: 'user-intruder',
          severity: 'high',
        })
      );
    });
  });
});
