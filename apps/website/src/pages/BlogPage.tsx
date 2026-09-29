import React, { useState } from 'react';
import { Navbar } from '../components/landing/Navbar.js';
import { Footer } from '../components/landing/Footer.js';
import {
  BookOpen,
  Search,
  ArrowRight,
  Share2,
  X,
  CheckCircle2,
  Shield,
  Send
} from 'lucide-react';

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: 'mfa' | 'ids' | 'encryption' | 'ml' | 'fintech' | 'classification';
  categoryLabel: string;
  readTime: string;
  publishedAt: string;
  author: {
    name: string;
    role: string;
    avatar: string;
  };
  featured?: boolean;
  content: {
    overview: string;
    sections: { heading: string; body: string; code?: string }[];
    takeaways: string[];
  };
}

const POSTS: BlogPost[] = [
  {
    id: 'post-1',
    slug: 'in-repo-totp-aes-256-gcm',
    featured: true,
    title: 'How We Built In-Repo RFC 6238 TOTP MFA with Zero External SaaS Dependencies',
    excerpt:
      'Eliminating third-party auth vendors by implementing RFC 6238 time-based tokens, AES-256-GCM encrypted secrets, 8 single-use recovery codes, and replay protection in pure Node.js.',
    category: 'mfa',
    categoryLabel: 'Authentication & MFA',
    readTime: '6 min read',
    publishedAt: 'September 22, 2026',
    author: {
      name: 'Nabin Sharma',
      role: 'Principal Security Architect',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    },
    content: {
      overview:
        'Many engineering teams outsource multi-factor authentication to third-party identity providers, creating recurring SaaS costs and introducing an external attack surface. Here is how we engineered RFC 6238 TOTP with zero external dependencies.',
      sections: [
        {
          heading: '1. The Math of RFC 6238 TOTP in Node.js',
          body:
            'TOTP computes an HMAC-SHA1 digest over a 64-bit counter representing 30-second epochs since Unix epoch. We extract a 4-byte dynamic binary code and truncate it modulo 1,000,000 to produce a 6-digit decimal code.',
          code: `// Generate 6-digit TOTP code from current timestamp
const epoch = Math.floor(Date.now() / 1000);
const timeStep = Math.floor(epoch / 30);
const hmac = crypto.createHmac('sha1', secretBuffer);
hmac.update(counterBuffer);
const digest = hmac.digest();
const offset = digest[digest.length - 1] & 0x0f;
const code = ((digest.readUInt32BE(offset) & 0x7fffffff) % 1000000)
  .toString()
  .padStart(6, '0');`,
        },
        {
          heading: '2. Storing Secrets Safely with AES-256-GCM',
          body:
            'A plaintext TOTP secret in a database is a critical vulnerability. SentinelKey encrypts all TOTP secrets using AES-256-GCM with a fresh 96-bit random IV and 128-bit authentication tag before writing to MongoDB.',
        },
        {
          heading: '3. Replay Protection & Exponential Lockout',
          body:
            'We record mfaLastTimeStep on the user document to guarantee that an intercepted code cannot be reused within the same 30-second window. Repeated failures trigger exponential backoff lockouts.',
        },
      ],
      takeaways: [
        'Pure in-repo cryptography eliminates recurring third-party identity SaaS bills.',
        'Authenticated encryption (AES-256-GCM) detects database tampering immediately.',
        'Tracking the last consumed time step prevents replay attacks within the ±30s window.',
      ],
    },
  },
  {
    id: 'post-2',
    slug: 'impossible-travel-haversine-heuristics',
    title: 'Catching Impossible Travel: The Math of Haversine Geo-Velocity Heuristics',
    excerpt:
      'Using great-circle spherical distance formulas to detect hijacked credentials across distant continents in under 2 milliseconds.',
    category: 'ids',
    categoryLabel: 'Intrusion Detection',
    readTime: '5 min read',
    publishedAt: 'September 15, 2026',
    author: {
      name: 'Dr. Aarav Joshi',
      role: 'Lead Cryptographer',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    },
    content: {
      overview:
        'When an account is compromised, attackers frequently access the session from an IP address geographically remote from the legitimate user. Here is how SentinelKey evaluates travel velocity in real time.',
      sections: [
        {
          heading: 'Calculating Spherical Distance with Haversine',
          body:
            'Earth is an oblate spheroid. The Haversine formula computes the shortest angular distance across its surface using latitude and longitude radians, accurately measuring real distances between cities.',
          code: `function calculateHaversineDistance(c1, c2) {
  const R = 6371; // Earth radius in km
  const dLat = (c2.lat - c1.lat) * (Math.PI / 180);
  const dLon = (c2.lon - c1.lon) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(c1.lat * (Math.PI / 180)) * Math.cos(c2.lat * (Math.PI / 180)) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}`,
        },
        {
          heading: 'Setting the 800 km/h Threshold',
          body:
            'Commercial air travel cruises at approximately 800-900 km/h. If sequential requests from New York and London occur within 45 minutes (implied velocity > 7,000 km/h), the request is flagged as an impossible travel anomaly.',
        },
      ],
      takeaways: [
        'Mathematical heuristics evaluate in sub-2ms with zero external API calls.',
        'Pairs with ML anomaly detection for comprehensive behavioral coverage.',
      ],
    },
  },
  {
    id: 'post-3',
    slug: 'shannon-entropy-magic-bytes-file-defense',
    title: 'Shannon Entropy and Magic Bytes: Detecting Disguised Malware in Pre-Flight Uploads',
    excerpt:
      'How inspecting binary headers and calculating byte-level information density stops packed and disguised malware before storage.',
    category: 'classification',
    categoryLabel: 'Threat Classification',
    readTime: '7 min read',
    publishedAt: 'September 08, 2026',
    author: {
      name: 'Pooja Thapa',
      role: 'Threat Intelligence Lead',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
    },
    content: {
      overview:
        'Attackers often disguise executable binaries by renaming them to .pdf or .png. Relying solely on declared file extensions or MIME headers is an open invitation to compromise.',
      sections: [
        {
          heading: '1. Binary Magic Header Verification (FILE-001)',
          body:
            'Every file upload begins by inspecting the first few bytes. If a file named document.pdf starts with MZ (Windows PE) or \\x7fELF (Linux executable), it is rejected as a binary disguise.',
        },
        {
          heading: '2. Shannon Entropy as an Indicator of Packing (FILE-002)',
          body:
            'Plain text, images, and standard PDFs have characteristic entropy ranges. Packed or encrypted malware displays extremely high byte entropy (H > 7.7 bits/byte), alerting the system to suspicious obfuscation.',
        },
      ],
      takeaways: [
        'Never trust user-supplied MIME types or file extensions.',
        'Shannon entropy accurately distinguishes standard files from packed payloads.',
      ],
    },
  },
  {
    id: 'post-4',
    slug: 'skf1-binary-envelope-key-rotation',
    title: 'SKF1 Binary Envelope Design: Zero-Downtime Key Rotation with HKDF-SHA256',
    excerpt:
      'Architecting a 34-byte compact binary file envelope format supporting cryptographic domain separation and seamless key migration.',
    category: 'encryption',
    categoryLabel: 'Cryptographic Storage',
    readTime: '6 min read',
    publishedAt: 'August 29, 2026',
    author: {
      name: 'Nabin Sharma',
      role: 'Principal Security Architect',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    },
    content: {
      overview:
        'Encrypting files on disk requires tracking which key version was used, the initialization vector (IV), and authentication tag. Here is the architecture of SentinelKey’s SKF1 envelope.',
      sections: [
        {
          heading: 'The 34-Byte Header Structure',
          body:
            'The SKF1 format prepends 34 bytes to the ciphertext: 4 bytes magic string ("SKF1"), 2 bytes big-endian key version, 12 bytes AES-GCM IV, and 16 bytes authentication tag.',
        },
        {
          heading: 'Zero-Downtime Rotation with HKDF',
          body:
            'When master keys rotate from v1 to v2, existing files created under v1 remain decryptable. When users update or download files, the system re-encrypts them under the active key.',
        },
      ],
      takeaways: [
        'Binary headers eliminate the overhead of external JSON metadata sidecars.',
        'HKDF domain separation prevents key cross-contamination across fields and files.',
      ],
    },
  },
  {
    id: 'post-5',
    slug: 'isolation-forest-ml-telemetry-scoring',
    title: 'Isolation Forest vs Statistical Z-Scores: Anomaly Scoring on 8D Security Telemetry',
    excerpt:
      'How our Python Flask microservice scores security telemetry in under 15ms with full feature explainability.',
    category: 'ml',
    categoryLabel: 'Machine Learning',
    readTime: '8 min read',
    publishedAt: 'August 18, 2026',
    author: {
      name: 'Dr. Aarav Joshi',
      role: 'Lead Cryptographer',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    },
    content: {
      overview:
        'Rules-based heuristics are great for known patterns, but novel attack vectors require unsupervised machine learning. Here is how we built our Python ML anomaly detection service.',
      sections: [
        {
          heading: 'The 8-Dimensional Telemetry Vector',
          body:
            'We transform raw events into 8 normalized features: hour_norm, is_night_hours, is_weekend, failed_login_ratio_1h, event_burst_5m, geo_distance_km, geo_velocity_kmh, and distinct_ips_24h.',
        },
        {
          heading: 'Explainable Anomaly Attribution',
          body:
            'A security analyst needs to know why an anomaly was flagged. Our service computes per-feature Z-score deviations, automatically highlighting which feature triggered the score whenever Z >= 2.0.',
        },
      ],
      takeaways: [
        'Isolation Forests isolate outliers efficiently in multi-dimensional space.',
        'Feature explainability is crucial for actionable security triage.',
      ],
    },
  },
  {
    id: 'post-6',
    slug: 'khalti-epayment-saas-nepal',
    title: 'Integrating Khalti ePayments and Automated VAT Invoicing for B2B SaaS in Nepal',
    excerpt:
      'Architecting tamper-proof Khalti payment verification with server-side validation and automated tax receipts in NPR.',
    category: 'fintech',
    categoryLabel: 'FinTech & Nepal',
    readTime: '5 min read',
    publishedAt: 'August 04, 2026',
    author: {
      name: 'Nabin Sharma',
      role: 'Principal Security Architect',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    },
    content: {
      overview:
        'Building SaaS products in Nepal previously meant dealing with complex international wire transfers or foreign card restrictions. Here is how we integrated Khalti ePayment v2.',
      sections: [
        {
          heading: 'Server-Side Token Verification Protocol',
          body:
            'Checkouts produce a unique PIDX lookup token. Our backend verifies payment status directly with Khalti’s API over mutual TLS, guarding against replay attacks.',
        },
        {
          heading: 'Automated VAT and Tax Compliance',
          body:
            'Once verified, our pipeline automatically calculates 13% VAT, records invoice numbers in compliance with Nepalese tax guidelines, and activates Pro tier quotas instantly.',
        },
      ],
      takeaways: [
        'Local payment rails eliminate international currency exchange friction.',
        'Server-side reconciliation ensures cryptographic certainty before tier provisioning.',
      ],
    },
  },
];

