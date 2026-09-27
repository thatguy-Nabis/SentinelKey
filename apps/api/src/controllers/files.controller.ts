import { Request, Response } from 'express';
import { fileStorageService } from '../services/file-storage.service.js';
import { keyManager } from '../services/key-manager.service.js';
import { fieldEncryption } from '../services/field-encryption.service.js';
import { EncryptedFile } from '../models/encrypted-file.model.js';
import { sendSuccess, sendError, extractError } from '../utils/api-response.js';

export async function uploadFile(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }

    const ip = req.ip || req.socket?.remoteAddress || '127.0.0.1';

    let buffer: Buffer;
    let originalName: string;
    let mimeType: string = 'application/octet-stream';

    // Handle JSON with base64 payload
    if (req.body && req.body.contentBase64) {
      originalName = req.body.originalName || 'file.bin';
      mimeType = req.body.mimeType || 'application/octet-stream';
      buffer = Buffer.from(req.body.contentBase64, 'base64');
    } else if (Buffer.isBuffer(req.body)) {
      buffer = req.body;
      originalName = (req.headers['x-file-name'] as string) || 'file.bin';
      mimeType = req.headers['content-type'] || 'application/octet-stream';
    } else {
      sendError(res, 400, 'BAD_REQUEST', 'Invalid file payload. Expected JSON with { originalName, mimeType, contentBase64 } or raw binary body');
      return;
    }

    if (buffer.length === 0) {
      sendError(res, 400, 'BAD_REQUEST', 'Cannot upload empty file');
      return;
    }

    const { fileRecord } = await fileStorageService.storeFile({
      buffer,
      originalName,
      mimeType,
      uploadedBy: user.sub,
      ip,
    });

    sendSuccess(res, fileRecord, 201);
  } catch (err) {
    const { statusCode, code, message } = extractError(err, 'UPLOAD_FAILED', 'File upload failed');
    sendError(res, statusCode, code, message);
  }
}

export async function downloadFile(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }

    const fileId = req.params.id;
    const ip = req.ip || req.socket?.remoteAddress || '127.0.0.1';

    const decrypted = await fileStorageService.retrieveFile({
      fileId,
      requestingUserId: user.sub,
      userRoles: user.roles,
      ip,
    });

    res.setHeader('Content-Type', decrypted.mimeType);
    // RFC 5987: ASCII fallback + UTF-8 filename* for non-ASCII names.
    const asciiName = decrypted.originalName.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_') || 'download';
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(decrypted.originalName)}`,
    );
    res.setHeader('Content-Length', decrypted.data.length);
    res.send(decrypted.data);
  } catch (err) {
    const { statusCode, code, message } = extractError(err, 'DOWNLOAD_FAILED', 'File download failed');
    sendError(res, statusCode, code, message);
  }
}

export async function listFiles(req: Request, res: Response): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }

    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};

    // Non-admin / non-analyst users only see their own files
    const isPrivileged = user.roles.includes('admin') || user.roles.includes('analyst');
    if (!isPrivileged) {
      query.uploadedBy = user.sub;
    } else if (req.query.uploadedBy) {
      query.uploadedBy = req.query.uploadedBy;
    }

    if (req.query.mimeType) {
      query.mimeType = req.query.mimeType;
    }

    const [files, total] = await Promise.all([
      EncryptedFile.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      EncryptedFile.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    res.json({
      success: true,
      data: { files, pagination: { page, limit, total, totalPages } },
    });
  } catch (err) {
    const { statusCode, code, message } = extractError(err, 'INTERNAL_ERROR', 'Failed to list files');
    sendError(res, statusCode, code, message);
  }
}

export async function rotateFile(req: Request, res: Response): Promise<void> {
  try {
    const fileId = req.params.id;
    const ip = req.ip || req.socket?.remoteAddress || '127.0.0.1';

    const result = await fileStorageService.rotateFileKey(fileId, ip);
    sendSuccess(res, result);
  } catch (err) {
    const { statusCode, code, message } = extractError(err, 'ROTATION_FAILED', 'Failed to rotate file encryption key');
    sendError(res, statusCode, code, message);
  }
}

export async function getKeyStatus(_req: Request, res: Response): Promise<void> {
  try {
    const activeVersion = keyManager.getActiveVersion();
    const keys = keyManager.listKeys();
    sendSuccess(res, { activeVersion, keys });
  } catch (err) {
    const { statusCode, code, message } = extractError(err, 'INTERNAL_ERROR', 'Failed to get key status');
    sendError(res, statusCode, code, message);
  }
}

export async function rotateMasterKey(_req: Request, res: Response): Promise<void> {
  try {
    const result = keyManager.rotateKey();
    sendSuccess(res, {
      message: `Master key rotated successfully to version ${result.newVersion}`,
      ...result,
    });
  } catch (err) {
    const { statusCode, code, message } = extractError(err, 'INTERNAL_ERROR', 'Failed to rotate master key');
    sendError(res, statusCode, code, message);
  }
}

export async function encryptField(req: Request, res: Response): Promise<void> {
  try {
    const { value } = req.body;
    if (value === undefined || value === null) {
      sendError(res, 400, 'BAD_REQUEST', 'Missing "value" field to encrypt');
      return;
    }
    const result = fieldEncryption.encrypt(String(value));
    sendSuccess(res, result);
  } catch (err) {
    const { statusCode, code, message } = extractError(err, 'ENCRYPTION_FAILED', 'Field encryption failed');
    sendError(res, statusCode, code, message);
  }
}

export async function decryptField(req: Request, res: Response): Promise<void> {
  try {
    const { ciphertext } = req.body;
    if (!ciphertext || typeof ciphertext !== 'string') {
      sendError(res, 400, 'BAD_REQUEST', 'Missing "ciphertext" string to decrypt');
      return;
    }
    const result = fieldEncryption.decrypt(ciphertext);
    sendSuccess(res, result);
  } catch (err) {
    const { statusCode, code, message } = extractError(err, 'DECRYPTION_FAILED', 'Field decryption failed', 400);
    sendError(res, statusCode, code, message);
  }
}

