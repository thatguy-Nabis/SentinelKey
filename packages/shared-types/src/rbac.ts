/**
 * RBAC types shared across API, dashboard, and SDK.
 *
 * Permission format: "resource:action"
 * Resources: users, roles, logs, alerts, settings, encryption, classify, domains
 * Actions: read, write, delete, manage
 */

/** All valid permission strings */
export type Permission =
  | 'users:read'
  | 'users:write'
  | 'users:delete'
  | 'roles:read'
  | 'roles:write'
  | 'logs:read'
  | 'logs:write'
  | 'alerts:read'
  | 'alerts:write'
  | 'alerts:manage'
  | 'settings:read'
  | 'settings:manage'
  | 'encryption:read'
  | 'encryption:write'
  | 'files:read'
  | 'files:write'
  | 'files:delete'
  | 'classify:read'
  | 'classify:write'
  | 'domains:read'
  | 'domains:write'
  | 'domains:manage';

/** A role with its associated permissions */
export interface IRole {
  _id: string;
  name: string;
  description: string;
  permissions: Permission[];
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Default role-permission mapping (used for seeding) */
export const DEFAULT_ROLE_PERMISSIONS: Record<string, Permission[]> = {
  admin: [
    'users:read', 'users:write', 'users:delete',
    'roles:read', 'roles:write',
    'logs:read', 'logs:write',
    'alerts:read', 'alerts:write', 'alerts:manage',
    'settings:read', 'settings:manage',
    'encryption:read', 'encryption:write',
    'files:read', 'files:write', 'files:delete',
    'classify:read', 'classify:write',
    'domains:read', 'domains:write', 'domains:manage',
  ],
  analyst: [
    'users:read',
    'roles:read',
    'logs:read', 'logs:write',
    'alerts:read', 'alerts:write', 'alerts:manage',
    'encryption:read',
    'files:read', 'files:write',
    'classify:read', 'classify:write',
    'domains:read', 'domains:write',
  ],
  viewer: [
    'users:read',
    'roles:read',
    'logs:read',
    'alerts:read',
    'settings:read',
    'files:read',
    'classify:read',
    'domains:read', 'domains:write',
  ],
};
