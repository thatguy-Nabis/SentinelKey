import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Search,
  ChevronDown,
  Box,
  Shield,
  Layers,
  Activity,
  Cpu,
  LifeBuoy,
  FileText,
  X,
  Menu,
  ArrowRight,
  Sparkles,
  Terminal
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

export const Navbar: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [productsOpen, setProductsOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const productsRef = useRef<HTMLDivElement>(null);
  const supportRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (productsRef.current && !productsRef.current.contains(event.target as Node)) {
        setProductsOpen(false);
      }
      if (supportRef.current && !supportRef.current.contains(event.target as Node)) {
        setSupportOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setProductsOpen(false);
    setSupportOpen(false);
    setSearchOpen(false);
  }, [location.pathname]);

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  // Search items across all pages
  const SEARCH_ITEMS = [
    { title: 'Auth & RBAC (JWT + bcrypt)', category: 'Products', path: '/products', desc: 'JWT access tokens, rotating refresh, admin/analyst/viewer roles' },
    { title: 'Adaptive MFA (RFC 6238 TOTP)', category: 'Products', path: '/products', desc: 'In-repo TOTP with AES-256-GCM encrypted secrets & 8 recovery codes' },
    { title: 'Rules-Based Intrusion Detection', category: 'Products', path: '/products', desc: 'Haversine geo-velocity & brute-force burst detection' },
    { title: 'ML Anomaly Engine (Isolation Forest)', category: 'Products', path: '/products', desc: 'Python Flask microservice on 8D telemetry vectors' },
    { title: 'SKF1 File & Field Encryption', category: 'Products', path: '/products', desc: 'AES-256-GCM with HKDF-SHA256 domain salts & zero-downtime key rotation' },
    { title: 'File & Email Threat Classifiers', category: 'Products', path: '/products', desc: 'Shannon entropy, magic bytes (MZ/ELF), Levenshtein typosquatting' },
    { title: 'Pro Tier with Khalti', category: 'Pricing', path: '/pricing', desc: 'NPR 2,499/mo with automated VAT invoices' },
    { title: 'SDK Quickstart Guide', category: 'Documentation', path: '/docs', desc: 'Install @sentinelkey/security-stack-sdk and make your first API call' },
    { title: 'REST API Reference', category: 'Documentation', path: '/docs', desc: 'Auth, MFA, Alerts, Files, Classifiers endpoint reference' },
    { title: 'IDS Alert Heuristics Deep-Dive', category: 'Blog', path: '/blog', desc: 'Haversine impossible travel math and brute-force burst detection' },
    { title: 'Open an Engineering Support Ticket', category: 'Support', path: '/support', desc: 'Direct review by core security team' },
    { title: 'System Status & Uptime', category: 'Support', path: '/support', desc: 'Real-time telemetry and service health' },
  ];

  const filteredSearch = SEARCH_ITEMS.filter((item) =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            <span style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em', color: '#ffffff' }}>
              Sentinel<span style={{ color: '#8B5CF6' }}>Key</span>
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '1.75rem' }} className="hidden-mobile">
            {/* Products Dropdown */}
            <div
              ref={productsRef}
              style={{ position: 'relative' }}
              onMouseEnter={() => setProductsOpen(true)}
              onMouseLeave={() => setProductsOpen(false)}
            >
              <Link
                to="/products"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  fontSize: '0.9rem',
                  color: isActive('/products') ? '#60A5FA' : '#CBD5E1',
                  fontWeight: isActive('/products') ? 600 : 500,
                  transition: 'color 0.15s ease',
                  padding: '0.5rem 0',
                }}
              >
                <span>Products</span>
                <ChevronDown size={14} style={{ transform: productsOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </Link>

              {productsOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: '-1rem',
                    width: '360px',
                    backgroundColor: '#111625',
                    border: '1px solid #221B3B',
                    borderRadius: '12px',
                    padding: '1rem',
                    boxShadow: '0 15px 35px rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    zIndex: 100,
                  }}
                >
                  <Link
                    to="/products"
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                      padding: '0.65rem 0.75rem',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      transition: 'background-color 0.15s',
                    }}
                  >
                    <Box size={20} color="#60A5FA" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#FFFFFF' }}>Auth & RBAC</div>
                      <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>JWT access tokens, rotating refresh, bcrypt-12 passwords</div>
                    </div>
                  </Link>

                  <Link
                    to="/products"
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                      padding: '0.65rem 0.75rem',
                      borderRadius: '8px',
                      backgroundColor: 'transparent',
                      transition: 'background-color 0.15s',
                    }}
                  >
                    <Shield size={20} color="#A78BFA" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#FFFFFF' }}>Adaptive MFA (TOTP)</div>
                      <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>RFC 6238 in-repo TOTP, AES-256-GCM secrets, 8 recovery codes</div>
                    </div>
                  </Link>

                  <Link
                    to="/products"
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                      padding: '0.65rem 0.75rem',
                      borderRadius: '8px',
                      backgroundColor: 'transparent',
                      transition: 'background-color 0.15s',
                    }}
                  >
                    <Layers size={20} color="#34D399" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#FFFFFF' }}>Intrusion Detection</div>
                      <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Haversine geo-velocity & brute-force burst heuristics</div>
                    </div>
                  </Link>

                  <Link
                    to="/products"
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                      padding: '0.65rem 0.75rem',
                      borderRadius: '8px',
                      backgroundColor: 'transparent',
                      transition: 'background-color 0.15s',
                    }}
                  >
                    <Activity size={20} color="#FBBF24" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#FFFFFF' }}>ML Anomaly Engine</div>
                      <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>scikit-learn Isolation Forest on 8D telemetry vectors</div>
                    </div>
                  </Link>

                  <Link
                    to="/products"
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                      padding: '0.65rem 0.75rem',
                      borderRadius: '8px',
                      backgroundColor: 'transparent',
                      transition: 'background-color 0.15s',
                    }}
                  >
                    <Cpu size={20} color="#EC4899" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#FFFFFF' }}>SKF1 Encryption & Classifiers</div>
                      <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>AES-256-GCM files, Shannon entropy, magic byte detection</div>
                    </div>
                  </Link>

                  <div style={{ borderTop: '1px solid #1E2638', paddingTop: '0.6rem', marginTop: '0.2rem' }}>
                    <Link
                      to="/products"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        color: '#60A5FA',
                        padding: '0.25rem 0.5rem',
                      }}
                    >
                      <span>Explore all security products</span>
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Support Dropdown */}
            <div
              ref={supportRef}
              style={{ position: 'relative' }}
              onMouseEnter={() => setSupportOpen(true)}
              onMouseLeave={() => setSupportOpen(false)}
            >
              <Link
                to="/support"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  fontSize: '0.9rem',
                  color: isActive('/support') ? '#60A5FA' : '#CBD5E1',
                  fontWeight: isActive('/support') ? 600 : 500,
                  transition: 'color 0.15s ease',
                  padding: '0.5rem 0',
                }}
              >
                <span>Support</span>
                <ChevronDown size={14} style={{ transform: supportOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </Link>

              {supportOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: '-1rem',
                    width: '320px',
                    backgroundColor: '#111625',
                    border: '1px solid #221B3B',
                    borderRadius: '12px',
                    padding: '1rem',
                    boxShadow: '0 15px 35px rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    zIndex: 100,
                  }}
                >
                  <Link
                    to="/support"
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                      padding: '0.65rem 0.75rem',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    }}
                  >
                    <LifeBuoy size={18} color="#60A5FA" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#FFFFFF' }}>Engineering Help Center</div>
                      <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Search FAQs, error codes, and troubleshooting</div>
                    </div>
                  </Link>

                  <Link
                    to="/support"
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                      padding: '0.65rem 0.75rem',
                      borderRadius: '8px',
                    }}
                  >
                    <FileText size={18} color="#A78BFA" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#FFFFFF' }}>Open a Ticket</div>
                      <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Average response in under 45 minutes</div>
                    </div>
                  </Link>

                  <Link
                    to="/support"
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.75rem',
                      padding: '0.65rem 0.75rem',
                      borderRadius: '8px',
                    }}
                  >
                    <Activity size={18} color="#10B981" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#FFFFFF' }}>Live System Health</div>
                      <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>API & ML service uptime and alert throughput</div>
                    </div>
                  </Link>

                  <div style={{ borderTop: '1px solid #1E2638', paddingTop: '0.6rem', marginTop: '0.2rem' }}>
                    <Link
                      to="/support"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        color: '#60A5FA',
                        padding: '0.25rem 0.5rem',
                      }}
                    >
                      <span>Visit support center</span>
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Pricing Link */}
            <Link
              to="/pricing"
              style={{
                fontSize: '0.9rem',
                color: isActive('/pricing') ? '#60A5FA' : '#CBD5E1',
                fontWeight: isActive('/pricing') ? 600 : 500,
                transition: 'color 0.15s ease',
              }}
            >
              Pricing
            </Link>

            {/* Blog Link */}
            <Link
              to="/blog"
              style={{
                fontSize: '0.9rem',
                color: isActive('/blog') ? '#60A5FA' : '#CBD5E1',
                fontWeight: isActive('/blog') ? 600 : 500,
                transition: 'color 0.15s ease',
              }}
            >
              Blog
            </Link>

            {/* Docs Link */}
            <Link
              to="/docs"
              style={{
                fontSize: '0.9rem',
                color: isActive('/docs') ? '#60A5FA' : '#CBD5E1',
                fontWeight: isActive('/docs') ? 600 : 500,
                transition: 'color 0.15s ease',
              }}
            >
              Docs
            </Link>
          </nav>
        </div>

        {/* Right CTA / Search / Auth */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          {/* Quick Search Palette Trigger */}
          <button
            onClick={() => setSearchOpen(true)}
            style={{
              color: '#94A3B8',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '0.4rem 0.75rem',
              fontSize: '0.8rem',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            title="Search SentinelKey"
          >
            <Search size={16} />
            <span className="hidden-mobile">Search...</span>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
            </div>
          )}

          {/* Mobile Menu Hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              color: '#CBD5E1',
              display: 'none',
              padding: '0.5rem',
              borderRadius: '6px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
            }}
            className="show-mobile-flex"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div
          style={{
            position: 'fixed',
            top: '68px',
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#0A0D14',
            padding: '2rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
            zIndex: 90,
            overflowY: 'auto',
          }}
        >
          <Link to="/products" style={{ fontSize: '1.15rem', fontWeight: 600, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Box size={20} color="#60A5FA" /> Products
          </Link>
          <Link to="/support" style={{ fontSize: '1.15rem', fontWeight: 600, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <LifeBuoy size={20} color="#60A5FA" /> Support & FAQs
          </Link>
          <Link to="/pricing" style={{ fontSize: '1.15rem', fontWeight: 600, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={20} color="#60A5FA" /> Pricing & Plans
          </Link>
          <Link to="/blog" style={{ fontSize: '1.15rem', fontWeight: 600, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={20} color="#60A5FA" /> Security Blog
          </Link>
          <Link to="/docs" style={{ fontSize: '1.15rem', fontWeight: 600, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Terminal size={20} color="#60A5FA" /> Documentation & SDKs
          </Link>

          <div style={{ marginTop: 'auto', borderTop: '1px solid #1E2638', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <Link
              to="/signup"
              style={{
                backgroundColor: 'var(--landing-hero-cta)',
                color: '#FFFFFF',
                textAlign: 'center',
                padding: '0.85rem',
                borderRadius: '8px',
                fontWeight: 600,
              }}
            >
              Get started Free
            </Link>
          </div>
        </div>
      )}

      {/* Global Quick Search Modal Palette */}
      {searchOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(5, 7, 12, 0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 120,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            padding: '5rem 1.5rem 2rem',
          }}
          onClick={() => setSearchOpen(false)}
        >
          <div
            style={{
              backgroundColor: '#111625',
              border: '1px solid #221B3B',
              borderRadius: '14px',
              maxWidth: '640px',
              width: '100%',
              overflow: 'hidden',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Input Bar */}
            <div style={{ display: 'flex', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid #1E2638' }}>
              <Search size={20} color="#94A3B8" style={{ marginRight: '0.75rem' }} />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search across Products, Docs, Pricing, Support..."
                style={{
                  width: '100%',
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: '1rem',
                  outline: 'none',
                }}
              />
              <button onClick={() => setSearchOpen(false)} style={{ color: '#64748B', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {/* Results List */}
            <div style={{ maxHeight: '380px', overflowY: 'auto', padding: '0.75rem' }}>
              {filteredSearch.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#64748B', fontSize: '0.9rem' }}>
                  No results found for "{searchQuery}"
                </div>
              ) : (
                filteredSearch.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      navigate(item.path);
                      setSearchOpen(false);
                    }}
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'background-color 0.15s',
                    }}
                    className="search-item"
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1A2035')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#FFFFFF' }}>{item.title}</div>
                      <div style={{ fontSize: '0.8rem', color: '#94A3B8' }}>{item.desc}</div>
                    </div>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        backgroundColor: 'rgba(139, 92, 246, 0.15)',
                        color: '#C4B5FD',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                      }}
                    >
                      {item.category}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Modal Bottom Footer */}
            <div style={{ padding: '0.75rem 1.25rem', backgroundColor: '#0D111C', borderTop: '1px solid #1E2638', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748B' }}>
              <span>Press ESC to close</span>
              <span>Navigate with click</span>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
