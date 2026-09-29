import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Navbar } from '../components/landing/Navbar.js';
import { Footer } from '../components/landing/Footer.js';
import {
  ShieldCheck,
  Key,
  Activity,
  Brain,
  Lock,
  Search,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Zap,
} from 'lucide-react';

interface ProductItem {
  id: string;
  badge: string;
  category: 'auth' | 'mfa' | 'ids' | 'ml' | 'encryption' | 'classification';
  name: string;
  tagline: string;
  description: string;
  icon: React.ReactNode;
  specs: { label: string; value: string }[];
  keyFeatures: string[];
  terminalSnippet?: string;
  ctaText: string;
  ctaLink: string;
}

const PRODUCTS: ProductItem[] = [
  {
    id: 'auth-rbac',
    badge: 'Core Identity',
    category: 'auth',
    name: 'Auth, Sessions & RBAC',
    tagline: 'Stateless JWT rotation with granular Role-Based Access Control',
    description:
      'Zero-dependency authentication system providing 15-minute access tokens and 7-day refresh tokens. Implements automatic token rotation, reuse detection (invalidates all tokens upon replay), bcrypt 12-round password hashing, and in-memory rate limiting.',
    icon: <ShieldCheck size={26} color="#1D63ED" />,
    specs: [
      { label: 'Access Token Lifespan', value: '15 Minutes' },
      { label: 'Refresh Token Lifespan', value: '7 Days (Rotating)' },
      { label: 'Password Security', value: 'Bcrypt (12 Rounds)' },
      { label: 'Built-in Roles', value: 'Admin, Analyst, Viewer' },
    ],
    keyFeatures: [
      'Automatic single-use refresh token rotation with immediate invalidation on reuse',
      'Defense-in-depth: passwordHash and refreshTokens stripped via Mongoose toJSON',
      'In-memory IP rate limiter protecting login and registration endpoints',
      'Strict RBAC permission middleware (authorize("resource:action"))',
    ],
    terminalSnippet: `# User registration (First user automatically assigned admin)
curl -X POST http://localhost:4000/auth/register \\
  -H "Content-Type: application/json" \\
  -d '{"email":"admin@sentinelkey.internal","password":"SecurePassword123!"}'`,
    ctaText: 'View Auth Endpoints',
    ctaLink: '/docs',
  },
  {
    id: 'adaptive-mfa',
    badge: 'Multi-Factor Auth',
    category: 'mfa',
    name: 'Adaptive MFA Engine (TOTP)',
    tagline: '100% in-repo RFC 6238 TOTP with AES-256-GCM encrypted secrets',
    description:
      'Self-contained time-based one-time password (TOTP) engine built using Node.js crypto. Stores TOTP secrets encrypted with AES-256-GCM, generates 8 single-use recovery backup codes, and enforces exponential backoff lockout after consecutive failures.',
    icon: <Key size={26} color="#8B5CF6" />,
    specs: [
      { label: 'Algorithm', value: 'RFC 6238 TOTP / RFC 4648 Base32' },
      { label: 'Secret Encryption', value: 'AES-256-GCM (128-bit Tag)' },
      { label: 'Time Tolerance', value: '±30 seconds (1 Time Step)' },
      { label: 'Recovery Option', value: '8 Hashed Backup Codes' },
    ],
    keyFeatures: [
      'Replay protection: stores mfaLastTimeStep to block duplicate tokens in same window',
      'Exponential lockout duration (BASE_LOCKOUT * 2^excess) on repeated failed attempts',
      'Generates standard authenticator URIs and QR code data URLs',
      'Single-use backup recovery codes formatted as XXXX-XXXX (SHA-256 hashed)',
    ],
    terminalSnippet: `# Verify MFA challenge code during authentication
curl -X POST http://localhost:4000/auth/mfa/verify \\
  -H "Content-Type: application/json" \\
  -d '{"mfaToken":"<challenge_jwt>","code":"492810"}'`,
    ctaText: 'Test MFA Setup',
    ctaLink: '/docs',
  },
  {
    id: 'heuristics-ids',
    badge: 'Intrusion Detection',
    category: 'ids',
    name: 'Rules-Based Intrusion Detection (IDS)',
    tagline: 'Near-real-time heuristics tracking geo-velocity and attack bursts',
    description:
      'In-memory mathematical heuristics engine that inspects every security event. Detects brute-force credential bursts, calculates Haversine great-circle distances to flag impossible travel (>800 km/h), and monitors privilege escalation.',
    icon: <Activity size={26} color="#EF4444" />,
    specs: [
      { label: 'Evaluation Latency', value: '< 2 ms (In-Memory Math)' },
      { label: 'Geo-Velocity Limit', value: '> 800 km/h (Impossible Travel)' },
      { label: 'Brute-Force Window', value: '≥ 5 failed attempts in 60s' },
      { label: 'Alert Actions', value: 'Acknowledge, Resolve, Webhooks' },
    ],
    keyFeatures: [
      'Pure TypeScript Haversine formula calculation for exact Earth distances',
      'Non-blocking failsafe logging: database hiccups never disrupt user logins',
      'Instant critical alert creation when consumed refresh tokens are replayed',
      'Pluggable alert subscriber hooks for WebSocket and notification dispatch',
    ],
    terminalSnippet: `# Query active intrusion detection alerts
curl -X GET "http://localhost:4000/alerts?status=open&severity=high" \\
  -H "Authorization: Bearer <access_token>"`,
    ctaText: 'Explore IDS Alerts',
    ctaLink: '/app',
  },
  {
    id: 'ml-anomaly',
    badge: 'Machine Learning',
    category: 'ml',
    name: 'ML Anomaly Detection Microservice',
    tagline: 'Scikit-learn Isolation Forest on 8-dimensional security telemetry',
    description:
      'Dedicated Python Flask microservice that scores events using an ensemble of Isolation Forests and statistical outlier analysis. Evaluates hour of day, burst frequency, failed login ratio, and geo-velocity to spot zero-day behavioral drift.',
    icon: <Brain size={26} color="#D97706" />,
    specs: [
      { label: 'Model Architecture', value: 'IsolationForest + Statistical Z-Score' },
      { label: 'Feature Dimensions', value: '8-Dimensional Normalized Vector' },
      { label: 'Scoring Latency', value: '< 15 ms via Flask REST' },
      { label: 'Resilience', value: '2,000ms Abort Signal & Fallback' },
    ],
    keyFeatures: [
      'Calibrated sigmoidal anomaly score mapped between 0.0 and 1.0',
      'Explainable AI: pinpoints contributing features whenever Z-score deviation ≥ 2.0',
      'High accuracy benchmark: 100% True Positive Rate with 0.21% False Positive Rate',
      'Non-blocking async evaluation with circuit-breaker protection in Node.js backend',
    ],
    terminalSnippet: `# Score an event against the Python ML microservice
curl -X POST http://localhost:5001/score \\
  -H "Content-Type: application/json" \\
  -d '{"event":{"type":"AUTH_LOGIN_FAILED","timestamp":"2026-09-27T14:00:00Z"},"history":[]}'`,
    ctaText: 'Inspect ML Service',
    ctaLink: '/docs',
  },
  {
    id: 'field-file-encryption',
    badge: 'Cryptographic Storage',
    category: 'encryption',
    name: 'Field & File Encryption (SKF1)',
    tagline: 'AES-256-GCM envelope encryption with HKDF key derivation',
    description:
      'Complete cryptographic storage engine. Encrypts sensitive document fields with AES-256-GCM (`enc:v1:...`) and packs files into 34-byte binary envelopes (`SKF1`). Utilizes HKDF-SHA256 for domain separation and supports zero-downtime key rotation.',
    icon: <Lock size={26} color="#10B981" />,
    specs: [
      { label: 'Cipher & Mode', value: 'AES-256-GCM (96-bit IV, 128-bit Tag)' },
      { label: 'Key Derivation', value: 'HKDF-SHA256 with Domain Salts' },
      { label: 'File Envelope', value: 'SKF1 Binary Header (34 Bytes)' },
      { label: 'Integrity Check', value: 'SHA-256 Pre-Encryption Checksum' },
    ],
    keyFeatures: [
      'Zero-downtime key rotation: advances active key version while legacy keys decrypt',
      'Tamper detection: detects tag modification and ciphertext alteration instantly',
      'Full audit trail: every file download and field decryption is logged with IP & user',
      'Strict byte-for-byte SHA-256 authenticity verified before payload stream',
    ],
    terminalSnippet: `# Upload and encrypt a file into SKF1 envelope
curl -X POST http://localhost:4000/files/upload \\
  -H "Authorization: Bearer <access_token>" \\
  -F "file=@confidential_report.pdf"`,
    ctaText: 'Read Encryption Specs',
    ctaLink: '/docs',
  },
  {
    id: 'threat-classification',
    badge: 'Threat Inspection',
    category: 'classification',
    name: 'Threat Classification & Browser Extension',
    tagline: 'Deterministic file, email, and URL inspection with pre-flight defense',
    description:
      'Multi-vector classification engine inspecting event anomalies, file binary magic bytes, Shannon entropy ($H > 7.7$ for packed malware), and email typosquatting. Paired with a Manifest V3 Chrome Extension that blocks malicious links and file uploads.',
    icon: <Search size={26} color="#0284C7" />,
    specs: [
      { label: 'Shannon Entropy', value: 'Calculates byte information density' },
      { label: 'Magic Bytes', value: 'MZ, ELF, and archive header verification' },
      { label: 'Email Phishing', value: 'Levenshtein typosquatting & fake links' },
      { label: 'Extension Standard', value: 'Chrome Manifest V3 with Fail-Safe' },
    ],
    keyFeatures: [
      'FILE-001 & FILE-002: Detects disguised PE executables in PDFs and packed malware',
      'EML-001 & EML-002: Identifies lookalike domains (e.g. micros0ft) and href mismatches',
      'Configurable action policies: customize ALLOW, WARN, BLOCK, and QUARANTINE rules',
      'Chrome Extension: intercepts <input type="file"> and outbound link clicks pre-flight',
    ],
    terminalSnippet: `# Classify a suspicious incoming email for phishing indicators
curl -X POST http://localhost:4000/classify/email \\
  -H "Authorization: Bearer <access_token>" \\
  -H "Content-Type: application/json" \\
  -d '{"sender":"security@paypa1.com","subject":"Urgent: Account Locked"}'`,
    ctaText: 'Test Classifiers',
    ctaLink: '/docs',
  },
];

