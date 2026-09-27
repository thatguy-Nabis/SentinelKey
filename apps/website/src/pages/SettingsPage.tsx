import React from 'react';
import { HubHeader } from '../components/hub/HubHeader.js';
import { HubSidebar } from '../components/hub/HubSidebar.js';
import { useAuth } from '../context/AuthContext.js';
import { User, Shield, KeyRound, ExternalLink, LogOut } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user, logout } = useAuth();
  const username = user?.email.split('@')[0] || 'alexchen';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--hub-bg-app)', color: 'var(--hub-text-primary)' }}>
      <HubHeader />
      <div style={{ display: 'flex' }}>
        <HubSidebar />

        <main style={{ flex: 1, padding: '2rem 2.5rem', minWidth: 0 }}>
          <div style={{ maxWidth: '960px', margin: '0 auto' }}>
            <div style={{ marginBottom: '2.5rem' }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#F8FAFC' }}>
                Account & Security Settings
              </h1>
              <p style={{ fontSize: '0.9rem', color: '#94A3B8', marginTop: '0.25rem' }}>
                Manage your credentials, 2FA enclaves, and personal security configuration.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              {/* Profile Card */}
              <div className="hub-card" style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  <User size={20} color="#8B5CF6" />
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#F8FAFC' }}>Identity Profile</h3>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 600 }}>
                      Username
                    </label>
                    <div style={{ fontSize: '0.95rem', color: '#F8FAFC', fontWeight: 500, marginTop: '0.25rem' }}>
                      {username}
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 600 }}>
                      Email Address
                    </label>
                    <div style={{ fontSize: '0.95rem', color: '#F8FAFC', fontWeight: 500, marginTop: '0.25rem' }}>
                      {user?.email || 'alexchen@sentinelkey.io'}
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 600 }}>
                      Assigned RBAC Roles
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.35rem' }}>
                      {user?.roles?.map((r, i) => (
                        <span
                          key={i}
                          style={{
                            backgroundColor: '#261C49',
                            color: '#A78BFA',
                            border: '1px solid #3B2D6B',
                            borderRadius: '4px',
                            padding: '2px 8px',
                            fontSize: '0.75rem',
                            fontFamily: 'var(--font-mono)',
                            fontWeight: 600,
                          }}
                        >
                          {r}
                        </span>
                      )) || <span style={{ color: '#94A3B8', fontSize: '0.85rem' }}>viewer</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* MFA Security Card */}
              <div className="hub-card" style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  <Shield size={20} color="#10B981" />
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#F8FAFC' }}>
                    Two-Factor Authentication (2FA)
                  </h3>
                </div>

                <p style={{ fontSize: '0.9rem', color: '#94A3B8', lineHeight: 1.5, marginBottom: '1.5rem' }}>
                  SentinelKey enforces cryptographic TOTP verification. Set up an authenticator app (1Password, Google Authenticator, YubiKey) to safeguard your cluster credentials.
                </p>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <span style={{ fontSize: '0.85rem', color: '#CBD5E1' }}>Status: </span>
                    <span
                      style={{
                        backgroundColor: user?.mfaEnabled ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: user?.mfaEnabled ? '#10B981' : '#F87171',
                        border: `1px solid ${user?.mfaEnabled ? '#10B981' : '#EF4444'}`,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      {user?.mfaEnabled ? 'MFA ENABLED' : 'MFA DISABLED'}
                    </span>
                  </div>

                  <a
                    href="http://localhost:5173"
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      backgroundColor: 'var(--hub-purple-primary)',
                      color: '#ffffff',
                      padding: '0.55rem 1.15rem',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                    }}
                  >
                    Configure in SOC Console <ExternalLink size={14} />
                  </a>
                </div>
              </div>

              {/* Sessions & Logout */}
              <div className="hub-card" style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <KeyRound size={20} color="#F59E0B" />
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#F8FAFC' }}>Session Management</h3>
                </div>

                <p style={{ fontSize: '0.85rem', color: '#94A3B8', marginBottom: '1.5rem' }}>
                  Sign out from all active sessions on this device.
                </p>

                <button
                  onClick={logout}
                  style={{
                    backgroundColor: '#261C3D',
                    color: '#F87171',
                    border: '1px solid #452D5A',
                    padding: '0.6rem 1.25rem',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <LogOut size={16} /> Sign out of SentinelKey
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
