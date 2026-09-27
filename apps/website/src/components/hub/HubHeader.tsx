import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, HelpCircle, Bell, Moon, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

export const HubHeader: React.FC = () => {
  const { user, logout } = useAuth();
  const username = user?.email.split('@')[0] || 'alexchen';

  return (
    <header
      style={{
        height: '60px',
        backgroundColor: 'var(--hub-topbar-bg)',
        borderBottom: '1px solid var(--hub-sidebar-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1.5rem',
        color: 'var(--hub-text-primary)',
        position: 'sticky',
        top: 0,
        zIndex: 40,
      }}
    >
      {/* Left: Brand + Breadcrumb Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        <Link to="/app" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '7px',
              background: 'linear-gradient(135deg, #8B5CF6 0%, #6B4DE6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShieldCheck size={20} color="#ffffff" />
          </div>
          <span style={{ fontSize: '1.15rem', fontWeight: 700, letterSpacing: '-0.02em', color: '#ffffff' }}>
            Sentinel<span style={{ color: '#8B5CF6' }}>Key</span>
          </span>
        </Link>

        {/* Sentinel Key Badge / Pill */}
        <div
          style={{
            backgroundColor: '#1E1836',
            border: '1px solid #322659',
            padding: '0.2rem 0.65rem',
            borderRadius: '6px',
            fontSize: '0.75rem',
            color: '#CBD5E1',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontFamily: 'var(--font-mono)',
          }}
        >
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981' }} />
          <span>Sentinel Key</span>
        </div>
      </div>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {/* Help */}
        <button
          style={{ color: '#94A3B8', padding: '6px', display: 'flex', alignItems: 'center' }}
          title="Help & Reference"
        >
          <HelpCircle size={18} />
        </button>

        {/* Notifications */}
        <button
          style={{ color: '#94A3B8', padding: '6px', position: 'relative', display: 'flex', alignItems: 'center' }}
          title="Notifications"
        >
          <Bell size={18} />
          <span
            style={{
              position: 'absolute',
              top: '5px',
              right: '5px',
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: '#8B5CF6',
            }}
          />
        </button>

        {/* Dark/Light Mode */}
        <button
          style={{ color: '#94A3B8', padding: '6px', display: 'flex', alignItems: 'center' }}
          title="Theme Toggle"
        >
          <Moon size={18} />
        </button>

        {/* User Profile Avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginLeft: '0.5rem' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: '#6B4DE6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: '0.85rem',
              fontWeight: 700,
              boxShadow: '0 0 0 2px #3B2D6B',
            }}
          >
            {username.charAt(0).toUpperCase()}
          </div>
          <button
            onClick={logout}
            style={{ color: '#94A3B8', padding: '4px', display: 'flex', alignItems: 'center' }}
            title="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
};
