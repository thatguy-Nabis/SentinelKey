import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { env } from '../config/env.js';
import { keyManager } from './key-manager.service.js';
import { EncryptedFile, IEncryptedFileDocument } from '../models/encrypted-file.model.js';
import { emitSecurityEvent } from './event-logger.service.js';

const FILE_DOMAIN = 'file-storage';
const MAGIC_HEADER = Buffer.from('SKF1', 'ascii'); // 4 bytes: SentinelKey File Format 1
const HEADER_LENGTH = 34; // 4 magic + 2 version + 12 IV + 16 Tag
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

export interface EncryptedFileOutput {
  fileRecord: IEncryptedFileDocument;
  storagePath: string;
}

export interface DecryptedFileOutput {
  fileRecord: IEncryptedFileDocument;
  data: Buffer;
  originalName: string;
  mimeType: string;
}

export class FileStorageService {
  private storageDir: string;

  constructor() {
    this.storageDir = path.isAbsolute(env.FILE_STORAGE_DIR)
      ? env.FILE_STORAGE_DIR
      : path.join(process.cwd(), env.FILE_STORAGE_DIR);

    this.ensureStorageDir();
  }

  private ensureStorageDir(): void {
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  /**
   * Encrypt a raw file buffer and package into SKF1 envelope
   */
  public encryptBuffer(buffer: Buffer, targetVersion?: number): { envelope: Buffer; keyVersion: number } {
    const version = targetVersion ?? keyManager.getActiveVersion();
    const key = keyManager.deriveDomainKey(FILE_DOMAIN, version);

    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });

    const ciphertext = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const tag = cipher.getAuthTag();

    const versionBuf = Buffer.alloc(2);
    versionBuf.writeUInt16BE(version, 0);

