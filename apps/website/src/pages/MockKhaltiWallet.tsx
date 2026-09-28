import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Smartphone, Lock, ShieldCheck, Loader2, ArrowRight, X, AlertCircle } from 'lucide-react';

/**
 * Local simulated Khalti wallet. Used when the API runs the MockPaymentProvider
 * (no KHALTI_SECRET_KEY set). Collects a dummy mobile number + PIN and, on
 * "Pay", redirects back to the billing page with the pidx so the order is
 * fulfilled — mimicking Khalti's real redirect flow without a live gateway.
 */
export const MockKhaltiWallet: React.FC = () => {
  const [searchParams] = useSearchParams();
  const pidx = searchParams.get('pidx') ?? '';
  const returnUrl = searchParams.get('returnUrl') ?? '/app/billing';
  const order = searchParams.get('order') ?? 'SentinelKey Plan';
  const amountNpr = Number(searchParams.get('amountNpr') ?? '0');

  const [phone, setPhone] = useState('9800000000');
  const [pin, setPin] = useState('1234');
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  const redirect = (withPidx: boolean) => {
    const sep = returnUrl.includes('?') ? '&' : '?';
    const url = withPidx
      ? `${returnUrl}${sep}pidx=${encodeURIComponent(pidx)}`
      : returnUrl;
    window.location.href = url;
  };

  const handlePay = () => {
    if (phone.trim().length < 10) {
      setError('Enter a valid 10-digit mobile number.');
      return;
    }
    if (pin.trim().length < 4) {
      setError('Enter a 4-digit Khalti PIN.');
      return;
    }
    setError(null);
    setPaying(true);
    // Simulate the wallet processing the payment before redirecting back.
    setTimeout(() => redirect(true), 1200);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--hub-bg-app)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.5rem',
        backgroundImage: 'var(--hub-purple-gradient)',
      }}
    >
      <div
        className="hub-card"
        style={{
          maxWidth: '420px',
          width: '100%',
          padding: '2rem',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          border: '1px solid var(--hub-purple-deep)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #5C2D91 0%, #6B4DE6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
              }}
            >
              <Smartphone size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--hub-text-primary)', fontSize: '1.1rem' }}>
                Khalti Wallet
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--hub-purple-light)', fontWeight: 600, letterSpacing: '0.06em' }}>
                SIMULATED PAYMENT
              </div>
            </div>
          </div>
          <span
            style={{
              backgroundColor: 'rgba(107, 77, 230, 0.18)',
              border: '1px solid var(--hub-purple-deep)',
              color: 'var(--hub-purple-light)',
              padding: '0.2rem 0.6rem',
              borderRadius: '999px',
              fontSize: '0.7rem',
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
            }}
          >
            MOCK
          </span>
        </div>

        {!pidx ? (
          <div
            style={{
              padding: '1rem',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#F87171',
              fontSize: '0.85rem',
              display: 'flex',
              gap: '0.6rem',
              alignItems: 'center',
            }}
          >
            <AlertCircle size={16} />
            <span>No payment session found. Start a checkout from the Billing page.</span>
          </div>
        ) : (
          <>
            {/* Order summary */}
            <div
              style={{
                backgroundColor: 'var(--hub-sidebar-bg)',
                borderRadius: '8px',
                padding: '1rem 1.25rem',
                marginBottom: '1.5rem',
                border: '1px solid var(--hub-card-border)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--hub-text-secondary)' }}>Order</span>
                <span style={{ color: 'var(--hub-text-primary)', fontWeight: 600 }}>{order}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--hub-text-secondary)' }}>Amount Due</span>
                <span style={{ color: '#34D399', fontWeight: 700, fontSize: '1.05rem' }}>
                  NPR {amountNpr.toLocaleString()}
                </span>
              </div>
            </div>

            {error && (
              <div
                style={{
                  padding: '0.6rem 0.85rem',
                  borderRadius: '8px',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#F87171',
                  fontSize: '0.8rem',
                  marginBottom: '1rem',
                }}
              >
                {error}
              </div>
            )}

            {/* Phone */}
            <div className="form-group">
              <label className="form-label" style={{ color: 'var(--hub-text-secondary)' }}>
                Khalti Mobile Number
              </label>
              <div style={{ position: 'relative' }}>
                <Smartphone
                  size={16}
                  style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--hub-text-muted)' }}
                />
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  style={{ paddingLeft: 38 }}
                  placeholder="98XXXXXXXX"
                />
              </div>
            </div>

            {/* PIN */}
            <div className="form-group">
              <label className="form-label" style={{ color: 'var(--hub-text-secondary)' }}>
                Khalti PIN
              </label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={16}
                  style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--hub-text-muted)' }}
                />
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  style={{ paddingLeft: 38, letterSpacing: '0.3em' }}
                  placeholder="••••"
                />
              </div>
            </div>

            <p style={{ fontSize: '0.72rem', color: 'var(--hub-text-muted)', marginBottom: '1.25rem' }}>
              Simulation only — any 10-digit number and 4-digit PIN completes the payment.
            </p>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => redirect(false)}
                disabled={paying}
                style={{
                  flex: 1,
                  backgroundColor: 'transparent',
                  border: '1px solid var(--hub-card-border)',
                  color: 'var(--hub-text-secondary)',
                  padding: '0.75rem',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: paying ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                }}
              >
                <X size={15} />
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePay}
                disabled={paying}
                style={{
                  flex: 2,
                  backgroundColor: 'var(--hub-purple-primary)',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '0.75rem',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  cursor: paying ? 'wait' : 'pointer',
                  boxShadow: '0 0 18px rgba(107, 77, 230, 0.4)',
                }}
              >
                {paying ? (
                  <>
                    <Loader2 size={16} className="pulse-emerald" />
                    Processing…
                  </>
                ) : (
                  <>
                    <ShieldCheck size={16} />
                    Pay NPR {amountNpr.toLocaleString()}
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
