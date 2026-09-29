import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '../components/landing/Navbar.js';
import { Footer } from '../components/landing/Footer.js';
import {
  LifeBuoy,
  MessageSquare,
  ShieldAlert,
  FileText,
  Search,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Send,
  Sparkles,
  MapPin,
  HelpCircle
} from 'lucide-react';

interface FaqItem {
  id: string;
  category: 'mfa' | 'ids' | 'encryption' | 'billing' | 'classification';
  question: string;
  answer: string;
}

const FAQS: FaqItem[] = [
  {
    id: 'faq-1',
    category: 'mfa',
    question: 'How does SentinelKey implement TOTP Multi-Factor Auth without external SaaS?',
    answer:
      'SentinelKey implements 100% in-repo RFC 6238 TOTP using Node.js native crypto (createHmac with sha1). TOTP secrets are stored encrypted in MongoDB using AES-256-GCM with a 96-bit random IV and 128-bit authentication tag. Users are provided 8 single-use recovery backup codes (SHA-256 hashed), and repeat verification attacks are mitigated with exponential backoff lockout.',
  },
  {
    id: 'faq-2',
    category: 'ids',
    question: 'How does the impossible travel heuristic detect account takeovers?',
    answer:
      'When logins occur across different locations, SentinelKey calculates the great-circle distance between GPS coordinates using the mathematical Haversine formula. If the implied travel speed exceeds 800 km/h (e.g. New York to London in 45 minutes), an instant high-severity impossible travel alert is dispatched into the IDS alert stream.',
  },
  {
    id: 'faq-3',
    category: 'encryption',
    question: 'What is the SKF1 file format and how does zero-downtime key rotation work?',
    answer:
      'Files are encrypted with AES-256-GCM and stored inside a compact 34-byte binary envelope: [Magic \'SKF1\' (4B)][Version (2B uint16BE)][IV (12B)][Tag (16B)][Ciphertext]. Keys are derived from an environment master key using HKDF-SHA256 with domain salts. When keys rotate, the active version advances; older keys remain in decrypt-only mode so legacy files decrypt smoothly without downtime.',
  },
  {
    id: 'faq-4',
    category: 'ids',
    question: 'How does the Python ML Anomaly Detection microservice score events?',
    answer:
      'Our Flask microservice extracts an 8-dimensional normalized telemetry vector (hour of day, night hours, weekend, failed login ratio over 1h, event burst in 5m, geo-distance, geo-velocity, distinct IPs over 24h). An ensemble of scikit-learn Isolation Forest and statistical Z-score analysis produces a calibrated anomaly score (0.0 to 1.0) with contributing feature explainability.',
  },
  {
    id: 'faq-5',
    category: 'classification',
    question: 'How do the File and Email Threat Classifiers detect malicious uploads and phishing?',
    answer:
      'The File Classifier checks binary magic bytes (detecting Windows PE MZ or Linux ELF executables disguised as .pdf or .png) and computes Shannon entropy to flag packed or encrypted malware (H > 7.7 bits/byte). The Email Classifier calculates Levenshtein edit distance against trusted corporate domains to catch typosquatting (e.g., micros0ft.com) and detects deceptive hyperlinks.',
  },
  {
    id: 'faq-6',
    category: 'billing',
    question: 'How do Khalti ePayments work for developers and engineering teams in Nepal?',
    answer:
      'We support direct Khalti wallet checkout, e-Banking, and mobile banking in Nepalese Rupees (NPR). When upgrading to SentinelKey Pro (NPR 2,499/mo), users checkout via Khalti ePayment v2. Our backend validates the transaction token server-side, provisions Pro quotas, and automatically generates tax-compliant VAT invoices.',
  },
];

interface StatusService {
  name: string;
  status: 'operational' | 'degraded';
  uptime: string;
  latency: string;
}

