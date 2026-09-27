/**
 * Encryption and File Security Types
 */

export interface IEncryptedFile {
  _id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  sizeOriginal: number;
  sizeEncrypted: number;
  keyVersion: number;
  checksumSha256: string;
  uploadedBy: string;
  storagePath: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface IEncryptedFileMetadata {
  id: string;
  originalName: string;
  mimeType: string;
  sizeOriginal: number;
  keyVersion: number;
  checksumSha256: string;
  uploadedBy: string;
  createdAt: string | Date;
}

export interface IKeyRotationResult {
  fileId: string;
  oldVersion: number;
  newVersion: number;
  success: boolean;
}

export interface IFileFilterQuery {
  page?: number;
  limit?: number;
  uploadedBy?: string;
  mimeType?: string;
}
