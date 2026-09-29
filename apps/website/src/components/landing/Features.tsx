import React, { useState } from 'react';
import { Shield, Copy, Check, Globe, Lock, Activity } from 'lucide-react';


export const Features: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const copyCommand = () => {
    navigator.clipboard.writeText('pnpm add @sentinelkey/security-stack-sdk');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div id="features" style={{ backgroundColor: '#ffffff', paddingTop: '4rem' }}>
      {/* 1. Logos Trust Strip */}
      <section
        style={{
          borderBottom: '1px solid #E2E8F0',
          paddingBottom: '3.5rem',
          maxWidth: '1240px',
          margin: '0 auto',
          textAlign: 'center',
          paddingLeft: '1.5rem',
          paddingRight: '1.5rem',
        }}
      >
        <p style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.12em', color: '#94A3B8', marginBottom: '2rem' }}>
          ENTERPRISE ARCHITECTURE DESIGNED FOR PRODUCTION RELIABILITY
        </p>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '3.5rem',
            flexWrap: 'wrap',
            opacity: 0.75,
          }}
        >
          {['NODE.JS & TYPESCRIPT', 'EXPRESS REST API', 'PYTHON FLASK & SCIKIT-LEARN', 'AES-256-GCM', 'MANIFEST V3 CHROME', 'KHALTI EPAYMENT'].map((logo, idx) => (
            <span
              key={idx}
              style={{
                fontSize: '0.95rem',
                fontWeight: 800,
                letterSpacing: '0.06em',
                color: '#475569',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {logo}
            </span>
          ))}
        </div>
      </section>

      {/* 2. Developer View vs Security Operations Console */}
      <section style={{ maxWidth: '1240px', margin: '6rem auto', padding: '0 1.5rem' }}>
        <div style={{ maxWidth: '780px', marginBottom: '3.5rem' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--landing-hero-cta)', marginBottom: '0.75rem', display: 'block' }}>
            Unified Security Operations
          </span>
          <h2
            style={{
              fontSize: 'clamp(2rem, 3.5vw, 3rem)',
              fontWeight: 800,
              color: '#0F172A',
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
              marginBottom: '1.25rem',
            }}
          >
            Zero SaaS dependencies.<br />Full-stack defense in one codebase.
          </h2>
          <p style={{ fontSize: '1.1rem', color: '#64748B', lineHeight: 1.6 }}>
            Most development teams stitch together five disjointed security services—Auth0 for logins, an external KMS for secrets, third-party log aggregators, and custom heuristics. SentinelKey unifies authentication, field/file encryption, heuristic intrusion detection, and ML anomaly scoring into one cohesive stack.
          </p>
        </div>

        {/* Dual Comparison Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))',
            gap: '2rem',
          }}
        >
          {/* Left: Developer SDK View */}
          <div
            style={{
              backgroundColor: '#0F172A',
              borderRadius: '14px',
              padding: '1.5rem',
              boxShadow: '0 20px 40px rgba(17, 22, 37, 0.25)',
              border: '1px solid #1E293B',
              color: '#F8FAFC',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#EF4444', display: 'inline-block' }} />
                <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#F59E0B', display: 'inline-block' }} />
                <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#10B981', display: 'inline-block' }} />
                <span style={{ marginLeft: '0.75rem', fontSize: '0.85rem', color: '#94A3B8', fontWeight: 500 }}>
                  Developer view: @sentinelkey/security-stack-sdk
                </span>
              </div>
              <button
                onClick={copyCommand}
                style={{
                  color: '#94A3B8',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                }}
                title="Copy command"
              >
                {copied ? <Check size={16} color="#10B981" /> : <Copy size={16} />}
              </button>
            </div>

            <pre
              style={{
                fontSize: '0.85rem',
                lineHeight: 1.7,
                color: '#CBD5E1',
                overflowX: 'auto',
                padding: '0.5rem 0',
                margin: 0,
              }}
            >
              <code>
                <span style={{ color: '#60A5FA' }}>$</span> pnpm add @sentinelkey/security-stack-sdk{'\n'}
                <span style={{ color: '#10B981' }}>✔</span> [auth] JWT Rotation active (15m access / 7d refresh){'\n'}
                <span style={{ color: '#10B981' }}>✔</span> [mfa] In-repo RFC 6238 TOTP + AES-256-GCM secrets [OK]{'\n'}
                <span style={{ color: '#A78BFA' }}>ℹ</span> [ids] Haversine geo-velocity heuristic listening (&gt;800 km/h){'\n'}
                <span style={{ color: '#A78BFA' }}>ℹ</span> [crypto] SKF1 binary file envelope initialized with HKDF{'\n'}
                <span style={{ color: '#38BDF8' }}>➔ SentinelKey Security Stack initialized in 42ms. Zero SaaS lock-in.</span>
              </code>
            </pre>
          </div>

          {/* Right: Security Operations Console */}
          <div
            style={{
              backgroundColor: '#0F172A',
              borderRadius: '14px',
              padding: '1.5rem',
              boxShadow: '0 20px 40px rgba(17, 22, 37, 0.25)',
              border: '1px solid #1E293B',
              color: '#F8FAFC',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <Shield size={16} color="#60A5FA" />
              <span style={{ fontSize: '0.85rem', color: '#94A3B8', fontWeight: 500 }}>
                IDS Telemetry: Live heuristic & classifier audit
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {[
                { time: '14:22:08', target: 'geo-velocity: NY -> London in 40m', status: 'ALERT TRIGGERED (>800 km/h)', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)' },
                { time: '14:21:45', target: 'file: invoice.pdf.exe', status: 'BLOCKED (FILE-003 Double Extension)', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)' },
                { time: '14:20:12', target: 'email: security@paypa1.com', status: 'BLOCKED (EML-001 Typosquatting)', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)' },
                { time: '14:19:30', target: 'mfa: RFC 6238 TOTP verify', status: 'PASSED (Replay Protected)', color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)' },
              ].map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    backgroundColor: '#161E31',
                    borderRadius: '8px',
                    padding: '0.75rem 1rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.85rem',
                    border: '1px solid #23304A',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', color: '#64748B', fontSize: '0.75rem' }}>{item.time}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: '#E2E8F0', fontWeight: 500 }}>{item.target}</span>
                  </div>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.75rem',
                      color: item.color,
                      backgroundColor: item.bg,
                      padding: '0.2rem 0.6rem',
                      borderRadius: '4px',
                      fontWeight: 600,
                    }}
                  >
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 3. The 4 Actual Core Pillars of SentinelKey (2x2 Grid) */}
      <section style={{ backgroundColor: 'var(--landing-section-alt)', padding: '6rem 1.5rem', borderTop: '1px solid #E2E8F0' }}>
        <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto 4rem' }}>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', marginBottom: '0.75rem' }}>
              Four Essential Pillars in One Stack
            </h2>
            <p style={{ fontSize: '1.1rem', color: '#64748B' }}>
              Every layer built from scratch with pure mathematical algorithms and native Node.js/Python cryptography.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))',
              gap: '2rem',
            }}
          >
            {/* Card 1: Auth + MFA */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #E2E8F0',
                borderRadius: '14px',
                padding: '2.5rem',
                boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
              }}
              className="spotlight-card"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '8px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Shield size={22} color="#1D63ED" />
                </div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0F172A' }}>
                  Auth, RBAC & Adaptive MFA
                </h3>
              </div>
              <p style={{ fontSize: '0.95rem', color: '#64748B', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                JWT access tokens (15m) with refresh token rotation and reuse detection. In-repo RFC 6238 TOTP with AES-256-GCM encrypted secrets, 8 single-use recovery codes, QR codes, and exponential lockout backoff.
              </p>
              <div
                style={{
                  backgroundColor: '#0F172A',
                  borderRadius: '10px',
                  padding: '1.25rem',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.8rem',
                  color: '#94A3B8',
                }}
              >
                <div><span style={{ color: '#10B981' }}>POST</span> /auth/mfa/verify {'{ code: "849201", mfaToken: "..." }'}</div>
                <div><span style={{ color: '#60A5FA' }}>✔</span> TOTP timestamp valid (window ±30s)</div>
                <div><span style={{ color: '#60A5FA' }}>✔</span> Single-use verified. mfaLastTimeStep updated</div>
              </div>
            </div>

            {/* Card 2: IDS & ML Anomaly Detection */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #E2E8F0',
                borderRadius: '14px',
                padding: '2.5rem',
                boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
              }}
              className="spotlight-card"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '8px', backgroundColor: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Activity size={22} color="#8B5CF6" />
                </div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0F172A' }}>
                  Rules & ML Intrusion Detection
                </h3>
              </div>
              <p style={{ fontSize: '0.95rem', color: '#64748B', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                Near-real-time heuristics tracking failed login bursts, Haversine geo-velocity impossible travel (&gt;800 km/h), and privilege escalation. Integrated Python Isolation Forest scoring 8D telemetry.
              </p>
              <div
                style={{
                  backgroundColor: '#0F172A',
                  borderRadius: '10px',
                  padding: '1.25rem',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.8rem',
                  color: '#94A3B8',
                }}
              >
                <div><span style={{ color: '#A78BFA' }}>Scoring:</span> Haversine distance: 5570 km | Elapsed: 45 min</div>
                <div><span style={{ color: '#EF4444' }}>➔ Implied velocity: 7426 km/h (&gt; 800 km/h threshold)</span></div>
                <div><span style={{ color: '#F59E0B' }}>Alert dispatched:</span> RULE_IMPOSSIBLE_TRAVEL (High Severity)</div>
              </div>
            </div>

            {/* Card 3: Field & File Encryption */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #E2E8F0',
                borderRadius: '14px',
                padding: '2.5rem',
                boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
              }}
              className="spotlight-card"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '8px', backgroundColor: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Lock size={22} color="#10B981" />
                </div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0F172A' }}>
                  Field & SKF1 File Encryption
                </h3>
              </div>
              <p style={{ fontSize: '0.95rem', color: '#64748B', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                AES-256-GCM field encryption (`enc:v1:...`) and SKF1 binary envelopes for file storage with SHA-256 integrity verification. Cryptographic domain separation via HKDF-SHA256 and zero-downtime key rotation.
              </p>
              <div
                style={{
                  backgroundColor: '#0F172A',
                  borderRadius: '10px',
                  padding: '1.25rem',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.8rem',
                  color: '#94A3B8',
                }}
              >
                <div><span style={{ color: '#10B981' }}>Envelope:</span> [Magic &apos;SKF1&apos;][v1][IV 12B][Tag 16B][Ciphertext]</div>
                <div><span style={{ color: '#60A5FA' }}>Checksum:</span> SHA-256 pre-encryption digest verified</div>
                <div><span style={{ color: '#38BDF8' }}>Rotation:</span> Active v2 key advances; v1 demoted to decrypt-only</div>
              </div>
            </div>

            {/* Card 4: Threat Classifiers & Browser Extension */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #E2E8F0',
                borderRadius: '14px',
                padding: '2.5rem',
                boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
              }}
              className="spotlight-card"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '8px', backgroundColor: '#FFFBEB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Globe size={22} color="#D97706" />
                </div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0F172A' }}>
                  Threat Classification & Chrome Extension
                </h3>
              </div>
              <p style={{ fontSize: '0.95rem', color: '#64748B', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                Deterministic classifiers for binary magic bytes, Shannon entropy ($H &gt; 7.7$), typosquatting domains, and deceptive URLs. Paired with a Manifest V3 browser extension for pre-flight upload defense.
              </p>
              <div
                style={{
                  backgroundColor: '#0F172A',
                  borderRadius: '10px',
                  padding: '1.25rem',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.8rem',
                  color: '#94A3B8',
                }}
              >
                <div><span style={{ color: '#F59E0B' }}>Inspect:</span> Magic &apos;MZ&apos; in &apos;document.pdf&apos; (Disguised PE Binary)</div>
                <div><span style={{ color: '#EF4444' }}>Verdict:</span> BLOCK (Risk score: 95/100)</div>
                <div><span style={{ color: '#10B981' }}>Extension:</span> Intercepted in-browser before upload dispatched</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Value Propositions (3 Columns) */}
      <section style={{ maxWidth: '1240px', margin: '6rem auto', padding: '0 1.5rem' }}>
        <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', marginBottom: '3.5rem' }}>
          Built for Developers.<br />Engineered for Zero SaaS Lock-In.
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '3rem' }}>
          <div>
            <h4 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.75rem' }}>
              Zero external security SaaS bills.
            </h4>
            <p style={{ fontSize: '0.925rem', color: '#64748B', lineHeight: 1.6 }}>
              Why pay monthly fees to Auth0, Datadog, Snyk, and Vault when your core security stack can live entirely inside your own repository and clusters? SentinelKey gives you complete control over your cryptography and user data.
            </p>
          </div>
          <div>
            <h4 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.75rem' }}>
              Typed SDKs and automated token rotation.
            </h4>
            <p style={{ fontSize: '0.925rem', color: '#64748B', lineHeight: 1.6 }}>
              Our typed TypeScript SDK (`@sentinelkey/security-stack-sdk`) handles silent 401 token refreshes, fail-safe offline defense, file uploads, and threat classification with zero boilerplate.
            </p>
          </div>
          <div>
            <h4 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.75rem' }}>
              Khalti billing for Nepal & beyond.
            </h4>
            <p style={{ fontSize: '0.925rem', color: '#64748B', lineHeight: 1.6 }}>
              Upgrade seamlessly in Nepalese Rupees (NPR 2,499/mo) with Khalti wallet and e-Banking. Full automated VAT invoices and zero foreign exchange fees for local engineering teams.
            </p>
          </div>
        </div>
      </section>

      {/* 5. Browser Extension & SDK Showcase */}
      <section style={{ backgroundColor: 'var(--landing-section-alt)', borderTop: '1px solid #E2E8F0', padding: '6rem 1.5rem', textAlign: 'center' }}>
        <div style={{ maxWidth: '880px', margin: '0 auto' }}>
          <h3 style={{ fontSize: '2rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.75rem' }}>
            Pre-Flight Security with the Chrome Extension
          </h3>
          <p style={{ fontSize: '1.05rem', color: '#64748B', margin: '0 auto 2.5rem', lineHeight: 1.6 }}>
            Our Manifest V3 browser companion intercepts malicious file uploads and typosquatted link clicks right in the web browser before packets leave your machine.
          </p>

          <div
            style={{
              backgroundColor: '#0F172A',
              borderRadius: '14px',
              padding: '2rem',
              border: '1px solid #1E293B',
              textAlign: 'left',
              color: '#F8FAFC',
              boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid #1E293B', paddingBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Globe size={22} color="#60A5FA" />
                <span style={{ fontWeight: 700, fontSize: '1rem' }}>SentinelKey Browser Companion (MV3)</span>
              </div>
              <span style={{ fontSize: '0.75rem', backgroundColor: '#10B981', color: '#000000', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 800 }}>ACTIVE</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
              <div>
                <div style={{ fontSize: '0.85rem', color: '#94A3B8', marginBottom: '0.4rem' }}>Pre-Flight File Inspection</div>
                <div style={{ fontSize: '0.9rem', color: '#FFFFFF', fontWeight: 600 }}>SHA-256 + Magic Header Verifier</div>
                <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '0.25rem' }}>Blocks disguised executables and high-entropy packed files before upload</div>
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', color: '#94A3B8', marginBottom: '0.4rem' }}>Outbound Link Interception</div>
                <div style={{ fontSize: '0.9rem', color: '#FFFFFF', fontWeight: 600 }}>Levenshtein Typosquatting Filter</div>
                <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '0.25rem' }}>Catches deceptive hyperlink text vs href mismatches and urgency prompts</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
