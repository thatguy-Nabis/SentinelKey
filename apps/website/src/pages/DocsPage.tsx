import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '../components/landing/Navbar.js';
import { Footer } from '../components/landing/Footer.js';
import {
  Search,
  Copy,
  Check,
  ChevronRight,
  ExternalLink,
  Play,
  Zap,
  ArrowRight
} from 'lucide-react';

interface DocSection {
  id: string;
  category: string;
  title: string;
  description: string;
  badge?: string;
  content: {
    lead: string;
    codeTabs?: { lang: string; label: string; code: string }[];
    steps?: { title: string; desc: string; snippet?: string }[];
    params?: { name: string; type: string; required: boolean; desc: string }[];
    responseSnippet?: string;
  };
}

const DOC_SECTIONS: DocSection[] = [
  {
    id: 'quickstart',
    category: 'Getting Started',
    title: 'Quickstart: SDK Setup & Authentication',
    description: 'Install the @sentinelkey/security-stack-sdk, obtain a JWT, and start making authenticated API calls in under 5 minutes.',
    badge: 'Popular',
    content: {
      lead: 'SentinelKey ships a TypeScript SDK (@sentinelkey/security-stack-sdk) that handles JWT access token issuance, silent 401 refresh, and typed wrappers for every REST endpoint. Initialize the client once and use it throughout your app.',
      codeTabs: [
        {
          lang: 'bash',
          label: 'npm / pnpm',
          code: `npm install @sentinelkey/security-stack-sdk\n# or with pnpm\npnpm add @sentinelkey/security-stack-sdk`,
        },
        {
          lang: 'typescript',
          label: 'TypeScript',
          code: `import { SentinelKeyClient } from '@sentinelkey/security-stack-sdk';

// 1. Authenticate — returns a 15-minute JWT access token
//    and a 7-day rotating refresh token (httpOnly cookie)
const client = await SentinelKeyClient.login({
  email: 'analyst@acme.com',
  password: process.env.SK_PASSWORD,
});

// 2. The client automatically refreshes the JWT on 401
const profile = await client.auth.me();
console.log('Logged in as:', profile.email, '| Role:', profile.role);

// 3. Upload a file — scanned & encrypted before storage
const result = await client.files.upload('./report.pdf');
console.log('File ID:', result.id, '| SKF1 envelope:', result.encrypted);`,
        },
      ],
      steps: [
        {
          title: '1. Sign Up & Get Credentials',
          desc: 'Create a SentinelKey account. Your initial role is viewer; an admin must promote you to analyst or admin.',
        },
        {
          title: '2. Install the SDK',
          desc: 'Run: pnpm add @sentinelkey/security-stack-sdk. The package ships TypeScript types for every API response.',
        },
        {
          title: '3. Call the API',
          desc: 'Every SDK method maps 1-to-1 to a REST endpoint. The SDK handles token refresh and serialization transparently.',
        },
      ],
      params: [
        { name: 'email', type: 'string', required: true, desc: 'Registered account email address' },
        { name: 'password', type: 'string', required: true, desc: 'Account password (bcrypt-12 hashed server-side)' },
      ],
    },
  },
  {
    id: 'mfa',
    category: 'Authentication',
    title: 'Adaptive MFA: TOTP Enrollment & Verification',
    description: 'Enable RFC 6238 TOTP two-factor authentication with AES-256-GCM encrypted secrets and single-use recovery codes.',
    content: {
      lead: 'SentinelKey MFA is 100% in-repo — no third-party authenticator cloud. TOTP secrets are stored AES-256-GCM encrypted at rest, 8 single-use recovery codes are issued on setup, and repeated failures trigger exponential lockout.',
      codeTabs: [
        {
          lang: 'bash',
          label: 'cURL — Enroll',
          code: `# Step 1: Generate a TOTP secret and QR code URI
curl -X POST https://api.sentinelkey.io/auth/mfa/setup \
  -H "Authorization: Bearer <access_token>"

# Response: { qrCodeUri, backupCodes: [...8 codes] }

# Step 2: Verify the first TOTP code to activate
curl -X POST https://api.sentinelkey.io/auth/mfa/verify \
  -H "Authorization: Bearer <access_token>" \
  -d '{"token": "847291"}'`,
        },
        {
          lang: 'typescript',
          label: 'TypeScript',
          code: `// Enroll MFA via the SDK
const { qrCodeUri, backupCodes } = await client.mfa.setup();

// Render qrCodeUri in your UI (e.g. <img src={qrCodeUri} />)
// User scans with Google Authenticator, Aegis, etc.

// Then confirm with their first generated token
await client.mfa.verify({ token: userInputToken });

// Subsequent logins require:
// POST /auth/login (password) → then POST /auth/mfa/challenge`,
        },
      ],
      params: [
        { name: 'token', type: 'string (6 digits)', required: true, desc: 'Time-based one-time password from authenticator app' },
      ],
      responseSnippet: `{
  "status": "success",
  "message": "MFA activated",
  "backupCodes": [
    "A1B2-C3D4", "E5F6-G7H8", "I9J0-K1L2",
    "M3N4-O5P6", "Q7R8-S9T0", "U1V2-W3X4",
    "Y5Z6-A7B8", "C9D0-E1F2"
  ]
}`,
    },
  },
  {
    id: 'ids',
    category: 'Intrusion Detection',
    title: 'Rules-Based IDS & Geo-Velocity Detection',
    description: 'Mathematical heuristics in TypeScript detect brute-force bursts, impossible Haversine travel, privilege escalation, and token reuse.',
    content: {
      lead: 'The IDS engine runs pure TypeScript math — no external agents or kernel hooks. Each login event is evaluated against 4 deterministic rules. Alerts are written to the alerts table and surfaced in the dashboard in real time.',
      steps: [
        {
          title: 'Rule 1 — Brute-Force Burst',
          desc: 'If an account records ≥ 5 failed login attempts within any 60-second sliding window, an alert fires and the account enters a 15-minute exponential lockout.',
        },
        {
          title: 'Rule 2 — Haversine Geo-Velocity',
          desc: 'Consecutive logins from two geolocations are checked with the Haversine formula. If the implied travel speed exceeds 800 km/h (impossible by commercial flight), an IMPOSSIBLE_TRAVEL alert is raised.',
        },
        {
          title: 'Rule 3 — Privilege Escalation',
          desc: 'Any role change that skips an intermediate level (e.g. viewer → admin) without an explicit admin action is flagged as PRIVILEGE_ESCALATION.',
        },
        {
          title: 'Rule 4 — Token Reuse',
          desc: 'Refresh tokens are single-use and rotated on every use. A second use of the same token hash generates a TOKEN_REUSE alert and immediately invalidates the entire session family.',
        },
      ],
      codeTabs: [
        {
          lang: 'bash',
          label: 'cURL — Stream Alerts',
          code: `# Fetch current open alerts (admin/analyst only)
curl -X GET https://api.sentinelkey.io/alerts \
  -H "Authorization: Bearer <access_token>"

# Acknowledge an alert
curl -X PATCH https://api.sentinelkey.io/alerts/alert_abc123 \
  -H "Authorization: Bearer <access_token>" \
  -d '{"acknowledged": true}'`,
        },
      ],
    },
  },
  {
    id: 'encryption',
    category: 'Encryption',
    title: 'AES-256-GCM Field & SKF1 File Encryption',
    description: 'Field-level database encryption with enc:v1: prefixed ciphertext, and SKF1 binary file envelopes with HKDF-SHA256 domain salts.',
    content: {
      lead: 'Every sensitive database column is encrypted with AES-256-GCM before write. Uploaded files are wrapped in a custom SKF1 binary envelope: a 34-byte header containing [SKF1][version][12-byte IV][16-byte Tag] prepended to the ciphertext. HKDF-SHA256 derives separate keys per domain.',
      codeTabs: [
        {
          lang: 'typescript',
          label: 'TypeScript SDK',
          code: `// Upload a file — SDK handles SKF1 wrapping transparently
const file = await client.files.upload('./sensitive-report.pdf');
console.log(file.id);        // "file_xK9p2mQ"
console.log(file.encrypted); // true

// Download and auto-decrypt
const buffer = await client.files.download(file.id);
// buffer is the original plaintext bytes

// Field encryption is automatic — no SDK config needed.
// DB stores:  enc:v1:base64(IV+Tag+Ciphertext)
// API returns: plaintext string`,
        },
        {
          lang: 'bash',
          label: 'cURL — Upload',
          code: `curl -X POST https://api.sentinelkey.io/files/upload \
  -H "Authorization: Bearer <access_token>" \
  -F "file=@./report.pdf"

# Response:
# { "id": "file_xK9p2mQ", "name": "report.pdf",
#   "size": 84210, "encrypted": true,
#   "mimeType": "application/pdf" }`,
        },
      ],
      steps: [
        {
          title: 'SKF1 Header Layout',
          desc: 'Bytes 0–3: magic "SKF1". Byte 4: version (0x01). Bytes 5–16: 12-byte random IV. Bytes 17–32: 16-byte GCM Auth Tag. Bytes 33+: AES-256-GCM ciphertext.',
        },
        {
          title: 'HKDF Domain Salts',
          desc: 'HKDF-SHA256 is called with info="sentinelkey-field-v1" for database columns and "sentinelkey-file-v1" for file uploads, deriving independent 256-bit keys from the root master key.',
        },
        {
          title: 'Zero-Downtime Key Rotation',
          desc: 'The key rotation endpoint re-encrypts all field ciphertext and file envelopes in a background job. Old keys are kept in a versioned key ring until rotation completes.',
        },
      ],
    },
  },
  {
    id: 'ml-anomaly',
    category: 'ML Anomaly Engine',
    title: 'Isolation Forest Anomaly Detection',
    description: 'Python Flask microservice (port 5001) trains a scikit-learn Isolation Forest on 8-dimensional login telemetry and scores every event in real time.',
    content: {
      lead: 'The ML Anomaly Service runs as a standalone Python Flask process (apps/ml-service). It exposes a single POST /predict endpoint that accepts an 8D feature vector and returns an anomaly score between –1.0 (anomalous) and 1.0 (normal).',
      codeTabs: [
        {
          lang: 'bash',
          label: 'cURL — Predict',
          code: `curl -X POST http://localhost:5001/predict \
  -H "Content-Type: application/json" \
  -d '{
    "hour_norm": 0.083,
    "is_night_hours": 1,
    "failed_login_ratio_1h": 0.6,
    "geo_velocity_kmh": 950,
    "is_new_device": 1,
    "login_count_24h": 32,
    "session_duration_norm": 0.02,
    "privilege_level": 2
  }'`,
        },
        {
          lang: 'python',
          label: 'Python (model.py)',
          code: `from sklearn.ensemble import IsolationForest
import numpy as np

# Feature vector shape: (n_samples, 8)
# Features: hour_norm, is_night_hours, failed_login_ratio_1h,
#            geo_velocity_kmh, is_new_device, login_count_24h,
#            session_duration_norm, privilege_level

model = IsolationForest(contamination=0.05, random_state=42)
model.fit(training_data)

score = model.decision_function([[0.083,1,0.6,950,1,32,0.02,2]])
# score < 0 → anomaly, score > 0 → normal`,
        },
      ],
      responseSnippet: `{
  "anomaly_score": -0.312,
  "is_anomalous": true,
  "threshold": -0.1,
  "features_received": 8
}`,
    },
  },
  {
    id: 'classifiers',
    category: 'Threat Classifiers',
    title: 'File & Email Threat Classification',
    description: 'File classifiers check magic bytes (MZ/ELF) and Shannon entropy. Email classifiers use Levenshtein typosquatting and shortener detection.',
    content: {
      lead: 'SentinelKey runs two threat classifier pipelines. The file classifier inspects uploaded files for executable signatures and high-entropy (encrypted/packed) content. The email classifier scans outbound links for phishing patterns.',
      codeTabs: [
        {
          lang: 'bash',
          label: 'cURL — Classify File',
          code: `curl -X POST https://api.sentinelkey.io/classify/file \
  -H "Authorization: Bearer <access_token>" \
  -F "file=@./suspicious.bin"

# Response:
# {
#   "isMalicious": true,
#   "reasons": ["executable_signature", "high_entropy"],
#   "entropy": 7.84,
#   "magicBytes": "MZ"
# }`,
        },
        {
          lang: 'bash',
          label: 'cURL — Classify Email',
          code: `curl -X POST https://api.sentinelkey.io/classify/email \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{ "subject": "Urgent: verify your PaypaI account",
        "links": ["https://bit.ly/3xQzR"] }'

# Response:
# { "isPhishing": true,
#   "reasons": ["typosquat_detected", "shortener_link"],
#   "levenshteinMatch": { "suspect": "PaypaI", "target": "PayPal", "distance": 1 } }`,
        },
      ],
      steps: [
        {
          title: 'Magic Byte Detection',
          desc: 'The first 4 bytes of every uploaded file are checked: MZ (Windows PE/EXE) and ELF (0x7f 45 4c 46, Linux binary) trigger an immediate executable_signature flag.',
        },
        {
          title: 'Shannon Entropy Check',
          desc: 'H = −Σ p(x) log₂ p(x) is computed over the full byte sequence. A score above 7.7 bits/byte indicates the file is encrypted or packed — a common packer/malware trait.',
        },
        {
          title: 'Levenshtein Typosquatting',
          desc: 'Sender domains and linked hostnames are compared to a blocklist of 500 brand names using Levenshtein distance ≤ 2. Matches within edit distance 1 of trusted domains flag phishing.',
        },
      ],
    },
  },
  {
    id: 'api-reference',
    category: 'API Reference',
    title: 'REST API Endpoint Reference',
    description: 'Full list of REST endpoints for auth, MFA, IDS alerts, file operations, and threat classifiers.',
    content: {
      lead: 'All endpoints are prefixed with the API base URL. Access tokens are 15-minute JWTs. Include the Authorization: Bearer <token> header on every authenticated request.',
      codeTabs: [
        {
          lang: 'bash',
          label: 'Auth Endpoints',
          code: `POST /auth/register       # Create account
POST /auth/login          # Get JWT + refresh token
POST /auth/refresh        # Rotate refresh token (httpOnly)
POST /auth/logout         # Revoke refresh token
GET  /auth/me             # Current user profile
PATCH /auth/me/password   # Change password (bcrypt-12)

POST /auth/mfa/setup      # Generate TOTP secret + QR
POST /auth/mfa/verify     # Activate MFA with first token
POST /auth/mfa/challenge  # Verify token during login`,
        },
        {
          lang: 'bash',
          label: 'Security Endpoints',
          code: `GET    /alerts              # List IDS alerts (analyst+)
PATCH  /alerts/:id         # Acknowledge alert (analyst+)

POST   /files/upload       # Upload & SKF1-encrypt file
GET    /files              # List encrypted files
GET    /files/:id/download # Decrypt & stream file
DELETE /files/:id          # Delete file

POST   /classify/file      # Magic byte + entropy check
POST   /classify/email     # Phishing / typosquat check`,
        },
      ],
      responseSnippet: `{
  "status": "success",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "usr_9f82a",
      "email": "analyst@acme.com",
      "role": "analyst",
      "mfaEnabled": true
    }
  }
}`,
    },
  },
];