export const ProductsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const categoryParam = searchParams.get('category');
  const [activeCategory, setActiveCategory] = useState<string>(categoryParam || 'all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (categoryParam) {
      setActiveCategory(categoryParam);
    }
  }, [categoryParam]);

  const filteredProducts = activeCategory === 'all'
    ? PRODUCTS
    : PRODUCTS.filter((p) => p.category === activeCategory);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--landing-body-bg)', color: 'var(--landing-text-head)' }}>
      <Navbar />

      <main style={{ flex: 1 }}>
        {/* Standardized Hero Section matching All Marketing Pages */}
        <section className="page-hero">
          <div className="page-hero-container">
            <div className="page-hero-badge">
              <Zap size={14} color="#60A5FA" />
              <span>Full-Stack Security Product Modules</span>
            </div>

            <h1 className="page-hero-title">
              Engineered from the ground up for <br />
              <span style={{ background: 'linear-gradient(135deg, #60A5FA 0%, #A78BFA 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                zero external SaaS lock-in
              </span>
            </h1>

            <p className="page-hero-subtitle">
              Every security primitive in SentinelKey—from RFC 6238 TOTP and AES-256-GCM file storage to Isolation Forest anomaly scoring—runs completely within your own infrastructure.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <Link
                to="/signup"
                style={{
                  backgroundColor: 'var(--landing-hero-cta)',
                  color: '#FFFFFF',
                  padding: '0.85rem 2rem',
                  borderRadius: '6px',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 4px 14px rgba(29, 99, 237, 0.4)',
                }}
              >
                Get Started Free <ChevronRight size={16} />
              </Link>
              <Link
                to="/docs"
                style={{
                  backgroundColor: 'transparent',
                  color: '#FFFFFF',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  padding: '0.85rem 2rem',
                  borderRadius: '6px',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                }}
              >
                Read API Documentation
              </Link>
            </div>
          </div>
        </section>

        {/* Category Filters */}
        <section style={{ backgroundColor: 'var(--landing-section-alt)', borderBottom: '1px solid #E2E8F0', padding: '1.5rem 1.5rem' }}>
          <div
            style={{
              maxWidth: '1240px',
              margin: '0 auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.6rem',
              flexWrap: 'wrap',
            }}
          >
            {[
              { id: 'all', label: 'All Capabilities' },
              { id: 'auth', label: 'Auth & RBAC' },
              { id: 'mfa', label: 'Adaptive MFA' },
              { id: 'ids', label: 'Intrusion Detection' },
              { id: 'ml', label: 'ML Anomaly Engine' },
              { id: 'encryption', label: 'Field & File Encryption' },
              { id: 'classification', label: 'Threat Classifiers' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                style={{
                  padding: '0.5rem 1.15rem',
                  borderRadius: '20px',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  backgroundColor: activeCategory === cat.id ? '#1D63ED' : '#FFFFFF',
                  color: activeCategory === cat.id ? '#FFFFFF' : '#475569',
                  border: activeCategory === cat.id ? '1px solid #1D63ED' : '1px solid #CBD5E1',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                  boxShadow: activeCategory === cat.id ? '0 2px 6px rgba(29, 99, 237, 0.25)' : 'none',
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </section>

        {/* Product Cards Grid */}
        <section style={{ backgroundColor: '#FFFFFF', padding: '4rem 1.5rem 6rem' }}>
          <div
            style={{
              maxWidth: '1240px',
              margin: '0 auto',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
              gap: '2rem',
            }}
          >
            {filteredProducts.map((prod) => (
              <div
                key={prod.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '14px',
                  padding: '2.25rem 2rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
                }}
                className="spotlight-card"
              >
                <div>
                  {/* Card Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                    <div
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '10px',
                        backgroundColor: '#F1F5F9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid #E2E8F0',
                      }}
                    >
                      {prod.icon}
                    </div>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        backgroundColor: '#F1F5F9',
                        color: '#475569',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '999px',
                        border: '1px solid #E2E8F0',
                      }}
                    >
                      {prod.badge}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.4rem' }}>
                    {prod.name}
                  </h3>
                  <p style={{ fontSize: '0.9rem', color: '#1D63ED', fontWeight: 600, marginBottom: '0.85rem' }}>
                    {prod.tagline}
                  </p>
                  <p style={{ fontSize: '0.925rem', color: '#475569', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                    {prod.description}
                  </p>

                  {/* Specs Grid */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '0.75rem',
                      backgroundColor: '#F8FAFC',
                      padding: '1rem',
                      borderRadius: '8px',
                      marginBottom: '1.5rem',
                      border: '1px solid #E2E8F0',
                    }}
                  >
                    {prod.specs.map((spec, i) => (
                      <div key={i}>
                        <div style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                          {spec.label}
                        </div>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0F172A', marginTop: '0.15rem' }}>
                          {spec.value}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Key Capabilities */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
                      Key Capabilities:
                    </div>
                    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {prod.keyFeatures.map((feat, i) => (
                        <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.875rem', color: '#475569', lineHeight: 1.4 }}>
                          <CheckCircle2 size={16} color="#10B981" style={{ flexShrink: 0, marginTop: '2px' }} />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Dark Terminal Box */}
                  {prod.terminalSnippet && (
                    <div
                      style={{
                        backgroundColor: '#0F172A',
                        border: '1px solid #1E293B',
                        borderRadius: '8px',
                        padding: '0.85rem 1rem',
                        marginBottom: '1.75rem',
                        position: 'relative',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.8rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '0.35rem' }}>
                        <span style={{ color: '#94A3B8', fontSize: '0.75rem' }}>CLI / API EXAMPLE</span>
                        <button
                          onClick={() => handleCopy(prod.id, prod.terminalSnippet || '')}
                          style={{
                            color: copiedId === prod.id ? '#10B981' : '#94A3B8',
                            fontSize: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            cursor: 'pointer',
                          }}
                        >
                          {copiedId === prod.id ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                      <pre style={{ color: '#93C5FD', whiteSpace: 'pre-wrap', lineHeight: 1.4, margin: 0 }}>
                        {prod.terminalSnippet}
                      </pre>
                    </div>
                  )}
                </div>

                {/* Footer action */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #E2E8F0', paddingTop: '1.25rem' }}>
                  <Link
                    to={prod.ctaLink}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      color: 'var(--landing-hero-cta)',
                    }}
                  >
                    {prod.ctaText} <ChevronRight size={16} />
                  </Link>

                  <Link
                    to="/docs"
                    style={{
                      fontSize: '0.85rem',
                      color: '#64748B',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                    }}
                  >
                    API Reference <ExternalLink size={12} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Architecture Pipeline in Section Alt */}
        <section
          style={{
            backgroundColor: 'var(--landing-section-alt)',
            borderTop: '1px solid #E2E8F0',
            borderBottom: '1px solid #E2E8F0',
            padding: '5rem 1.5rem',
          }}
        >
          <div style={{ maxWidth: '1100px', margin: '0 auto', textAlign: 'center' }}>
            <h2 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.75rem' }}>
              Four-Phase Defense Lifecycle
            </h2>
            <p style={{ fontSize: '1.05rem', color: '#64748B', maxWidth: '640px', margin: '0 auto 3.5rem' }}>
              From initial user authentication to real-time heuristic scoring and cryptographic file storage.
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '1.5rem',
              }}
            >
              {[
                {
                  step: '01',
                  title: 'Auth & TOTP Challenge',
                  desc: 'JWT token rotation verifies identity; unverified devices require RFC 6238 TOTP with encrypted secrets.',
                  icon: <ShieldCheck size={24} color="#1D63ED" />,
                },
                {
                  step: '02',
                  title: 'Heuristic & Geo Math',
                  desc: 'Haversine distance verifies travel velocity (<800 km/h) and checks for credential stuffing bursts.',
                  icon: <Activity size={24} color="#8B5CF6" />,
                },
                {
                  step: '03',
                  title: 'ML Isolation Forest',
                  desc: 'Python service evaluates 8-dimensional telemetry vectors, scoring zero-day behavioral drift in <15ms.',
                  icon: <Brain size={24} color="#D97706" />,
                },
                {
                  step: '04',
                  title: 'SKF1 Envelope Encryption',
                  desc: 'Data and files are sealed with AES-256-GCM using HKDF domain-separated keys with SHA-256 checksums.',
                  icon: <Lock size={24} color="#10B981" />,
                },
              ].map((gate, i) => (
                <div
                  key={i}
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '12px',
                    padding: '2rem 1.5rem',
                    textAlign: 'left',
                    position: 'relative',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: '1rem',
                      right: '1.25rem',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '1.25rem',
                      fontWeight: 800,
                      color: '#CBD5E1',
                    }}
                  >
                    {gate.step}
                  </div>
                  <div style={{ marginBottom: '1.25rem' }}>{gate.icon}</div>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.5rem' }}>
                    {gate.title}
                  </h4>
                  <p style={{ fontSize: '0.875rem', color: '#64748B', lineHeight: 1.5 }}>
                    {gate.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Bottom CTA in White */}
        <section style={{ padding: '5rem 1.5rem', backgroundColor: '#FFFFFF', textAlign: 'center' }}>
          <div
            style={{
              maxWidth: '800px',
              margin: '0 auto',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '16px',
              padding: '3.5rem 2rem',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
            }}
          >
            <h3 style={{ fontSize: '2rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.75rem' }}>
              Ready to secure your stack with SentinelKey?
            </h3>
            <p style={{ fontSize: '1.05rem', color: '#64748B', marginBottom: '2rem' }}>
              Start free on local development or upgrade seamlessly with Khalti in Nepal.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <Link
                to="/signup"
                style={{
                  backgroundColor: 'var(--landing-hero-cta)',
                  color: '#FFFFFF',
                  padding: '0.85rem 2rem',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                }}
              >
                Get Started Free
              </Link>
              <Link
                to="/pricing"
                style={{
                  backgroundColor: '#FFFFFF',
                  color: '#0F172A',
                  border: '1px solid #CBD5E1',
                  padding: '0.85rem 2rem',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                }}
              >
                View Plans & Pricing
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};
