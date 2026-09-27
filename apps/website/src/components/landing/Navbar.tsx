import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ChevronDown, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

export const Navbar: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <header
      style={{
        backgroundColor: 'var(--landing-hero-bg)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        height: '68px',
        display: 'flex',
        alignItems: 'center',
        padding: '0 2rem',
        color: '#ffffff',
      }}
    >
      <div
        style={{
          maxWidth: '1280px',
          width: '100%',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Brand / Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2.5rem' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #8B5CF6 0%, #1D63ED 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(107, 77, 230, 0.4)',
              }}
            >
              <ShieldCheck size={22} color="#ffffff" />
            </div>
            <span style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em', color: '#ffffff' }}>
              Sentinel<span style={{ color: '#8B5CF6' }}>Key</span>
            </span>
          </Link>

          {/* Navigation Links */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.9rem', color: '#CBD5E1', cursor: 'pointer' }}>
              <span>Products</span>
              <ChevronDown size={14} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.9rem', color: '#CBD5E1', cursor: 'pointer' }}>
              <span>Support</span>
              <ChevronDown size={14} />
            </div>
            <a href="#pricing" style={{ fontSize: '0.9rem', color: '#CBD5E1' }}>
              Pricing
            </a>
            <a href="#features" style={{ fontSize: '0.9rem', color: '#CBD5E1' }}>
              Blog
            </a>
            <Link to="/app" style={{ fontSize: '0.9rem', color: '#CBD5E1' }}>
              Docs
            </Link>
          </nav>
        </div>

        {/* Right CTA / Search / Auth */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <button
            style={{
              color: '#94A3B8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px',
            }}
            title="Search"
          >
            <Search size={18} />
          </button>

          {user ? (
            <button
              onClick={() => navigate('/app')}
              style={{
                backgroundColor: 'var(--landing-hero-cta)',
                color: '#ffffff',
                padding: '0.5rem 1.15rem',
                borderRadius: '6px',
                fontSize: '0.875rem',
                fontWeight: 600,
                transition: 'background-color 0.2s',
              }}
            >
              Console ({user.email.split('@')[0]})
            </button>
          ) : (
            <>
              <Link
                to="/login"
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#CBD5E1',
                  padding: '0.5rem 0.75rem',
                }}
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                style={{
                  backgroundColor: 'var(--landing-hero-cta)',
                  color: '#ffffff',
                  padding: '0.5rem 1.15rem',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  transition: 'background-color 0.2s',
                }}
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
