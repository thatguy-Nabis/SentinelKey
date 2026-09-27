import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import * as api from '../../services/api';
import type { IMfaSetupResponse } from '@sentinelkey/shared-types';
import {
  ShieldCheck,
  ShieldAlert,
  Copy,
  Check,
  AlertTriangle,
} from 'lucide-react';

export const MfaSettingsView: React.FC = () => {
  const { user, refreshProfile } = useAuth();

  const [setupData, setSetupData] = useState<IMfaSetupResponse | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [disablePassword, setDisablePassword] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isMfaActive = Boolean(user?.mfaEnabled);

  const handleStartSetup = async () => {
    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const data = await api.setupMfa();
      setSetupData(data);
    } catch (err) {
      setError(api.getErrorMessage(err, 'Failed to initiate MFA setup'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyCode.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      await api.confirmMfaSetup(verifyCode.trim());
      setSuccessMsg('MFA has been successfully activated on your account!');
      setSetupData(null);
      setVerifyCode('');
      await refreshProfile();
    } catch (err) {
      setError(api.getErrorMessage(err, 'Invalid verification code'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisableMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disablePassword) return;

    setIsLoading(true);
    setError(null);
    try {
      await api.disableMfa(disablePassword, disableCode || undefined);
      setSuccessMsg('MFA has been disabled on your account.');
      setShowDisableModal(false);
      setDisablePassword('');
      setDisableCode('');
      await refreshProfile();
    } catch (err) {
      setError(api.getErrorMessage(err, 'Failed to disable MFA. Check password.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyBackupCodes = () => {
    if (!setupData?.backupCodes) return;
    navigator.clipboard.writeText(setupData.backupCodes.join('\n'));
    setCopiedCodes(true);
    setTimeout(() => setCopiedCodes(false), 2500);
  };

  return (
    <div className="content-body" style={{ maxWidth: 840 }}>
      {/* Status Card */}
      <div className="glass-panel" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: isMfaActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                color: isMfaActive ? 'var(--color-emerald)' : 'var(--color-amber)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isMfaActive ? <ShieldCheck size={28} /> : <ShieldAlert size={28} />}
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 600 }}>
                {isMfaActive ? 'Two-Factor Authentication is Enabled' : 'Two-Factor Authentication is Inactive'}
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {isMfaActive
                  ? 'Your account is secured with RFC 6238 TOTP (Google Authenticator / Authy).'
                  : 'Add a second security layer using time-based one-time password (TOTP) codes.'}
              </p>
            </div>
          </div>

          <div>
            {isMfaActive ? (
              <button
                className="btn btn-danger btn-sm"
                onClick={() => {
                  setShowDisableModal(true);
                  setError(null);
                }}
              >
                Disable 2FA
              </button>
            ) : !setupData ? (
              <button
                className="btn btn-primary btn-sm"
                onClick={handleStartSetup}
                disabled={isLoading}
              >
                Set Up Two-Factor Auth
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div
          style={{
            background: 'rgba(244, 63, 94, 0.1)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            borderRadius: 8,
            padding: '12px 16px',
            color: 'var(--color-rose)',
            fontSize: '0.875rem',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div
          style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 8,
            padding: '12px 16px',
            color: 'var(--color-emerald)',
            fontSize: '0.875rem',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <Check size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Setup Wizard (when setup initiated) */}
      {setupData && !isMfaActive && (
        <div className="glass-panel" style={{ border: '1px solid var(--border-cyan)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 16 }}>
            Set Up Your Authenticator App
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 24, alignItems: 'center', marginBottom: 24 }}>
            {/* QR Code */}
            <div
              style={{
                background: '#fff',
                padding: 12,
                borderRadius: 12,
                width: 180,
                height: 180,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img src={setupData.qrCode} alt="TOTP QR Code" style={{ width: '100%', height: '100%' }} />
            </div>

            {/* Instructions */}
            <div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 12 }}>
                1. Scan the QR code using Google Authenticator, 1Password, Authy, or any TOTP app.
              </p>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
                Or enter this secret key manually into your app:
              </p>
              <div
                className="font-mono"
                style={{
                  background: 'var(--bg-app)',
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--color-cyan)',
                  fontSize: '0.9rem',
                  display: 'inline-block',
                  letterSpacing: '0.05em',
                  marginBottom: 16,
                }}
              >
                {setupData.secret}
              </div>
            </div>
          </div>

          {/* Backup Recovery Codes */}
          <div style={{ marginBottom: 24, padding: 16, background: 'var(--bg-app)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                One-Time Backup Recovery Codes
              </span>
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleCopyBackupCodes}
              >
                {copiedCodes ? <Check size={14} style={{ color: 'var(--color-emerald)' }} /> : <Copy size={14} />}
                {copiedCodes ? 'Copied to Clipboard' : 'Copy All Codes'}
              </button>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 12 }}>
              Save these codes in a secure location. Each recovery code can only be used once if you lose access to your authenticator.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {setupData.backupCodes.map((code, idx) => (
                <div
                  key={idx}
                  className="font-mono"
                  style={{
                    background: 'var(--bg-card)',
                    padding: '6px 8px',
                    borderRadius: 4,
                    textAlign: 'center',
                    fontSize: '0.8rem',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  {code}
                </div>
              ))}
            </div>
          </div>

          {/* Confirmation Input */}
          <form onSubmit={handleConfirmSetup} style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label className="form-label">Enter 6-Digit Code to Confirm & Activate</label>
              <input
                type="text"
                className="form-input font-mono"
                placeholder="000000"
                maxLength={6}
                value={verifyCode}
                onChange={e => setVerifyCode(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading || verifyCode.trim().length !== 6}
            >
              Confirm & Activate
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setSetupData(null)}
            >
              Cancel
            </button>
          </form>
        </div>
      )}

      {/* Disable Modal */}
      {showDisableModal && (
        <div className="modal-overlay" onClick={() => setShowDisableModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: 10, color: 'var(--color-rose)' }}>
              Disable Two-Factor Authentication
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
              Disabling MFA reduces account security. Enter your account password to confirm.
            </p>

            <form onSubmit={handleDisableMfa}>
              <div className="form-group">
                <label className="form-label">Account Password</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="••••••••"
                  required
                  value={disablePassword}
                  onChange={e => setDisablePassword(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setShowDisableModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-danger"
                  style={{ flex: 1 }}
                  disabled={isLoading || !disablePassword}
                >
                  Confirm Disable
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
