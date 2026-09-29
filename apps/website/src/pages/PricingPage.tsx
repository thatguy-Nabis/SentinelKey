import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '../components/landing/Navbar.js';
import { Footer } from '../components/landing/Footer.js';
import {
  Check,
  ShieldCheck,
  Zap,
  Sparkles,
  CreditCard,
  X,
  BadgePercent
} from 'lucide-react';

export const PricingPage: React.FC = () => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [currency, setCurrency] = useState<'NPR' | 'USD'>('NPR');

  // Pro price calculations
  const proMonthlyNPR = 2499;
  const proAnnualMonthlyNPR = 1999;
  const proMonthlyUSD = 19;
  const proAnnualMonthlyUSD = 15;

  const displayProPrice = currency === 'NPR'
    ? (billingCycle === 'monthly' ? `NPR ${proMonthlyNPR.toLocaleString()}` : `NPR ${proAnnualMonthlyNPR.toLocaleString()}`)
    : (billingCycle === 'monthly' ? `$${proMonthlyUSD}` : `$${proAnnualMonthlyUSD}`);

  const displayBilledNote = billingCycle === 'annual'
    ? (currency === 'NPR' ? 'Billed NPR 23,988 annually (Save 20%)' : 'Billed $180 annually (Save 20%)')
    : 'Billed monthly, cancel anytime';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--landing-body-bg)', color: 'var(--landing-text-head)' }}>
      <Navbar />

      <main style={{ flex: 1 }}>
        {/* Standardized Hero Section matching All Marketing Pages */}
        <section className="page-hero">
          <div className="page-hero-container">
            <div className="page-hero-badge" style={{ backgroundColor: 'rgba(139, 92, 246, 0.15)', borderColor: 'rgba(139, 92, 246, 0.35)', color: '#C4B5FD' }}>
              <BadgePercent size={14} color="#A78BFA" />
              <span>Transparent Pricing • Instant Khalti Checkout in NPR</span>
            </div>

            <h1 className="page-hero-title">
              Predictable pricing for your <br />
              <span style={{ background: 'linear-gradient(135deg, #60A5FA 0%, #A78BFA 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                entire security stack
              </span>
            </h1>

            <p className="page-hero-subtitle">
              All four pillars—Auth, MFA, IDS Heuristics, ML Anomaly Scoring, and SKF1 File Encryption—included. Pay in Nepalese Rupees (NPR) with Khalti or USD.
            </p>

            {/* Billing Cycle & Currency Switchers */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
              {/* Monthly vs Annual */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '0.35rem',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                }}
              >
                <button
                  onClick={() => setBillingCycle('monthly')}
                  style={{
                    padding: '0.5rem 1.25rem',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    backgroundColor: billingCycle === 'monthly' ? '#1D63ED' : 'transparent',
                    color: billingCycle === 'monthly' ? '#FFFFFF' : '#CBD5E1',
                    transition: 'all 0.2s',
                    cursor: 'pointer',
                  }}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingCycle('annual')}
                  style={{
                    padding: '0.5rem 1.25rem',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    backgroundColor: billingCycle === 'annual' ? '#1D63ED' : 'transparent',
                    color: billingCycle === 'annual' ? '#FFFFFF' : '#CBD5E1',
                    transition: 'all 0.2s',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <span>Annual</span>
                  <span style={{ backgroundColor: '#10B981', color: '#000000', fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 800 }}>
                    -20%
                  </span>
                </button>
              </div>

              {/* Currency Selector */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '0.35rem',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                }}
              >
                <button
                  onClick={() => setCurrency('NPR')}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    backgroundColor: currency === 'NPR' ? '#8B5CF6' : 'transparent',
                    color: currency === 'NPR' ? '#FFFFFF' : '#CBD5E1',
                  }}
                >
                  NPR (रू)
                </button>
                <button
                  onClick={() => setCurrency('USD')}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    backgroundColor: currency === 'USD' ? '#8B5CF6' : 'transparent',
                    color: currency === 'USD' ? '#FFFFFF' : '#CBD5E1',
                  }}
                >
                  USD ($)
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 3 Pricing Cards in Clean Light Theme */}
        <section style={{ backgroundColor: '#FFFFFF', padding: '5rem 1.5rem 6rem' }}>
          <div style={{ maxWidth: '1240px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', alignItems: 'stretch' }}>
            {/* Free Tier */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '16px',
                padding: '2.5rem 2rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 4px 15px rgba(0,0,0,0.03)',
              }}
              className="spotlight-card"
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <ShieldCheck size={22} color="#64748B" />
                  <h3 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0F172A' }}>Community Free</h3>
                </div>
                <p style={{ fontSize: '0.9rem', color: '#64748B', minHeight: '48px', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                  Essential local authentication, TOTP multi-factor verification, and core security logging.
                </p>

                <div style={{ marginBottom: '2rem' }}>
                  <span style={{ fontSize: '2.75rem', fontWeight: 800, color: '#0F172A', fontFamily: 'var(--font-mono)' }}>
                    {currency === 'NPR' ? 'NPR 0' : '$0'}
                  </span>
                  <span style={{ color: '#64748B', fontSize: '0.9rem' }}> / forever</span>
                  <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '0.25rem' }}>Free for personal & open-source projects</div>
                </div>

                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '2.5rem' }}>
                  {[
                    '1 Administrator / Developer seat',
                    'JWT Auth & Refresh Token Rotation',
                    'In-Repo RFC 6238 TOTP MFA + 8 Backup Codes',
                    'Basic Security Event Audit Logging',
                    'AES-256-GCM Field-Level Encryption',
                    'Community Discord & Forum Support',
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
                  border: '1px solid #E2E8F0',
                  transition: 'background-color 0.15s',
                }}
              >
                Get Started Free
              </Link>
            </div>

            {/* Pro Plan (Elevated) */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '2px solid #8B5CF6',
                borderRadius: '16px',
                padding: '2.5rem 2rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 12px 40px -5px rgba(139, 92, 246, 0.2)',
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
                  color: '#FFFFFF',
                  padding: '0.25rem 1.25rem',
                  borderRadius: '999px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  boxShadow: '0 2px 10px rgba(139, 92, 246, 0.4)',
                }}
              >
                MOST POPULAR
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <Zap size={22} color="#8B5CF6" />
                  <h3 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0F172A' }}>SentinelKey Pro</h3>
                </div>
                <p style={{ fontSize: '0.9rem', color: '#64748B', minHeight: '48px', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                  Full intrusion detection with Haversine heuristics, Python Isolation Forest ML, and Khalti checkout.
                </p>

                <div style={{ marginBottom: '2rem' }}>
                  <span style={{ fontSize: '2.75rem', fontWeight: 800, color: '#0F172A', fontFamily: 'var(--font-mono)' }}>
                    {displayProPrice}
                  </span>
                  <span style={{ color: '#64748B', fontSize: '0.9rem' }}> / month</span>
                  <div style={{ fontSize: '0.8rem', color: '#8B5CF6', fontWeight: 600, marginTop: '0.25rem' }}>{displayBilledNote}</div>
                </div>

                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '2.5rem' }}>
                  {[
                    'Up to 10 Team seats (Admin, Analyst, Viewer)',
                    'Rules-Based IDS: Haversine Geo-Velocity (>800 km/h)',
                    'ML Anomaly Detection (Python Isolation Forest)',
                    'SKF1 Binary Envelope File Storage & Rotation',
                    'File & Email Classifiers (Entropy, Typosquatting)',
                    'Manifest V3 Browser Extension Companion',
                    'Automated Khalti ePayment & VAT Invoicing',
                    'Priority Email Support & IDS Webhook Hooks',
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
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  textAlign: 'center',
                  backgroundColor: 'var(--landing-hero-cta)',
                  color: '#FFFFFF',
                  padding: '0.85rem',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  boxShadow: '0 4px 14px rgba(29, 99, 237, 0.4)',
                }}
              >
                <CreditCard size={18} /> Upgrade with Khalti
              </Link>
            </div>

            {/* Enterprise Plan */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '16px',
                padding: '2.5rem 2rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 4px 15px rgba(0,0,0,0.03)',
              }}
              className="spotlight-card"
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <Sparkles size={22} color="#D97706" />
                  <h3 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0F172A' }}>Enterprise Sentinel</h3>
                </div>
                <p style={{ fontSize: '0.9rem', color: '#64748B', minHeight: '48px', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                  Unlimited clusters, custom classification thresholds, on-premise deployments, and 24/7 hotline.
                </p>

                <div style={{ marginBottom: '2rem' }}>
                  <span style={{ fontSize: '2.75rem', fontWeight: 800, color: '#0F172A', fontFamily: 'var(--font-mono)' }}>Custom</span>
                  <span style={{ color: '#64748B', fontSize: '0.9rem' }}> / annual contract</span>
                  <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '0.25rem' }}>Tailored enterprise licensing</div>
                </div>

                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '2.5rem' }}>
                  {[
                    'Unlimited team seats & API throughput',
                    'Custom Policy Rules (custom thresholds & weights)',
                    'On-Premise or Air-Gapped Cluster Deployment',
                    'Dedicated Master Key Management Service',
                    'Custom Threat Signatures & Malware Hash Blocks',
                    'SAML 2.0 / SSO Integration Support',
                    '1-Hour Response Security Hotline',
                  ].map((feat, idx) => (
                    <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.9rem', color: '#334155' }}>
                      <Check size={16} color="#10B981" /> {feat}
                    </li>
                  ))}
                </ul>
              </div>

              <Link
                to="/support"
                style={{
                  display: 'block',
                  textAlign: 'center',
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF',
                  padding: '0.85rem',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                }}
              >
                Contact Enterprise Sales
              </Link>
            </div>
          </div>
        </section>

        {/* Feature Comparison Matrix in White */}
        <section style={{ backgroundColor: '#FFFFFF', padding: '0 1.5rem 6rem' }}>
          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#0F172A', textAlign: 'center', marginBottom: '0.75rem' }}>
              Compare Stack Capabilities
            </h2>
            <p style={{ fontSize: '1rem', color: '#64748B', textAlign: 'center', marginBottom: '3rem' }}>
              Complete breakdown of SentinelKey modules across all tiers.
            </p>

            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '16px',
                overflow: 'hidden',
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.03)',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                    <th style={{ padding: '1.25rem 1.5rem', color: '#334155', fontSize: '0.9rem', width: '40%', fontWeight: 700 }}>Security Module</th>
                    <th style={{ padding: '1.25rem 1rem', color: '#475569', fontSize: '0.9rem', textAlign: 'center', fontWeight: 600 }}>Community Free</th>
                    <th style={{ padding: '1.25rem 1rem', color: '#8B5CF6', fontSize: '0.9rem', textAlign: 'center', fontWeight: 700 }}>SentinelKey Pro</th>
                    <th style={{ padding: '1.25rem 1rem', color: '#475569', fontSize: '0.9rem', textAlign: 'center', fontWeight: 600 }}>Enterprise</th>
                  </tr>
                </thead>
                <tbody style={{ fontSize: '0.875rem' }}>
                  {[
                    { name: 'JWT Access & Refresh Token Rotation', free: true, pro: true, ent: true },
                    { name: 'Role-Based Access Control (RBAC)', free: 'Admin only', pro: 'Admin, Analyst, Viewer', ent: 'Custom Roles' },
                    { name: 'RFC 6238 TOTP MFA Engine', free: true, pro: true, ent: true },
                    { name: 'Encrypted TOTP Secrets (AES-256-GCM)', free: true, pro: true, ent: true },
                    { name: 'Rules-Based IDS Heuristics', free: 'Basic rate limit', pro: 'Haversine & Bursts', ent: 'Custom Rules' },
                    { name: 'Impossible Travel Detection (>800 km/h)', free: false, pro: true, ent: true },
                    { name: 'ML Anomaly Detection (Isolation Forest)', free: false, pro: true, ent: true },
                    { name: 'SKF1 Binary Envelope File Encryption', free: false, pro: true, ent: true },
                    { name: 'Threat Classifiers (Files & Phishing)', free: false, pro: true, ent: true },
                    { name: 'Manifest V3 Browser Extension Companion', free: false, pro: true, ent: true },
                    { name: 'Khalti Automated Invoicing (NPR)', free: false, pro: true, ent: true },
                    { name: 'Support Response SLA', free: 'Community', pro: '24 hr email', ent: '1 hr hotline' },
                  ].map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '1rem 1.5rem', color: '#0F172A', fontWeight: 600 }}>{row.name}</td>
                      <td style={{ padding: '1rem', textAlign: 'center', color: '#64748B' }}>
                        {typeof row.free === 'boolean' ? (
                          row.free ? <Check size={18} color="#10B981" style={{ margin: '0 auto' }} /> : <X size={18} color="#94A3B8" style={{ margin: '0 auto' }} />
                        ) : row.free}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center', color: '#0F172A', backgroundColor: 'rgba(139, 92, 246, 0.03)', fontWeight: 600 }}>
                        {typeof row.pro === 'boolean' ? (
                          row.pro ? <Check size={18} color="#8B5CF6" style={{ margin: '0 auto' }} /> : <X size={18} color="#94A3B8" style={{ margin: '0 auto' }} />
                        ) : row.pro}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center', color: '#64748B' }}>
                        {typeof row.ent === 'boolean' ? (
                          row.ent ? <Check size={18} color="#10B981" style={{ margin: '0 auto' }} /> : <X size={18} color="#94A3B8" style={{ margin: '0 auto' }} />
                        ) : row.ent}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Khalti Banner in Light Theme */}
        <section style={{ backgroundColor: 'var(--landing-section-alt)', padding: '5rem 1.5rem' }}>
          <div
            style={{
              maxWidth: '1100px',
              margin: '0 auto',
              backgroundColor: '#FFFFFF',
              border: '1px solid #DDD6FE',
              borderRadius: '16px',
              padding: '2.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1.5rem',
              boxShadow: '0 4px 20px rgba(139, 92, 246, 0.08)',
            }}
          >
            <div>
              <div style={{ display: 'inline-block', backgroundColor: '#5c2d91', color: '#ffffff', fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '4px', marginBottom: '0.5rem' }}>
                KHALTI VERIFIED PARTNER
              </div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.5rem' }}>
                Upgrade Instantly with Khalti in Nepal
              </h3>
              <p style={{ fontSize: '0.9rem', color: '#475569', maxWidth: '580px', lineHeight: 1.5 }}>
                Local developers and teams in Nepal can upgrade to SentinelKey Pro (NPR 2,499/mo) with Khalti Wallet, e-Banking, or SCT card with automated tax invoices and zero international transaction surcharges.
              </p>
            </div>
            <Link
              to="/app/billing"
              style={{
                backgroundColor: '#8B5CF6',
                color: '#FFFFFF',
                padding: '0.85rem 1.75rem',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.95rem',
                boxShadow: '0 4px 14px rgba(139, 92, 246, 0.35)',
              }}
            >
              Go to Billing Portal
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};
