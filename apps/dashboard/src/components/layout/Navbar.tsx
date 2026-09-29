import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogOut, AlertOctagon, Menu } from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  onOpenDrawer?: () => void;
  openAlertCount?: number;
  onNavigateTab?: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onOpenDrawer,
  openAlertCount = 0,
  onNavigateTab,
}) => {
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

  const getMobileTitle = () => {
    switch (currentTab) {
      case 'overview':
        return 'SOC Console';
      case 'logs':
        return 'Event Stream';
      case 'alerts':
        return 'IDS Alerts';
      case 'mfa':
        return 'MFA Settings';
      case 'admin':
        return 'Access Control';
      default:
        return 'Dashboard';
    }
  };

  return (
    <header className="header">
      {/* Left Title & Status */}
      <div className="header-left">
        <h1 className="header-title-desktop">{getTitle()}</h1>
        <h1 className="header-title-mobile">{getMobileTitle()}</h1>

        <div className="live-status-pill">
          <div className="pulse-indicator" />
          <span className="live-status-text">IDS LIVE</span>
        </div>
      </div>

      {/* Desktop User Info & Sign Out */}
      <div className="header-right-desktop">
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
                  ? 'rgba(168, 85, 247, 0.15)' // Or emerald
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

      {/* Mobile Header Right: Quick Alert Jump & Menu Drawer Trigger */}
      <div className="header-right-mobile">
        {openAlertCount > 0 && onNavigateTab && (
          <button
            type="button"
            className="mobile-header-badge-btn"
            onClick={() => onNavigateTab('alerts')}
            aria-label={`Jump to ${openAlertCount} active alerts`}
          >
            <AlertOctagon size={16} />
            <span className="badge-text">{openAlertCount}</span>
          </button>
        )}

        {onOpenDrawer && (
          <button
            type="button"
            className="mobile-header-menu-btn"
            onClick={onOpenDrawer}
            aria-label="Open navigation menu"
          >
            <Menu size={20} />
          </button>
        )}
      </div>
    </header>
  );
};
