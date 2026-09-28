import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutGrid,
  Terminal,
  User,
  Mail,
  Lock,
  Fingerprint,
  KeyRound,
  Server,
  Building2,
  ShieldCheck,
  AlertTriangle,
  CreditCard,
  ChevronDown,
  Check,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

export const HubSidebar: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const username = user?.email.split('@')[0] || 'alexchen';
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [activeOrg, setActiveOrg] = useState('Personal Workspace');

  const isHome = location.pathname === '/app';
  const isBilling = location.pathname === '/app/billing';

  const accountNavItems = [
    {
      id: 'account',
      path: '/app/settings/account',
      matchPaths: ['/app/settings', '/app/settings/account'],
      label: 'Account Information',
      icon: User,
    },
    {
      id: 'email',
      path: '/app/settings/email',
      matchPaths: ['/app/settings/email'],
      label: 'Email & Identity',
      icon: Mail,
    },
    {
      id: 'password',
      path: '/app/settings/password',
      matchPaths: ['/app/settings/password'],
      label: 'Password',
      icon: Lock,
    },
    {
      id: 'mfa',
      path: '/app/settings/mfa',
      matchPaths: ['/app/settings/mfa'],
      label: '2FA (RFC 6238 TOTP)',
      icon: Fingerprint,
    },
    {
      id: 'tokens',
      path: '/app/settings/tokens',
      matchPaths: ['/app/settings/tokens'],
      label: 'Personal Access Tokens',
      icon: KeyRound,
    },
    {
      id: 'services',
      path: '/app/settings/services',
      matchPaths: ['/app/settings/services'],
      label: 'Connected Services',
      icon: Server,
    },
    {
      id: 'organization',
      path: '/app/settings/organization',
      matchPaths: ['/app/settings/organization'],
      label: 'Convert / Organization',
      icon: Building2,
    },
    {
      id: 'audit',
      path: '/app/settings/audit',
      matchPaths: ['/app/settings/audit'],
      label: 'Privacy & Audit',
      icon: ShieldCheck,
    },
    {
      id: 'deactivate',
      path: '/app/settings/deactivate',
      matchPaths: ['/app/settings/deactivate'],
      label: 'Deactivate',
      icon: AlertTriangle,
      isDanger: true,
    },
  ];

  return (
    <aside
      className="hub-sidebar-scroll"
      style={{
        width: '260px',
        backgroundColor: 'var(--hub-sidebar-bg)',
        borderRight: '1px solid var(--hub-sidebar-border)',
        height: 'calc(100vh - 60px)',
        position: 'sticky',
        top: '60px',
        display: 'flex',
        flexDirection: 'column',
        padding: '1.25rem 0',
        flexShrink: 0,
        overflowY: 'auto',
      }}
    >
      <div>
        {/* Profile Switcher Card */}
        <div style={{ padding: '0 1rem 1.25rem', borderBottom: '1px solid var(--hub-sidebar-border)', position: 'relative' }}>
          <div
            onClick={() => setWorkspaceMenuOpen(!workspaceMenuOpen)}
            style={{
              backgroundColor: '#1C1633',
              border: '1px solid #2B214C',
              borderRadius: '8px',
              padding: '0.65rem 0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              transition: 'border-color 0.15s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--hub-purple-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                }}
              >
                {username.charAt(0).toUpperCase()}
              </div>
              <div style={{ lineHeight: 1.2 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#F8FAFC' }}>{username}</div>
                <div style={{ fontSize: '0.7rem', color: '#94A3B8' }}>{activeOrg}</div>
              </div>
            </div>
            <ChevronDown size={14} color="#94A3B8" />
          </div>

          {/* Workspace dropdown menu */}
          {workspaceMenuOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% - 0.5rem)',
                left: '1rem',
                right: '1rem',
                backgroundColor: '#1A1430',
                border: '1px solid #33265D',
                borderRadius: '8px',
                padding: '0.4rem',
                zIndex: 50,
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              }}
            >
              <div
                onClick={() => {
                  setActiveOrg('Personal Workspace');
                  setWorkspaceMenuOpen(false);
                }}
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  backgroundColor: activeOrg === 'Personal Workspace' ? '#261C49' : 'transparent',
                  color: activeOrg === 'Personal Workspace' ? '#FFFFFF' : '#CBD5E1',
                }}
              >
                <span>Personal Workspace</span>
                {activeOrg === 'Personal Workspace' && <Check size={14} color="#A78BFA" />}
              </div>
              <Link
                to="/app/settings/organization"
                onClick={() => {
                  setActiveOrg('SentinelKey SecOps Team');
                  setWorkspaceMenuOpen(false);
                }}
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  backgroundColor: activeOrg === 'SentinelKey SecOps Team' ? '#261C49' : 'transparent',
                  color: activeOrg === 'SentinelKey SecOps Team' ? '#FFFFFF' : '#CBD5E1',
                }}
              >
                <span>SentinelKey SecOps Team</span>
                {activeOrg === 'SentinelKey SecOps Team' && <Check size={14} color="#A78BFA" />}
              </Link>
            </div>
          )}
        </div>

        {/* WORKSPACE Navigation */}
        <div style={{ padding: '1.25rem 0 0.5rem' }}>
          <div
            style={{
              padding: '0 1.25rem 0.5rem',
              fontSize: '0.7rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              color: 'var(--hub-text-muted)',
              textTransform: 'uppercase',
            }}
          >
            Workspace
          </div>

          <Link
            to="/app"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.6rem 1.25rem',
              fontSize: '0.85rem',
              fontWeight: isHome ? 600 : 500,
              color: isHome ? '#FFFFFF' : '#94A3B8',
              backgroundColor: isHome ? 'var(--hub-sidebar-active)' : 'transparent',
              borderLeft: isHome ? '3px solid var(--hub-sidebar-active-border)' : '3px solid transparent',
              transition: 'all 0.15s ease',
            }}
          >
            <LayoutGrid size={16} color={isHome ? '#A78BFA' : '#94A3B8'} />
            <span>Home</span>
          </Link>

          <a
            href="http://localhost:5173"
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.6rem 1.25rem',
              fontSize: '0.85rem',
              fontWeight: 500,
              color: '#94A3B8',
              borderLeft: '3px solid transparent',
              transition: 'all 0.15s ease',
            }}
          >
            <Terminal size={16} color="#94A3B8" />
            <span>Security Operations (SOC)</span>
          </a>

          <Link
            to="/app/billing"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.6rem 1.25rem',
              fontSize: '0.85rem',
              fontWeight: isBilling ? 600 : 500,
              color: isBilling ? '#FFFFFF' : '#94A3B8',
              backgroundColor: isBilling ? 'var(--hub-sidebar-active)' : 'transparent',
              borderLeft: isBilling ? '3px solid var(--hub-sidebar-active-border)' : '3px solid transparent',
              transition: 'all 0.15s ease',
            }}
          >
            <CreditCard size={16} color={isBilling ? '#A78BFA' : '#94A3B8'} />
            <span>Billing &amp; Subscription</span>
          </Link>
        </div>

        {/* ACCOUNT & SECURITY Navigation */}
        <div style={{ padding: '1rem 0 0.5rem' }}>
          <div
            style={{
              padding: '0 1.25rem 0.5rem',
              fontSize: '0.7rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              color: 'var(--hub-text-muted)',
              textTransform: 'uppercase',
            }}
          >
            Account & Security
          </div>

          {accountNavItems.map((item) => {
            const isActive = item.matchPaths.some((p) => location.pathname === p);
            const Icon = item.icon;

            return (
              <Link
                key={item.id}
                to={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.55rem 1.25rem',
                  fontSize: '0.825rem',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive
                    ? item.isDanger
                      ? '#F87171'
                      : '#FFFFFF'
                    : item.isDanger
                    ? '#F87171'
                    : '#94A3B8',
                  backgroundColor: isActive
                    ? item.isDanger
                      ? 'rgba(239, 68, 68, 0.15)'
                      : 'var(--hub-sidebar-active)'
                    : 'transparent',
                  borderLeft: isActive
                    ? item.isDanger
                      ? '3px solid #EF4444'
                      : '3px solid var(--hub-sidebar-active-border)'
                    : '3px solid transparent',
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon
                  size={15}
                  color={
                    item.isDanger
                      ? '#F87171'
                      : isActive
                      ? '#A78BFA'
                      : '#94A3B8'
                  }
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </aside>
  );
};