export const DocsPage: React.FC = () => {
  const [selectedDocId, setSelectedDocId] = useState<string>('quickstart');
  const [searchFilter, setSearchFilter] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Interactive API Sandbox Runner
  const [apiTesting, setApiTesting] = useState(false);
  const [apiOutput, setApiOutput] = useState<string | null>(null);

  const activeDoc = DOC_SECTIONS.find((d) => d.id === selectedDocId) || DOC_SECTIONS[0];

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSimulateApi = () => {
    setApiTesting(true);
    setApiOutput(null);
    setTimeout(() => {
      setApiTesting(false);
      setApiOutput(JSON.stringify({
        status: 'success',
        data: {
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3JfOWY4MmEiLCJyb2xlIjoiYW5hbHlzdCIsImlhdCI6MTcyNzQ1MDYwMCwiZXhwIjoxNzI3NDUxNTAwfQ.EXAMPLE',
          tokenType: 'Bearer',
          expiresIn: 900,
          user: {
            id: `usr_${Math.random().toString(36).substring(2, 9)}`,
            email: 'analyst@acme.com',
            role: 'analyst',
            mfaEnabled: true,
          },
          timestamp: new Date().toISOString(),
        },
      }, null, 2));
    }, 700);
  };

  const filteredDocs = DOC_SECTIONS.filter((doc) => {
    return (
      doc.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      doc.category.toLowerCase().includes(searchFilter.toLowerCase()) ||
      doc.description.toLowerCase().includes(searchFilter.toLowerCase())
    );
  });

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--landing-body-bg)', color: 'var(--landing-text-head)' }}>
      <Navbar />

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Top Docs Breadcrumb / Sub-header in Light Section Alt */}
        <section
          style={{
            borderBottom: '1px solid #E2E8F0',
            backgroundColor: 'var(--landing-section-alt)',
            padding: '1rem 2rem',
          }}
        >
          <div style={{ maxWidth: '1360px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#64748B' }}>
              <Link to="/docs" style={{ color: '#1E293B', fontWeight: 600 }}>Docs</Link>
              <ChevronRight size={14} />
              <span style={{ color: '#8B5CF6', fontWeight: 600 }}>{activeDoc.category}</span>
              <ChevronRight size={14} />
              <span style={{ color: '#0F172A', fontWeight: 700 }}>{activeDoc.title}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontSize: '0.8rem', color: '#059669', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981' }} />
                SDK v2.4.0 (Latest)
              </span>
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                style={{
                  fontSize: '0.8rem',
                  color: '#64748B',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}
              >
                GitHub Repo <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </section>

        {/* Documentation Portal Split Layout in Clean White Theme */}
        <div style={{ maxWidth: '1360px', width: '100%', margin: '0 auto', display: 'flex', flex: 1, padding: '2.5rem 1.5rem 5rem', gap: '2.5rem' }}>
          {/* Left Navigation Sidebar */}
          <aside
            style={{
              width: '280px',
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
            }}
          >
            {/* Docs Search Filter */}
            <div style={{ position: 'relative' }}>
              <Search size={16} color="#64748B" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Filter documentation..."
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem 0.65rem 2.4rem',
                  borderRadius: '8px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  color: '#0F172A',
                  fontSize: '0.85rem',
                  outline: 'none',
                }}
              />
            </div>

            {/* Navigation List grouped by Category */}
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {Array.from(new Set(DOC_SECTIONS.map((d) => d.category))).map((cat) => {
                const docsInCat = filteredDocs.filter((d) => d.category === cat);
                if (docsInCat.length === 0) return null;

                return (
                  <div key={cat}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem', paddingLeft: '0.5rem' }}>
                      {cat}
                    </div>
                    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      {docsInCat.map((doc) => {
                        const isSelected = selectedDocId === doc.id;
                        return (
                          <li key={doc.id}>
                            <button
                              onClick={() => setSelectedDocId(doc.id)}
                              style={{
                                width: '100%',
                                textAlign: 'left',
                                padding: '0.5rem 0.75rem',
                                borderRadius: '6px',
                                fontSize: '0.875rem',
                                fontWeight: isSelected ? 700 : 500,
                                backgroundColor: isSelected ? '#EFF6FF' : 'transparent',
                                color: isSelected ? '#1D63ED' : '#475569',
                                borderLeft: isSelected ? '3px solid #1D63ED' : '3px solid transparent',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                transition: 'all 0.15s ease',
                                cursor: 'pointer',
                              }}
                            >
                              <span>{doc.title.split(':')[0]}</span>
                              {doc.badge && (
                                <span style={{ fontSize: '0.7rem', backgroundColor: '#EFF6FF', color: '#1D63ED', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 600 }}>
                                  {doc.badge}
                                </span>
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </nav>

            {/* Quick Links Card */}
            <div
              style={{
                marginTop: 'auto',
                backgroundColor: 'var(--landing-section-alt)',
                border: '1px solid #E2E8F0',
                borderRadius: '10px',
                padding: '1.25rem',
              }}
            >
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.4rem' }}>
                Need Custom Integrations?
              </div>
              <p style={{ fontSize: '0.8rem', color: '#64748B', lineHeight: 1.4, marginBottom: '0.75rem' }}>
                Our security engineering team can assist in setting up webhooks, custom classifiers, and auth pipelines.
              </p>
              <Link to="/support" style={{ fontSize: '0.8rem', color: 'var(--landing-hero-cta)', fontWeight: 600 }}>
                Contact Support Desk →
              </Link>
            </div>
          </aside>

          {/* Right Main Content Panel */}
          <section style={{ flex: 1, maxWidth: '980px', display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
            {/* Header */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: '#8B5CF6', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {activeDoc.category}
                </span>
              </div>
              <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>
                {activeDoc.title}
              </h1>
              <p style={{ fontSize: '1.05rem', color: '#64748B', lineHeight: 1.6 }}>
                {activeDoc.description}
              </p>
            </div>

            {/* Lead Content Box */}
            <div style={{ fontSize: '0.95rem', color: '#334155', lineHeight: 1.7, backgroundColor: 'var(--landing-section-alt)', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.5rem' }}>
              {activeDoc.content.lead}
            </div>

            {/* Code Snippets with Lang Switcher */}
            {activeDoc.content.codeTabs && activeDoc.content.codeTabs.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0F172A' }}>Implementation Example</h3>
                  <div style={{ fontSize: '0.8rem', color: '#64748B' }}>Copy to clipboard</div>
                </div>

                <div
                  style={{
                    backgroundColor: '#0F172A',
                    border: '1px solid #1E293B',
                    borderRadius: '12px',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1E293B', borderBottom: '1px solid #334155', padding: '0.5rem 1rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {activeDoc.content.codeTabs.map((tab, idx) => (
                        <span key={idx} style={{ fontSize: '0.75rem', color: '#CBD5E1', fontWeight: 600, backgroundColor: 'rgba(255, 255, 255, 0.1)', padding: '0.2rem 0.6rem', borderRadius: '4px' }}>
                          {tab.label}
                        </span>
                      ))}
                    </div>
                    <button
                      onClick={() => handleCopy(activeDoc.id, activeDoc.content.codeTabs?.[0].code || '')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        color: copiedKey === activeDoc.id ? '#10B981' : '#94A3B8',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                      }}
                    >
                      {copiedKey === activeDoc.id ? <Check size={14} /> : <Copy size={14} />}
                      <span>{copiedKey === activeDoc.id ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  <pre style={{ padding: '1.25rem', margin: 0, color: '#93C5FD', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', lineHeight: 1.5, overflowX: 'auto' }}>
                    {activeDoc.content.codeTabs[0].code}
                  </pre>
                </div>
              </div>
            )}

            {/* Steps Breakdown */}
            {activeDoc.content.steps && (
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0F172A', marginBottom: '1.25rem' }}>
                  Execution Flow
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {activeDoc.content.steps.map((st, i) => (
                    <div
                      key={i}
                      style={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: '10px',
                        padding: '1.25rem 1.5rem',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
                      }}
                    >
                      <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.35rem' }}>
                        {st.title}
                      </h4>
                      <p style={{ fontSize: '0.875rem', color: '#475569', lineHeight: 1.5 }}>
                        {st.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Parameters Table */}
            {activeDoc.content.params && (
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0F172A', marginBottom: '1rem' }}>
                  Configuration Schema
                </h3>
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
                  }}
                >
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                        <th style={{ padding: '0.85rem 1rem', color: '#334155', width: '25%', fontWeight: 700 }}>Parameter</th>
                        <th style={{ padding: '0.85rem 1rem', color: '#334155', width: '20%', fontWeight: 700 }}>Type</th>
                        <th style={{ padding: '0.85rem 1rem', color: '#334155', fontWeight: 700 }}>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeDoc.content.params.map((p, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '0.85rem 1rem', color: '#1D63ED', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                            {p.name}
                            {p.required && <span style={{ color: '#EF4444', marginLeft: '4px' }}>*</span>}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', color: '#8B5CF6', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                            {p.type}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', color: '#475569' }}>{p.desc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Interactive Live API Sandbox Simulator */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '14px',
                padding: '1.75rem',
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.03)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Play size={18} color="#059669" />
                  <span style={{ fontWeight: 700, color: '#0F172A', fontSize: '1rem' }}>
                    Interactive Sandbox Tester
                  </span>
                </div>
                <button
                  onClick={handleSimulateApi}
                  disabled={apiTesting}
                  style={{
                    backgroundColor: 'var(--landing-hero-cta)',
                    color: '#FFFFFF',
                    padding: '0.5rem 1.25rem',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    cursor: apiTesting ? 'not-allowed' : 'pointer',
                    opacity: apiTesting ? 0.7 : 1,
                  }}
                >
                  <Zap size={14} /> {apiTesting ? 'Dispatching...' : 'Test API Call'}
                </button>
              </div>

              <p style={{ fontSize: '0.85rem', color: '#64748B', marginBottom: '1rem' }}>
                Simulate a live <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', backgroundColor: '#F1F5F9', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>POST /auth/login</code> request to the SentinelKey REST API. Returns a signed JWT access token and user profile.
              </p>

              {apiOutput && (
                <div
                  style={{
                    backgroundColor: '#0F172A',
                    border: '1px solid #1E293B',
                    borderRadius: '8px',
                    padding: '1rem',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.8rem',
                    color: '#34D399',
                  }}
                >
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{apiOutput}</pre>
                </div>
              )}
            </div>

            {/* Bottom Next/Previous Navigation */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #E2E8F0', paddingTop: '2rem', marginTop: '1rem' }}>
              <Link
                to="/products"
                style={{
                  color: '#64748B',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontWeight: 500,
                }}
              >
                ← Explore Products
              </Link>
              <Link
                to="/signup"
                style={{
                  backgroundColor: 'var(--landing-hero-cta)',
                  color: '#FFFFFF',
                  padding: '0.65rem 1.5rem',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                Get API Keys Free <ArrowRight size={16} />
              </Link>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};
