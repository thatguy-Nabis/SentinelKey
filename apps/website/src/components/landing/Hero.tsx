import React from 'react';
import { Link } from 'react-router-dom';
import { Box, Shield, Layers, ArrowRight } from 'lucide-react';

const FLOATING_CHARS = [
  { char: 'E', top: '15%', left: '12%', delay: '0s' },
  { char: 'R', top: '22%', left: '38%', delay: '1s' },
  { char: 'X', top: '18%', right: '14%', delay: '2s' },
  { char: 'D', top: '35%', right: '28%', delay: '1.5s' },
  { char: 'K', top: '30%', left: '22%', delay: '0.5s' },
  { char: '0', top: '12%', right: '35%', delay: '2.5s' },
  { char: '1', top: '42%', left: '8%', delay: '3s' },
  { char: 'T', top: '48%', right: '10%', delay: '1.8s' },
];

export const Hero: React.FC = () => {
  return (
    <section
      style={{
        backgroundColor: 'var(--landing-hero-bg)',
        position: 'relative',
        paddingTop: '5rem',
        paddingBottom: '8rem',
        color: '#ffffff',
        overflow: 'hidden',
        textAlign: 'center',
      }}
    >
      {/* Floating alphanumeric characters background from Image 1 */}
      {FLOATING_CHARS.map((item, idx) => (
        <span
          key={idx}
          className="animate-glyph"
          style={{
            position: 'absolute',
            top: item.top,
            left: item.left,
            right: item.right,
            fontSize: '1.75rem',
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            color: '#64748B',
            pointerEvents: 'none',
            userSelect: 'none',
            animationDelay: item.delay,
          }}
        >
          {item.char}
        </span>
      ))}

      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0 1.5rem', position: 'relative', zIndex: 10 }}>
        {/* Title */}
        <h1
          style={{
            fontSize: 'clamp(2.5rem, 5vw, 3.75rem)',
            fontWeight: 800,
            lineHeight: 1.15,
            letterSpacing: '-0.03em',
            marginBottom: '1.25rem',
            color: '#FFFFFF',
          }}
        >
          Trust SentinelKey<br />for the Agents You Don’t
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize: '1.15rem',
            color: '#94A3B8',
            lineHeight: 1.6,
            maxWidth: '680px',
            margin: '0 auto 2.5rem',
          }}
        >
          SentinelKey securely contains autonomous agents and critical workloads so you
          can confidently build, ship, and run on trust.
        </p>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <Link
            to="/signup"
            style={{
              backgroundColor: 'var(--landing-hero-cta)',
              color: '#FFFFFF',
              padding: '0.85rem 2rem',
              borderRadius: '6px',
              fontSize: '1rem',
              fontWeight: 600,
              boxShadow: '0 4px 14px rgba(29, 99, 237, 0.4)',
              transition: 'background-color 0.2s',
            }}
          >
            Get started
          </Link>
          <a
            href="#features"
            style={{
              backgroundColor: 'transparent',
              color: '#FFFFFF',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              padding: '0.85rem 2rem',
              borderRadius: '6px',
              fontSize: '1rem',
              fontWeight: 600,
              transition: 'border-color 0.2s, background-color 0.2s',
            }}
          >
            Learn more
          </a>
        </div>
      </div>

      {/* 3 Spotlight Cards (Overlapping Hero bottom) */}
      <div
        style={{
          maxWidth: '1240px',
          margin: '4.5rem auto -12rem',
          padding: '0 1.5rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.5rem',
          position: 'relative',
          zIndex: 20,
        }}
      >
        {/* Spotlight Card 1 */}
        <div className="spotlight-card" style={{ padding: '2rem 1.75rem', textAlign: 'left' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0F172A' }}>Sentinel Sandboxes</h3>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '8px',
                backgroundColor: '#111625',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Box size={22} color="#60A5FA" />
            </div>
          </div>
          <p style={{ fontSize: '0.925rem', color: '#475569', lineHeight: 1.6, marginBottom: '2rem', minHeight: '68px' }}>
            MicroVM isolation for every agent session, rootfs, virtual network and filesystem shield at the runtime.
          </p>
          <a
            href="#features"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: 'var(--landing-hero-cta)',
            }}
          >
            Need more about our approach? <ArrowRight size={14} />
          </a>
        </div>

        {/* Spotlight Card 2 */}
        <div className="spotlight-card" style={{ padding: '2rem 1.75rem', textAlign: 'left' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0F172A' }}>Sentinel AI Governance</h3>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '8px',
                backgroundColor: '#111625',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Shield size={22} color="#60A5FA" />
            </div>
          </div>
          <p style={{ fontSize: '0.925rem', color: '#475569', lineHeight: 1.6, marginBottom: '2rem', minHeight: '68px' }}>
            One console for sanction access, privacy control, bound audit logs, flow pan-workstation setups.
          </p>
          <a
            href="#features"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: 'var(--landing-hero-cta)',
            }}
          >
            Overview for agent governance <ArrowRight size={14} />
          </a>
        </div>

        {/* Spotlight Card 3 */}
        <div className="spotlight-card" style={{ padding: '2rem 1.75rem', textAlign: 'left' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0F172A' }}>Sentinel Hardened Images</h3>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '8px',
                backgroundColor: '#111625',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Layers size={22} color="#60A5FA" />
            </div>
          </div>
          <p style={{ fontSize: '0.925rem', color: '#475569', lineHeight: 1.6, marginBottom: '2rem', minHeight: '68px' }}>
            Minimal, signed, continuously patched images and FIPS runtimes to shield your supply-chain by default.
          </p>
          <a
            href="#features"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: 'var(--landing-hero-cta)',
            }}
          >
            Security-hardened images matter <ArrowRight size={14} />
          </a>
        </div>
      </div>
    </section>
  );
};