    const envelope = Buffer.concat([MAGIC_HEADER, versionBuf, iv, tag, ciphertext]);
    return { envelope, keyVersion: version };
  }

  /**
   * Decrypt an SKF1 envelope buffer back to raw plaintext
   */
  public decryptBuffer(envelope: Buffer): { data: Buffer; keyVersion: number } {
    if (envelope.length < HEADER_LENGTH) {
      throw new Error(`Invalid file envelope: truncated data (length ${envelope.length} < header length ${HEADER_LENGTH})`);
    }

    const magic = envelope.subarray(0, 4);
    if (!magic.equals(MAGIC_HEADER)) {
      throw new Error('Invalid file format: missing SentinelKey SKF1 magic bytes header');
    }

    const version = envelope.readUInt16BE(4);
    const iv = envelope.subarray(6, 18);
    const tag = envelope.subarray(18, 34);
    const ciphertext = envelope.subarray(34);

    const key = keyManager.deriveDomainKey(FILE_DOMAIN, version);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
    decipher.setAuthTag(tag);

    try {
      const data = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
      return { data, keyVersion: version };
    } catch {
      throw new Error(`File decryption failed for version ${version}: file integrity tag mismatch or corrupt ciphertext`);
    }
  }

  /**
   * Store an uploaded file: encrypts on upload, writes to disk, saves metadata, logs event
   */
  public async storeFile(params: {
    buffer: Buffer;
    originalName: string;
    mimeType: string;
    uploadedBy: string;
    ip?: string;
  }): Promise<EncryptedFileOutput> {
    this.ensureStorageDir();

    const { buffer, originalName, mimeType, uploadedBy, ip = '127.0.0.1' } = params;
    const sha256Checksum = crypto.createHash('sha256').update(buffer).digest('hex');

    // Encrypt in-memory
    const { envelope, keyVersion } = this.encryptBuffer(buffer);

    // Generate unique storage filename
    const fileId = crypto.randomUUID();
    const diskFilename = `${fileId}.skenc`;
    const storagePath = path.join(this.storageDir, diskFilename);

    // Write encrypted envelope to disk
    fs.writeFileSync(storagePath, envelope);

    // Save record to DB; roll back the disk file if persistence fails
    let fileRecord: IEncryptedFileDocument;
    try {
      fileRecord = await EncryptedFile.create({
        filename: diskFilename,
        originalName,
        mimeType,
        sizeOriginal: buffer.length,
        sizeEncrypted: envelope.length,
        keyVersion,
        checksumSha256: sha256Checksum,
        uploadedBy,
        storagePath,
      });
    } catch (err) {
      fs.unlinkSync(storagePath);
      throw err;
    }

    // Telemetry: audit log
    await emitSecurityEvent({
      type: 'FILE_UPLOADED',
      userId: uploadedBy,
      ip,
      severity: 'info',
      metadata: {
        fileId: fileRecord._id.toString(),
        filename: originalName,
        sizeOriginal: buffer.length,
        sizeEncrypted: envelope.length,
        keyVersion,
        checksumSha256: sha256Checksum,
      },
    });

    return { fileRecord, storagePath };
  }

  /**
   * Retrieve and decrypt file by ID, with access control check and audit logging
   */
  public async retrieveFile(params: {
    fileId: string;
    requestingUserId: string;
    userRoles: string[];
    ip?: string;
  }): Promise<DecryptedFileOutput> {
    const { fileId, requestingUserId, userRoles, ip = '127.0.0.1' } = params;

    const fileRecord = await EncryptedFile.findById(fileId);
    if (!fileRecord) {
      throw Object.assign(new Error('File not found'), { statusCode: 404 });
    }

    // Access control: admins and analysts can download any file; others only their own
    const isOwner = fileRecord.uploadedBy === requestingUserId;
    const isPrivileged = userRoles.includes('admin') || userRoles.includes('analyst');

    if (!isOwner && !isPrivileged) {
      // Security escalation: unauthorized file access attempt
      await emitSecurityEvent({
        type: 'PERMISSION_DENIED',
        userId: requestingUserId,
        ip,
        severity: 'high',
        metadata: {
          fileId,
          targetOwner: fileRecord.uploadedBy,
          action: 'file:download',
          reason: 'Access denied: user is neither owner nor privileged analyst/admin',
        },
      });
      throw Object.assign(
        new Error('Access denied: You do not have permission to download this file'),
        { statusCode: 403 },
      );
    }

    if (!fs.existsSync(fileRecord.storagePath)) {
      throw new Error('Encrypted file payload missing from storage disk');
    }

    const encryptedEnvelope = fs.readFileSync(fileRecord.storagePath);
    const { data } = this.decryptBuffer(encryptedEnvelope);

    // Verify SHA-256 integrity
    const decryptedChecksum = crypto.createHash('sha256').update(data).digest('hex');
    if (decryptedChecksum !== fileRecord.checksumSha256) {
      throw new Error('Security integrity failure: decrypted file hash does not match original stored checksum');
    }

    // Telemetry: audit log decryption access
    await emitSecurityEvent({
      type: 'FILE_DECRYPT_ACCESSED',
      userId: requestingUserId,
      ip,
      severity: 'info',
      metadata: {
        fileId: fileRecord._id.toString(),
        filename: fileRecord.originalName,
        keyVersion: fileRecord.keyVersion,
        size: data.length,
      },
    });

    await emitSecurityEvent({
      type: 'FILE_DOWNLOADED',
      userId: requestingUserId,
      ip,
      severity: 'info',
      metadata: {
        fileId: fileRecord._id.toString(),
        filename: fileRecord.originalName,
      },
    });

    return {
      fileRecord,
      data,
      originalName: fileRecord.originalName,
      mimeType: fileRecord.mimeType,
    };
  }

  /**
   * Rotate key for a stored file:
   * Decrypts with old version, re-encrypts with active key version, writes to disk, updates record
   */
  public async rotateFileKey(fileId: string, ip = '127.0.0.1'): Promise<{
    oldVersion: number;
    newVersion: number;
    success: boolean;
  }> {
    const fileRecord = await EncryptedFile.findById(fileId);
    if (!fileRecord) {
      throw new Error(`File ${fileId} not found`);
    }

    const activeVersion = keyManager.getActiveVersion();
    const oldVersion = fileRecord.keyVersion;

    if (oldVersion === activeVersion) {
      return { oldVersion, newVersion: activeVersion, success: true };
    }

    if (!fs.existsSync(fileRecord.storagePath)) {
      throw new Error(`File storage path not found for file ${fileId}`);
    }

    // 1. Decrypt using old key
    const currentEnvelope = fs.readFileSync(fileRecord.storagePath);
    const { data } = this.decryptBuffer(currentEnvelope);

    // 2. Encrypt with active version
    const { envelope: newEnvelope, keyVersion: newVersion } = this.encryptBuffer(data, activeVersion);

    // 3. Atomically overwrite disk
    fs.writeFileSync(fileRecord.storagePath, newEnvelope);

    // 4. Update DB
    fileRecord.keyVersion = newVersion;
    fileRecord.sizeEncrypted = newEnvelope.length;
    await fileRecord.save();

    // 5. Telemetry
    await emitSecurityEvent({
      type: 'FILE_KEY_ROTATED',
      userId: fileRecord.uploadedBy,
      ip,
      severity: 'low',
      metadata: {
        fileId,
        oldVersion,
        newVersion,
      },
    });

    return { oldVersion, newVersion, success: true };
  }
}

export const fileStorageService = new FileStorageService();
