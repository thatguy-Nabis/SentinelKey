import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, Users, CheckCircle, XCircle } from 'lucide-react';
import { DEFAULT_ROLE_PERMISSIONS, type Permission } from '@sentinelkey/shared-types';

export const AdminView: React.FC = () => {
  const { user, isAdmin } = useAuth();

  if (!isAdmin) {
    return (
      <div className="content-body">
        <div className="glass-panel" style={{ textAlign: 'center', padding: '60px 24px', borderColor: 'var(--color-rose)' }}>
          <ShieldAlert size={48} style={{ color: 'var(--color-rose)', marginBottom: 16 }} />
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 8 }}>403 — Access Denied</h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: 480, margin: '0 auto 20px', fontSize: '0.9rem' }}>
            Your account ({user?.email}) has role <strong style={{ color: 'var(--text-primary)' }}>{user?.roles.join(', ')}</strong>, which lacks the required administrative permissions.
          </p>
          <div
            className="font-mono"
            style={{
              display: 'inline-block',
              background: 'var(--bg-app)',
              padding: '8px 16px',
              borderRadius: 6,
              border: '1px solid var(--border-subtle)',
              fontSize: '0.8rem',
              color: 'var(--color-rose)',
            }}
          >
            RBAC Enforcement: requirePermission('users:manage') &rarr; 403 FORBIDDEN
          </div>
        </div>
      </div>
    );
  }

  const allPermissions: Permission[] = [
    'users:read', 'users:write', 'users:delete',
    'roles:read', 'roles:write',
    'logs:read', 'logs:write',
    'alerts:read', 'alerts:write', 'alerts:manage',
    'settings:read', 'settings:manage',
    'encryption:read', 'encryption:write',
    'classify:read', 'classify:write',
  ];

  return (
    <div className="content-body">
      <div className="glass-panel" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <Users size={22} style={{ color: 'var(--color-purple)' }} />
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Role-Based Access Control (RBAC) Matrix</h2>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          SentinelKey enforces fine-grained permissions per role. Evaluated by custom in-repo middleware with audit logging on denials.
        </p>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Permission Key</th>
              <th style={{ textAlign: 'center' }}>Admin</th>
              <th style={{ textAlign: 'center' }}>Analyst</th>
              <th style={{ textAlign: 'center' }}>Viewer</th>
            </tr>
          </thead>
          <tbody>
            {allPermissions.map(perm => {
              const inAdmin = DEFAULT_ROLE_PERMISSIONS.admin.includes(perm);
              const inAnalyst = DEFAULT_ROLE_PERMISSIONS.analyst.includes(perm);
              const inViewer = DEFAULT_ROLE_PERMISSIONS.viewer.includes(perm);

              return (
                <tr key={perm}>
                  <td className="font-mono" style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                    {perm}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {inAdmin ? <CheckCircle size={16} style={{ color: 'var(--color-emerald)', display: 'inline' }} /> : <XCircle size={16} style={{ color: 'var(--border-subtle)', display: 'inline' }} />}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {inAnalyst ? <CheckCircle size={16} style={{ color: 'var(--color-cyan)', display: 'inline' }} /> : <XCircle size={16} style={{ color: 'var(--border-subtle)', display: 'inline' }} />}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {inViewer ? <CheckCircle size={16} style={{ color: 'var(--text-secondary)', display: 'inline' }} /> : <XCircle size={16} style={{ color: 'var(--border-subtle)', display: 'inline' }} />}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
