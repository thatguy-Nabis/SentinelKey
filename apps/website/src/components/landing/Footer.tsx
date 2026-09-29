import React from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Globe } from 'lucide-react';


export const Footer: React.FC = () => {
  return (
    <footer
      style={{
        backgroundColor: 'var(--landing-footer-bg)',
        color: '#94A3B8',
        borderTop: '1px solid #1E2638',
        padding: '5rem 2rem 3rem',
        fontSize: '0.85rem',
      }}
    >
      <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
        {/* Brand Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '3rem', paddingBottom: '2rem', borderBottom: '1px solid #1E2638' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img
              src="/logo.png"
              alt="SentinelKey"
              style={{
                width: '32px',
                height: '37px',
                objectFit: 'contain',
                filter: 'drop-shadow(0 2px 8px rgba(139, 92, 246, 0.45))',
              }}
            />
            <div>
              <span style={{ fontSize: '1.2rem', fontWeight: 700, letterSpacing: '-0.02em', color: '#ffffff' }}>
                Sentinel<span style={{ color: '#8B5CF6' }}>Key</span>
              </span>
              <div style={{ fontSize: '0.75rem', color: '#64748B' }}>Zero-Trust Security, Enclaves & Telemetry</div>
            </div>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8rem', color: '#94A3B8' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981', display: 'inline-block' }} />
            <span>All Systems Operational</span>
          </div>
        </div>

        {/* Navigation Grid (6 columns matching Image 1) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '2.5rem',
            marginBottom: '4rem',
          }}
        >
          {/* Column 1: Products */}
          <div>
            <h4 style={{ color: '#F8FAFC', fontWeight: 600, marginBottom: '1.25rem', fontSize: '0.9rem' }}>Products</h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <li><Link to="/products" style={{ color: '#94A3B8' }}>Product Overview</Link></li>
              <li><Link to="/products" style={{ color: '#94A3B8' }}>Auth & RBAC</Link></li>
              <li><Link to="/products" style={{ color: '#94A3B8' }}>Adaptive MFA (TOTP)</Link></li>
              <li><Link to="/products" style={{ color: '#94A3B8' }}>Intrusion Detection</Link></li>
              <li><Link to="/products" style={{ color: '#94A3B8' }}>ML Anomaly Engine</Link></li>
              <li><Link to="/products" style={{ color: '#94A3B8' }}>SKF1 Encryption</Link></li>
            </ul>
          </div>

          {/* Column 2: Features */}
          <div>
            <h4 style={{ color: '#F8FAFC', fontWeight: 600, marginBottom: '1.25rem', fontSize: '0.9rem' }}>Features</h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <li><Link to="/products" style={{ color: '#94A3B8' }}>Threat Classifiers</Link></li>
              <li><Link to="/products" style={{ color: '#94A3B8' }}>Haversine Geo-Velocity</Link></li>
              <li><Link to="/products" style={{ color: '#94A3B8' }}>Shannon Entropy Analysis</Link></li>
              <li><Link to="/products" style={{ color: '#94A3B8' }}>Chrome MV3 Extension</Link></li>
              <li><Link to="/pricing" style={{ color: '#94A3B8' }}>Khalti ePayment</Link></li>
              <li><Link to="/docs" style={{ color: '#94A3B8' }}>REST API Reference</Link></li>
            </ul>
          </div>

          {/* Column 3: Developers */}
          <div>
            <h4 style={{ color: '#F8FAFC', fontWeight: 600, marginBottom: '1.25rem', fontSize: '0.9rem' }}>Developers</h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <li><Link to="/docs" style={{ color: '#94A3B8' }}>Documentation</Link></li>
              <li><Link to="/signup" style={{ color: '#94A3B8' }}>Getting Started</Link></li>
              <li><Link to="/docs" style={{ color: '#94A3B8' }}>Training Paths</Link></li>
              <li><Link to="/docs" style={{ color: '#94A3B8' }}>Telemetry SDK</Link></li>
              <li><Link to="/support" style={{ color: '#94A3B8' }}>Community Forums</Link></li>
              <li><Link to="/docs" style={{ color: '#94A3B8' }}>CLI Reference</Link></li>
            </ul>
          </div>

          {/* Column 4: Pricing */}
          <div>
            <h4 style={{ color: '#F8FAFC', fontWeight: 600, marginBottom: '1.25rem', fontSize: '0.9rem' }}>Pricing</h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <li><Link to="/pricing" style={{ color: '#94A3B8' }}>Personal / Free</Link></li>
              <li><Link to="/pricing" style={{ color: '#94A3B8' }}>Pro (NPR 2,499)</Link></li>
              <li><Link to="/pricing" style={{ color: '#94A3B8' }}>Enterprise SLA</Link></li>
              <li><Link to="/app/billing" style={{ color: '#94A3B8' }}>Khalti ePayment</Link></li>
              <li><Link to="/pricing" style={{ color: '#94A3B8' }}>Custom Invoicing</Link></li>
            </ul>
          </div>

          {/* Column 5: Company */}
          <div>
            <h4 style={{ color: '#F8FAFC', fontWeight: 600, marginBottom: '1.25rem', fontSize: '0.9rem' }}>Company</h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <li><Link to="/blog" style={{ color: '#94A3B8' }}>Security Research Blog</Link></li>
              <li><Link to="/products" style={{ color: '#94A3B8' }}>Trust & Compliance</Link></li>
              <li><Link to="/blog" style={{ color: '#94A3B8' }}>Security Bulletins</Link></li>
              <li><Link to="/support" style={{ color: '#94A3B8' }}>System Status</Link></li>
              <li><Link to="/support" style={{ color: '#94A3B8' }}>Contact Support</Link></li>
            </ul>
          </div>

          {/* Column 6: Languages */}
          <div>
            <h4 style={{ color: '#F8FAFC', fontWeight: 600, marginBottom: '1.25rem', fontSize: '0.9rem' }}>Language</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#CBD5E1' }}>
              <Globe size={16} />
              <span>English (US / NP)</span>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Social Icons & Legal */}
        <div
          style={{
            borderTop: '1px solid #1E2638',
            paddingTop: '2rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1.5rem',
          }}
        >
          {/* Social Icons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <a href="https://github.com" target="_blank" rel="noreferrer" style={{ color: '#94A3B8', display: 'flex' }} title="GitHub">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
            </a>
            <a href="https://twitter.com" target="_blank" rel="noreferrer" style={{ color: '#94A3B8', display: 'flex' }} title="Twitter">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noreferrer" style={{ color: '#94A3B8', display: 'flex' }} title="LinkedIn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
              </svg>
            </a>
            <a href="https://discord.com" target="_blank" rel="noreferrer" style={{ color: '#94A3B8', display: 'flex' }} title="Discord">
              <MessageSquare size={18} />
            </a>
          </div>


          {/* Legal / Copyright */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', color: '#64748B', fontSize: '0.8rem' }}>
            <span>© 2026 SentinelKey Inc. All rights reserved.</span>
            <a href="#" style={{ color: '#64748B' }}>Terms of Service</a>
            <a href="#" style={{ color: '#64748B' }}>Privacy Policy</a>
            <a href="#" style={{ color: '#64748B' }}>Legal</a>
          </div>
        </div>
      </div>
    </footer>
  );
};
