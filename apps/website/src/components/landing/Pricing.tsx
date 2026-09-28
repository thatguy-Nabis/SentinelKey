import React from 'react';
import { Link } from 'react-router-dom';
import { Check, ShieldCheck, Zap, Sparkles } from 'lucide-react';

export const Pricing: React.FC = () => {
  return (
    <section id="pricing" style={{ padding: '6rem 1.5rem', backgroundColor: '#ffffff', borderTop: '1px solid #E2E8F0' }}>
      <div style={{ maxWidth: '1240px', margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', marginBottom: '0.75rem' }}>
          Transparent, developer-first pricing
        </h2>
        <p style={{ fontSize: '1.1rem', color: '#64748B', maxWidth: '640px', margin: '0 auto 4rem' }}>
          Pay seamlessly with Khalti in Nepalese Rupees (NPR). Start free on your local workstation and upgrade anytime.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', alignItems: 'stretch' }}>
          {/* Free Plan */}
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #E2E8F0',
              borderRadius: '14px',
              padding: '2.5rem 2rem',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 4px 15px rgba(0,0,0,0.03)',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <ShieldCheck size={20} color="#64748B" />
                <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0F172A' }}>Community Free</h3>
              </div>
              <p style={{ fontSize: '0.9rem', color: '#64748B', minHeight: '48px', marginBottom: '1.5rem' }}>
                Core authentication, TOTP MFA, and real-time intrusion detection for individual developers.
              </p>
              <div style={{ marginBottom: '2rem' }}>
                <span style={{ fontSize: '2.75rem', fontWeight: 800, color: '#0F172A', fontFamily: 'var(--font-mono)' }}>NPR 0</span>
                <span style={{ color: '#64748B', fontSize: '0.9rem' }}> / forever</span>
              </div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '2.5rem' }}>
                {[
                  '1 Developer seat',
                  'Auth & RBAC (admin/analyst/viewer)',
                  'RFC 6238 TOTP MFA with recovery codes',
                  'Rules-Based IDS (brute-force & geo-velocity)',
                  'Community forum support',
                ].map((feat, idx) => (
                  <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.9rem', color: '#334155' }}>
                    <Check size={16} color="#10B981" /> {feat}
                  </li>
                ))}
              </ul>
            </div>
            <Link
              to="/signup"
              style={{
                display: 'block',
                textAlign: 'center',
                backgroundColor: '#F1F5F9',
                color: '#0F172A',
                padding: '0.85rem',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.95rem',
                transition: 'background-color 0.15s',
              }}
            >
              Get Started Free
            </Link>
          </div>

          {/* Pro Plan (Elevated) */}
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '2px solid #8B5CF6',
              borderRadius: '14px',
              padding: '2.5rem 2rem',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 12px 35px -5px rgba(139, 92, 246, 0.2)',
              position: 'relative',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: '-14px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: '#8B5CF6',
                color: '#ffffff',
                padding: '0.25rem 1rem',
                borderRadius: '999px',
                fontSize: '0.75rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
              }}
            >
              MOST POPULAR
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <Zap size={20} color="#8B5CF6" />
                <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0F172A' }}>SentinelKey Pro</h3>
              </div>
              <p style={{ fontSize: '0.9rem', color: '#64748B', minHeight: '48px', marginBottom: '1.5rem' }}>
                Full security stack with ML anomaly detection, SKF1 encryption, threat classifiers, and priority alerts.
              </p>
              <div style={{ marginBottom: '2rem' }}>
                <span style={{ fontSize: '2.75rem', fontWeight: 800, color: '#0F172A', fontFamily: 'var(--font-mono)' }}>NPR 2,499</span>
                <span style={{ color: '#64748B', fontSize: '0.9rem' }}> / month</span>
              </div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '2.5rem' }}>
                {[
                  'Up to 10 Team seats',
                  'ML Anomaly Detection (Isolation Forest)',
                  'Field & File AES-256-GCM Encryption',
                  'Pre-flight Manifest V3 file inspection',
                  'Khalti ePayment automated invoicing',
                  'Priority security alert routing',
                  '99.9% uptime SLA & email support',
                ].map((feat, idx) => (
                  <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.9rem', color: '#334155' }}>
                    <Check size={16} color="#8B5CF6" /> {feat}
                  </li>
                ))}
              </ul>
            </div>
            <Link
              to="/app/billing"
              style={{
                display: 'block',
                textAlign: 'center',
                backgroundColor: 'var(--landing-hero-cta)',
                color: '#ffffff',
                padding: '0.85rem',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.95rem',
                boxShadow: '0 4px 12px rgba(29, 99, 237, 0.35)',
              }}
            >
              Upgrade with Khalti
            </Link>
          </div>

          {/* Enterprise Plan */}
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #E2E8F0',
              borderRadius: '14px',
              padding: '2.5rem 2rem',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 4px 15px rgba(0,0,0,0.03)',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <Sparkles size={20} color="#0F172A" />
                <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0F172A' }}>Enterprise Sentinel</h3>
              </div>
              <p style={{ fontSize: '0.9rem', color: '#64748B', minHeight: '48px', marginBottom: '1.5rem' }}>
                Custom deployment, dedicated cryptographic architect, extended RBAC policies, and 24/7 incident response.
              </p>
              <div style={{ marginBottom: '2rem' }}>
                <span style={{ fontSize: '2.75rem', fontWeight: 800, color: '#0F172A', fontFamily: 'var(--font-mono)' }}>Custom</span>
                <span style={{ color: '#64748B', fontSize: '0.9rem' }}> / annual SLA</span>
              </div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '2.5rem' }}>
                {[
                  'Unlimited seats & workspaces',
                  'Custom IDS rules & classifier thresholds',
                  'Dedicated field encryption key management',
                  'Single Sign-On (SAML / OIDC)',
                  'Dedicated cryptographic architect',
                  '1-hour SLA 24/7 critical incident response',
                ].map((feat, idx) => (
                  <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.9rem', color: '#334155' }}>
                    <Check size={16} color="#10B981" /> {feat}
                  </li>
                ))}
              </ul>
            </div>
            <Link
              to="/app"
              style={{
                display: 'block',
                textAlign: 'center',
                backgroundColor: '#0F172A',
                color: '#ffffff',
                padding: '0.85rem',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.95rem',
              }}
            >
              Contact Sales
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};
