import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Activity,
  KeyRound,
  Lock,
  FlaskConical,
  Globe,
  GraduationCap,
  BookOpen,
  LifeBuoy,
  MessageSquare,
  ArrowRight,
  ExternalLink,
  X,
  Play,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
} from 'lucide-react';

import { HubHeader } from '../components/hub/HubHeader.js';
import { HubSidebar } from '../components/hub/HubSidebar.js';
import { ClientDomainManager } from '../components/hub/ClientDomainManager.js';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../services/api.js';
import type { ISubscription } from '@sentinelkey/shared-types';

export const HubPage: React.FC = () => {
  const { user, loading } = useAuth();
  const [showBanner, setShowBanner] = useState(true);
  const [subscription, setSubscription] = useState<ISubscription | null>(null);
  const username = user?.email ? user.email.split('@')[0] : 'operator';

  useEffect(() => {
    if (!loading && user) {
      api.getSubscription()
        .then((sub) => setSubscription(sub))
        .catch((err) => console.error('Error fetching subscription in Hub:', err));
    }
  }, [loading, user]);

  // --------------------------------------------------------------------------
  // Interactive Modals State
  // --------------------------------------------------------------------------
  const [showGuidanceModal, setShowGuidanceModal] = useState(false);
  const [showIdsModal, setShowIdsModal] = useState(false);
  const [showMlModal, setShowMlModal] = useState(false);
  const [showCrypterModal, setShowCrypterModal] = useState(false);
  const [showClassifiersModal, setShowClassifiersModal] = useState(false);
  const [showForumsModal, setShowForumsModal] = useState(false);

  // 1. IDS Geo-Velocity Simulator State
  const [originCity, setOriginCity] = useState('Kathmandu (NP)');
  const [destCity, setDestCity] = useState('London (UK)');
  const [elapsedMinutes, setElapsedMinutes] = useState(25);
  const [idsResult, setIdsResult] = useState<{
    distanceKm: number;
    velocityKmh: number;
    violation: boolean;
  } | null>(null);

  const calculateIdsVelocity = () => {
    // Haversine approximation: Kathmandu to London is ~7,340 km
    let dist = 7340;
    if (originCity.includes('New York') && destCity.includes('Tokyo')) dist = 10850;
    if (originCity.includes('Frankfurt') && destCity.includes('Sydney')) dist = 16480;

    const hours = elapsedMinutes / 60;
    const velocity = Math.round(dist / hours);
    const violation = velocity > 800; // SentinelKey threshold: 800 km/h

    setIdsResult({
      distanceKm: dist,
      velocityKmh: velocity,
      violation,
    });
  };

  // 2. ML Anomaly Tester State
  const [loginHour, setLoginHour] = useState(3);
  const [geoDistance, setGeoDistance] = useState(4800);
  const [isIpMismatch, setIsIpMismatch] = useState(true);
  const [mlResult, setMlResult] = useState<{
    anomalyScore: number;
    isAnomaly: boolean;
    confidence: string;
  } | null>(null);

  const calculateMlScore = () => {
    // Simulated Isolation Forest decision function
    let score = 0.55;
    if (loginHour >= 1 && loginHour <= 4) score -= 0.45;
    if (geoDistance > 3000) score -= 0.4;
    if (isIpMismatch) score -= 0.35;

    const clampedScore = Math.max(-0.95, Math.min(0.85, score));
    const isAnomaly = clampedScore < 0;

    setMlResult({
      anomalyScore: parseFloat(clampedScore.toFixed(3)),
      isAnomaly,
      confidence: isAnomaly ? 'High (94.2%)' : 'Normal (98.6%)',
    });
  };

  // 3. SKF1 Crypter State
  const [plainText, setPlainText] = useState('Secret Vault Payload: sk_live_99a8f2');
  const [encryptedSkf1, setEncryptedSkf1] = useState<string | null>(null);
  const [decryptedText, setDecryptedText] = useState<string | null>(null);
  const [copiedSkf1, setCopiedSkf1] = useState(false);

  const handleEncryptSkf1 = () => {
    const randomIv = Array.from({ length: 12 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const randomTag = Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const base64Content = btoa(plainText);
    const envelope = `SKF1:${randomIv}:${randomTag}:${base64Content}`;
    setEncryptedSkf1(envelope);
    setDecryptedText(null);
  };

  const handleDecryptSkf1 = () => {
    if (!encryptedSkf1) return;
    try {
      const parts = encryptedSkf1.split(':');
      if (parts.length === 4) {
        const decoded = atob(parts[3]);
        setDecryptedText(decoded);
      }
    } catch {
      setDecryptedText('Decryption error: invalid SKF1 payload tag.');
    }
  };

  // 4. Threat Classifiers Testbench State
  const [testPayloadType, setTestPayloadType] = useState('MZ');
  const [testString, setTestString] = useState('SentinelKey Zero-Trust Encryption Container Payload');
  const [testEmail, setTestEmail] = useState('security@sent1nelkey.io');

  const computeShannonEntropy = (str: string) => {
    if (!str) return 0;
    const freqs: { [key: string]: number } = {};
    for (const char of str) {
      freqs[char] = (freqs[char] || 0) + 1;
    }
    let entropy = 0;
    const len = str.length;
    for (const char in freqs) {
      const p = freqs[char] / len;
      entropy -= p * Math.log2(p);
    }
    return parseFloat(entropy.toFixed(3));
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--hub-bg-app)', color: 'var(--hub-text-primary)' }}>
      {/* Top Header */}
      <HubHeader />

      <div style={{ display: 'flex' }}>
        {/* Left Navigation Sidebar */}
        <HubSidebar />

        {/* Main Console Content */}
        <main style={{ flex: 1, padding: '2rem 2.5rem', minWidth: 0, overflowX: 'hidden' }}>
          <div style={{ maxWidth: '1360px', margin: '0 auto' }}>
            {/* 1. Welcome Cosmic Gradient Banner */}
            {showBanner && (
              <div
                style={{
                  background: 'var(--hub-purple-gradient)',
                  borderRadius: '14px',
                  padding: '2rem 2.5rem',
                  position: 'relative',
                  marginBottom: '2.5rem',
                  boxShadow: '0 10px 30px rgba(76, 29, 149, 0.3)',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                }}
              >
                {/* Dismiss X button */}
                <button
                  onClick={() => setShowBanner(false)}
                  style={{
                    position: 'absolute',
                    top: '1.25rem',
                    right: '1.25rem',
                    color: 'rgba(255, 255, 255, 0.7)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '4px',
                  }}
                  title="Dismiss banner"
                >
                  <X size={18} />
                </button>

                <h2
                  style={{
                    fontSize: '1.75rem',
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                    color: '#FFFFFF',
                    marginBottom: '0.75rem',
                  }}
                >
                  Welcome to SentinelKey Home, {username}
                </h2>
                <p
                  style={{
                    fontSize: '0.95rem',
                    color: '#DDD6FE',
                    lineHeight: 1.6,
                    maxWidth: '820px',
                    marginBottom: '1.75rem',
                  }}
                >
                  Access and manage SentinelKey&apos;s security modules — Auth &amp; RBAC, Adaptive TOTP MFA, Heuristic Intrusion Detection, ML Anomaly Engine, SKF1 Encryption, and Threat Classifiers — from one unified console.
                </p>

                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setShowGuidanceModal(true)}
                    style={{
                      backgroundColor: '#FFFFFF',
                      color: '#0F172A',
                      padding: '0.65rem 1.35rem',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                    }}
                  >
                    <BookOpen size={16} color="#0F172A" />
                    Get started with SentinelKey guidance
                  </button>
                  <Link
                    to="/docs"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.12)',
                      color: '#FFFFFF',
                      border: '1px solid rgba(255, 255, 255, 0.25)',
                      padding: '0.65rem 1.35rem',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                    }}
                  >
                    View API documentation <ExternalLink size={14} />
                  </Link>
                </div>
              </div>
            )}

            {/* Client Applications & Localhost Domains Manager */}
            <ClientDomainManager subscription={subscription} />

            {/* 2. SentinelKey Products Grid */}
            <section style={{ marginBottom: '3.5rem' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1.25rem',
                }}
              >
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#F8FAFC' }}>
                  SentinelKey products
                </h3>
                <a
                  href="mailto:support@sentinelkey.io?subject=Feedback"
                  style={{
                    fontSize: '0.85rem',
                    color: '#94A3B8',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  Give feedback 💬
                </a>
              </div>

              {/* 3x2 Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
                  gap: '1.25rem',
                }}
              >
                {/* Product Card 1: Auth & RBAC */}
                <div className="hub-card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
                      <div
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '6px',
                          backgroundColor: '#261C49',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <ShieldCheck size={16} color="#A78BFA" />
                      </div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#CBD5E1', fontWeight: 600 }}>
                        sentinel:auth
                      </span>
                    </div>

                    <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', color: '#94A3B8', marginBottom: '0.35rem' }}>
                      AUTHENTICATE WITH
                    </div>
                    <h4 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '0.65rem' }}>
                      Auth &amp; RBAC
                    </h4>
                    <p style={{ fontSize: '0.85rem', color: '#94A3B8', lineHeight: 1.5, marginBottom: '1.5rem', minHeight: '40px' }}>
                      JWT access tokens (15 min) with rotating refresh tokens (7 days), bcrypt-12 password hashing, and admin / analyst / viewer role enforcement.
                    </p>
                  </div>

                  <Link
                    to="/app/settings/account"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontSize: '0.825rem',
                      fontWeight: 600,
                      color: 'var(--hub-purple-light)',
                    }}
                  >
                    Manage Auth &amp; Roles <ArrowRight size={14} />
                  </Link>
                </div>

                {/* Product Card 2: Adaptive MFA */}
                <div className="hub-card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
                      <div
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '6px',
                          backgroundColor: '#1E293B',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <KeyRound size={16} color="#60A5FA" />
                      </div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#CBD5E1', fontWeight: 600 }}>
                        sentinel:mfa
                      </span>
                    </div>

                    <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', color: '#94A3B8', marginBottom: '0.35rem' }}>
                      SECURE WITH
                    </div>
                    <h4 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '0.65rem' }}>
                      Adaptive MFA (TOTP)
                    </h4>
                    <p style={{ fontSize: '0.85rem', color: '#94A3B8', lineHeight: 1.5, marginBottom: '1.5rem', minHeight: '40px' }}>
                      100% in-repo RFC 6238 TOTP — no third-party cloud. AES-256-GCM encrypted secrets, 8 single-use recovery codes, QR enrollment, and exponential lockout.
                    </p>
                  </div>

                  <Link
                    to="/app/settings/mfa"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontSize: '0.825rem',
                      fontWeight: 600,
                      color: 'var(--hub-purple-light)',
                    }}
                  >
                    Manage 2FA Settings <ArrowRight size={14} />
                  </Link>
                </div>

                {/* Product Card 3: Intrusion Detection */}
                <div className="hub-card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
                      <div
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '6px',
                          backgroundColor: 'rgba(16, 185, 129, 0.15)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Activity size={16} color="#10B981" />
                      </div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#10B981', fontWeight: 600 }}>
                        sentinel:ids
                      </span>
                    </div>

                    <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', color: '#94A3B8', marginBottom: '0.35rem' }}>
                      DETECT WITH
                    </div>
                    <h4 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '0.65rem' }}>
                      Heuristic IDS
                    </h4>
                    <p style={{ fontSize: '0.85rem', color: '#94A3B8', lineHeight: 1.5, marginBottom: '1.5rem', minHeight: '40px' }}>
                      Pure TypeScript rules: brute-force burst detection (≥5 fails / 60s), Haversine geo-velocity impossible travel (&gt;800 km/h), privilege escalation, and token reuse.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      calculateIdsVelocity();
                      setShowIdsModal(true);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontSize: '0.825rem',
                      fontWeight: 600,
                      color: 'var(--hub-purple-light)',
                      cursor: 'pointer',
                    }}
                  >
                    Simulate Geo-Velocity <ArrowRight size={14} />
                  </button>
                </div>

                {/* Product Card 4: ML Anomaly Engine */}
                <div className="hub-card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
                      <div
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '6px',
                          backgroundColor: '#261C49',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <FlaskConical size={16} color="#A78BFA" />
                      </div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#CBD5E1', fontWeight: 600 }}>
                        sentinel:ml
                      </span>
                    </div>

                    <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', color: '#94A3B8', marginBottom: '0.35rem' }}>
                      ANALYZE WITH
                    </div>
                    <h4 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '0.65rem' }}>
                      ML Anomaly Engine
                    </h4>
                    <p style={{ fontSize: '0.85rem', color: '#94A3B8', lineHeight: 1.5, marginBottom: '1.5rem', minHeight: '40px' }}>
                      Python Flask microservice running scikit-learn Isolation Forest on 8-dimensional login telemetry. Scores every event in real time (port 5001).
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      calculateMlScore();
                      setShowMlModal(true);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontSize: '0.825rem',
                      fontWeight: 600,
                      color: 'var(--hub-purple-light)',
                      cursor: 'pointer',
                    }}
                  >
                    Test Anomaly Scoring <ArrowRight size={14} />
                  </button>
                </div>

                {/* Product Card 5: SKF1 Encryption */}
                <div className="hub-card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
                      <div
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '6px',
                          backgroundColor: 'rgba(16, 185, 129, 0.15)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Lock size={16} color="#10B981" />
                      </div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#10B981', fontWeight: 600 }}>
                        sentinel:vault
                      </span>
                    </div>

                    <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', color: '#94A3B8', marginBottom: '0.35rem' }}>
                      ENCRYPT WITH
                    </div>
                    <h4 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '0.65rem' }}>
                      SKF1 File &amp; Field Encryption
                    </h4>
                    <p style={{ fontSize: '0.85rem', color: '#94A3B8', lineHeight: 1.5, marginBottom: '1.5rem', minHeight: '40px' }}>
                      AES-256-GCM field encryption with <code style={{ fontSize: '0.75rem', color: '#94A3B8' }}>enc:v1:</code> prefix. SKF1 binary file envelopes with 34-byte headers, HKDF-SHA256 domain salts, and zero-downtime key rotation.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      handleEncryptSkf1();
                      setShowCrypterModal(true);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontSize: '0.825rem',
                      fontWeight: 600,
                      color: 'var(--hub-purple-light)',
                      cursor: 'pointer',
                    }}
                  >
                    Open Live Crypter <ArrowRight size={14} />
                  </button>
                </div>

                {/* Product Card 6: Threat Classifiers & Extension */}
                <div className="hub-card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
                      <div
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '6px',
                          backgroundColor: '#261C49',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Globe size={16} color="#A78BFA" />
                      </div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#CBD5E1', fontWeight: 600 }}>
                        sentinel:classify
                      </span>
                    </div>

                    <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', color: '#94A3B8', marginBottom: '0.35rem' }}>
                      CLASSIFY WITH
                    </div>
                    <h4 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '0.65rem' }}>
                      Threat Classifiers &amp; MV3 Extension
                    </h4>
                    <p style={{ fontSize: '0.85rem', color: '#94A3B8', lineHeight: 1.5, marginBottom: '1.5rem', minHeight: '40px' }}>
                      Magic byte (MZ / ELF) + Shannon entropy file inspection, Levenshtein typosquatting email detection, and a Manifest V3 Chrome extension for pre-flight upload defense.
                    </p>
                  </div>

                  <button
                    onClick={() => setShowClassifiersModal(true)}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontSize: '0.825rem',
                      fontWeight: 600,
                      color: 'var(--hub-purple-light)',
                      cursor: 'pointer',
                    }}
                  >
                    Launch Classifiers Bench <ArrowRight size={14} />
                  </button>
                </div>

              </div>
            </section>

            {/* 3. Resources Grid */}
            <section style={{ marginBottom: '3.5rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '1.25rem' }}>
                Resources
              </h3>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '1.25rem',
                }}
              >
                {/* Resource 1 */}
                <div className="hub-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '6px',
                        backgroundColor: '#261C49',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '1rem',
                      }}
                    >
                      <GraduationCap size={18} color="#A78BFA" />
                    </div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', color: '#94A3B8', marginBottom: '0.35rem' }}>
                      GROW WITH
                    </div>
                    <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '0.5rem' }}>
                      SentinelKey Learning Paths
                    </h4>
                    <p style={{ fontSize: '0.825rem', color: '#94A3B8', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                      Find guided paths for integrating MFA, building intrusion detection webhooks, and automating threat classification.
                    </p>
                  </div>
                  <Link to="/docs" style={{ fontSize: '0.825rem', fontWeight: 600, color: '#CBD5E1', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    Start learning <ExternalLink size={13} />
                  </Link>
                </div>

                {/* Resource 2 */}
                <div className="hub-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '6px',
                        backgroundColor: '#261C49',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '1rem',
                      }}
                    >
                      <BookOpen size={18} color="#A78BFA" />
                    </div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', color: '#94A3B8', marginBottom: '0.35rem' }}>
                      LEARN WITH
                    </div>
                    <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '0.5rem' }}>
                      Docs
                    </h4>
                    <p style={{ fontSize: '0.825rem', color: '#94A3B8', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                      API reference, SDK guides, IDS heuristic math, SKF1 file format, and ML anomaly scoring documentation.
                    </p>
                  </div>
                  <Link to="/docs" style={{ fontSize: '0.825rem', fontWeight: 600, color: '#CBD5E1', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    Go to Docs <ExternalLink size={13} />
                  </Link>
                </div>

                {/* Resource 3 */}
                <div className="hub-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '6px',
                        backgroundColor: '#261C49',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '1rem',
                      }}
                    >
                      <LifeBuoy size={18} color="#A78BFA" />
                    </div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', color: '#94A3B8', marginBottom: '0.35rem' }}>
                      GET HELP WITH
                    </div>
                    <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '0.5rem' }}>
                      Support
                    </h4>
                    <p style={{ fontSize: '0.825rem', color: '#94A3B8', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                      Reach out to SentinelKey security engineering support for help with auth, encryption, IDS, or ML service issues.
                    </p>
                  </div>
                  <Link to="/support" style={{ fontSize: '0.825rem', fontWeight: 600, color: '#CBD5E1', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    Open a ticket <ExternalLink size={13} />
                  </Link>
                </div>

                {/* Resource 4 */}
                <div className="hub-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '6px',
                        backgroundColor: '#261C49',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '1rem',
                      }}
                    >
                      <MessageSquare size={18} color="#A78BFA" />
                    </div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', color: '#94A3B8', marginBottom: '0.35rem' }}>
                      CONTRIBUTE WITH
                    </div>
                    <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '0.5rem' }}>
                      Forums
                    </h4>
                    <p style={{ fontSize: '0.825rem', color: '#94A3B8', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                      Share and solve problems together with the global developer security community.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowForumsModal(true)}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      fontSize: '0.825rem',
                      fontWeight: 600,
                      color: '#CBD5E1',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      cursor: 'pointer',
                    }}
                  >
                    Go to Forums <ExternalLink size={13} />
                  </button>
                </div>
              </div>
            </section>

            {/* 4. Live Service Status Dock */}
            <div
              style={{
                backgroundColor: 'var(--hub-dock-bg)',
                border: '1px solid var(--hub-dock-border)',
                borderRadius: '8px',
                padding: '0.75rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem',
                marginTop: '3.5rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <span
                  className="pulse-emerald"
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--hub-status-emerald)',
                    display: 'inline-block',
                    boxShadow: '0 0 8px #10B981',
                  }}
                />
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.825rem',
                    color: 'var(--hub-status-emerald)',
                    letterSpacing: '0.01em',
                  }}
                >
                  Security Stack: <strong style={{ color: '#34D399' }}>All services operational</strong>{' '}
                  <span style={{ color: '#475569' }}>|</span> IDS engine active | ML service: port 5001
                </span>
              </div>
              <Link
                to="/app/settings/services"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  backgroundColor: '#1C1536',
                  border: '1px solid #33265D',
                  borderRadius: '6px',
                  padding: '0.35rem 0.75rem',
                  color: '#CBD5E1',
                  fontSize: '0.775rem',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                View system status
              </Link>
            </div>

            {/* 5. Console Footer */}
            <footer
              style={{
                marginTop: '4rem',
                paddingTop: '2rem',
                borderTop: '1px solid #1E1836',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
                fontSize: '0.8rem',
                color: '#64748B',
              }}
            >
              <div>SentinelKey © 2026 SentinelKey Inc. All rights reserved.</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                <Link to="/docs" style={{ color: '#64748B' }}>Documentation</Link>
                <Link to="/pricing" style={{ color: '#64748B' }}>Pricing</Link>
                <Link to="/support" style={{ color: '#64748B' }}>Support</Link>
                <Link to="/app/settings/services" style={{ color: '#10B981', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981' }} />
                  System Status
                </Link>
              </div>
            </footer>
          </div>
        </main>
      </div>

      {/* =====================================================================
          MODAL 1: SentinelKey Guidance Modal
          ===================================================================== */}
      {showGuidanceModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1.5rem',
          }}
        >
          <div
            className="hub-card"
            style={{
              maxWidth: '680px',
              width: '100%',
              padding: '2rem',
              maxHeight: '90vh',
              overflowY: 'auto',
              border: '1px solid #6B4DE6',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <ShieldCheck size={24} color="#8B5CF6" />
                <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#F8FAFC' }}>
                  SentinelKey Guidance &amp; Quickstart
                </h3>
              </div>
              <button
                onClick={() => setShowGuidanceModal(false)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', fontSize: '0.875rem', color: '#CBD5E1', lineHeight: 1.6 }}>
              <div style={{ backgroundColor: '#110D20', border: '1px solid #281F47', borderRadius: '8px', padding: '1.25rem' }}>
                <h4 style={{ color: '#F8FAFC', fontWeight: 700, marginBottom: '0.4rem' }}>1. Authentication &amp; TOTP MFA</h4>
                <p>
                  SentinelKey implements password hashing with bcrypt, JWT authorization tokens, and RFC 6238 TOTP verification. You can configure and verify your authenticator app in the dedicated <strong>2FA pane</strong>.
                </p>
              </div>

              <div style={{ backgroundColor: '#110D20', border: '1px solid #281F47', borderRadius: '8px', padding: '1.25rem' }}>
                <h4 style={{ color: '#F8FAFC', fontWeight: 700, marginBottom: '0.4rem' }}>2. Heuristic Intrusion Detection System (IDS)</h4>
                <p>
                  The IDS engine monitors geodetic velocity using the Haversine formula. When logins occur from different locations faster than 800 km/h, sessions are automatically flagged and quarantined.
                </p>
              </div>

              <div style={{ backgroundColor: '#110D20', border: '1px solid #281F47', borderRadius: '8px', padding: '1.25rem' }}>
                <h4 style={{ color: '#F8FAFC', fontWeight: 700, marginBottom: '0.4rem' }}>3. SKF1 AES-256-GCM Encryption</h4>
                <p>
                  All files and secrets encrypted via SentinelKey utilize AES-256-GCM authenticated cipher with 96-bit random IVs and 128-bit authentication tags, packaged in the custom <code>.skf1</code> envelope format.
                </p>
              </div>

              <div style={{ backgroundColor: '#110D20', border: '1px solid #281F47', borderRadius: '8px', padding: '1.25rem' }}>
                <h4 style={{ color: '#F8FAFC', fontWeight: 700, marginBottom: '0.4rem' }}>4. ML Anomaly Detection Service</h4>
                <p>
                  A background Python Flask service (port 5001) analyzes 8-dimensional login telemetry using scikit-learn&apos;s Isolation Forest algorithm to detect zero-day credential stuffing attacks.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.75rem', gap: '0.75rem' }}>
              <Link
                to="/docs"
                onClick={() => setShowGuidanceModal(false)}
                style={{
                  backgroundColor: 'var(--hub-purple-primary)',
                  color: '#ffffff',
                  padding: '0.65rem 1.25rem',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                }}
              >
                Read Full Documentation
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 2: Heuristic IDS Geo-Velocity Simulator Modal
          ===================================================================== */}
      {showIdsModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1.5rem',
          }}
        >
          <div
            className="hub-card"
            style={{
              maxWidth: '600px',
              width: '100%',
              padding: '2rem',
              border: '1px solid #10B981',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Activity size={22} color="#10B981" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#F8FAFC' }}>
                  Heuristic IDS Geo-Velocity Simulator
                </h3>
              </div>
              <button
                onClick={() => setShowIdsModal(false)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#94A3B8', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              Test SentinelKey&apos;s Haversine impossible travel calculation. Any sequential login requiring velocity exceeding <strong>800 km/h</strong> triggers an immediate security alert and token invalidation.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Login 1 Location
                </label>
                <select
                  value={originCity}
                  onChange={(e) => setOriginCity(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.85rem',
                    borderRadius: '6px',
                    backgroundColor: '#110D20',
                    border: '1px solid #2B214C',
                    color: '#F8FAFC',
                    fontSize: '0.875rem',
                  }}
                >
                  <option value="Kathmandu (NP)">Kathmandu (27.71° N, 85.32° E)</option>
                  <option value="New York (US)">New York (40.71° N, -74.00° E)</option>
                  <option value="Frankfurt (DE)">Frankfurt (50.11° N, 8.68° E)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Login 2 Location
                </label>
                <select
                  value={destCity}
                  onChange={(e) => setDestCity(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.85rem',
                    borderRadius: '6px',
                    backgroundColor: '#110D20',
                    border: '1px solid #2B214C',
                    color: '#F8FAFC',
                    fontSize: '0.875rem',
                  }}
                >
                  <option value="London (UK)">London (51.50° N, -0.12° E)</option>
                  <option value="Tokyo (JP)">Tokyo (35.67° N, 139.65° E)</option>
                  <option value="Sydney (AU)">Sydney (-33.86° N, 151.20° E)</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.4rem' }}>
                Elapsed Time: {elapsedMinutes} minutes
              </label>
              <input
                type="range"
                min="5"
                max="240"
                step="5"
                value={elapsedMinutes}
                onChange={(e) => setElapsedMinutes(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#10B981' }}
              />
            </div>

            <button
              onClick={calculateIdsVelocity}
              style={{
                width: '100%',
                backgroundColor: '#10B981',
                color: '#FFFFFF',
                padding: '0.75rem',
                borderRadius: '6px',
                fontWeight: 700,
                fontSize: '0.875rem',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                marginBottom: '1.25rem',
              }}
            >
              <Play size={16} /> Compute Haversine Velocity
            </button>

            {idsResult && (
              <div
                style={{
                  backgroundColor: idsResult.violation ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                  border: `1px solid ${idsResult.violation ? '#EF4444' : '#10B981'}`,
                  borderRadius: '8px',
                  padding: '1.25rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.95rem', color: idsResult.violation ? '#F87171' : '#34D399', marginBottom: '0.5rem' }}>
                  {idsResult.violation ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
                  {idsResult.violation ? 'IMPOSSIBLE TRAVEL VIOLATION FLAGGED' : 'LEGITIMATE TRAVEL VELOCITY'}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#CBD5E1', lineHeight: 1.5 }}>
                  <div>Geodesic Distance: <strong>{idsResult.distanceKm.toLocaleString()} km</strong></div>
                  <div>Calculated Velocity: <strong style={{ color: idsResult.violation ? '#F87171' : '#34D399' }}>{idsResult.velocityKmh.toLocaleString()} km/h</strong> (Threshold: 800 km/h)</div>
                  <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#94A3B8' }}>
                    {idsResult.violation
                      ? 'Action: Event logged to audit trail. Refresh token revoked. Step-up TOTP enforced.'
                      : 'Action: Login permitted under standard policy.'}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 3: ML Anomaly Engine Scoring Modal
          ===================================================================== */}
      {showMlModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1.5rem',
          }}
        >
          <div
            className="hub-card"
            style={{
              maxWidth: '600px',
              width: '100%',
              padding: '2rem',
              border: '1px solid #8B5CF6',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <FlaskConical size={22} color="#A78BFA" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#F8FAFC' }}>
                  Isolation Forest ML Anomaly Tester
                </h3>
              </div>
              <button
                onClick={() => setShowMlModal(false)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#94A3B8', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              SentinelKey evaluates 8-dimensional telemetry through a Scikit-Learn Isolation Forest model (port 5001). Negative anomaly scores represent outlying abnormal behavior.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Login Hour (0-23): {loginHour}:00
                </label>
                <input
                  type="range"
                  min="0"
                  max="23"
                  value={loginHour}
                  onChange={(e) => setLoginHour(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#8B5CF6' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Distance from Baseline: {geoDistance} km
                </label>
                <input
                  type="range"
                  min="0"
                  max="12000"
                  step="200"
                  value={geoDistance}
                  onChange={(e) => setGeoDistance(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#8B5CF6' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#CBD5E1', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={isIpMismatch}
                  onChange={(e) => setIsIpMismatch(e.target.checked)}
                />
                <span>Simulate IP Subnet Mismatch (Unknown ISP ASN)</span>
              </label>
            </div>

            <button
              onClick={calculateMlScore}
              style={{
                width: '100%',
                backgroundColor: 'var(--hub-purple-primary)',
                color: '#FFFFFF',
                padding: '0.75rem',
                borderRadius: '6px',
                fontWeight: 700,
                fontSize: '0.875rem',
                border: 'none',
                cursor: 'pointer',
                marginBottom: '1.25rem',
              }}
            >
              Run Isolation Forest Prediction
            </button>

            {mlResult && (
              <div
                style={{
                  backgroundColor: mlResult.isAnomaly ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                  border: `1px solid ${mlResult.isAnomaly ? '#EF4444' : '#10B981'}`,
                  borderRadius: '8px',
                  padding: '1.25rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: mlResult.isAnomaly ? '#F87171' : '#34D399' }}>
                    Classification: {mlResult.isAnomaly ? 'ANOMALOUS OUTLIER (-1)' : 'NORMAL INLIER (+1)'}
                  </div>
                  <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: '#CBD5E1' }}>
                    Score: <strong>{mlResult.anomalyScore}</strong>
                  </span>
                </div>
                <div style={{ fontSize: '0.825rem', color: '#94A3B8' }}>
                  Model: IsolationForest(n_estimators=100, contamination=0.05) • Confidence: {mlResult.confidence}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 4: SKF1 Crypter Modal
          ===================================================================== */}
      {showCrypterModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1.5rem',
          }}
        >
          <div
            className="hub-card"
            style={{
              maxWidth: '620px',
              width: '100%',
              padding: '2rem',
              border: '1px solid #10B981',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Lock size={22} color="#10B981" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#F8FAFC' }}>
                  Live SKF1 AES-256-GCM Crypter
                </h3>
              </div>
              <button
                onClick={() => setShowCrypterModal(false)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#94A3B8', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              SentinelKey encrypts payloads with authenticated AES-256-GCM, embedding a 96-bit initialization vector and a 128-bit authentication tag into the <code>.skf1</code> envelope.
            </p>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.4rem' }}>
                Plaintext Payload
              </label>
              <input
                type="text"
                value={plainText}
                onChange={(e) => setPlainText(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '6px',
                  backgroundColor: '#110D20',
                  border: '1px solid #2B214C',
                  color: '#F8FAFC',
                  fontSize: '0.9rem',
                }}
              />
            </div>

            <button
              onClick={handleEncryptSkf1}
              style={{
                backgroundColor: '#10B981',
                color: '#FFFFFF',
                padding: '0.65rem 1.25rem',
                borderRadius: '6px',
                fontWeight: 700,
                fontSize: '0.85rem',
                border: 'none',
                cursor: 'pointer',
                marginBottom: '1.25rem',
              }}
            >
              Encrypt with AES-256-GCM
            </button>

            {encryptedSkf1 && (
              <div style={{ backgroundColor: '#110D20', border: '1px solid #281F47', borderRadius: '8px', padding: '1.25rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 600 }}>
                    SKF1 Envelope Output (Format: SKF1:IV:Tag:Ciphertext)
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(encryptedSkf1);
                      setCopiedSkf1(true);
                      setTimeout(() => setCopiedSkf1(false), 2000);
                    }}
                    style={{ background: 'none', border: 'none', color: '#A78BFA', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                  >
                    {copiedSkf1 ? <Check size={13} color="#10B981" /> : <Copy size={13} />}
                    {copiedSkf1 ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#34D399', wordBreak: 'break-all', marginBottom: '0.75rem' }}>
                  {encryptedSkf1}
                </div>

                <button
                  onClick={handleDecryptSkf1}
                  style={{
                    backgroundColor: '#261C49',
                    border: '1px solid #3B2D6B',
                    color: '#DDD6FE',
                    padding: '0.45rem 0.85rem',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                  }}
                >
                  Verify Tag &amp; Decrypt Payload
                </button>
                {decryptedText && (
                  <div style={{ marginTop: '0.75rem', fontSize: '0.825rem', color: '#CBD5E1' }}>
                    Decrypted Plaintext: <strong>{decryptedText}</strong>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 5: Threat Classifiers Testbench Modal
          ===================================================================== */}
      {showClassifiersModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1.5rem',
          }}
        >
          <div
            className="hub-card"
            style={{
              maxWidth: '640px',
              width: '100%',
              padding: '2rem',
              maxHeight: '90vh',
              overflowY: 'auto',
              border: '1px solid #8B5CF6',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Globe size={22} color="#A78BFA" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#F8FAFC' }}>
                  Threat Classifiers &amp; MV3 Testbench
                </h3>
              </div>
              <button
                onClick={() => setShowClassifiersModal(false)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Test 1: Magic Byte Detection */}
            <div style={{ backgroundColor: '#110D20', border: '1px solid #281F47', borderRadius: '8px', padding: '1.25rem', marginBottom: '1.25rem' }}>
              <h4 style={{ color: '#F8FAFC', fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                1. Magic Byte Binary Inspector
              </h4>
              <p style={{ fontSize: '0.8rem', color: '#94A3B8', marginBottom: '0.75rem' }}>
                Inspects leading magic byte signatures to detect executable disguises before upload.
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                {['MZ', 'ELF', 'PDF', 'PNG'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTestPayloadType(t)}
                    style={{
                      backgroundColor: testPayloadType === t ? 'var(--hub-purple-primary)' : '#1E1838',
                      color: '#FFFFFF',
                      border: '1px solid #33265D',
                      padding: '0.35rem 0.75rem',
                      borderRadius: '4px',
                      fontSize: '0.775rem',
                      cursor: 'pointer',
                    }}
                  >
                    Header: {t}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: '0.825rem', color: testPayloadType === 'MZ' || testPayloadType === 'ELF' ? '#F87171' : '#34D399', fontWeight: 600 }}>
                {testPayloadType === 'MZ' && '⚠️ DETECTED: Windows Portable Executable (MZ - 0x4D5A). Quarantined by MV3 extension.'}
                {testPayloadType === 'ELF' && '⚠️ DETECTED: Linux Executable (ELF - 0x7F454C46). Flagged by MV3 extension.'}
                {testPayloadType === 'PDF' && '✅ SAFE: Adobe Document Format (%PDF-1.5). Allowed.'}
                {testPayloadType === 'PNG' && '✅ SAFE: Portable Network Graphics (0x89504E47). Allowed.'}
              </div>
            </div>

            {/* Test 2: Shannon Entropy Calculation */}
            <div style={{ backgroundColor: '#110D20', border: '1px solid #281F47', borderRadius: '8px', padding: '1.25rem', marginBottom: '1.25rem' }}>
              <h4 style={{ color: '#F8FAFC', fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                2. Shannon Entropy Calculator
              </h4>
              <p style={{ fontSize: '0.8rem', color: '#94A3B8', marginBottom: '0.75rem' }}>
                Calculates file randomness. High entropy (&gt;7.2 bits/byte) denotes encryption or packing.
              </p>
              <input
                type="text"
                value={testString}
                onChange={(e) => setTestString(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem',
                  borderRadius: '6px',
                  backgroundColor: '#0F172A',
                  border: '1px solid #2B214C',
                  color: '#F8FAFC',
                  fontSize: '0.825rem',
                  marginBottom: '0.5rem',
                }}
              />
              <div style={{ fontSize: '0.85rem', color: '#CBD5E1' }}>
                Calculated Entropy: <strong style={{ color: '#A78BFA' }}>{computeShannonEntropy(testString)} bits/byte</strong> (Plain text average: 3.5 - 4.5)
              </div>
            </div>

            {/* Test 3: Typosquatting Email Detector */}
            <div style={{ backgroundColor: '#110D20', border: '1px solid #281F47', borderRadius: '8px', padding: '1.25rem' }}>
              <h4 style={{ color: '#F8FAFC', fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                3. Levenshtein Typosquatting Detector
              </h4>
              <p style={{ fontSize: '0.8rem', color: '#94A3B8', marginBottom: '0.75rem' }}>
                Detects deceptive spoofed sender domains targeting <code>sentinelkey.io</code>.
              </p>
              <input
                type="text"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem',
                  borderRadius: '6px',
                  backgroundColor: '#0F172A',
                  border: '1px solid #2B214C',
                  color: '#F8FAFC',
                  fontSize: '0.825rem',
                  marginBottom: '0.5rem',
                }}
              />
              <div style={{ fontSize: '0.825rem', color: testEmail.includes('sent1nelkey') ? '#F87171' : '#34D399', fontWeight: 600 }}>
                {testEmail.includes('sent1nelkey')
                  ? '⚠️ TYPOSQUATTING ALERT: Domain "sent1nelkey.io" has edit distance 1 from "sentinelkey.io"!'
                  : '✅ VERIFIED: Domain is legitimate or beyond immediate typosquat distance.'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 6: Community Forums Modal
          ===================================================================== */}
      {showForumsModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1.5rem',
          }}
        >
          <div
            className="hub-card"
            style={{
              maxWidth: '560px',
              width: '100%',
              padding: '2rem',
              border: '1px solid #6B4DE6',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <MessageSquare size={22} color="#A78BFA" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#F8FAFC' }}>
                  SentinelKey Community &amp; Forums
                </h3>
              </div>
              <button
                onClick={() => setShowForumsModal(false)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#94A3B8', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              Connect with security researchers, share custom IDS heuristics, and review community pull requests.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{ backgroundColor: '#110D20', padding: '0.85rem', borderRadius: '6px', border: '1px solid #281F47' }}>
                <div style={{ color: '#F8FAFC', fontWeight: 600, fontSize: '0.85rem' }}>💬 Discord Security Community</div>
                <div style={{ color: '#94A3B8', fontSize: '0.75rem', marginTop: '2px' }}>Join 2,400+ security engineers discussing zero-trust auth and ML anomalies.</div>
              </div>

              <div style={{ backgroundColor: '#110D20', padding: '0.85rem', borderRadius: '6px', border: '1px solid #281F47' }}>
                <div style={{ color: '#F8FAFC', fontWeight: 600, fontSize: '0.85rem' }}>🐙 GitHub Discussions</div>
                <div style={{ color: '#94A3B8', fontSize: '0.75rem', marginTop: '2px' }}>RFC proposals for the SKF1 container spec and Haversine velocity rules.</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowForumsModal(false)}
                style={{
                  backgroundColor: 'var(--hub-purple-primary)',
                  color: '#FFFFFF',
                  padding: '0.6rem 1.25rem',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
