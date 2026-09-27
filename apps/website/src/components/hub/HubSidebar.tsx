import React from 'react';
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
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

export const HubSidebar: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const username = user?.email.split('@')[0] || 'alexchen';

  const isHome = location.pathname === '/app';
  const isBilling = location.pathname === '/app/billing';

  return (
    <aside
      style={{
        width: '260px',
        backgroundColor: 'var(--hub-sidebar-bg)',
        borderRight: '1px solid var(--hub-sidebar-border)',
        minHeight: 'calc(100vh - 60px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '1.25rem 0',
        flexShrink: 0,
      }}
    >
      <div>
        {/* Profile Switcher Card */}
        <div style={{ padding: '0 1rem 1.25rem', borderBottom: '1px solid var(--hub-sidebar-border)' }}>
          <div
            style={{
              backgroundColor: '#1C1633',
              border: '1px solid #2B214C',
              borderRadius: '8px',
              padding: '0.65rem 0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
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
                <div style={{ fontSize: '0.7rem', color: '#94A3B8' }}>Personal Workspace</div>
              </div>
            </div>
            <ChevronDown size={14} color="#94A3B8" />
          </div>
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
              fontWeight: 500,
              color: isHome ? '#FFFFFF' : '#94A3B8',
              backgroundColor: isHome ? 'var(--hub-sidebar-active)' : 'transparent',
              borderLeft: isHome ? '3px solid var(--hub-sidebar-active-border)' : '3px solid transparent',
              transition: 'background-color 0.15s',
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
              transition: 'color 0.15s',
            }}
          >
            <Terminal size={16} color="#94A3B8" />
            <span>Build & Enclave (SOC)</span>
          </a>
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

          <Link
            to="/app/settings"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.5rem 1.25rem',
              fontSize: '0.825rem',
              color: '#94A3B8',
            }}
          >
            <User size={15} />
            <span>Account Information</span>
          </Link>

          <Link
            to="/app/settings"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.5rem 1.25rem',
              fontSize: '0.825rem',
              color: '#94A3B8',
            }}
          >
            <Mail size={15} />
            <span>Email & Identity</span>
          </Link>

          <Link
            to="/app/settings"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.5rem 1.25rem',
              fontSize: '0.825rem',
              color: '#94A3B8',
            }}
          >
            <Lock size={15} />
            <span>Password</span>
          </Link>

          <Link
            to="/app/settings"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.5rem 1.25rem',
              fontSize: '0.825rem',
              color: '#94A3B8',
            }}
          >
            <Fingerprint size={15} />
            <span>2FA & Passkeys</span>
          </Link>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.5rem 1.25rem',
              fontSize: '0.825rem',
              color: '#64748B',
              cursor: 'not-allowed',
            }}
          >
            <KeyRound size={15} />
            <span>Personal Access Tokens</span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.5rem 1.25rem',
              fontSize: '0.825rem',
              color: '#64748B',
              cursor: 'not-allowed',
            }}
          >
            <Server size={15} />
            <span>Connected Clusters</span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.5rem 1.25rem',
              fontSize: '0.825rem',
              color: '#64748B',
              cursor: 'not-allowed',
            }}
          >
            <Building2 size={15} />
            <span>Convert / Organization</span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.5rem 1.25rem',
              fontSize: '0.825rem',
              color: '#64748B',
              cursor: 'not-allowed',
            }}
          >
            <ShieldCheck size={15} />
            <span>Privacy & Audit</span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.5rem 1.25rem',
              fontSize: '0.825rem',
              color: '#F87171',
              cursor: 'pointer',
            }}
          >
            <AlertTriangle size={15} color="#F87171" />
            <span>Deactivate</span>
          </div>
        </div>
      </div>

      {/* Sidebar Footer: Billing & Subscription */}
      <div style={{ borderTop: '1px solid var(--hub-sidebar-border)', paddingTop: '0.75rem' }}>
        <Link
          to="/app/billing"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.65rem 1.25rem',
            fontSize: '0.85rem',
            fontWeight: 500,
            color: isBilling ? '#FFFFFF' : '#CBD5E1',
            backgroundColor: isBilling ? 'var(--hub-sidebar-active)' : 'transparent',
            borderLeft: isBilling ? '3px solid var(--hub-sidebar-active-border)' : '3px solid transparent',
          }}
        >
          <CreditCard size={16} color={isBilling ? '#A78BFA' : '#94A3B8'} />
          <span>Billing & Subscription</span>
        </Link>
      </div>
    </aside>
  );
};
