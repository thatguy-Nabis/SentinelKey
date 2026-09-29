import type { Permission } from '@sentinelkey/shared-types';

/**
 * Default role definitions seeded on first boot.
 * Matches DEFAULT_ROLE_PERMISSIONS from shared-types but structured for DB seeding.
 */
export interface RoleSeed {
  name: string;
  description: string;
  permissions: Permission[];
  isDefault: boolean;
}

export const DEFAULT_ROLES: RoleSeed[] = [
  {
    name: 'admin',
    description: 'Full system access — manages users, roles, settings, domains, and all security features.',
    permissions: [
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
    isDefault: false,
  },
  {
    name: 'analyst',
    description: 'Security analyst — can view/manage logs, alerts, classifications, and domains.',
    permissions: [
      'users:read',
      'roles:read',
      'logs:read', 'logs:write',
      'alerts:read', 'alerts:write', 'alerts:manage',
      'encryption:read',
      'files:read', 'files:write',
      'classify:read', 'classify:write',
      'domains:read', 'domains:write',
    ],
    isDefault: false,
  },
  {
    name: 'viewer',
    description: 'Standard access to logs, alerts, settings, and own domains.',
    permissions: [
      'users:read',
      'roles:read',
      'logs:read',
      'alerts:read',
      'settings:read',
      'files:read',
      'classify:read',
      'domains:read', 'domains:write',
    ],
    isDefault: true,
  },
];
