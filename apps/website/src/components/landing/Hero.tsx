import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Activity, Lock, ArrowRight, Shield } from 'lucide-react';

export const Hero: React.FC = () => {
  return (
    <section
      style={{
        backgroundColor: 'var(--landing-hero-bg)',
        position: 'relative',
        paddingTop: '5rem',
        paddingBottom: '5rem',
        color: '#ffffff',
        overflow: 'hidden',
        textAlign: 'center',
      }}
    >
      {/* Video background */}
      <video
        autoPlay
        muted
        loop
        playsInline
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: 0,
        }}
      >
        <source src="/hero-bg.mp4" type="video/mp4" />
      </video>

      {/* Dark overlay for text readability */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(10, 13, 20, 0.65)',
          zIndex: 1,
        }}
      />

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 1.5rem', position: 'relative', zIndex: 10 }}>
        {/* Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            backgroundColor: 'rgba(29, 99, 237, 0.15)',
            border: '1px solid rgba(29, 99, 237, 0.35)',
            padding: '0.35rem 1rem',
            borderRadius: '999px',
            fontSize: '0.85rem',
            color: '#93C5FD',
            marginBottom: '1.5rem',
            fontWeight: 500,
          }}
        >
          <Shield size={14} color="#60A5FA" />
          <span>Unified Enterprise Security Stack</span>
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: 'clamp(2.4rem, 5vw, 3.75rem)',
            fontWeight: 800,
            lineHeight: 1.15,
            letterSpacing: '-0.03em',
            marginBottom: '1.25rem',
            color: '#FFFFFF',
          }}
        >
          Authentication, Encryption, Intrusion Detection & Compliance in One Stack
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize: '1.15rem',
            color: '#94A3B8',
            lineHeight: 1.6,
            maxWidth: '720px',
            margin: '0 auto 2.5rem',
          }}
        >
          Zero third-party SaaS dependencies. Secure your applications with in-repo RFC 6238 TOTP, AES-256-GCM file encryption, mathematical geo-velocity heuristics, and Isolation Forest ML threat detection.
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
            Get started free
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
            Explore features
          </a>
        </div>
      </div>

      {/* 3 Spotlight Cards */}
      <div
        style={{
          maxWidth: '1240px',
          margin: '3.5rem auto 0',
          padding: '0 1.5rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.5rem',
          position: 'relative',
          zIndex: 10,
        }}
      >
        {/* Spotlight Card 1 */}
        <div className="spotlight-card" style={{ padding: '2rem 1.75rem', textAlign: 'left', backgroundColor: '#FFFFFF' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0F172A' }}>Auth, RBAC & Adaptive MFA</h3>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '8px',
                backgroundColor: '#EFF6FF',
                border: '1px solid #DBEAFE',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShieldCheck size={22} color="#1D63ED" />
            </div>
          </div>
          <p style={{ fontSize: '0.925rem', color: '#475569', lineHeight: 1.6, marginBottom: '2rem', minHeight: '68px' }}>
            In-repo RFC 6238 TOTP, AES-256-GCM encrypted secrets, 8 single-use recovery codes, JWT token rotation, and 3-tier RBAC.
          </p>
          <Link
            to="/products"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: 'var(--landing-hero-cta)',
            }}
          >
            Learn about Auth & MFA <ArrowRight size={14} />
          </Link>
        </div>

        {/* Spotlight Card 2 */}
        <div className="spotlight-card" style={{ padding: '2rem 1.75rem', textAlign: 'left', backgroundColor: '#FFFFFF' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0F172A' }}>Rules & ML Intrusion Detection</h3>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '8px',
                backgroundColor: '#F5F3FF',
                border: '1px solid #EDE9FE',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Activity size={22} color="#8B5CF6" />
            </div>
          </div>
          <p style={{ fontSize: '0.925rem', color: '#475569', lineHeight: 1.6, marginBottom: '2rem', minHeight: '68px' }}>
            Haversine geo-velocity impossible travel heuristics (&gt;800 km/h) combined with Python Isolation Forest ML anomaly scoring.
          </p>
          <Link
            to="/products"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: 'var(--landing-hero-cta)',
            }}
          >
            Explore Intrusion Detection <ArrowRight size={14} />
          </Link>
        </div>

        {/* Spotlight Card 3 */}
        <div className="spotlight-card" style={{ padding: '2rem 1.75rem', textAlign: 'left', backgroundColor: '#FFFFFF' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0F172A' }}>Field & SKF1 File Encryption</h3>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '8px',
                backgroundColor: '#ECFDF5',
                border: '1px solid #D1FAE5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Lock size={22} color="#10B981" />
            </div>
          </div>
          <p style={{ fontSize: '0.925rem', color: '#475569', lineHeight: 1.6, marginBottom: '2rem', minHeight: '68px' }}>
            AES-256-GCM field encryption, SKF1 binary file envelopes, HKDF domain separation, and zero-downtime key rotation.
          </p>
          <Link
            to="/products"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: 'var(--landing-hero-cta)',
            }}
          >
            Review Encryption Specs <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
};