const SERVICES: StatusService[] = [
  { name: 'SentinelKey Auth & Session API', status: 'operational', uptime: '99.99%', latency: '8ms' },
  { name: 'In-Repo TOTP MFA Engine', status: 'operational', uptime: '100%', latency: '3ms' },
  { name: 'Mathematical Heuristics IDS Engine', status: 'operational', uptime: '100%', latency: '2ms' },
  { name: 'Python Flask ML Anomaly Service', status: 'operational', uptime: '99.95%', latency: '14ms' },
  { name: 'SKF1 Cryptographic File Vault', status: 'operational', uptime: '100%', latency: '6ms' },
  { name: 'Khalti ePayment Gateway Connector', status: 'operational', uptime: '99.98%', latency: '120ms' },
];

export const SupportPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [faqCategory, setFaqCategory] = useState<string>('all');
  const [expandedFaq, setExpandedFaq] = useState<string | null>('faq-1');

  // Ticket form state
  const [ticketForm, setTicketForm] = useState({
    name: '',
    email: '',
    category: 'Auth & RBAC',
    priority: 'Medium',
    subject: '',
    description: '',
  });
  const [submittedTicketId, setSubmittedTicketId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const toggleFaq = (id: string) => {
    setExpandedFaq(expandedFaq === id ? null : id);
  };

  const handleTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketForm.email || !ticketForm.subject || !ticketForm.description) return;

    setSubmitting(true);
    setTimeout(() => {
      const generatedId = `SK-${Math.floor(1000 + Math.random() * 9000)}`;
      setSubmittedTicketId(generatedId);
      setSubmitting(false);
    }, 800);
  };

  const filteredFaqs = FAQS.filter((faq) => {
    const matchesCategory = faqCategory === 'all' || faq.category === faqCategory;
    const matchesSearch =
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--landing-body-bg)', color: 'var(--landing-text-head)' }}>
      <Navbar />

      <main style={{ flex: 1 }}>
        {/* Standardized Hero Section matching All Marketing Pages */}
        <section className="page-hero">
          <div className="page-hero-container">
            <div className="page-hero-badge">
              <LifeBuoy size={14} color="#60A5FA" />
              <span>SentinelKey Developer Support & Knowledge Base</span>
            </div>

            <h1 className="page-hero-title">
              How can our engineering team <br />
              <span style={{ background: 'linear-gradient(135deg, #60A5FA 0%, #A78BFA 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                assist your deployment?
              </span>
            </h1>

            <p className="page-hero-subtitle">
              Get answers about our in-repo TOTP implementation, mathematical heuristics, ML scoring service, or submit a support ticket.
            </p>

            {/* Quick Search Bar */}
            <div
              style={{
                maxWidth: '620px',
                margin: '0 auto',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Search
                size={20}
                color="#64748B"
                style={{ position: 'absolute', left: '1.25rem', pointerEvents: 'none' }}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search TOTP setup, Haversine geo-velocity, SKF1 files, Khalti..."
                style={{
                  width: '100%',
                  padding: '1rem 1.25rem 1rem 3.25rem',
                  borderRadius: '10px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  color: '#0F172A',
                  fontSize: '0.95rem',
                  outline: 'none',
                  boxShadow: '0 8px 25px rgba(0, 0, 0, 0.25)',
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: '1rem',
                    color: '#64748B',
                    fontSize: '0.8rem',
                    backgroundColor: '#F1F5F9',
                    borderRadius: '4px',
                    padding: '0.2rem 0.5rem',
                  }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Live System Status Bar in Light Section Alt */}
        <section id="status" style={{ backgroundColor: 'var(--landing-section-alt)', borderBottom: '1px solid #E2E8F0', padding: '2.5rem 1.5rem' }}>
          <div
            style={{
              maxWidth: '1240px',
              margin: '0 auto',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '14px',
              padding: '1.5rem 2rem',
              boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: '#10B981',
                    boxShadow: '0 0 10px #10B981',
                  }}
                  className="pulse-emerald"
                />
                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0F172A' }}>
                  All SentinelKey Security Services Operational
                </span>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Clock size={14} /> Refreshed 30 seconds ago
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
              }}
            >
              {SERVICES.map((s, idx) => (
                <div
                  key={idx}
                  style={{
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    padding: '0.85rem 1rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <span style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 500 }}>{s.name}</span>
                    <span style={{ fontSize: '0.75rem', color: '#10B981', fontWeight: 700 }}>Active</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748B' }}>
                    <span>Uptime {s.uptime}</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{s.latency}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 4 Support Channels in Light Theme */}
        <section style={{ maxWidth: '1240px', margin: '4rem auto', padding: '0 1.5rem' }}>
          <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0F172A', marginBottom: '1.5rem' }}>
            Developer Support Channels
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '1.5rem',
            }}
          >
            {/* Channel 1 */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '1.75rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 4px 15px rgba(0,0,0,0.03)',
              }}
              className="spotlight-card"
            >
              <div>
                <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem', border: '1px solid #DBEAFE' }}>
                  <MessageSquare size={22} color="#1D63ED" />
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.5rem' }}>
                  Developer Discord
                </h3>
                <p style={{ fontSize: '0.875rem', color: '#475569', lineHeight: 1.5, marginBottom: '1.5rem' }}>
                  Join our community of developers integrating SentinelKey SDK and building custom threat rules.
                </p>
              </div>
              <a
                href="https://discord.com"
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: 'var(--landing-hero-cta)',
                }}
              >
                Join Developer Discord →
              </a>
            </div>

            {/* Channel 2 */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '1.75rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 4px 15px rgba(0,0,0,0.03)',
              }}
              className="spotlight-card"
            >
              <div>
                <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#FDF2F8', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem', border: '1px solid #FCE7F3' }}>
                  <ShieldAlert size={22} color="#DB2777" />
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.5rem' }}>
                  Security Incident Reporting
                </h3>
                <p style={{ fontSize: '0.875rem', color: '#475569', lineHeight: 1.5, marginBottom: '1.5rem' }}>
                  Found an issue with our cryptographic envelopes, token rotation, or classifiers? Responsible disclosure.
                </p>
              </div>
              <a
                href="mailto:security@sentinelkey.com"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#DB2777',
                }}
              >
                security@sentinelkey.com →
              </a>
            </div>

            {/* Channel 3 */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '1.75rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 4px 15px rgba(0,0,0,0.03)',
              }}
              className="spotlight-card"
            >
              <div>
                <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem', border: '1px solid #EDE9FE' }}>
                  <FileText size={22} color="#8B5CF6" />
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.5rem' }}>
                  API & SDK Documentation
                </h3>
                <p style={{ fontSize: '0.875rem', color: '#475569', lineHeight: 1.5, marginBottom: '1.5rem' }}>
                  Complete REST API endpoints, postman collection, @sentinelkey/security-stack-sdk guide, and examples.
                </p>
              </div>
              <Link
                to="/docs"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#8B5CF6',
                }}
              >
                Browse Documentation →
              </Link>
            </div>

            {/* Channel 4 */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '1.75rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 4px 15px rgba(0,0,0,0.03)',
              }}
              className="spotlight-card"
            >
              <div>
                <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem', border: '1px solid #D1FAE5' }}>
                  <Sparkles size={22} color="#10B981" />
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.5rem' }}>
                  Khalti Billing Desk
                </h3>
                <p style={{ fontSize: '0.875rem', color: '#475569', lineHeight: 1.5, marginBottom: '1.5rem' }}>
                  Assistance with Khalti ePayment transactions, VAT receipt generation, and enterprise team licensing in Nepal.
                </p>
              </div>
              <Link
                to="/app/billing"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#059669',
                }}
              >
                Billing Management →
              </Link>
            </div>
          </div>
        </section>

        {/* Support Ticket Submission Form & FAQ Split Section */}
        <section style={{ backgroundColor: 'var(--landing-section-alt)', borderTop: '1px solid #E2E8F0', padding: '5rem 1.5rem 6rem' }}>
          <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '3rem', alignItems: 'start' }}>
              {/* Left: Ticket Submission Form */}
              <div
                id="ticket"
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '16px',
                  padding: '2.5rem 2rem',
                  boxShadow: '0 4px 25px rgba(0, 0, 0, 0.04)',
                }}
              >
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.5rem' }}>
                  Submit a Support Request
                </h3>
                <p style={{ fontSize: '0.9rem', color: '#64748B', marginBottom: '2rem' }}>
                  Directly reviewed by SentinelKey security engineers. Average response time: under 45 minutes.
                </p>

                {submittedTicketId ? (
                  <div
                    style={{
                      backgroundColor: '#ECFDF5',
                      border: '1px solid #10B981',
                      borderRadius: '12px',
                      padding: '2rem',
                      textAlign: 'center',
                    }}
                  >
                    <CheckCircle2 size={48} color="#10B981" style={{ margin: '0 auto 1rem' }} />
                    <h4 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#065F46', marginBottom: '0.5rem' }}>
                      Ticket {submittedTicketId} Created
                    </h4>
                    <p style={{ fontSize: '0.9rem', color: '#047857', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                      We have logged your issue under priority <strong>{ticketForm.priority}</strong>. Our on-duty security engineer will email confirmation to <strong>{ticketForm.email}</strong> shortly.
                    </p>
                    <button
                      onClick={() => {
                        setSubmittedTicketId(null);
                        setTicketForm({
                          name: '',
                          email: '',
                          category: 'Auth & RBAC',
                          priority: 'Medium',
                          subject: '',
                          description: '',
                        });
                      }}
                      style={{
                        backgroundColor: '#059669',
                        color: '#FFFFFF',
                        padding: '0.6rem 1.25rem',
                        borderRadius: '6px',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                      }}
                    >
                      Submit Another Request
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleTicketSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: '#334155', marginBottom: '0.4rem', fontWeight: 600 }}>
                          Your Name
                        </label>
                        <input
                          type="text"
                          required
                          value={ticketForm.name}
                          onChange={(e) => setTicketForm({ ...ticketForm, name: e.target.value })}
                          placeholder="Nabin K."
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            borderRadius: '8px',
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #CBD5E1',
                            color: '#0F172A',
                            fontSize: '0.9rem',
                            outline: 'none',
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: '#334155', marginBottom: '0.4rem', fontWeight: 600 }}>
                          Email Address
                        </label>
                        <input
                          type="email"
                          required
                          value={ticketForm.email}
                          onChange={(e) => setTicketForm({ ...ticketForm, email: e.target.value })}
                          placeholder="dev@organization.com"
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            borderRadius: '8px',
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #CBD5E1',
                            color: '#0F172A',
                            fontSize: '0.9rem',
                            outline: 'none',
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: '#334155', marginBottom: '0.4rem', fontWeight: 600 }}>
                          Category
                        </label>
                        <select
                          value={ticketForm.category}
                          onChange={(e) => setTicketForm({ ...ticketForm, category: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            borderRadius: '8px',
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #CBD5E1',
                            color: '#0F172A',
                            fontSize: '0.9rem',
                            outline: 'none',
                          }}
                        >
                          <option>Auth & RBAC</option>
                          <option>MFA TOTP Configuration</option>
                          <option>Intrusion Detection & Heuristics</option>
                          <option>ML Anomaly Service</option>
                          <option>Field & File Encryption (SKF1)</option>
                          <option>Threat Classification & Browser Extension</option>
                          <option>Khalti Billing & Invoices</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: '#334155', marginBottom: '0.4rem', fontWeight: 600 }}>
                          Priority Level
                        </label>
                        <select
                          value={ticketForm.priority}
                          onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            borderRadius: '8px',
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #CBD5E1',
                            color: '#0F172A',
                            fontSize: '0.9rem',
                            outline: 'none',
                          }}
                        >
                          <option>Low (General Inquiry)</option>
                          <option>Medium (Standard Issue)</option>
                          <option>High (Degraded Operation)</option>
                          <option>Critical P1 (Security Escalation)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: '#334155', marginBottom: '0.4rem', fontWeight: 600 }}>
                        Subject
                      </label>
                      <input
                        type="text"
                        required
                        value={ticketForm.subject}
                        onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                        placeholder="e.g., Question about SKF1 key rotation or Khalti token verification"
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          borderRadius: '8px',
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #CBD5E1',
                          color: '#0F172A',
                          fontSize: '0.9rem',
                          outline: 'none',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: '#334155', marginBottom: '0.4rem', fontWeight: 600 }}>
                        Problem Description & Details
                      </label>
                      <textarea
                        required
                        rows={4}
                        value={ticketForm.description}
                        onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                        placeholder="Include API responses, SDK method called, error codes, or Khalti transaction PIDX..."
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          borderRadius: '8px',
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #CBD5E1',
                          color: '#0F172A',
                          fontSize: '0.9rem',
                          outline: 'none',
                          resize: 'vertical',
                        }}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      style={{
                        backgroundColor: 'var(--landing-hero-cta)',
                        color: '#FFFFFF',
                        padding: '0.85rem',
                        borderRadius: '8px',
                        fontWeight: 600,
                        fontSize: '0.95rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        cursor: submitting ? 'not-allowed' : 'pointer',
                        opacity: submitting ? 0.7 : 1,
                        boxShadow: '0 4px 12px rgba(29, 99, 237, 0.35)',
                      }}
                    >
                      {submitting ? 'Creating Ticket...' : (
                        <>
                          <Send size={16} /> Submit Ticket
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>

              {/* Right: Searchable FAQ Accordion in Light Theme */}
              <div id="faq">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A' }}>
                    Frequently Asked Questions
                  </h3>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    {['all', 'mfa', 'ids', 'encryption', 'billing'].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setFaqCategory(cat)}
                        style={{
                          fontSize: '0.75rem',
                          padding: '0.3rem 0.7rem',
                          borderRadius: '12px',
                          backgroundColor: faqCategory === cat ? '#1D63ED' : '#FFFFFF',
                          color: faqCategory === cat ? '#FFFFFF' : '#475569',
                          border: faqCategory === cat ? '1px solid #1D63ED' : '1px solid #CBD5E1',
                          textTransform: 'capitalize',
                          fontWeight: 500,
                        }}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {filteredFaqs.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#64748B', backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                      <HelpCircle size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
                      <p>No FAQ matching "{searchQuery}". You can submit a ticket on the left.</p>
                    </div>
                  ) : (
                    filteredFaqs.map((faq) => {
                      const isExpanded = expandedFaq === faq.id;
                      return (
                        <div
                          key={faq.id}
                          style={{
                            backgroundColor: '#FFFFFF',
                            border: isExpanded ? '1px solid #1D63ED' : '1px solid #E2E8F0',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          <button
                            onClick={() => toggleFaq(faq.id)}
                            style={{
                              width: '100%',
                              padding: '1.25rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              textAlign: 'left',
                              color: isExpanded ? '#1D63ED' : '#0F172A',
                              fontWeight: 600,
                              fontSize: '0.95rem',
                            }}
                          >
                            <span>{faq.question}</span>
                            {isExpanded ? <ChevronUp size={18} color="#1D63ED" /> : <ChevronDown size={18} color="#64748B" />}
                          </button>
                          {isExpanded && (
                            <div
                              style={{
                                padding: '0 1.25rem 1.25rem',
                                color: '#475569',
                                fontSize: '0.9rem',
                                lineHeight: 1.6,
                                borderTop: '1px solid #F1F5F9',
                                paddingTop: '0.75rem',
                              }}
                            >
                              {faq.answer}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Regional Office Callout */}
                <div
                  style={{
                    marginTop: '2rem',
                    padding: '1.25rem',
                    borderRadius: '12px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                  }}
                >
                  <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid #DBEAFE' }}>
                    <MapPin size={20} color="#1D63ED" />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A' }}>
                      Nepal Regional Support Desk
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748B' }}>
                      Kathmandu, Nepal • Khalti Merchant Verification & Enterprise SLA Support
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};
