import mongoose, { Document, Schema } from 'mongoose';
import type { IEncryptedFile } from '@sentinelkey/shared-types';

export interface IEncryptedFileDocument extends Omit<IEncryptedFile, '_id'>, Document {}

const EncryptedFileSchema = new Schema<IEncryptedFileDocument>(
  {
    filename: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
      default: 'application/octet-stream',
    },
    sizeOriginal: {
      type: Number,
      required: true,
    },
    sizeEncrypted: {
      type: Number,
      required: true,
    },
    keyVersion: {
      type: Number,
      required: true,
      index: true,
    },
    checksumSha256: {
      type: String,
      required: true,
    },
    uploadedBy: {
      type: String,
      required: true,
      index: true,
    },
    storagePath: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

EncryptedFileSchema.set('toJSON', {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mongoose types `ret` as Record<string, any>
  transform: (_doc, ret: Record<string, any>) => {
    delete ret.storagePath; // Never expose internal disk paths to client
    delete ret.__v;
    return ret;
  },
});

export const EncryptedFile = mongoose.model<IEncryptedFileDocument>(
  'EncryptedFile',
  EncryptedFileSchema
);
