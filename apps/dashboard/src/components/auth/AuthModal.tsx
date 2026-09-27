import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../services/api';
import { Shield, Lock, Mail, KeyRound, AlertTriangle, ArrowRight, RefreshCw } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { login, register, verifyMfa, pendingMfaToken, cancelMfa } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('admin@sentinelkey.local');
  const [password, setPassword] = useState('SuperSecretAdmin123!');
  const [mfaCode, setMfaCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Geo-location simulation option (useful for testing impossible travel live)
  const [simulatedCity, setSimulatedCity] = useState<'default' | 'new_york' | 'london' | 'tokyo'>('default');

  const getLocationCoords = () => {
    switch (simulatedCity) {
      case 'new_york':
        return { latitude: 40.7128, longitude: -74.006, city: 'New York' };
      case 'london':
        return { latitude: 51.5074, longitude: -0.1278, city: 'London' };
      case 'tokyo':
        return { latitude: 35.6762, longitude: 139.6503, city: 'Tokyo' };
      default:
        return undefined;
    }
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        const res = await login(email, password, getLocationCoords());
        if (res.mfaRequired) {
          setMfaCode('');
        }
      } else {
        await register(email, password);
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Authentication failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await verifyMfa(mfaCode.trim(), getLocationCoords());
    } catch (err) {
      setError(getErrorMessage(err, 'MFA verification failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: 460 }}>
        {/* Header Icon */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: 'linear-gradient(135deg, var(--color-indigo), var(--color-cyan))',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: 'var(--shadow-neon)',
              marginBottom: 12,
            }}
          >
            <Shield size={32} />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
            {pendingMfaToken ? 'Two-Factor Authentication' : mode === 'login' ? 'SentinelKey Access' : 'Create Account'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: 4 }}>
            {pendingMfaToken
              ? 'Enter the 6-digit code from your authenticator app or backup code'
              : mode === 'login'
              ? 'Enter your credentials to enter the security console'
              : 'Register an account to bootstrap the security stack'}
          </p>
        </div>

        {error && (
          <div
            style={{
              background: 'rgba(244, 63, 94, 0.1)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              borderRadius: 8,
              padding: '10px 14px',
              color: 'var(--color-rose)',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 20,
            }}
          >
            <AlertTriangle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Step 2: MFA Challenge */}
        {pendingMfaToken ? (
          <form onSubmit={handleMfaSubmit}>
            <div className="form-group">
              <label className="form-label">Authentication Code / Recovery Code</label>
              <div style={{ position: 'relative' }}>
                <KeyRound
                  size={18}
                  style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
                />
                <input
                  type="text"
                  className="form-input font-mono"
                  style={{ paddingLeft: 40, fontSize: '1.1rem', letterSpacing: '0.15em', textAlign: 'center' }}
                  placeholder="000000"
                  maxLength={12}
                  autoFocus
                  required
                  value={mfaCode}
                  onChange={e => setMfaCode(e.target.value)}
                />
              </div>
            </div>

            {/* Geo-Velocity Simulation Option */}
            <div className="form-group" style={{ marginTop: 12 }}>
              <label className="form-label" style={{ fontSize: '0.75rem' }}>
                Simulate Location (IDS Geo-Velocity Check)
              </label>
              <select
                className="form-select font-mono"
                value={simulatedCity}
                onChange={e => setSimulatedCity(e.target.value as 'default' | 'new_york' | 'london' | 'tokyo')}
                style={{ fontSize: '0.8rem' }}
              >
                <option value="default">Client IP (Default)</option>
                <option value="new_york">New York, US (40.71, -74.00)</option>
                <option value="london">London, UK (51.50, -0.12)</option>
                <option value="tokyo">Tokyo, JP (35.67, 139.65)</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={cancelMfa}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ flex: 2 }}
                disabled={isSubmitting || !mfaCode.trim()}
              >
                {isSubmitting ? 'Verifying...' : 'Verify & Enter'}
              </button>
            </div>
          </form>
        ) : (
          /* Step 1: Credentials Form */
          <form onSubmit={handleCredentialsSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail
                  size={18}
                  style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
                />
                <input
                  type="email"
                  className="form-input"
                  style={{ paddingLeft: 40 }}
                  placeholder="name@domain.com"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={18}
                  style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
                />
                <input
                  type="password"
                  className="form-input"
                  style={{ paddingLeft: 40 }}
                  placeholder="••••••••"
                  minLength={8}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>
            </div>

            {mode === 'login' && (
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.75rem' }}>
                  Simulate Location (IDS Geo-Velocity Check)
                </label>
                <select
                  className="form-select font-mono"
                  value={simulatedCity}
                  onChange={e => setSimulatedCity(e.target.value as 'default' | 'new_york' | 'london' | 'tokyo')}
                  style={{ fontSize: '0.8rem' }}
                >
                  <option value="default">Client IP (Default)</option>
                  <option value="new_york">New York, US (40.71, -74.00)</option>
                  <option value="london">London, UK (51.50, -0.12)</option>
                  <option value="tokyo">Tokyo, JP (35.67, 139.65)</option>
                </select>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: 8 }}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw size={16} className="animate-spin" /> Authenticating...
                </>
              ) : mode === 'login' ? (
                <>
                  Sign In <ArrowRight size={16} />
                </>
              ) : (
                'Create Account'
              )}
            </button>

            <div style={{ textAlign: 'center', marginTop: 20 }}>
              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'login' ? 'register' : 'login');
                  setError(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-cyan)',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                {mode === 'login'
                  ? "Don't have an account? Register"
                  : 'Already registered? Sign in'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