export const BlogPage: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activePost, setActivePost] = useState<BlogPost | null>(null);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const filteredPosts = POSTS.filter((post) => {
    const matchesCat = activeCategory === 'all' || post.category === activeCategory;
    const matchesQuery =
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  const featuredPost = POSTS.find((p) => p.featured) || POSTS[0];

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail) return;
    setSubscribed(true);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--landing-body-bg)', color: 'var(--landing-text-head)' }}>
      <Navbar />

      <main style={{ flex: 1 }}>
        {/* Standardized Hero Section matching All Marketing Pages */}
        <section className="page-hero">
          <div className="page-hero-container">
            <div className="page-hero-badge">
              <BookOpen size={14} color="#60A5FA" />
              <span>SentinelKey Security Engineering & Research</span>
            </div>

            <h1 className="page-hero-title">
              Engineering deep dives & <br />
              <span style={{ background: 'linear-gradient(135deg, #60A5FA 0%, #A78BFA 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                cryptographic architectures
              </span>
            </h1>

            <p className="page-hero-subtitle">
              Read technical teardowns of our RFC 6238 TOTP engine, Haversine geo-velocity math, Isolation Forest ML models, and SKF1 file format.
            </p>

            {/* Search Input */}
            <div style={{ maxWidth: '580px', margin: '0 auto', position: 'relative' }}>
              <Search size={18} color="#64748B" style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search articles on TOTP, Haversine, ML anomaly, SKF1..."
                style={{
                  width: '100%',
                  padding: '0.85rem 1.25rem 0.85rem 3rem',
                  borderRadius: '10px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  color: '#0F172A',
                  fontSize: '0.95rem',
                  outline: 'none',
                  boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
                }}
              />
            </div>
          </div>
        </section>

        {/* Featured Post Spotlight in Section Alt */}
        {!searchQuery && activeCategory === 'all' && (
          <section style={{ backgroundColor: 'var(--landing-section-alt)', borderBottom: '1px solid #E2E8F0', padding: '3.5rem 1.5rem' }}>
            <div
              style={{
                maxWidth: '1240px',
                margin: '0 auto',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '16px',
                padding: '2.5rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '2.5rem',
                alignItems: 'center',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <span
                    style={{
                      backgroundColor: '#1D63ED',
                      color: '#FFFFFF',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '0.2rem 0.65rem',
                      borderRadius: '4px',
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Featured Architecture
                  </span>
                  <span style={{ fontSize: '0.85rem', color: '#64748B' }}>{featuredPost.readTime}</span>
                </div>

                <h2
                  onClick={() => setActivePost(featuredPost)}
                  style={{
                    fontSize: 'clamp(1.5rem, 3vw, 2rem)',
                    fontWeight: 800,
                    color: '#0F172A',
                    marginBottom: '1rem',
                    lineHeight: 1.25,
                    cursor: 'pointer',
                  }}
                >
                  {featuredPost.title}
                </h2>

                <p style={{ fontSize: '0.95rem', color: '#475569', lineHeight: 1.6, marginBottom: '2rem' }}>
                  {featuredPost.excerpt}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <img
                      src={featuredPost.author.avatar}
                      alt={featuredPost.author.name}
                      style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0F172A' }}>{featuredPost.author.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{featuredPost.author.role}</div>
                    </div>
                  </div>

                  <button
                    onClick={() => setActivePost(featuredPost)}
                    style={{
                      backgroundColor: 'var(--landing-hero-cta)',
                      color: '#FFFFFF',
                      padding: '0.65rem 1.5rem',
                      borderRadius: '6px',
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      cursor: 'pointer',
                    }}
                  >
                    Read Full Story <ArrowRight size={16} />
                  </button>
                </div>
              </div>

              {/* Graphic snippet representation in Dark Terminal */}
              <div
                style={{
                  backgroundColor: '#0F172A',
                  border: '1px solid #1E293B',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.8rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid #1E293B', paddingBottom: '0.75rem' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#EF4444' }} />
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#F59E0B' }} />
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10B981' }} />
                  <span style={{ color: '#94A3B8', fontSize: '0.75rem', marginLeft: 'auto' }}>totp-verification.log</span>
                </div>
                <pre style={{ color: '#93C5FD', margin: 0, lineHeight: 1.5 }}>
{`[0.000s] Incoming POST /auth/mfa/verify
[0.002s] AES-256-GCM secret decrypted from MongoDB
[0.004s] RFC 6238 HMAC-SHA1 computed for step=598102
[0.005s] Code matched: "849201" (Delta: 0 steps)
[0.006s] Replay check: timeStep > mfaLastTimeStep [PASS]
[0.007s] Session issued: 15m access / 7d refresh token
[STATUS] Authentication successful. Zero SaaS calls.`}
                </pre>
              </div>
            </div>
          </section>
        )}

        {/* Category Pills */}
        <section style={{ backgroundColor: '#FFFFFF', padding: '2.5rem 1.5rem 1rem' }}>
          <div style={{ maxWidth: '1240px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', borderBottom: '1px solid #E2E8F0', paddingBottom: '1.25rem' }}>
            {[
              { id: 'all', label: 'All Articles' },
              { id: 'mfa', label: 'Authentication & MFA' },
              { id: 'ids', label: 'Intrusion Detection' },
              { id: 'ml', label: 'ML Anomaly Engine' },
              { id: 'encryption', label: 'Cryptographic Storage' },
              { id: 'classification', label: 'Threat Classification' },
              { id: 'fintech', label: 'Khalti & FinTech' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                style={{
                  padding: '0.45rem 1.1rem',
                  borderRadius: '20px',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  backgroundColor: activeCategory === cat.id ? '#1D63ED' : '#F1F5F9',
                  color: activeCategory === cat.id ? '#FFFFFF' : '#475569',
                  border: activeCategory === cat.id ? '1px solid #1D63ED' : '1px solid #E2E8F0',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </section>

        {/* Article Grid in Light Theme */}
        <section style={{ backgroundColor: '#FFFFFF', padding: '2rem 1.5rem 6rem' }}>
          <div
            style={{
              maxWidth: '1240px',
              margin: '0 auto',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
              gap: '2rem',
            }}
          >
            {filteredPosts.map((post) => (
              <article
                key={post.id}
                onClick={() => setActivePost(post)}
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '14px',
                  padding: '1.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
                }}
                className="spotlight-card"
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor: '#F5F3FF',
                        color: '#7C3AED',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '4px',
                        border: '1px solid #DDD6FE',
                      }}
                    >
                      {post.categoryLabel}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#64748B' }}>{post.readTime}</span>
                  </div>

                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.75rem', lineHeight: 1.4 }}>
                    {post.title}
                  </h3>

                  <p style={{ fontSize: '0.875rem', color: '#475569', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                    {post.excerpt}
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #E2E8F0', paddingTop: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <img
                      src={post.author.avatar}
                      alt={post.author.name}
                      style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                    <span style={{ fontSize: '0.8rem', color: '#334155', fontWeight: 500 }}>{post.author.name}</span>
                  </div>

                  <span style={{ fontSize: '0.8rem', color: 'var(--landing-hero-cta)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}>
                    Read article <ArrowRight size={14} />
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Newsletter Subscription Banner */}
        <section style={{ backgroundColor: 'var(--landing-section-alt)', borderTop: '1px solid #E2E8F0', padding: '5rem 1.5rem' }}>
          <div
            style={{
              maxWidth: '900px',
              margin: '0 auto',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '16px',
              padding: '3rem 2.5rem',
              textAlign: 'center',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
            }}
          >
            <Shield size={32} color="#1D63ED" style={{ margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.75rem' }}>
              Subscribe to SentinelKey Engineering Bulletins
            </h3>
            <p style={{ fontSize: '0.95rem', color: '#64748B', maxWidth: '580px', margin: '0 auto 2rem', lineHeight: 1.5 }}>
              Receive technical updates on our cryptographic envelope formats, heuristic algorithm improvements, and new SDK releases. Zero marketing spam.
            </p>

            {subscribed ? (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#059669', fontWeight: 600, fontSize: '0.95rem' }}>
                <CheckCircle2 size={20} /> Thank you! You're subscribed to SentinelKey engineering updates.
              </div>
            ) : (
              <form onSubmit={handleSubscribe} style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', maxWidth: '480px', margin: '0 auto', flexWrap: 'wrap' }}>
                <input
                  type="email"
                  required
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder="Enter your engineering email..."
                  style={{
                    flex: '1 1 260px',
                    padding: '0.8rem 1rem',
                    borderRadius: '8px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    color: '#0F172A',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
                <button
                  type="submit"
                  style={{
                    backgroundColor: 'var(--landing-hero-cta)',
                    color: '#FFFFFF',
                    padding: '0.8rem 1.5rem',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    cursor: 'pointer',
                  }}
                >
                  <Send size={14} /> Subscribe
                </button>
              </form>
            )}
          </div>
        </section>

        {/* Interactive Full Article Reading Modal */}
        {activePost && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(6px)',
              zIndex: 100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1.5rem',
            }}
            onClick={() => setActivePost(null)}
          >
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '16px',
                maxWidth: '820px',
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto',
                padding: '2.5rem',
                position: 'relative',
                boxShadow: '0 25px 60px rgba(0, 0, 0, 0.3)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => setActivePost(null)}
                style={{
                  position: 'absolute',
                  top: '1.5rem',
                  right: '1.5rem',
                  color: '#64748B',
                  padding: '0.5rem',
                  borderRadius: '50%',
                  backgroundColor: '#F1F5F9',
                  cursor: 'pointer',
                }}
              >
                <X size={20} />
              </button>

              {/* Modal Metadata */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    backgroundColor: '#EFF6FF',
                    color: '#1D63ED',
                    padding: '0.2rem 0.65rem',
                    borderRadius: '4px',
                    border: '1px solid #DBEAFE',
                  }}
                >
                  {activePost.categoryLabel}
                </span>
                <span style={{ fontSize: '0.8rem', color: '#64748B' }}>{activePost.publishedAt}</span>
                <span style={{ fontSize: '0.8rem', color: '#64748B' }}>• {activePost.readTime}</span>
              </div>

              <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0F172A', marginBottom: '1.25rem', lineHeight: 1.3 }}>
                {activePost.title}
              </h2>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '1.25rem' }}>
                <img
                  src={activePost.author.avatar}
                  alt={activePost.author.name}
                  style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover' }}
                />
                <div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A' }}>{activePost.author.name}</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748B' }}>{activePost.author.role} • SentinelKey Engineering</div>
                </div>
              </div>

              {/* Article Body */}
              <div style={{ fontSize: '0.95rem', color: '#334155', lineHeight: 1.7, display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                <p style={{ fontSize: '1.05rem', color: '#1E293B', fontWeight: 500, fontStyle: 'italic', borderLeft: '3px solid #1D63ED', paddingLeft: '1rem' }}>
                  {activePost.content.overview}
                </p>

                {activePost.content.sections.map((sec, idx) => (
                  <div key={idx}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.75rem' }}>
                      {sec.heading}
                    </h3>
                    <p style={{ marginBottom: '1rem', color: '#475569' }}>{sec.body}</p>
                    {sec.code && (
                      <div
                        style={{
                          backgroundColor: '#0F172A',
                          border: '1px solid #1E293B',
                          borderRadius: '8px',
                          padding: '1rem',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.8rem',
                          color: '#93C5FD',
                          overflowX: 'auto',
                        }}
                      >
                        <pre style={{ margin: 0 }}>{sec.code}</pre>
                      </div>
                    )}
                  </div>
                ))}

                {/* Key Takeaways */}
                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '10px',
                    padding: '1.5rem',
                  }}
                >
                  <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.75rem' }}>
                    Key Takeaways
                  </h4>
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {activePost.content.takeaways.map((item, i) => (
                      <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.875rem', color: '#334155' }}>
                        <CheckCircle2 size={16} color="#10B981" style={{ flexShrink: 0, marginTop: '3px' }} />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Modal Footer */}
              <div style={{ marginTop: '2.5rem', borderTop: '1px solid #E2E8F0', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    alert('Article link copied to clipboard!');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    color: '#64748B',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  <Share2 size={16} /> Share Article
                </button>
                <button
                  onClick={() => setActivePost(null)}
                  style={{
                    backgroundColor: 'var(--landing-hero-cta)',
                    color: '#FFFFFF',
                    padding: '0.5rem 1.25rem',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                  }}
                >
                  Close Reader
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};
