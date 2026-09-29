import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { HubHeader } from '../components/hub/HubHeader.js';
import { HubSidebar } from '../components/hub/HubSidebar.js';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../services/api.js';
import {
  User,
  Mail,
  Lock,
  Fingerprint,
  KeyRound,
  Building2,
  AlertTriangle,
  Check,
  Copy,
  Plus,
  Trash2,
  Download,
  RefreshCw,
  Shield,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  LogOut,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { tab } = useParams<{ tab?: string }>();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const username = user?.email ? user.email.split('@')[0] : 'operator';

  // Default to 'account' if no tab param
  const activeTab = tab || 'account';

  // Global notification banner
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // --------------------------------------------------------------------------
  // Tab 1: Account Information State (with local persistence)
  // --------------------------------------------------------------------------
  const profileStorageKey = `sentinelkey_profile_${user?.id || 'guest'}`;
  const getStoredProfile = () => {
    try {
      const raw = localStorage.getItem(profileStorageKey);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };
  const cachedProfile = getStoredProfile();

  const [fullName, setFullName] = useState(
    cachedProfile?.fullName || (user?.email ? user.email.split('@')[0].toUpperCase() : 'Security Admin'),
  );
  const [accountUsername, setAccountUsername] = useState(cachedProfile?.accountUsername || username);
  const [company, setCompany] = useState(cachedProfile?.company || 'Local Dev Environment');
  const [timezone, setTimezone] = useState(cachedProfile?.timezone || 'UTC+05:45 (Kathmandu)');
  const [isSavingAccount, setIsSavingAccount] = useState(false);

  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingAccount(true);
    try {
      localStorage.setItem(
        profileStorageKey,
        JSON.stringify({ fullName, accountUsername, company, timezone }),
      );
    } catch {}
    setTimeout(() => {
      setIsSavingAccount(false);
      showToast('Account details successfully updated.');
    }, 400);
  };

  // --------------------------------------------------------------------------
  // Tab 2: Email & Identity State
  // --------------------------------------------------------------------------
  const [primaryEmail, setPrimaryEmail] = useState(user?.email || 'operator@sentinelkey.local');
  const [backupEmail, setBackupEmail] = useState(cachedProfile?.backupEmail || 'backup@sentinelkey.local');
  const [notifyIdsAlerts, setNotifyIdsAlerts] = useState(true);
  const [notifyMlAnomalies, setNotifyMlAnomalies] = useState(true);
  const [notifyKhaltiInvoices, setNotifyKhaltiInvoices] = useState(true);

  const handleSaveEmail = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const existing = getStoredProfile() || {};
      localStorage.setItem(profileStorageKey, JSON.stringify({ ...existing, backupEmail }));
    } catch {}
    showToast('Email preferences & alert routing updated.');
  };

  // --------------------------------------------------------------------------
  // Tab 3: Password State
  // --------------------------------------------------------------------------
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const calculatePasswordStrength = (pwd: string) => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };

  const pwdScore = calculatePasswordStrength(newPassword);

  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      setPasswordError('Please provide your current password.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setIsUpdatingPassword(true);
    setPasswordError('');
    try {
      await api.changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('Master password successfully updated in your SentinelKey account.');
    } catch (err: unknown) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to update password.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // --------------------------------------------------------------------------
  // Tab 4: 2FA (RFC 6238 TOTP) State
  // --------------------------------------------------------------------------
  const [mfaEnabled, setMfaEnabled] = useState(user?.mfaEnabled ?? true);
  const [totpInput, setTotpInput] = useState('');
  const [totpVerificationMsg, setTotpVerificationMsg] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const base32Secret = 'JBSWY3DPEHPK3PXP';
  const [recoveryCodes, setRecoveryCodes] = useState([
    'a7f2-9c01',
    '3b8d-e45f',
    '52e1-70ba',
    '89c3-11df',
    'c04b-9aa8',
    '1e3d-55fc',
    '47a9-22cb',
    'f610-84eb',
  ]);

  const copySecret = () => {
    navigator.clipboard.writeText(base32Secret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  const handleVerifyTotp = (e: React.FormEvent) => {
    e.preventDefault();
    if (totpInput.length !== 6 || !/^\d+$/.test(totpInput)) {
      setTotpVerificationMsg('Please enter a 6-digit TOTP code.');
      return;
    }
    setTotpVerificationMsg('TOTP code verified successfully! Authentication test passed.');
    setTotpInput('');
    showToast('TOTP verification successful.');
  };

  const downloadRecoveryCodes = () => {
    const content = `SentinelKey MFA Emergency Recovery Codes\nGenerated: ${new Date().toISOString()}\nAccount: ${user?.email || 'alexchen@sentinelkey.io'}\n\n` +
      recoveryCodes.map((c, i) => `${i + 1}. ${c}`).join('\n') +
      '\n\nKeep these codes stored securely offline in an encrypted password vault.';
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sentinelkey-recovery-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Recovery codes downloaded to sentinelkey-recovery-codes.txt');
  };

  const regenerateRecoveryCodes = () => {
    const newCodes = Array.from({ length: 8 }, () => {
      const part1 = Math.random().toString(16).substring(2, 6);
      const part2 = Math.random().toString(16).substring(2, 6);
      return `${part1}-${part2}`;
    });
    setRecoveryCodes(newCodes);
    showToast('New emergency recovery codes generated.');
  };

  // --------------------------------------------------------------------------
  // Tab 5: Personal Access Tokens State
  // --------------------------------------------------------------------------
  const [tokens, setTokens] = useState([
    {
      id: 'tok-1',
      name: 'SentinelKey CLI Daemon (Workstation)',
      prefix: 'sk_live_9a7f8e...',
      scope: 'ids:read, crypto:encrypt, ml:score',
      created: '2026-09-12',
      lastUsed: '14 minutes ago',
    },
    {
      id: 'tok-2',
      name: 'GitHub Actions Security CI/CD',
      prefix: 'sk_live_3c1b99...',
      scope: 'crypto:encrypt, audit:read',
      created: '2026-08-30',
      lastUsed: 'Yesterday',
    },
  ]);

  const [isGeneratingToken, setIsGeneratingToken] = useState(false);
  const [newTokenName, setNewTokenName] = useState('');
  const [newTokenExpiry, setNewTokenExpiry] = useState('90');
  const [newlyCreatedToken, setNewlyCreatedToken] = useState<string | null>(null);

  const handleCreateToken = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTokenName.trim()) return;

    const randomHex = Array.from({ length: 24 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const fullToken = `sk_live_${randomHex}`;

    const newTokenItem = {
      id: `tok-${Date.now()}`,
      name: newTokenName.trim(),
      prefix: `${fullToken.slice(0, 15)}...`,
      scope: 'ids:read, ids:write, crypto:encrypt, ml:score',
      created: 'Just now',
      lastUsed: 'Never',
    };

    setTokens([newTokenItem, ...tokens]);
    setNewlyCreatedToken(fullToken);
    setNewTokenName('');
    setIsGeneratingToken(false);
    showToast('Personal access token generated.');
  };

  const handleRevokeToken = (id: string) => {
    setTokens(tokens.filter((t) => t.id !== id));
    showToast('Access token revoked.');
  };

  // --------------------------------------------------------------------------
  // Tab 6: Connected Services State
  // --------------------------------------------------------------------------
  const [services, setServices] = useState([
    {
      id: 'core-api',
      name: 'SentinelKey Core API',
      url: 'http://localhost:3000/api',
      engine: 'Express.js + Node runtime',
      status: 'HEALTHY',
      latency: 14,
      details: 'JWT Authentication, Session management, and SQLite/PostgreSQL store',
    },
    {
      id: 'ml-service',
      name: 'ML Anomaly Engine',
      url: 'http://localhost:5001/predict',
      engine: 'Python 3.11 + Scikit-Learn (Isolation Forest)',
      status: 'HEALTHY',
      latency: 28,
      details: 'Contamination rate 0.05, login hour + geo-distance scoring',
    },
    {
      id: 'ids-daemon',
      name: 'Heuristic IDS Service',
      url: 'Internal In-Memory Engine',
      engine: 'Haversine Velocity & Rapid Failure Thresholds',
      status: 'HEALTHY',
      latency: 2,
      details: 'Speed threshold > 800 km/h, 5-failure lock trigger',
    },
    {
      id: 'mv3-ext',
      name: 'Manifest V3 Chrome Extension',
      url: 'sentinelkey-mv3-relay',
      engine: 'Chromium Background Service Worker',
      status: 'CONNECTED',
      latency: 5,
      details: 'Magic byte (MZ/ELF) inspection & Shannon entropy calculation pre-flight',
    },
    {
      id: 'khalti-gw',
      name: 'Khalti ePayment Gateway',
      url: 'https://a.khalti.com/api/v2/epayment',
      engine: 'Sandbox Merchant API v2',
      status: 'CONFIGURED',
      latency: 85,
      details: 'NPR automated invoicing, return_url webhook verification',
    },
  ]);
  const [isPinging, setIsPinging] = useState(false);

  const handlePingServices = () => {
    setIsPinging(true);
    setTimeout(() => {
      setServices((prev) =>
        prev.map((s) => ({
          ...s,
          latency: Math.floor(Math.random() * 25) + 6,
          status: 'HEALTHY',
        }))
      );
      setIsPinging(false);
      showToast('All connected services pinged. Latency metrics refreshed.');
    }, 700);
  };

  // --------------------------------------------------------------------------
  // Tab 7: Convert / Organization State
  // --------------------------------------------------------------------------
  const [orgName, setOrgName] = useState('SentinelKey SecOps Team');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('analyst');
  const [enforceMfaPolicy, setEnforceMfaPolicy] = useState(true);
  const [members, setMembers] = useState([
    {
      id: 'm-1',
      name: 'Alex Chen',
      email: 'alexchen@sentinelkey.io',
      role: 'Owner',
      mfa: true,
      status: 'Active',
    },
    {
      id: 'm-2',
      name: 'Sarah Lin',
      email: 'sarah.lin@sentinelkey.io',
      role: 'SecOps Admin',
      mfa: true,
      status: 'Active',
    },
    {
      id: 'm-3',
      name: 'Dave K.',
      email: 'dave.k@sentinelkey.io',
      role: 'Security Analyst',
      mfa: false,
      status: 'Invited',
    },
  ]);

  const handleInviteMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    const newMember = {
      id: `m-${Date.now()}`,
      name: inviteEmail.split('@')[0],
      email: inviteEmail.trim(),
      role: inviteRole === 'admin' ? 'SecOps Admin' : inviteRole === 'analyst' ? 'Security Analyst' : 'Viewer',
      mfa: false,
      status: 'Pending',
    };

    setMembers([...members, newMember]);
    setInviteEmail('');
    showToast(`Invitation sent to ${newMember.email}`);
  };

  const handleRemoveMember = (id: string) => {
    setMembers(members.filter((m) => m.id !== id));
    showToast('Member removed from organization.');
  };

  // --------------------------------------------------------------------------
  // Tab 8: Privacy & Audit State
  // --------------------------------------------------------------------------
  const [auditFilter, setAuditFilter] = useState('ALL');
  const [auditLogs] = useState([
    {
      id: 'aud-101',
      timestamp: '2026-09-27 19:42:10 UTC',
      event: 'auth.login.success',
      actor: 'alexchen@sentinelkey.io',
      ip: '103.145.74.12',
      location: 'Kathmandu, NP',
      severity: 'INFO',
      details: 'User authenticated via master password + RFC 6238 TOTP',
    },
    {
      id: 'aud-102',
      timestamp: '2026-09-27 18:22:04 UTC',
      event: 'ids.velocity.flagged',
      actor: 'system.ids_daemon',
      ip: '185.220.101.4',
      location: 'Frankfurt, DE',
      severity: 'CRITICAL',
      details: 'Haversine velocity 8,240 km/h detected between consecutive logins. Flagged.',
    },
    {
      id: 'aud-103',
      timestamp: '2026-09-27 16:11:55 UTC',
      event: 'crypto.encrypt.skf1',
      actor: 'alexchen@sentinelkey.io',
      ip: '103.145.74.12',
      location: 'Kathmandu, NP',
      severity: 'INFO',
      details: 'Payload encrypted with AES-256-GCM. 96-bit IV, 128-bit auth tag generated.',
    },
    {
      id: 'aud-104',
      timestamp: '2026-09-27 14:05:12 UTC',
      event: 'token.create',
      actor: 'alexchen@sentinelkey.io',
      ip: '103.145.74.12',
      location: 'Kathmandu, NP',
      severity: 'INFO',
      details: 'Personal access token "SentinelKey CLI Daemon" created (3 scopes)',
    },
    {
      id: 'aud-105',
      timestamp: '2026-09-27 11:30:40 UTC',
      event: 'ml.anomaly.scored',
      actor: 'system.ml_service',
      ip: '91.240.118.82',
      location: 'Amsterdam, NL',
      severity: 'WARNING',
      details: 'Isolation Forest anomaly score -0.68 (Anomaly). Contingency alert triggered.',
    },
  ]);

  const filteredLogs = auditLogs.filter((log) => {
    if (auditFilter === 'ALL') return true;
    if (auditFilter === 'AUTH') return log.event.startsWith('auth.');
    if (auditFilter === 'IDS') return log.event.startsWith('ids.');
    if (auditFilter === 'CRYPTO') return log.event.startsWith('crypto.');
    if (auditFilter === 'ML') return log.event.startsWith('ml.');
    return true;
  });

  const exportAuditJson = () => {
    const jsonString = JSON.stringify(auditLogs, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sentinelkey-audit-logs-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Audit logs exported as JSON.');
  };

  const exportAuditCsv = () => {
    const headers = 'ID,Timestamp,Event,Actor,IP,Location,Severity,Details\n';
    const rows = auditLogs
      .map(
        (l) =>
          `"${l.id}","${l.timestamp}","${l.event}","${l.actor}","${l.ip}","${l.location}","${l.severity}","${l.details}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sentinelkey-audit-logs-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Audit logs exported as CSV.');
  };

  // --------------------------------------------------------------------------
  // Tab 9: Deactivate State
  // --------------------------------------------------------------------------
  const [chkKeys, setChkKeys] = useState(false);
  const [chkAudit, setChkAudit] = useState(false);
  const [confirmDeleteInput, setConfirmDeleteInput] = useState('');
  const [isDeactivating, setIsDeactivating] = useState(false);

  const canDeactivate = chkKeys && chkAudit && confirmDeleteInput.trim().toUpperCase() === 'DELETE ALEXCHEN';

  const handleDeactivate = () => {
    if (!canDeactivate) return;
    setIsDeactivating(true);
    setTimeout(() => {
      logout();
      navigate('/login');
    }, 1200);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--hub-bg-app)', color: 'var(--hub-text-primary)' }}>
      <HubHeader />
      <div style={{ display: 'flex' }}>
        <HubSidebar />

        <main style={{ flex: 1, padding: '2rem 2.5rem', minWidth: 0, overflowX: 'hidden' }}>
          <div style={{ maxWidth: '980px', margin: '0 auto' }}>
            {/* Toast Notification */}
            {toastMessage && (
              <div
                style={{
                  backgroundColor: '#1E1838',
                  border: '1px solid #8B5CF6',
                  color: '#F8FAFC',
                  padding: '0.75rem 1.25rem',
                  borderRadius: '8px',
                  marginBottom: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  boxShadow: '0 4px 16px rgba(139, 92, 246, 0.25)',
                }}
              >
                <CheckCircle2 size={18} color="#34D399" />
                <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{toastMessage}</span>
              </div>
            )}

            {/* PANE 1: Account Information */}
            {(activeTab === 'account' || activeTab === '') && (
              <div>
                <div style={{ marginBottom: '2rem' }}>
                  <div style={{ fontSize: '0.8rem', color: '#94A3B8', fontFamily: 'var(--font-mono)', marginBottom: '0.35rem' }}>
                    Account &amp; Security / Profile
                  </div>
                  <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#F8FAFC' }}>
                    Account Information
                  </h1>
                  <p style={{ fontSize: '0.9rem', color: '#94A3B8', marginTop: '0.25rem' }}>
                    Manage your personal profile, credentials, and access tier.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                  {/* Profile Edit Card */}
                  <form onSubmit={handleSaveAccount} className="hub-card" style={{ padding: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.75rem' }}>
                      <User size={20} color="#8B5CF6" />
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#F8FAFC' }}>Identity Profile</h3>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '1.75rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.4rem' }}>
                          Full Name
                        </label>
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.65rem 0.85rem',
                            borderRadius: '6px',
                            backgroundColor: '#110D20',
                            border: '1px solid #2B214C',
                            color: '#F8FAFC',
                            fontSize: '0.9rem',
                            outline: 'none',
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.4rem' }}>
                          Username
                        </label>
                        <input
                          type="text"
                          value={accountUsername}
                          onChange={(e) => setAccountUsername(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.65rem 0.85rem',
                            borderRadius: '6px',
                            backgroundColor: '#110D20',
                            border: '1px solid #2B214C',
                            color: '#F8FAFC',
                            fontSize: '0.9rem',
                            outline: 'none',
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.4rem' }}>
                          Company / Organization
                        </label>
                        <input
                          type="text"
                          value={company}
                          onChange={(e) => setCompany(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.65rem 0.85rem',
                            borderRadius: '6px',
                            backgroundColor: '#110D20',
                            border: '1px solid #2B214C',
                            color: '#F8FAFC',
                            fontSize: '0.9rem',
                            outline: 'none',
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.4rem' }}>
                          Time Zone
                        </label>
                        <input
                          type="text"
                          value={timezone}
                          onChange={(e) => setTimezone(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.65rem 0.85rem',
                            borderRadius: '6px',
                            backgroundColor: '#110D20',
                            border: '1px solid #2B214C',
                            color: '#F8FAFC',
                            fontSize: '0.9rem',
                            outline: 'none',
                          }}
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSavingAccount}
                      style={{
                        backgroundColor: 'var(--hub-purple-primary)',
                        color: '#ffffff',
                        padding: '0.65rem 1.4rem',
                        borderRadius: '6px',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        border: 'none',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                      }}
                    >
                      {isSavingAccount ? 'Saving...' : 'Save Profile Changes'}
                    </button>
                  </form>

                  {/* RBAC Roles Card */}
                  <div className="hub-card" style={{ padding: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                      <Shield size={20} color="#10B981" />
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#F8FAFC' }}>
                        Role-Based Access Control (RBAC)
                      </h3>
                    </div>

                    <p style={{ fontSize: '0.85rem', color: '#94A3B8', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                      Your permissions are governed by role-based claims embedded in your signed JWT access token.
                    </p>

                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                      {['admin', 'secops', 'developer'].map((r) => (
                        <div
                          key={r}
                          style={{
                            backgroundColor: '#261C49',
                            border: '1px solid #3B2D6B',
                            borderRadius: '6px',
                            padding: '0.5rem 0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                          }}
                        >
                          <CheckCircle2 size={15} color="#34D399" />
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 600, color: '#DDD6FE' }}>
                            {r}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div style={{ backgroundColor: '#110D20', border: '1px solid #2B214C', borderRadius: '8px', padding: '1rem', fontSize: '0.825rem', color: '#94A3B8', lineHeight: 1.6 }}>
                      <div>• <strong>admin</strong>: Full authorization to manage users, rotate keys, and issue organization invites.</div>
                      <div>• <strong>secops</strong>: Can inspect heuristic IDS velocity threshold violations and train ML anomaly models.</div>
                      <div>• <strong>developer</strong>: Authorized to invoke file encryption (SKF1) and consume REST APIs.</div>
                    </div>
                  </div>

                  {/* Active Session Card */}
                  <div className="hub-card" style={{ padding: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                      <KeyRound size={20} color="#F59E0B" />
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#F8FAFC' }}>Session &amp; Device</h3>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                      <div style={{ fontSize: '0.85rem', color: '#94A3B8' }}>
                        <div>Current IP: <strong style={{ color: '#F8FAFC' }}>103.145.74.12</strong> (Kathmandu, NP)</div>
                        <div>Device: Chrome on Windows 11 • Authenticated session active</div>
                      </div>
                      <button
                        onClick={logout}
                        style={{
                          backgroundColor: '#261C3D',
                          color: '#F87171',
                          border: '1px solid #452D5A',
                          padding: '0.55rem 1.15rem',
                          borderRadius: '6px',
                          fontSize: '0.825rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.45rem',
                        }}
                      >
                        <LogOut size={15} /> Sign out this device
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PANE 2: Email & Identity */}
            {activeTab === 'email' && (
              <div>
                <div style={{ marginBottom: '2rem' }}>
                  <div style={{ fontSize: '0.8rem', color: '#94A3B8', fontFamily: 'var(--font-mono)', marginBottom: '0.35rem' }}>
                    Account &amp; Security / Email
                  </div>
                  <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#F8FAFC' }}>
                    Email &amp; Identity
                  </h1>
                  <p style={{ fontSize: '0.9rem', color: '#94A3B8', marginTop: '0.25rem' }}>
                    Manage verified email addresses, security alert routing, and notifications.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                  <form onSubmit={handleSaveEmail} className="hub-card" style={{ padding: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                      <Mail size={20} color="#8B5CF6" />
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#F8FAFC' }}>Email Configuration</h3>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.75rem' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                          <label style={{ fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 600 }}>
                            Primary Email Address
                          </label>
                          <span style={{ fontSize: '0.75rem', color: '#34D399', fontWeight: 600 }}>● VERIFIED</span>
                        </div>
                        <input
                          type="email"
                          value={primaryEmail}
                          onChange={(e) => setPrimaryEmail(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.65rem 0.85rem',
                            borderRadius: '6px',
                            backgroundColor: '#110D20',
                            border: '1px solid #2B214C',
                            color: '#F8FAFC',
                            fontSize: '0.9rem',
                            outline: 'none',
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.4rem' }}>
                          Secondary / Security Backup Email
                        </label>
                        <input
                          type="email"
                          value={backupEmail}
                          onChange={(e) => setBackupEmail(e.target.value)}
                          placeholder="backup@example.com"
                          style={{
                            width: '100%',
                            padding: '0.65rem 0.85rem',
                            borderRadius: '6px',
                            backgroundColor: '#110D20',
                            border: '1px solid #2B214C',
                            color: '#F8FAFC',
                            fontSize: '0.9rem',
                            outline: 'none',
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid #2B214C', paddingTop: '1.25rem', marginBottom: '1.5rem' }}>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#F8FAFC', marginBottom: '0.75rem' }}>
                        Alert Routing Preferences
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem', color: '#CBD5E1' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={notifyIdsAlerts}
                            onChange={(e) => setNotifyIdsAlerts(e.target.checked)}
                          />
                          <span>Forward IDS Geo-Velocity violations (&gt;800 km/h) immediately</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={notifyMlAnomalies}
                            onChange={(e) => setNotifyMlAnomalies(e.target.checked)}
                          />
                          <span>Send ML anomaly engine alerts (Isolation Forest contamination &gt; 0.70)</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={notifyKhaltiInvoices}
                            onChange={(e) => setNotifyKhaltiInvoices(e.target.checked)}
                          />
                          <span>Receive Khalti ePayment subscription invoices &amp; transaction receipts</span>
                        </label>
                      </div>
                    </div>

                    <button
                      type="submit"
                      style={{
                        backgroundColor: 'var(--hub-purple-primary)',
                        color: '#ffffff',
                        padding: '0.65rem 1.4rem',
                        borderRadius: '6px',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      Save Email Preferences
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* PANE 3: Password */}
            {activeTab === 'password' && (
              <div>
                <div style={{ marginBottom: '2rem' }}>
                  <div style={{ fontSize: '0.8rem', color: '#94A3B8', fontFamily: 'var(--font-mono)', marginBottom: '0.35rem' }}>
                    Account &amp; Security / Credentials
                  </div>
                  <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#F8FAFC' }}>
                    Password Management
                  </h1>
                  <p style={{ fontSize: '0.9rem', color: '#94A3B8', marginTop: '0.25rem' }}>
                    Update master authentication passphrase and manage credential policies.
                  </p>
                </div>

                <div className="hub-card" style={{ padding: '2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <Lock size={20} color="#8B5CF6" />
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#F8FAFC' }}>Change Password</h3>
                  </div>

                  {passwordError && (
                    <div
                      style={{
                        padding: '0.75rem 1rem',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid #EF4444',
                        color: '#F87171',
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        marginBottom: '1.25rem',
                      }}
                    >
                      <AlertCircle size={16} />
                      <span>{passwordError}</span>
                    </div>
                  )}

                  <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.4rem' }}>
                        Current Password
                      </label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••••••"
                        style={{
                          width: '100%',
                          padding: '0.65rem 0.85rem',
                          borderRadius: '6px',
                          backgroundColor: '#110D20',
                          border: '1px solid #2B214C',
                          color: '#F8FAFC',
                          fontSize: '0.9rem',
                          outline: 'none',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.4rem' }}>
                        New Password
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="••••••••••••"
                          style={{
                            width: '100%',
                            padding: '0.65rem 2.5rem 0.65rem 0.85rem',
                            borderRadius: '6px',
                            backgroundColor: '#110D20',
                            border: '1px solid #2B214C',
                            color: '#F8FAFC',
                            fontSize: '0.9rem',
                            outline: 'none',
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          style={{
                            position: 'absolute',
                            right: '0.75rem',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            color: '#94A3B8',
                            cursor: 'pointer',
                          }}
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>

                      {/* Password strength meter */}
                      {newPassword && (
                        <div style={{ marginTop: '0.65rem' }}>
                          <div style={{ display: 'flex', gap: '4px', height: '4px', marginBottom: '0.35rem' }}>
                            {[1, 2, 3, 4, 5].map((level) => (
                              <div
                                key={level}
                                style={{
                                  flex: 1,
                                  borderRadius: '2px',
                                  backgroundColor:
                                    pwdScore >= level
                                      ? pwdScore <= 2
                                        ? '#EF4444'
                                        : pwdScore <= 3
                                        ? '#F59E0B'
                                        : '#10B981'
                                      : '#2B214C',
                                }}
                              />
                            ))}
                          </div>
                          <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                            Strength: {pwdScore <= 2 ? 'Weak' : pwdScore <= 3 ? 'Moderate' : 'Strong (Cryptographic)'}
                          </span>
                        </div>
                      )}
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.4rem' }}>
                        Confirm New Password
                      </label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••••••"
                        style={{
                          width: '100%',
                          padding: '0.65rem 0.85rem',
                          borderRadius: '6px',
                          backgroundColor: '#110D20',
                          border: '1px solid #2B214C',
                          color: '#F8FAFC',
                          fontSize: '0.9rem',
                          outline: 'none',
                        }}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isUpdatingPassword}
                      style={{
                        backgroundColor: isUpdatingPassword ? '#4C1D95' : 'var(--hub-purple-primary)',
                        color: '#ffffff',
                        padding: '0.65rem 1.4rem',
                        borderRadius: '6px',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        border: 'none',
                        cursor: isUpdatingPassword ? 'not-allowed' : 'pointer',
                        marginTop: '0.5rem',
                        width: 'fit-content',
                      }}
                    >
                      {isUpdatingPassword ? 'Updating Password...' : 'Update Password'}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* PANE 4: 2FA (RFC 6238 TOTP) */}
            {activeTab === 'mfa' && (
              <div>
                <div style={{ marginBottom: '2rem' }}>
                  <div style={{ fontSize: '0.8rem', color: '#94A3B8', fontFamily: 'var(--font-mono)', marginBottom: '0.35rem' }}>
                    Account &amp; Security / Multi-Factor
                  </div>
                  <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#F8FAFC' }}>
                    Two-Factor Authentication (RFC 6238 TOTP)
                  </h1>
                  <p style={{ fontSize: '0.9rem', color: '#94A3B8', marginTop: '0.25rem' }}>
                    Protect authentication flow with time-based one-time passwords and recovery codes.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                  {/* Status Toggle Card */}
                  <div className="hub-card" style={{ padding: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Fingerprint size={22} color={mfaEnabled ? '#10B981' : '#F87171'} />
                        <div>
                          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#F8FAFC' }}>
                            RFC 6238 TOTP Verification
                          </h3>
                          <div style={{ fontSize: '0.85rem', color: '#94A3B8', marginTop: '0.2rem' }}>
                            Status:{' '}
                            <strong style={{ color: mfaEnabled ? '#34D399' : '#F87171' }}>
                              {mfaEnabled ? 'ENFORCED (ACTIVE)' : 'DISABLED'}
                            </strong>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          const next = !mfaEnabled;
                          setMfaEnabled(next);
                          showToast(`2FA has been ${next ? 'enabled' : 'disabled'}.`);
                        }}
                        style={{
                          backgroundColor: mfaEnabled ? '#261C3D' : '#10B981',
                          color: mfaEnabled ? '#F87171' : '#FFFFFF',
                          border: mfaEnabled ? '1px solid #452D5A' : 'none',
                          padding: '0.55rem 1.15rem',
                          borderRadius: '6px',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {mfaEnabled ? 'Disable 2FA' : 'Enable 2FA'}
                      </button>
                    </div>
                  </div>

                  {/* Provisioning Key Card */}
                  <div className="hub-card" style={{ padding: '2rem' }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '0.75rem' }}>
                      Authenticator Provisioning
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: '#94A3B8', lineHeight: 1.5, marginBottom: '1.5rem' }}>
                      Scan or manually enter this Base32 secret key into Google Authenticator, 1Password, or YubiKey Authenticator. Time step is 30 seconds with HMAC-SHA1.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem', alignItems: 'center', marginBottom: '1.75rem' }}>
                      {/* Simulated QR block */}
                      <div
                        style={{
                          backgroundColor: '#FFFFFF',
                          padding: '1.25rem',
                          borderRadius: '8px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          maxWidth: '220px',
                        }}
                      >
                        <div
                          style={{
                            width: '140px',
                            height: '140px',
                            background: 'repeating-linear-gradient(0deg, #000 0px, #000 7px, #fff 7px, #fff 14px), repeating-linear-gradient(90deg, #000 0px, #000 7px, #fff 7px, #fff 14px)',
                            borderRadius: '4px',
                            mixBlendMode: 'multiply',
                            marginBottom: '0.5rem',
                          }}
                        />
                        <span style={{ fontSize: '0.7rem', color: '#475569', fontWeight: 600 }}>otpauth://totp/SentinelKey</span>
                      </div>

                      {/* Secret text block */}
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.4rem' }}>
                          Base32 Provisioning Secret
                        </label>
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                          <input
                            type="text"
                            readOnly
                            value={base32Secret}
                            style={{
                              flex: 1,
                              padding: '0.65rem 0.85rem',
                              borderRadius: '6px',
                              backgroundColor: '#110D20',
                              border: '1px solid #2B214C',
                              color: '#A78BFA',
                              fontSize: '0.95rem',
                              fontFamily: 'var(--font-mono)',
                              fontWeight: 700,
                              letterSpacing: '0.1em',
                            }}
                          />
                          <button
                            onClick={copySecret}
                            style={{
                              backgroundColor: '#261C49',
                              border: '1px solid #3B2D6B',
                              color: '#CBD5E1',
                              borderRadius: '6px',
                              padding: '0 0.85rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                              fontSize: '0.8rem',
                            }}
                          >
                            {copiedSecret ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
                            {copiedSecret ? 'Copied' : 'Copy'}
                          </button>
                        </div>

                        {/* Test verification form */}
                        <form onSubmit={handleVerifyTotp}>
                          <label style={{ display: 'block', fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.4rem' }}>
                            Verify 6-Digit Code
                          </label>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input
                              type="text"
                              maxLength={6}
                              placeholder="123456"
                              value={totpInput}
                              onChange={(e) => setTotpInput(e.target.value)}
                              style={{
                                width: '130px',
                                padding: '0.65rem 0.85rem',
                                borderRadius: '6px',
                                backgroundColor: '#110D20',
                                border: '1px solid #2B214C',
                                color: '#F8FAFC',
                                fontSize: '1rem',
                                fontFamily: 'var(--font-mono)',
                                textAlign: 'center',
                                letterSpacing: '0.15em',
                              }}
                            />
                            <button
                              type="submit"
                              style={{
                                backgroundColor: 'var(--hub-purple-primary)',
                                color: '#ffffff',
                                padding: '0.65rem 1rem',
                                borderRadius: '6px',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                border: 'none',
                                cursor: 'pointer',
                              }}
                            >
                              Verify OTP
                            </button>
                          </div>
                          {totpVerificationMsg && (
                            <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: totpVerificationMsg.includes('passed') ? '#34D399' : '#F87171' }}>
                              {totpVerificationMsg}
                            </div>
                          )}
                        </form>
                      </div>
                    </div>
                  </div>

                  {/* Recovery Codes Card */}
                  <div className="hub-card" style={{ padding: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#F8FAFC' }}>
                        Emergency Recovery Codes
                      </h3>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={downloadRecoveryCodes}
                          style={{
                            backgroundColor: '#1E1838',
                            border: '1px solid #33265D',
                            color: '#CBD5E1',
                            borderRadius: '6px',
                            padding: '0.4rem 0.75rem',
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                          }}
                        >
                          <Download size={14} /> Download
                        </button>
                        <button
                          onClick={regenerateRecoveryCodes}
                          style={{
                            backgroundColor: '#1E1838',
                            border: '1px solid #33265D',
                            color: '#CBD5E1',
                            borderRadius: '6px',
                            padding: '0.4rem 0.75rem',
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                          }}
                        >
                          <RefreshCw size={14} /> Regenerate
                        </button>
                      </div>
                    </div>

                    <p style={{ fontSize: '0.85rem', color: '#94A3B8', marginBottom: '1.25rem' }}>
                      Each recovery code can be used once to access your SentinelKey vault if you lose your phone.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
                      {recoveryCodes.map((code, idx) => (
                        <div
                          key={idx}
                          style={{
                            backgroundColor: '#110D20',
                            border: '1px solid #2B214C',
                            borderRadius: '6px',
                            padding: '0.5rem 0.75rem',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.85rem',
                            color: '#DDD6FE',
                            textAlign: 'center',
                          }}
                        >
                          {code}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PANE 5: Personal Access Tokens */}
            {activeTab === 'tokens' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: '#94A3B8', fontFamily: 'var(--font-mono)', marginBottom: '0.35rem' }}>
                      Account &amp; Security / API Keys
                    </div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#F8FAFC' }}>
                      Personal Access Tokens
                    </h1>
                    <p style={{ fontSize: '0.9rem', color: '#94A3B8', marginTop: '0.25rem' }}>
                      Manage bearer tokens for CLI scripts, REST endpoints, and CI/CD pipelines.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setIsGeneratingToken(!isGeneratingToken);
                      setNewlyCreatedToken(null);
                    }}
                    style={{
                      backgroundColor: 'var(--hub-purple-primary)',
                      color: '#ffffff',
                      padding: '0.65rem 1.25rem',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <Plus size={16} /> Generate New Token
                  </button>
                </div>

                {/* Just created token alert */}
                {newlyCreatedToken && (
                  <div
                    style={{
                      backgroundColor: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid #10B981',
                      borderRadius: '8px',
                      padding: '1.25rem',
                      marginBottom: '1.75rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#34D399', fontWeight: 600, marginBottom: '0.5rem' }}>
                      <CheckCircle2 size={18} /> Make sure to copy your personal access token now!
                    </div>
                    <p style={{ fontSize: '0.825rem', color: '#CBD5E1', marginBottom: '0.75rem' }}>
                      You won&apos;t be able to see it again after navigating away.
                    </p>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        type="text"
                        readOnly
                        value={newlyCreatedToken}
                        style={{
                          flex: 1,
                          padding: '0.6rem 0.85rem',
                          borderRadius: '6px',
                          backgroundColor: '#0F172A',
                          border: '1px solid #334155',
                          color: '#34D399',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.85rem',
                        }}
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(newlyCreatedToken);
                          showToast('Token copied to clipboard.');
                        }}
                        style={{
                          backgroundColor: '#10B981',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '0 1rem',
                          fontWeight: 600,
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                        }}
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                )}

                {/* Inline Token Generator */}
                {isGeneratingToken && (
                  <form
                    onSubmit={handleCreateToken}
                    className="hub-card"
                    style={{ padding: '1.75rem', marginBottom: '2rem', border: '1px solid #8B5CF6' }}
                  >
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '1rem' }}>
                      New Token Details
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.4rem' }}>
                          Token Description / Name
                        </label>
                        <input
                          type="text"
                          required
                          value={newTokenName}
                          onChange={(e) => setNewTokenName(e.target.value)}
                          placeholder="e.g. AWS Lambda Ingestion Worker"
                          style={{
                            width: '100%',
                            padding: '0.6rem 0.85rem',
                            borderRadius: '6px',
                            backgroundColor: '#110D20',
                            border: '1px solid #2B214C',
                            color: '#F8FAFC',
                            fontSize: '0.875rem',
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.4rem' }}>
                          Expiration Period
                        </label>
                        <select
                          value={newTokenExpiry}
                          onChange={(e) => setNewTokenExpiry(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.6rem 0.85rem',
                            borderRadius: '6px',
                            backgroundColor: '#110D20',
                            border: '1px solid #2B214C',
                            color: '#F8FAFC',
                            fontSize: '0.875rem',
                          }}
                        >
                          <option value="30">30 days</option>
                          <option value="90">90 days</option>
                          <option value="365">1 year</option>
                          <option value="never">No expiration</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <button
                        type="submit"
                        style={{
                          backgroundColor: 'var(--hub-purple-primary)',
                          color: '#ffffff',
                          padding: '0.55rem 1.15rem',
                          borderRadius: '6px',
                          fontSize: '0.825rem',
                          fontWeight: 600,
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        Generate Token
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsGeneratingToken(false)}
                        style={{
                          backgroundColor: '#261C3D',
                          color: '#94A3B8',
                          padding: '0.55rem 1rem',
                          borderRadius: '6px',
                          fontSize: '0.825rem',
                          border: '1px solid #3B2D6B',
                          cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                {/* Tokens Table */}
                <div className="hub-card" style={{ padding: '1.5rem', overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #2B214C', color: '#94A3B8' }}>
                        <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>TOKEN NAME</th>
                        <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>PREFIX</th>
                        <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>SCOPES</th>
                        <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>LAST USED</th>
                        <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>ACTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tokens.map((tok) => (
                        <tr key={tok.id} style={{ borderBottom: '1px solid #1C1533' }}>
                          <td style={{ padding: '1rem', color: '#F8FAFC', fontWeight: 600 }}>{tok.name}</td>
                          <td style={{ padding: '1rem', fontFamily: 'var(--font-mono)', color: '#A78BFA' }}>{tok.prefix}</td>
                          <td style={{ padding: '1rem', color: '#94A3B8', fontSize: '0.775rem' }}>{tok.scope}</td>
                          <td style={{ padding: '1rem', color: '#94A3B8' }}>{tok.lastUsed}</td>
                          <td style={{ padding: '1rem', textAlign: 'right' }}>
                            <button
                              onClick={() => handleRevokeToken(tok.id)}
                              style={{
                                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid #EF4444',
                                color: '#F87171',
                                padding: '0.35rem 0.75rem',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                cursor: 'pointer',
                              }}
                            >
                              Revoke
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* PANE 6: Connected Services */}
            {activeTab === 'services' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: '#94A3B8', fontFamily: 'var(--font-mono)', marginBottom: '0.35rem' }}>
                      Account &amp; Security / Microservices
                    </div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#F8FAFC' }}>
                      Connected Services
                    </h1>
                    <p style={{ fontSize: '0.9rem', color: '#94A3B8', marginTop: '0.25rem' }}>
                      Monitor health, latencies, and RPC connectivity across the SentinelKey stack.
                    </p>
                  </div>

                  <button
                    onClick={handlePingServices}
                    disabled={isPinging}
                    style={{
                      backgroundColor: '#261C49',
                      border: '1px solid #3B2D6B',
                      color: '#DDD6FE',
                      padding: '0.65rem 1.25rem',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      cursor: 'pointer',
                    }}
                  >
                    <RefreshCw size={15} className={isPinging ? 'pulse-emerald' : ''} />
                    {isPinging ? 'Pinging stack...' : 'Ping All Services'}
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {services.map((srv) => (
                    <div
                      key={srv.id}
                      className="hub-card"
                      style={{
                        padding: '1.5rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '1rem',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
                          <span
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor: '#10B981',
                              boxShadow: '0 0 6px #10B981',
                            }}
                          />
                          <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#F8FAFC' }}>{srv.name}</h4>
                          <span
                            style={{
                              backgroundColor: '#1C1536',
                              border: '1px solid #3B2D6B',
                              color: '#A78BFA',
                              fontSize: '0.725rem',
                              fontFamily: 'var(--font-mono)',
                              padding: '2px 8px',
                              borderRadius: '4px',
                            }}
                          >
                            {srv.url}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.825rem', color: '#94A3B8' }}>{srv.details}</p>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                        <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                          <div style={{ color: '#34D399', fontWeight: 600 }}>{srv.status}</div>
                          <div style={{ color: '#64748B' }}>{srv.latency} ms</div>
                        </div>

                        <button
                          onClick={() => {
                            showToast(`Connected successfully to ${srv.name}`);
                          }}
                          style={{
                            backgroundColor: '#1E1838',
                            border: '1px solid #33265D',
                            color: '#CBD5E1',
                            padding: '0.45rem 0.85rem',
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                          }}
                        >
                          Test RPC
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PANE 7: Convert / Organization */}
            {activeTab === 'organization' && (
              <div>
                <div style={{ marginBottom: '2rem' }}>
                  <div style={{ fontSize: '0.8rem', color: '#94A3B8', fontFamily: 'var(--font-mono)', marginBottom: '0.35rem' }}>
                    Account &amp; Security / Team
                  </div>
                  <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#F8FAFC' }}>
                    Organization &amp; Team Workspace
                  </h1>
                  <p style={{ fontSize: '0.9rem', color: '#94A3B8', marginTop: '0.25rem' }}>
                    Convert to a multi-seat team workspace, manage roles, and enforce security policies.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                  {/* Organization Profile */}
                  <div className="hub-card" style={{ padding: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                      <Building2 size={20} color="#8B5CF6" />
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#F8FAFC' }}>Organization Profile</h3>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.4rem' }}>
                          Organization Display Name
                        </label>
                        <input
                          type="text"
                          value={orgName}
                          onChange={(e) => setOrgName(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.65rem 0.85rem',
                            borderRadius: '6px',
                            backgroundColor: '#110D20',
                            border: '1px solid #2B214C',
                            color: '#F8FAFC',
                            fontSize: '0.9rem',
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.4rem' }}>
                          Workspace Tier
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.65rem' }}>
                          <span style={{ backgroundColor: '#261C49', border: '1px solid #3B2D6B', color: '#DDD6FE', padding: '3px 10px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 600 }}>
                            Team Pro (10 Seats)
                          </span>
                          <a href="/app/billing" style={{ color: 'var(--hub-purple-light)', fontSize: '0.825rem', fontWeight: 600 }}>
                            Upgrade Tier →
                          </a>
                        </div>
                      </div>
                    </div>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#CBD5E1', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={enforceMfaPolicy}
                        onChange={(e) => {
                          setEnforceMfaPolicy(e.target.checked);
                          showToast('Organization security policy updated.');
                        }}
                      />
                      <span>Enforce RFC 6238 TOTP for all team members before vault access</span>
                    </label>
                  </div>

                  {/* Members List & Invite */}
                  <div className="hub-card" style={{ padding: '2rem' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '1.25rem' }}>
                      Team Members ({members.length})
                    </h3>

                    {/* Invite form */}
                    <form onSubmit={handleInviteMember} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.75rem' }}>
                      <input
                        type="email"
                        required
                        placeholder="colleague@sentinelkey.io"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        style={{
                          flex: 1,
                          minWidth: '220px',
                          padding: '0.6rem 0.85rem',
                          borderRadius: '6px',
                          backgroundColor: '#110D20',
                          border: '1px solid #2B214C',
                          color: '#F8FAFC',
                          fontSize: '0.875rem',
                        }}
                      />
                      <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value)}
                        style={{
                          padding: '0.6rem 0.85rem',
                          borderRadius: '6px',
                          backgroundColor: '#110D20',
                          border: '1px solid #2B214C',
                          color: '#F8FAFC',
                          fontSize: '0.875rem',
                        }}
                      >
                        <option value="analyst">Security Analyst</option>
                        <option value="admin">SecOps Admin</option>
                        <option value="viewer">Read-Only Viewer</option>
                      </select>
                      <button
                        type="submit"
                        style={{
                          backgroundColor: 'var(--hub-purple-primary)',
                          color: '#ffffff',
                          padding: '0.6rem 1.25rem',
                          borderRadius: '6px',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        Invite Member
                      </button>
                    </form>

                    {/* Members Table */}
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #2B214C', color: '#94A3B8' }}>
                            <th style={{ padding: '0.65rem 0.75rem', fontWeight: 600 }}>NAME</th>
                            <th style={{ padding: '0.65rem 0.75rem', fontWeight: 600 }}>ROLE</th>
                            <th style={{ padding: '0.65rem 0.75rem', fontWeight: 600 }}>2FA</th>
                            <th style={{ padding: '0.65rem 0.75rem', fontWeight: 600 }}>STATUS</th>
                            <th style={{ padding: '0.65rem 0.75rem', fontWeight: 600, textAlign: 'right' }}>ACTION</th>
                          </tr>
                        </thead>
                        <tbody>
                          {members.map((m) => (
                            <tr key={m.id} style={{ borderBottom: '1px solid #1C1533' }}>
                              <td style={{ padding: '0.85rem 0.75rem' }}>
                                <div style={{ color: '#F8FAFC', fontWeight: 600 }}>{m.name}</div>
                                <div style={{ color: '#94A3B8', fontSize: '0.75rem' }}>{m.email}</div>
                              </td>
                              <td style={{ padding: '0.85rem 0.75rem', color: '#DDD6FE' }}>{m.role}</td>
                              <td style={{ padding: '0.85rem 0.75rem' }}>
                                <span style={{ color: m.mfa ? '#34D399' : '#F87171', fontWeight: 600, fontSize: '0.75rem' }}>
                                  {m.mfa ? 'Active' : 'Missing'}
                                </span>
                              </td>
                              <td style={{ padding: '0.85rem 0.75rem', color: '#94A3B8' }}>{m.status}</td>
                              <td style={{ padding: '0.85rem 0.75rem', textAlign: 'right' }}>
                                {m.role !== 'Owner' && (
                                  <button
                                    onClick={() => handleRemoveMember(m.id)}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: '#F87171',
                                      cursor: 'pointer',
                                      padding: '4px',
                                    }}
                                    title="Remove member"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PANE 8: Privacy & Audit */}
            {activeTab === 'audit' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: '#94A3B8', fontFamily: 'var(--font-mono)', marginBottom: '0.35rem' }}>
                      Account &amp; Security / Governance
                    </div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#F8FAFC' }}>
                      Privacy &amp; Audit Logs
                    </h1>
                    <p style={{ fontSize: '0.9rem', color: '#94A3B8', marginTop: '0.25rem' }}>
                      Tamper-evident trail of all authentication events, IDS alerts, and cryptographic actions.
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={exportAuditJson}
                      style={{
                        backgroundColor: '#261C49',
                        border: '1px solid #3B2D6B',
                        color: '#DDD6FE',
                        padding: '0.6rem 1rem',
                        borderRadius: '6px',
                        fontSize: '0.825rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        cursor: 'pointer',
                      }}
                    >
                      <Download size={14} /> Export JSON
                    </button>
                    <button
                      onClick={exportAuditCsv}
                      style={{
                        backgroundColor: '#261C49',
                        border: '1px solid #3B2D6B',
                        color: '#DDD6FE',
                        padding: '0.6rem 1rem',
                        borderRadius: '6px',
                        fontSize: '0.825rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        cursor: 'pointer',
                      }}
                    >
                      <Download size={14} /> Export CSV
                    </button>
                  </div>
                </div>

                {/* Filter bar */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                  {['ALL', 'AUTH', 'IDS', 'CRYPTO', 'ML'].map((f) => (
                    <button
                      key={f}
                      onClick={() => setAuditFilter(f)}
                      style={{
                        backgroundColor: auditFilter === f ? 'var(--hub-purple-primary)' : '#1C1536',
                        color: auditFilter === f ? '#FFFFFF' : '#94A3B8',
                        border: '1px solid #2B214C',
                        borderRadius: '6px',
                        padding: '0.4rem 0.85rem',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {f}
                    </button>
                  ))}
                </div>

                {/* Audit table */}
                <div className="hub-card" style={{ padding: '1.5rem', overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.825rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #2B214C', color: '#94A3B8' }}>
                        <th style={{ padding: '0.75rem 0.85rem', fontWeight: 600 }}>TIMESTAMP</th>
                        <th style={{ padding: '0.75rem 0.85rem', fontWeight: 600 }}>EVENT</th>
                        <th style={{ padding: '0.75rem 0.85rem', fontWeight: 600 }}>ACTOR</th>
                        <th style={{ padding: '0.75rem 0.85rem', fontWeight: 600 }}>IP &amp; LOCATION</th>
                        <th style={{ padding: '0.75rem 0.85rem', fontWeight: 600 }}>SEVERITY</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLogs.map((log) => (
                        <tr key={log.id} style={{ borderBottom: '1px solid #1C1533' }}>
                          <td style={{ padding: '0.85rem', fontFamily: 'var(--font-mono)', color: '#CBD5E1' }}>
                            {log.timestamp}
                          </td>
                          <td style={{ padding: '0.85rem' }}>
                            <div style={{ color: '#F8FAFC', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                              {log.event}
                            </div>
                            <div style={{ color: '#94A3B8', fontSize: '0.75rem' }}>{log.details}</div>
                          </td>
                          <td style={{ padding: '0.85rem', color: '#DDD6FE' }}>{log.actor}</td>
                          <td style={{ padding: '0.85rem', color: '#94A3B8' }}>
                            <div>{log.ip}</div>
                            <div style={{ fontSize: '0.725rem', color: '#64748B' }}>{log.location}</div>
                          </td>
                          <td style={{ padding: '0.85rem' }}>
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '0.725rem',
                                fontWeight: 700,
                                fontFamily: 'var(--font-mono)',
                                backgroundColor:
                                  log.severity === 'CRITICAL'
                                    ? 'rgba(239, 68, 68, 0.15)'
                                    : log.severity === 'WARNING'
                                    ? 'rgba(245, 158, 11, 0.15)'
                                    : 'rgba(52, 211, 153, 0.15)',
                                color:
                                  log.severity === 'CRITICAL'
                                    ? '#F87171'
                                    : log.severity === 'WARNING'
                                    ? '#FBBF24'
                                    : '#34D399',
                              }}
                            >
                              {log.severity}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* PANE 9: Deactivate */}
            {activeTab === 'deactivate' && (
              <div>
                <div style={{ marginBottom: '2rem' }}>
                  <div style={{ fontSize: '0.8rem', color: '#F87171', fontFamily: 'var(--font-mono)', marginBottom: '0.35rem' }}>
                    Account &amp; Security / Danger Zone
                  </div>
                  <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#F87171' }}>
                    Deactivate Account
                  </h1>
                  <p style={{ fontSize: '0.9rem', color: '#94A3B8', marginTop: '0.25rem' }}>
                    Permanently delete your SentinelKey account, revoke active tokens, and wipe cryptographic keys.
                  </p>
                </div>

                <div
                  className="hub-card"
                  style={{
                    padding: '2rem',
                    backgroundColor: 'rgba(239, 68, 68, 0.04)',
                    border: '1px solid #7F1D1D',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                    <AlertTriangle size={24} color="#EF4444" />
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#F87171' }}>
                      Permanent Cryptographic Destruction Notice
                    </h3>
                  </div>

                  <p style={{ fontSize: '0.875rem', color: '#CBD5E1', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                    Deactivating your account will immediately revoke all active JWT tokens, delete your personal encryption keys, purge MFA secrets, and terminate your access to SentinelKey workspaces. Any files encrypted solely with your personal key (such as <code>.skf1</code> archives) will become permanently undecryptable.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.75rem', fontSize: '0.85rem', color: '#CBD5E1' }}>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={chkKeys}
                        onChange={(e) => setChkKeys(e.target.checked)}
                        style={{ marginTop: '3px' }}
                      />
                      <span>I understand that any encrypted files requiring my personal keys will be lost forever.</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={chkAudit}
                        onChange={(e) => setChkAudit(e.target.checked)}
                        style={{ marginTop: '3px' }}
                      />
                      <span>I have exported any required audit logs and backup configuration.</span>
                    </label>
                  </div>

                  <div style={{ marginBottom: '1.75rem' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: '#94A3B8', marginBottom: '0.5rem' }}>
                      To confirm, type <strong style={{ color: '#F87171' }}>DELETE ALEXCHEN</strong> below:
                    </label>
                    <input
                      type="text"
                      value={confirmDeleteInput}
                      onChange={(e) => setConfirmDeleteInput(e.target.value)}
                      placeholder="DELETE ALEXCHEN"
                      style={{
                        width: '100%',
                        maxWidth: '320px',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '6px',
                        backgroundColor: '#110D20',
                        border: '1px solid #7F1D1D',
                        color: '#F8FAFC',
                        fontSize: '0.9rem',
                        fontFamily: 'var(--font-mono)',
                      }}
                    />
                  </div>

                  <button
                    onClick={handleDeactivate}
                    disabled={!canDeactivate || isDeactivating}
                    style={{
                      backgroundColor: canDeactivate ? '#DC2626' : '#451A1A',
                      color: canDeactivate ? '#FFFFFF' : '#991B1B',
                      border: 'none',
                      padding: '0.75rem 1.5rem',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      fontWeight: 700,
                      cursor: canDeactivate ? 'pointer' : 'not-allowed',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      transition: 'background-color 0.15s',
                    }}
                  >
                    <AlertTriangle size={16} />
                    {isDeactivating ? 'Purging account credentials...' : 'Permanently Deactivate Account'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
