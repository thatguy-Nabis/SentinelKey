import mongoose, { Schema, type Document, type Model } from 'mongoose';
import type { Permission } from '@sentinelkey/shared-types';

/** Role document interface */
export interface IRoleDocument extends Document {
  name: string;
  description: string;
  permissions: Permission[];
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const roleSchema = new Schema<IRoleDocument>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    permissions: {
      type: [String],
      required: true,
      default: [],
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

export const Role: Model<IRoleDocument> = mongoose.model<IRoleDocument>('Role', roleSchema);
