import React, { useState } from 'react';
import { Shield, Copy, Check, Download, Box } from 'lucide-react';


export const Features: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const [activePill, setActivePill] = useState(0);

  const copyCommand = () => {
    navigator.clipboard.writeText('sentinel agent run --enclave sgx-04 my-agent');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const offerings = [
    'SentinelKey Desktop',
    'Sentinel AI Governance',
    'Sentinel Hardened Baselines',
    'Sentinel Scout',
  ];

  return (
    <div id="features" style={{ backgroundColor: '#ffffff', paddingTop: '15rem' }}>
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
          TRUSTED BY DEVELOPERS AND SECURITY ENGINEERS WORLDWIDE
        </p>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '3.5rem',
            flexWrap: 'wrap',
            opacity: 0.65,
          }}
        >
          {['ADOBE', 'DATADOG', 'CLOUDFLARE', 'RED HAT', 'MICROSOFT AZURE', 'GITHUB'].map((logo, idx) => (
            <span
              key={idx}
              style={{
                fontSize: '1.1rem',
                fontWeight: 800,
                letterSpacing: '0.05em',
                color: '#475569',
                fontFamily: 'var(--font-sans)',
              }}
            >
              {logo}
            </span>
          ))}
        </div>
      </section>

      {/* 2. "Invisible to developers. Total control for security." (Dual Comparison) */}
      <section style={{ maxWidth: '1240px', margin: '6rem auto', padding: '0 1.5rem' }}>
        <div style={{ maxWidth: '780px', marginBottom: '3.5rem' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--landing-hero-cta)', marginBottom: '0.75rem', display: 'block' }}>
            Introducing SentinelKey AI Governance
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
            Invisible to developers.<br />Total control for security.
          </h2>
          <p style={{ fontSize: '1.1rem', color: '#64748B', lineHeight: 1.6 }}>
            A unified foundation for isolation, verified components, and governance that lives anywhere your agents run. Most teams are flying blind with unsafe overrides and no audit trail. SentinelKey brings it all together on the stack you already run.
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
          {/* Left: Developer View */}
          <div
            style={{
              backgroundColor: 'var(--landing-terminal-bg)',
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
                  Developer view: Your laptop. One command.
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
                fontSize: '0.875rem',
                lineHeight: 1.7,
                color: '#CBD5E1',
                overflowX: 'auto',
                padding: '0.5rem 0',
              }}
            >
              <code>
                <span style={{ color: '#60A5FA' }}>$</span> sentinel agent run --enclave sgx-04 my-agent{'\n'}
                <span style={{ color: '#10B981' }}>✔</span> [runtime] Booting isolated hardware microVM...{'\n'}
                <span style={{ color: '#10B981' }}>✔</span> [enclave] Attestation verified: sha256:7f3a... [OK]{'\n'}
                <span style={{ color: '#A78BFA' }}>ℹ</span> [network] Zero-trust ingress proxy mounted (mTLS strict){'\n'}
                <span style={{ color: '#A78BFA' }}>ℹ</span> [storage] AES-256-GCM encrypted overlay volume mounted{'\n'}
                <span style={{ color: '#38BDF8' }}>➔ Agent ready in 84ms. Bound to enclave us-east-sgx-04</span>
              </code>
            </pre>
          </div>

          {/* Right: Governance Console */}
          <div
            style={{
              backgroundColor: 'var(--landing-terminal-bg)',
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
                Governance console: Your console. Fourteen checks.
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {[
                { time: '04:12:01', target: 'image: deepseek-r1:latest', status: '14/14 checks pass', color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)' },
                { time: '04:11:45', target: 'enclave: sgx-04-attested', status: 'Hardware integrity OK', color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)' },
                { time: '04:10:12', target: 'policy: strict-egress-ebpf', status: 'Zero unauthorized calls', color: '#60A5FA', bg: 'rgba(96, 165, 250, 0.12)' },
                { time: '04:09:50', target: 'rego-engine: v1.4', status: 'Zero violations', color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)' },
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

      {/* 3. "The runtime under every agent" (2x2 Grid) */}
      <section style={{ backgroundColor: 'var(--landing-section-alt)', padding: '6rem 1.5rem', borderTop: '1px solid #E2E8F0' }}>
        <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto 4rem' }}>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', marginBottom: '0.75rem' }}>
              The runtime under every agent
            </h2>
            <p style={{ fontSize: '1.1rem', color: '#64748B' }}>
              The foundation that runs the cloud now on the agent box. Same guards. Same stack.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
              gap: '2rem',
            }}
          >
            {/* Card 1 */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #E2E8F0',
                borderRadius: '14px',
                padding: '2.5rem',
                boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
              }}
            >
              <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.75rem' }}>
                Isolation you can trust
              </h3>
              <p style={{ fontSize: '0.95rem', color: '#64748B', lineHeight: 1.6, marginBottom: '2rem' }}>
                Hardware-level enclave execution is the foundation of safe agent runs. Ephemeral sandboxes shield host memory and kernel syscalls.
              </p>
              <div
                style={{
                  backgroundColor: '#111625',
                  borderRadius: '10px',
                  padding: '1.25rem',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.825rem',
                  color: '#94A3B8',
                }}
              >
                <div><span style={{ color: '#10B981' }}>Running</span> agent in sandbox &apos;agent-ai-vendor&apos;...</div>
                <div><span style={{ color: '#60A5FA' }}>✔</span> Initialized overlayfs snapshot (size: 44MB)</div>
                <div><span style={{ color: '#60A5FA' }}>✔</span> Network policy: drop all except s3.internal</div>
              </div>
            </div>

            {/* Card 2 */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #E2E8F0',
                borderRadius: '14px',
                padding: '2.5rem',
                boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
              }}
            >
              <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.75rem' }}>
                Start local. Scale anywhere.
              </h3>
              <p style={{ fontSize: '0.95rem', color: '#64748B', lineHeight: 1.6, marginBottom: '2rem' }}>
                Start on your laptop and move to 100+ cloud enclaves for large agent teams. One command either way. Same isolation everywhere.
              </p>
              <div
                style={{
                  backgroundColor: '#111625',
                  borderRadius: '10px',
                  padding: '1.25rem',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.825rem',
                  color: '#94A3B8',
                }}
              >
                <div><span style={{ color: '#38BDF8' }}>Ready in 100ms</span></div>
                <div><span style={{ color: '#10B981' }}>✔</span> Cluster verified: us-east-sgx-04</div>
                <div><span style={{ color: '#A78BFA' }}>Sandboxed: 10/100 nodes</span> [100 matches]</div>
              </div>
            </div>

            {/* Card 3 */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #E2E8F0',
                borderRadius: '14px',
                padding: '2.5rem',
                boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.75rem' }}>
                  Nothing to fix and replace
                </h3>
                <p style={{ fontSize: '0.95rem', color: '#64748B', lineHeight: 1.6, marginBottom: '2rem' }}>
                  Your images, registries, and CI pipelines reuse your existing stack. No new ecosystems. No migration. The trust chain extends to agents on the same core.
                </p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem 0' }}>
                {/* 3D Wireframe Cube Vector (Image 1 reference) */}
                <svg width="140" height="120" viewBox="0 0 140 120" fill="none">
                  <path d="M70 10L125 40V80L70 110L15 80V40L70 10Z" stroke="#3B82F6" strokeWidth="2" strokeDasharray="3 3" />
                  <path d="M70 10V60M125 40L70 60M15 40L70 60" stroke="#3B82F6" strokeWidth="2" />
                  <path d="M70 60V110" stroke="#3B82F6" strokeWidth="2" />
                  <circle cx="70" cy="60" r="4" fill="#60A5FA" />
                </svg>
              </div>
            </div>

            {/* Card 4 */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #E2E8F0',
                borderRadius: '14px',
                padding: '2.5rem',
                boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.75rem' }}>
                  No lock-in. Ever.
                </h3>
                <p style={{ fontSize: '0.95rem', color: '#64748B', lineHeight: 1.6, marginBottom: '2rem' }}>
                  Built on open standards (OCI, FIPS, OIDC) day one. SOC-compliant, hardware-independent. End audit dragging for agents.
                </p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem 0' }}>
                {/* 3D Wireframe Sphere Vector (Image 1 reference) */}
                <svg width="140" height="120" viewBox="0 0 140 120" fill="none">
                  <circle cx="70" cy="60" r="45" stroke="#3B82F6" strokeWidth="2" />
                  <ellipse cx="70" cy="60" rx="45" ry="18" stroke="#3B82F6" strokeWidth="1.5" strokeDasharray="4 4" />
                  <ellipse cx="70" cy="60" rx="18" ry="45" stroke="#3B82F6" strokeWidth="1.5" strokeDasharray="4 4" />
                  <circle cx="70" cy="60" r="4" fill="#8B5CF6" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. "Unlock the Autonomy of Agents, Safely" (3 Columns) */}
      <section style={{ maxWidth: '1240px', margin: '6rem auto', padding: '0 1.5rem' }}>
        <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', marginBottom: '3.5rem' }}>
          Unlock the Autonomy<br />of Agents, Safely
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '3rem' }}>
          <div>
            <h4 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.75rem' }}>
              Lower cost through leaked safe-entry.
            </h4>
            <p style={{ fontSize: '0.925rem', color: '#64748B', lineHeight: 1.6 }}>
              Autonomy only saves money when agents can be trusted with writes. Dual-boundaries, shared components, and runtime policy mean agents do the work, and you don’t pay for the cleanup.
            </p>
          </div>
          <div>
            <h4 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.75rem' }}>
              Ship faster. Without the breach.
            </h4>
            <p style={{ fontSize: '0.925rem', color: '#64748B', lineHeight: 1.6 }}>
              Every engineer can run agents and enclaves at full speed, without the business inheriting the risk. Output goes up, audit gaps goes down. Engineering focuses on product, not plumbing.
            </p>
          </div>
          <div>
            <h4 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.75rem' }}>
              Compliant by default.
            </h4>
            <p style={{ fontSize: '0.925rem', color: '#64748B', lineHeight: 1.6 }}>
              Identity-bound audit policy enforced at every step, with every action logged and telemetried. Evidence your auditors will actually appreciate.
            </p>
          </div>
        </div>
      </section>

      {/* 5. Stats Band */}
      <section style={{ borderTop: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0', padding: '5rem 1.5rem', textAlign: 'center' }}>
        <p style={{ fontSize: '1.15rem', fontWeight: 600, color: '#0F172A', marginBottom: '3rem' }}>
          From the platform that secured the developer laptop for the enterprise.
        </p>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '2rem' }}>
          <div>
            <div style={{ fontSize: '3.75rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em', lineHeight: 1 }}>91%</div>
            <p style={{ fontSize: '0.95rem', color: '#64748B', marginTop: '0.5rem' }}>of the Fortune 100 trust container isolation</p>
          </div>
          <div>
            <div style={{ fontSize: '3.75rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em', lineHeight: 1 }}>20B+</div>
            <p style={{ fontSize: '0.95rem', color: '#64748B', marginTop: '0.5rem' }}>attestation events verified</p>
          </div>
          <div>
            <div style={{ fontSize: '3.75rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em', lineHeight: 1 }}>20M+</div>
            <p style={{ fontSize: '0.95rem', color: '#64748B', marginTop: '0.5rem' }}>secure developer workflows every day</p>
          </div>
        </div>
      </section>

      {/* 6. Desktop Showcase (Image 1 reference) */}
      <section style={{ maxWidth: '1240px', margin: '6rem auto 3rem', padding: '0 1.5rem', textAlign: 'center' }}>
        <h3 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.75rem' }}>
          SentinelKey Desktop
        </h3>
        <p style={{ fontSize: '1.05rem', color: '#64748B', maxWidth: '640px', margin: '0 auto 1.75rem', lineHeight: 1.6 }}>
          How modern applications get built. Containers and the full dev loop in one place. Go from blank file to running app in minutes, shipped anywhere.
        </p>
        <button
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #CBD5E1',
            padding: '0.65rem 1.5rem',
            borderRadius: '6px',
            fontSize: '0.9rem',
            fontWeight: 600,
            color: '#0F172A',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            marginBottom: '3rem',
          }}
        >
          <Download size={16} /> Download SentinelKey Desktop
        </button>

        {/* Desktop UI Showcase Screenshot Mockup */}
        <div
          style={{
            backgroundColor: '#0F172A',
            borderRadius: '12px',
            border: '1px solid #334155',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            overflow: 'hidden',
            maxWidth: '1020px',
            margin: '0 auto',
            textAlign: 'left',
          }}
        >
          {/* Header Bar */}
          <div style={{ backgroundColor: '#1E293B', padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #334155' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#EF4444' }} />
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#F59E0B' }} />
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10B981' }} />
              <span style={{ marginLeft: '1rem', fontSize: '0.8rem', color: '#94A3B8', fontFamily: 'var(--font-mono)' }}>
                SentinelKey Desktop 2.8.4 — SGX Enclave Active
              </span>
            </div>
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: '#94A3B8' }}>
              <span>Memory: 1.2 GB / 16 GB</span>
              <span>CPU: 4%</span>
            </div>
          </div>

          {/* Desktop Body */}
          <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: '220px 1fr', gap: '1.5rem' }}>
            <div style={{ borderRight: '1px solid #334155', paddingRight: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ backgroundColor: '#334155', color: '#ffffff', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                Containers & Enclaves
              </div>
              <div style={{ color: '#94A3B8', padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}>Images & Baselines</div>
              <div style={{ color: '#94A3B8', padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}>Build Shield</div>
              <div style={{ color: '#94A3B8', padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}>Scout Telemetry</div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span style={{ color: '#F8FAFC', fontWeight: 600, fontSize: '0.95rem' }}>Active Enclave Sessions (3)</span>
                <span style={{ backgroundColor: 'rgba(16,185,129,0.15)', color: '#10B981', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                  Hardware SGX: Validated
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[
                  { name: 'agent-deepseek-code', port: '8080:80', status: 'RUNNING (Isolated)', time: '42m ago' },
                  { name: 'build-shield-cache', port: '9000:9000', status: 'RUNNING (Attested)', time: '2h ago' },
                  { name: 'vault-crypto-daemon', port: '5001:5001', status: 'IDLE (Encrypted)', time: '5h ago' },
                ].map((row, idx) => (
                  <div
                    key={idx}
                    style={{
                      backgroundColor: '#1E293B',
                      padding: '0.75rem 1rem',
                      borderRadius: '6px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.825rem',
                    }}
                  >
                    <span style={{ color: '#F8FAFC', fontFamily: 'var(--font-mono)' }}>{row.name}</span>
                    <span style={{ color: '#94A3B8' }}>{row.port}</span>
                    <span style={{ color: '#10B981', fontFamily: 'var(--font-mono)' }}>{row.status}</span>
                    <span style={{ color: '#64748B' }}>{row.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. "Build better, together" Offering Pills */}
      <section style={{ backgroundColor: 'var(--landing-section-alt)', padding: '5rem 1.5rem', textAlign: 'center', borderTop: '1px solid #E2E8F0' }}>
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: 'var(--landing-hero-cta)',
            margin: '0 auto 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Box size={24} color="#ffffff" />
        </div>
        <h3 style={{ fontSize: '2rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.5rem' }}>
          Build better, together
        </h3>
        <p style={{ fontSize: '1rem', color: '#64748B', marginBottom: '2rem' }}>
          Explore these premium offerings
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap', maxWidth: '800px', margin: '0 auto' }}>
          {offerings.map((title, idx) => (
            <button
              key={idx}
              onClick={() => setActivePill(idx)}
              style={{
                backgroundColor: activePill === idx ? 'var(--landing-hero-cta)' : '#ffffff',
                color: activePill === idx ? '#ffffff' : '#475569',
                border: activePill === idx ? '1px solid var(--landing-hero-cta)' : '1px solid #E2E8F0',
                padding: '0.6rem 1.25rem',
                borderRadius: '6px',
                fontSize: '0.85rem',
                fontWeight: 600,
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                transition: 'all 0.15s ease',
              }}
            >
              {title}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};
