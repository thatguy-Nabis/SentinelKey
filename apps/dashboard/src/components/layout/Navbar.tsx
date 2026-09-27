import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogOut } from 'lucide-react';

interface NavbarProps {
  currentTab: string;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab }) => {
  const { user, logout } = useAuth();

  const getTitle = () => {
    switch (currentTab) {
      case 'overview':
        return 'Security Operations Console';
      case 'logs':
        return 'Security Event Audit Stream';
      case 'alerts':
        return 'Intrusion Detection Alerts';
      case 'mfa':
        return 'MFA Security Factor Settings';
      case 'admin':
        return 'Role-Based Access Control Policies';
      default:
        return 'Dashboard';
    }
  };

  return (
    <header className="header">
      <div style={{ display: 'flex', alignContent: 'center', alignItems: 'center', gap: 16 }}>
        <h1 style={{ fontSize: '1.15rem', fontWeight: 600 }}>{getTitle()}</h1>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            padding: '2px 8px',
            borderRadius: 999,
            fontSize: '0.75rem',
            color: 'var(--color-emerald)',
          }}
        >
          <div className="pulse-indicator" />
          <span style={{ fontWeight: 600 }}>IDS LIVE</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Role Badge */}
            <span
              className="badge"
              style={{
                background: user.roles.includes('admin')
                  ? 'rgba(168, 85, 247, 0.15)'
                  : user.roles.includes('analyst')
                  ? 'rgba(0, 240, 255, 0.15)'
                  : 'rgba(148, 163, 184, 0.15)',
                color: user.roles.includes('admin')
                  ? 'var(--color-purple)'
                  : user.roles.includes('analyst')
                  ? 'var(--color-cyan)'
                  : 'var(--text-secondary)',
                border: user.roles.includes('admin')
                  ? '1px solid rgba(168, 85, 247, 0.3)'
                  : user.roles.includes('analyst')
                  ? '1px solid rgba(0, 240, 255, 0.3)'
                  : '1px solid rgba(148, 163, 184, 0.3)',
              }}
            >
              {user.roles.join(', ')}
            </span>

            {/* MFA Status Badge */}
            <span
              className="badge"
              style={{
                background: user.mfaEnabled
                  ? 'rgba(16, 185, 129, 0.15)'
                  : 'rgba(245, 158, 11, 0.15)',
                color: user.mfaEnabled ? 'var(--color-emerald)' : 'var(--color-amber)',
                border: user.mfaEnabled
                  ? '1px solid rgba(16, 185, 129, 0.3)'
                  : '1px solid rgba(245, 158, 11, 0.3)',
              }}
            >
              {user.mfaEnabled ? '2FA ACTIVE' : '2FA DISABLED'}
            </span>

            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              {user.email}
            </span>
          </div>
        )}

        <button
          onClick={logout}
          className="btn btn-secondary btn-sm"
          title="Sign out of console"
        >
          <LogOut size={14} />
          Sign Out
        </button>
      </div>
    </header>
  );
};
