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
              <li><Link to="/app" style={{ color: '#94A3B8' }}>Product Overview</Link></li>
              <li><Link to="/app" style={{ color: '#94A3B8' }}>SentinelKey Desktop</Link></li>
              <li><Link to="/app" style={{ color: '#94A3B8' }}>Sentinel Scout</Link></li>
              <li><Link to="/app" style={{ color: '#94A3B8' }}>Hardened Images</Link></li>
              <li><Link to="/app" style={{ color: '#94A3B8' }}>Sentinel Sandboxes</Link></li>
              <li><Link to="/app" style={{ color: '#94A3B8' }}>AI Governance</Link></li>
            </ul>
          </div>

          {/* Column 2: Features */}
          <div>
            <h4 style={{ color: '#F8FAFC', fontWeight: 600, marginBottom: '1.25rem', fontSize: '0.9rem' }}>Features</h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <li><a href="#features" style={{ color: '#94A3B8' }}>Automated Root & Run-Time</a></li>
              <li><a href="#features" style={{ color: '#94A3B8' }}>CIS Benchmarks</a></li>
              <li><a href="#features" style={{ color: '#94A3B8' }}>Container Runtime</a></li>
              <li><a href="#features" style={{ color: '#94A3B8' }}>Enclave Attestation</a></li>
              <li><a href="#features" style={{ color: '#94A3B8' }}>Open Source Integrity</a></li>
              <li><a href="#features" style={{ color: '#94A3B8' }}>Secure Supply Chain</a></li>
            </ul>
          </div>

          {/* Column 3: Developers */}
          <div>
            <h4 style={{ color: '#F8FAFC', fontWeight: 600, marginBottom: '1.25rem', fontSize: '0.9rem' }}>Developers</h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <li><Link to="/app" style={{ color: '#94A3B8' }}>Documentation</Link></li>
              <li><Link to="/signup" style={{ color: '#94A3B8' }}>Getting Started</Link></li>
              <li><Link to="/app" style={{ color: '#94A3B8' }}>Training Paths</Link></li>
              <li><Link to="/app" style={{ color: '#94A3B8' }}>Telemetry SDK</Link></li>
              <li><Link to="/app" style={{ color: '#94A3B8' }}>Community Forums</Link></li>
              <li><Link to="/app" style={{ color: '#94A3B8' }}>CLI Reference</Link></li>
            </ul>
          </div>

          {/* Column 4: Pricing */}
          <div>
            <h4 style={{ color: '#F8FAFC', fontWeight: 600, marginBottom: '1.25rem', fontSize: '0.9rem' }}>Pricing</h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <li><a href="#pricing" style={{ color: '#94A3B8' }}>Personal / Free</a></li>
              <li><a href="#pricing" style={{ color: '#94A3B8' }}>Pro (NPR 2,499)</a></li>
              <li><a href="#pricing" style={{ color: '#94A3B8' }}>Enterprise SLA</a></li>
              <li><Link to="/app/billing" style={{ color: '#94A3B8' }}>Khalti ePayment</Link></li>
              <li><a href="#pricing" style={{ color: '#94A3B8' }}>Custom Invoicing</a></li>
            </ul>
          </div>

          {/* Column 5: Company */}
          <div>
            <h4 style={{ color: '#F8FAFC', fontWeight: 600, marginBottom: '1.25rem', fontSize: '0.9rem' }}>Company</h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <li><a href="#" style={{ color: '#94A3B8' }}>About SentinelKey</a></li>
              <li><a href="#" style={{ color: '#94A3B8' }}>Trust & Compliance</a></li>
              <li><a href="#" style={{ color: '#94A3B8' }}>Security Bulletins</a></li>
              <li><a href="#" style={{ color: '#94A3B8' }}>Careers</a></li>
              <li><a href="#" style={{ color: '#94A3B8' }}>Contact Support</a></li>
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
