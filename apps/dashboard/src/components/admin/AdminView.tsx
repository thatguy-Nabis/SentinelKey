import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, Users, CheckCircle, XCircle, Search } from 'lucide-react';
import { DEFAULT_ROLE_PERMISSIONS, type Permission } from '@sentinelkey/shared-types';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { TapToCopy } from '../common/TapToCopy';

export const AdminView: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const isMobile = useIsMobile(768);
  const [searchTerm, setSearchTerm] = useState('');

  if (!isAdmin) {
    return (
      <div className="content-body">
        <div className="glass-panel" style={{ textAlign: 'center', padding: isMobile ? '40px 16px' : '60px 24px', borderColor: 'var(--color-rose)' }}>
          <ShieldAlert size={48} style={{ color: 'var(--color-rose)', marginBottom: 16 }} />
          <h2 style={{ fontSize: isMobile ? '1.2rem' : '1.4rem', fontWeight: 700, marginBottom: 8 }}>403 — Access Denied</h2>
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
              wordBreak: 'break-word',
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

  const filteredPermissions = allPermissions.filter((p) =>
    p.toLowerCase().includes(searchTerm.toLowerCase().trim()),
  );

  return (
    <div className="content-body">
      {/* Overview Card */}
      <div className={isMobile ? 'mobile-sec-card' : 'glass-panel'} style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: 'rgba(168, 85, 247, 0.15)',
              color: 'var(--color-purple)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Users size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: isMobile ? '1.1rem' : '1.2rem', fontWeight: 600 }}>
              Role-Based Access Control Matrix
            </h2>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-purple)', fontWeight: 600 }}>
              RBAC Enforcement Core Active
            </div>
          </div>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          SentinelKey enforces fine-grained permissions per role with audit logging on denials.
        </p>

        {/* Mobile Search */}
        {isMobile && (
          <div style={{ position: 'relative', marginTop: 14 }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: 38, minHeight: 44 }}
              placeholder="Search permissions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Desktop Table View (>= 768px) */}
      {!isMobile && (
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
              {allPermissions.map((perm) => {
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
      )}

      {/* Mobile Card-Based RBAC Matrix (< 768px) */}
      {isMobile && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredPermissions.map((perm) => {
            const inAdmin = DEFAULT_ROLE_PERMISSIONS.admin.includes(perm);
            const inAnalyst = DEFAULT_ROLE_PERMISSIONS.analyst.includes(perm);
            const inViewer = DEFAULT_ROLE_PERMISSIONS.viewer.includes(perm);

            return (
              <div key={perm} className="mobile-sec-card" style={{ padding: '12px 14px', marginBottom: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <TapToCopy value={perm} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                  {/* Admin Status */}
                  <div
                    style={{
                      background: inAdmin ? 'rgba(168, 85, 247, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                      border: `1px solid ${inAdmin ? 'rgba(168, 85, 247, 0.3)' : 'var(--border-subtle)'}`,
                      borderRadius: 6,
                      padding: '6px 8px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <span style={{ fontSize: '0.68rem', fontWeight: 600, color: inAdmin ? 'var(--color-purple)' : 'var(--text-muted)' }}>
                      ADMIN
                    </span>
                    {inAdmin ? (
                      <CheckCircle size={15} style={{ color: 'var(--color-emerald)' }} />
                    ) : (
                      <XCircle size={15} style={{ color: 'var(--border-subtle)' }} />
                    )}
                  </div>

                  {/* Analyst Status */}
                  <div
                    style={{
                      background: inAnalyst ? 'rgba(0, 240, 255, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                      border: `1px solid ${inAnalyst ? 'rgba(0, 240, 255, 0.3)' : 'var(--border-subtle)'}`,
                      borderRadius: 6,
                      padding: '6px 8px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <span style={{ fontSize: '0.68rem', fontWeight: 600, color: inAnalyst ? 'var(--color-cyan)' : 'var(--text-muted)' }}>
                      ANALYST
                    </span>
                    {inAnalyst ? (
                      <CheckCircle size={15} style={{ color: 'var(--color-cyan)' }} />
                    ) : (
                      <XCircle size={15} style={{ color: 'var(--border-subtle)' }} />
                    )}
                  </div>

                  {/* Viewer Status */}
                  <div
                    style={{
                      background: inViewer ? 'rgba(148, 163, 184, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                      border: `1px solid ${inViewer ? 'rgba(148, 163, 184, 0.3)' : 'var(--border-subtle)'}`,
                      borderRadius: 6,
                      padding: '6px 8px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <span style={{ fontSize: '0.68rem', fontWeight: 600, color: inViewer ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                      VIEWER
                    </span>
                    {inViewer ? (
                      <CheckCircle size={15} style={{ color: 'var(--color-emerald)' }} />
                    ) : (
                      <XCircle size={15} style={{ color: 'var(--border-subtle)' }} />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
