import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Activity,
  FileText,
  AlertOctagon,
  Lock,
  Users,
  Terminal,
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  openAlertCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  openAlertCount = 0,
}) => {
  const { isAdmin } = useAuth();

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="brand">
        <img
          src="/logo.png"
          alt="SentinelKey"
          style={{
            width: 32,
            height: 37,
            objectFit: 'contain',
            flexShrink: 0,
            filter: 'drop-shadow(0 2px 8px rgba(139, 92, 246, 0.45))',
          }}
        />
        <div>
          <div className="brand-name">SentinelKey</div>
          <span className="brand-tag">SOC Stack v0.1</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="nav-menu">
        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, padding: '8px 12px 4px' }}>
          Monitoring & Telemetry
        </div>

        <button
          className={`nav-item ${currentTab === 'overview' ? 'active' : ''}`}
          onClick={() => setCurrentTab('overview')}
        >
          <Activity size={18} />
          <span>Overview</span>
        </button>

        <button
          className={`nav-item ${currentTab === 'logs' ? 'active' : ''}`}
          onClick={() => setCurrentTab('logs')}
        >
          <FileText size={18} />
          <span>Security Logs</span>
        </button>

        <button
          className={`nav-item ${currentTab === 'alerts' ? 'active' : ''}`}
          onClick={() => setCurrentTab('alerts')}
        >
          <AlertOctagon size={18} />
          <span>IDS Alerts</span>
          {openAlertCount > 0 && (
            <span className="nav-badge">{openAlertCount}</span>
          )}
        </button>

        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, padding: '16px 12px 4px' }}>
          Security Controls
        </div>

        <button
          className={`nav-item ${currentTab === 'mfa' ? 'active' : ''}`}
          onClick={() => setCurrentTab('mfa')}
        >
          <Lock size={18} />
          <span>MFA Configuration</span>
        </button>

        {/* RBAC Protected Admin Tab: only rendered/enabled for users with admin permissions */}
        {isAdmin && (
          <button
            className={`nav-item ${currentTab === 'admin' ? 'active' : ''}`}
            onClick={() => setCurrentTab('admin')}
          >
            <Users size={18} />
            <span>Access Control</span>
            <span
              style={{
                marginLeft: 'auto',
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
      </nav>

      {/* System Status Footer */}
      <div
        style={{
          marginTop: 'auto',
          padding: '16px 20px',
          borderTop: '1px solid var(--border-subtle)',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <Terminal size={14} style={{ color: 'var(--color-cyan)' }} />
        <span>Self-Hosted Security Core</span>
      </div>
    </aside>
  );
};
