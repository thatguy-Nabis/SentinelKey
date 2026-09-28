import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  HelpCircle,
  Bell,
  Moon,
  LogOut,
  X,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  KeyRound,
  User,
  CreditCard,
  Fingerprint,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

export const HubHeader: React.FC = () => {
  const { user, logout } = useAuth();
  const username = user?.email.split('@')[0] || 'alexchen';

  const [showNotifications, setShowNotifications] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [notificationsRead, setNotificationsRead] = useState(false);
  const [themeToast, setThemeToast] = useState(false);

  const notifications = [
    {
      id: 'notif-1',
      title: 'Haversine IDS Impossible Travel Flagged',
      time: '12 min ago',
      desc: 'Rapid geo-velocity of 8,240 km/h detected between consecutive logins.',
      icon: AlertTriangle,
      color: '#EF4444',
      link: '/app/settings/audit',
    },
    {
      id: 'notif-2',
      title: 'New Personal Access Token Created',
      time: '2 hours ago',
      desc: 'Token "SentinelKey CLI Daemon" was generated with 3 scopes.',
      icon: KeyRound,
      color: '#8B5CF6',
      link: '/app/settings/tokens',
    },
    {
      id: 'notif-3',
      title: 'RFC 6238 TOTP MFA Verified',
      time: '1 day ago',
      desc: 'Two-factor authentication code validated successfully.',
      icon: CheckCircle2,
      color: '#10B981',
      link: '/app/settings/mfa',
    },
  ];

  return (
    <header
      style={{
        height: '60px',
        backgroundColor: 'var(--hub-topbar-bg)',
        borderBottom: '1px solid var(--hub-sidebar-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1.5rem',
        color: 'var(--hub-text-primary)',
        position: 'sticky',
        top: 0,
        zIndex: 40,
      }}
    >
      {/* Left: Brand + Breadcrumb Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        <Link to="/app" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '7px',
              background: 'linear-gradient(135deg, #8B5CF6 0%, #6B4DE6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShieldCheck size={20} color="#ffffff" />
          </div>
          <span style={{ fontSize: '1.15rem', fontWeight: 700, letterSpacing: '-0.02em', color: '#ffffff' }}>
            Sentinel<span style={{ color: '#8B5CF6' }}>Key</span>
          </span>
        </Link>

        {/* Sentinel Key Badge / Pill */}
        <div
          style={{
            backgroundColor: '#1E1836',
            border: '1px solid #322659',
            padding: '0.2rem 0.65rem',
            borderRadius: '6px',
            fontSize: '0.75rem',
            color: '#CBD5E1',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontFamily: 'var(--font-mono)',
          }}
        >
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981' }} />
          <span>Security Stack Active</span>
        </div>
      </div>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', position: 'relative' }}>
        {/* Help button */}
        <button
          onClick={() => {
            setShowHelp(!showHelp);
            setShowNotifications(false);
            setShowProfileMenu(false);
          }}
          style={{
            color: showHelp ? '#FFFFFF' : '#94A3B8',
            backgroundColor: showHelp ? '#261C49' : 'transparent',
            padding: '6px',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            transition: 'color 0.15s',
          }}
          title="Help & Reference"
        >
          <HelpCircle size={18} />
        </button>

        {/* Notifications button */}
        <button
          onClick={() => {
            setShowNotifications(!showNotifications);
            setShowHelp(false);
            setShowProfileMenu(false);
          }}
          style={{
            color: showNotifications ? '#FFFFFF' : '#94A3B8',
            backgroundColor: showNotifications ? '#261C49' : 'transparent',
            padding: '6px',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            transition: 'color 0.15s',
          }}
          title="Notifications"
        >
          <Bell size={18} />
          {!notificationsRead && (
            <span
              style={{
                position: 'absolute',
                top: '5px',
                right: '5px',
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: '#8B5CF6',
              }}
            />
          )}
        </button>

        {/* Dark/Light Mode */}
        <button
          onClick={() => {
            setThemeToast(true);
            setTimeout(() => setThemeToast(false), 2500);
          }}
          style={{
            color: '#94A3B8',
            backgroundColor: 'transparent',
            padding: '6px',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
          }}
          title="Theme (Locked to Obsidian Dark for Console)"
        >
          <Moon size={18} />
        </button>

        {/* User Profile Avatar */}
        <div style={{ position: 'relative' }}>
          <div
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowNotifications(false);
              setShowHelp(false);
            }}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: '#6B4DE6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: '0.85rem',
              fontWeight: 700,
              boxShadow: '0 0 0 2px #3B2D6B',
              cursor: 'pointer',
            }}
            title="Profile & Options"
          >
            {username.charAt(0).toUpperCase()}
          </div>

          {/* Profile Dropdown Menu */}
          {showProfileMenu && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 10px)',
                right: 0,
                width: '220px',
                backgroundColor: '#171328',
                border: '1px solid #33265D',
                borderRadius: '8px',
                padding: '0.5rem',
                boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
                zIndex: 50,
              }}
            >
              <div style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #2B214C', marginBottom: '0.35rem' }}>
                <div style={{ color: '#F8FAFC', fontWeight: 600, fontSize: '0.85rem' }}>{username}</div>
                <div style={{ color: '#94A3B8', fontSize: '0.75rem' }}>{user?.email || 'alexchen@sentinelkey.io'}</div>
              </div>

              <Link
                to="/app/settings/account"
                onClick={() => setShowProfileMenu(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  padding: '0.5rem 0.75rem',
                  color: '#CBD5E1',
                  fontSize: '0.825rem',
                  borderRadius: '6px',
                }}
              >
                <User size={15} color="#A78BFA" /> Account Settings
              </Link>

              <Link
                to="/app/settings/mfa"
                onClick={() => setShowProfileMenu(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  padding: '0.5rem 0.75rem',
                  color: '#CBD5E1',
                  fontSize: '0.825rem',
                  borderRadius: '6px',
                }}
              >
                <Fingerprint size={15} color="#10B981" /> 2FA (RFC 6238 TOTP)
              </Link>

              <Link
                to="/app/billing"
                onClick={() => setShowProfileMenu(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  padding: '0.5rem 0.75rem',
                  color: '#CBD5E1',
                  fontSize: '0.825rem',
                  borderRadius: '6px',
                }}
              >
                <CreditCard size={15} color="#60A5FA" /> Billing &amp; Invoices
              </Link>

              <div style={{ borderTop: '1px solid #2B214C', margin: '0.35rem 0' }} />

              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  logout();
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  padding: '0.5rem 0.75rem',
                  color: '#F87171',
                  fontSize: '0.825rem',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: '6px',
                  textAlign: 'left',
                }}
              >
                <LogOut size={15} /> Sign Out
              </button>
            </div>
          )}
        </div>

        {/* Notifications Dropdown */}
        {showNotifications && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 10px)',
              right: 0,
              width: '340px',
              backgroundColor: '#171328',
              border: '1px solid #33265D',
              borderRadius: '8px',
              padding: '1rem',
              boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
              zIndex: 50,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#F8FAFC' }}>Security Alerts &amp; Events</div>
              <button
                onClick={() => setNotificationsRead(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#A78BFA',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Mark read
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
              {notifications.map((n) => {
                const Icon = n.icon;
                return (
                  <Link
                    key={n.id}
                    to={n.link}
                    onClick={() => setShowNotifications(false)}
                    style={{
                      display: 'flex',
                      gap: '0.65rem',
                      padding: '0.6rem',
                      backgroundColor: '#110D20',
                      borderRadius: '6px',
                      border: '1px solid #281F47',
                      color: 'inherit',
                    }}
                  >
                    <div style={{ marginTop: '2px' }}>
                      <Icon size={16} color={n.color} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#F8FAFC' }}>{n.title}</div>
                      <div style={{ fontSize: '0.725rem', color: '#94A3B8', marginTop: '2px', lineHeight: 1.3 }}>{n.desc}</div>
                      <div style={{ fontSize: '0.675rem', color: '#64748B', marginTop: '3px' }}>{n.time}</div>
                    </div>
                  </Link>
                );
              })}
            </div>

            <Link
              to="/app/settings/audit"
              onClick={() => setShowNotifications(false)}
              style={{
                display: 'block',
                textAlign: 'center',
                fontSize: '0.775rem',
                color: 'var(--hub-purple-light)',
                fontWeight: 600,
              }}
            >
              View full audit trail →
            </Link>
          </div>
        )}

        {/* Help & Reference Modal */}
        {showHelp && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 10px)',
              right: 0,
              width: '360px',
              backgroundColor: '#171328',
              border: '1px solid #33265D',
              borderRadius: '8px',
              padding: '1.25rem',
              boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
              zIndex: 50,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#F8FAFC' }}>SentinelKey Quick Reference</div>
              <button
                onClick={() => setShowHelp(false)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ fontSize: '0.825rem', color: '#CBD5E1', lineHeight: 1.5, marginBottom: '1rem' }}>
              <div>• <strong>Auth Engine</strong>: <code>POST /api/auth/login</code> (JWT + TOTP)</div>
              <div>• <strong>Heuristic IDS</strong>: <code>POST /api/ids/telemetry</code> (&gt;800 km/h velocity)</div>
              <div>• <strong>ML Anomaly</strong>: <code>POST http://localhost:5001/predict</code></div>
              <div>• <strong>Vault Encrypt</strong>: <code>POST /api/crypto/encrypt</code> (SKF1 / AES-256-GCM)</div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid #2B214C', paddingTop: '0.85rem' }}>
              <Link
                to="/docs"
                onClick={() => setShowHelp(false)}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  backgroundColor: '#261C49',
                  border: '1px solid #3B2D6B',
                  color: '#DDD6FE',
                  padding: '0.45rem',
                  borderRadius: '6px',
                  fontSize: '0.775rem',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                }}
              >
                Full Docs <ExternalLink size={12} />
              </Link>
              <Link
                to="/support"
                onClick={() => setShowHelp(false)}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  backgroundColor: '#261C49',
                  border: '1px solid #3B2D6B',
                  color: '#DDD6FE',
                  padding: '0.45rem',
                  borderRadius: '6px',
                  fontSize: '0.775rem',
                  fontWeight: 600,
                }}
              >
                Get Support
              </Link>
            </div>
          </div>
        )}

        {/* Theme indicator toast */}
        {themeToast && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 10px)',
              right: 0,
              backgroundColor: '#1E1838',
              border: '1px solid #8B5CF6',
              borderRadius: '6px',
              padding: '0.5rem 0.85rem',
              color: '#F8FAFC',
              fontSize: '0.775rem',
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
              zIndex: 50,
            }}
          >
            🔒 Obsidian Dark theme enforced for security operations
          </div>
        )}
      </div>
    </header>
  );
};
