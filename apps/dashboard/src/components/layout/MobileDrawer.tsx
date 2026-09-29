import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  X,
  Activity,
  FileText,
  AlertOctagon,
  Lock,
  Users,
  LogOut,
  Globe,
  ExternalLink,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  openAlertCount: number;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({
  isOpen,
  onClose,
  currentTab,
  setCurrentTab,
  openAlertCount,
}) => {
  const { user, isAdmin, logout } = useAuth();
  const [showSignoutConfirm, setShowSignoutConfirm] = useState(false);

  if (!isOpen) return null;

  const handleSelectTab = (tab: string) => {
    setCurrentTab(tab);
    onClose();
  };

  const handleSignOut = () => {
    onClose();
    logout();
  };

  return (
    <div className="mobile-drawer-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="mobile-drawer-sheet" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="mobile-drawer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img
              src="/logo.png"
              alt="SentinelKey"
              style={{
                width: 30,
                height: 35,
                objectFit: 'contain',
                flexShrink: 0,
                filter: 'drop-shadow(0 2px 8px rgba(139, 92, 246, 0.45))',
              }}
            />
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: '#fff' }}>SentinelKey</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>SOC Mobile Console</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn btn-secondary btn-sm"
            style={{ width: 36, height: 36, padding: 0 }}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* User Profile Card */}
        {user && (
          <div className="mobile-user-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <span className="font-mono" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                {user.email}
              </span>
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
                  fontSize: '0.65rem',
                  padding: '1px 6px',
                }}
              >
                {user.mfaEnabled ? '2FA ON' : '2FA OFF'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {user.roles.map((r) => (
                <span
                  key={r}
                  className="badge"
                  style={{
                    background: r === 'admin'
                      ? 'rgba(168, 85, 247, 0.15)'
                      : r === 'analyst'
                      ? 'rgba(0, 240, 255, 0.15)'
                      : 'rgba(148, 163, 184, 0.15)',
                    color: r === 'admin'
                      ? 'var(--color-purple)'
                      : r === 'analyst'
                      ? 'var(--color-cyan)'
                      : 'var(--text-secondary)',
                    border: r === 'admin'
                      ? '1px solid rgba(168, 85, 247, 0.3)'
                      : r === 'analyst'
                      ? '1px solid rgba(0, 240, 255, 0.3)'
                      : '1px solid rgba(148, 163, 184, 0.3)',
                    fontSize: '0.7rem',
                  }}
                >
                  {r.toUpperCase()}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Navigation List */}
        <div className="mobile-drawer-nav">
          <div className="drawer-nav-section-label">Monitoring & Telemetry</div>

          <button
            className={`drawer-nav-item ${currentTab === 'overview' ? 'active' : ''}`}
            onClick={() => handleSelectTab('overview')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Activity size={18} />
              <span>Overview & Posture</span>
            </div>
            <ChevronRight size={16} className="drawer-chevron" />
          </button>

          <button
            className={`drawer-nav-item ${currentTab === 'alerts' ? 'active' : ''}`}
            onClick={() => handleSelectTab('alerts')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <AlertOctagon size={18} />
              <span>IDS Intrusion Alerts</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {openAlertCount > 0 && <span className="nav-badge">{openAlertCount}</span>}
              <ChevronRight size={16} className="drawer-chevron" />
            </div>
          </button>

          <button
            className={`drawer-nav-item ${currentTab === 'logs' ? 'active' : ''}`}
            onClick={() => handleSelectTab('logs')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <FileText size={18} />
              <span>Security Event Stream</span>
            </div>
            <ChevronRight size={16} className="drawer-chevron" />
          </button>

          <div className="drawer-nav-section-label" style={{ marginTop: 12 }}>Security Controls</div>

          <button
            className={`drawer-nav-item ${currentTab === 'mfa' ? 'active' : ''}`}
            onClick={() => handleSelectTab('mfa')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Lock size={18} />
              <span>MFA Security Factor</span>
            </div>
            <ChevronRight size={16} className="drawer-chevron" />
          </button>

          {isAdmin && (
            <button
              className={`drawer-nav-item ${currentTab === 'admin' ? 'active' : ''}`}
              onClick={() => handleSelectTab('admin')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Users size={18} />
                <span>RBAC Access Control</span>
              </div>
              <span
                style={{
                  fontSize: '0.65rem',
                  padding: '2px 5px',
                  borderRadius: 4,
                  background: 'rgba(168, 85, 247, 0.2)',
                  color: 'var(--color-purple)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                ADMIN
              </span>
            </button>
          )}

          <div className="drawer-nav-section-label" style={{ marginTop: 12 }}>External Services</div>

          <a
            href="http://localhost:5174/app"
            target="_blank"
            rel="noreferrer"
            className="drawer-nav-item"
            style={{ color: '#a78bfa' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Globe size={18} />
              <span>Client Hub Console</span>
            </div>
            <ExternalLink size={14} />
          </a>
        </div>

        {/* Sign Out Section with Confirmation */}
        <div className="mobile-drawer-footer">
          {showSignoutConfirm ? (
            <div className="signout-confirm-box">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-rose)', fontSize: '0.85rem', marginBottom: 10 }}>
                <AlertTriangle size={16} />
                <span>Sign out of security console session?</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ flex: 1, minHeight: 44 }}
                  onClick={() => setShowSignoutConfirm(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  style={{ flex: 1, minHeight: 44 }}
                  onClick={handleSignOut}
                >
                  Confirm Sign Out
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowSignoutConfirm(true)}
              className="btn btn-secondary"
              style={{ width: '100%', minHeight: 44, justifyContent: 'center', gap: 8 }}
            >
              <LogOut size={16} />
              Sign Out
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
