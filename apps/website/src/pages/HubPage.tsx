import React, { useState } from 'react';
import {
  ShieldCheck,
  Layers,
  Crosshair,
  KeyRound,
  FlaskConical,
  ShieldAlert,
  GraduationCap,
  BookOpen,
  LifeBuoy,
  MessageSquare,
  ArrowRight,
  ExternalLink,
  X,
} from 'lucide-react';

import { HubHeader } from '../components/hub/HubHeader.js';
import { HubSidebar } from '../components/hub/HubSidebar.js';
import { HardwareStatusDock } from '../components/hub/HardwareStatusDock.js';
import { useAuth } from '../context/AuthContext.js';

export const HubPage: React.FC = () => {
  const { user } = useAuth();
  const [showBanner, setShowBanner] = useState(true);
  const username = user?.email.split('@')[0] || 'alexchen';

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
                  Access and manage your SentinelKey Enclave, Build Shield, Intrusion Detection, and Vault products,
                  and get access to resources for learning, support, and account settings, including billing management.
                </p>

                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <button
                    style={{
                      backgroundColor: '#FFFFFF',
                      color: '#0F172A',
                      padding: '0.65rem 1.35rem',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                      transition: 'background-color 0.15s',
                    }}
                  >
                    Get started with SentinelKey guidance
                  </button>
                  <button
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.12)',
                      color: '#FFFFFF',
                      border: '1px solid rgba(255, 255, 255, 0.25)',
                      padding: '0.65rem 1.35rem',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      transition: 'background-color 0.15s',
                    }}
                  >
                    Learn about Zero-Trust concepts
                  </button>
                </div>
              </div>
            )}

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
                {/* Product Card 1: SentinelKey Desktop */}
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
                        sentinel:desktop
                      </span>
                    </div>

                    <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', color: '#94A3B8', marginBottom: '0.35rem' }}>
                      INNOVATE WITH
                    </div>
                    <h4 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '0.65rem' }}>
                      SentinelKey Desktop
                    </h4>
                    <p style={{ fontSize: '0.85rem', color: '#94A3B8', lineHeight: 1.5, marginBottom: '1.5rem', minHeight: '40px' }}>
                      Your command center for local cryptographic enclave execution and zero-trust container verification.
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginTop: '1rem' }}>
                    <a href="#download" style={{ fontSize: '0.8rem', color: '#94A3B8', fontWeight: 500 }}>
                      Go to download
                    </a>
                    <a
                      href="http://localhost:5173"
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        backgroundColor: 'var(--hub-purple-primary)',
                        color: '#FFFFFF',
                        padding: '0.45rem 1rem',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        transition: 'background-color 0.15s',
                      }}
                    >
                      Launch SentinelKey Desktop
                    </a>
                  </div>
                </div>

                {/* Product Card 2: Build Shield Cloud */}
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
                        <Layers size={16} color="#60A5FA" />
                      </div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#CBD5E1', fontWeight: 600 }}>
                        buildshield
                      </span>
                    </div>

                    <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', color: '#94A3B8', marginBottom: '0.35rem' }}>
                      BUILD WITH
                    </div>
                    <h4 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '0.65rem' }}>
                      Build Shield Cloud
                    </h4>
                    <p style={{ fontSize: '0.85rem', color: '#94A3B8', lineHeight: 1.5, marginBottom: '1.5rem', minHeight: '40px' }}>
                      Accelerate confidential build times with access to remote attestation clusters and shared signature cache.
                    </p>
                  </div>

                  <a
                    href="http://localhost:5173"
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontSize: '0.825rem',
                      fontWeight: 600,
                      color: 'var(--hub-purple-light)',
                    }}
                  >
                    Go to Build Shield <ArrowRight size={14} />
                  </a>
                </div>

                {/* Product Card 3: Sentinel Scout */}
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
                        <Crosshair size={16} color="#10B981" />
                      </div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#10B981', fontWeight: 600 }}>
                        sentinel:scout
                      </span>
                    </div>

                    <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', color: '#94A3B8', marginBottom: '0.35rem' }}>
                      SECURE WITH
                    </div>
                    <h4 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '0.65rem' }}>
                      Sentinel Scout
                    </h4>
                    <p style={{ fontSize: '0.85rem', color: '#94A3B8', lineHeight: 1.5, marginBottom: '1.5rem', minHeight: '40px' }}>
                      Address security issues and kernel-level vulnerabilities before they hit production through actionable supply-chain telemetry.
                    </p>
                  </div>

                  <a
                    href="http://localhost:5173"
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontSize: '0.825rem',
                      fontWeight: 600,
                      color: 'var(--hub-purple-light)',
                    }}
                  >
                    Go to Scout <ArrowRight size={14} />
                  </a>
                </div>

                {/* Product Card 4: Sentinel Hub & Vault */}
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
                        <KeyRound size={16} color="#A78BFA" />
                      </div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#CBD5E1', fontWeight: 600 }}>
                        sentinel:vault
                      </span>
                    </div>

                    <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', color: '#94A3B8', marginBottom: '0.35rem' }}>
                      EXPLORE WITH
                    </div>
                    <h4 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '0.65rem' }}>
                      Sentinel Hub & Vault
                    </h4>
                    <p style={{ fontSize: '0.85rem', color: '#94A3B8', lineHeight: 1.5, marginBottom: '1.5rem', minHeight: '40px' }}>
                      The platform to discover, distribute, store, and cryptographically attest container images and secrets.
                    </p>
                  </div>

                  <a
                    href="http://localhost:5173"
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontSize: '0.825rem',
                      fontWeight: 600,
                      color: 'var(--hub-purple-light)',
                    }}
                  >
                    Go to Hub <ArrowRight size={14} />
                  </a>
                </div>

                {/* Product Card 5: TestEnclaves Cloud */}
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
                        <FlaskConical size={16} color="#10B981" />
                      </div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#10B981', fontWeight: 600 }}>
                        TestEnclaves
                      </span>
                    </div>

                    <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', color: '#94A3B8', marginBottom: '0.35rem' }}>
                      TEST WITH
                    </div>
                    <h4 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '0.65rem' }}>
                      TestEnclaves Cloud
                    </h4>
                    <p style={{ fontSize: '0.85rem', color: '#94A3B8', lineHeight: 1.5, marginBottom: '1.5rem', minHeight: '40px' }}>
                      Scale out your automated zero-trust security integration testing with ephemeral hardware-isolated environments.
                    </p>
                  </div>

                  <a
                    href="http://localhost:5173"
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontSize: '0.825rem',
                      fontWeight: 600,
                      color: 'var(--hub-purple-light)',
                    }}
                  >
                    Go to TestEnclaves Cloud <ArrowRight size={14} />
                  </a>
                </div>

                {/* Product Card 6: Sentinel Hardened Baselines */}
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
                        <ShieldAlert size={16} color="#A78BFA" />
                      </div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#CBD5E1', fontWeight: 600 }}>
                        HardenedBaselines
                      </span>
                    </div>

                    <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', color: '#94A3B8', marginBottom: '0.35rem' }}>
                      SECURE WITH
                    </div>
                    <h4 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '0.65rem' }}>
                      Sentinel Hardened Baselines
                    </h4>
                    <p style={{ fontSize: '0.85rem', color: '#94A3B8', lineHeight: 1.5, marginBottom: '1.5rem', minHeight: '40px' }}>
                      Get near-zero CVEs, up to 92% smaller images, and enterprise-grade FIPS 140-3 SLA for rapid compliance.
                    </p>
                  </div>

                  <a
                    href="http://localhost:5173"
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontSize: '0.825rem',
                      fontWeight: 600,
                      color: 'var(--hub-purple-light)',
                    }}
                  >
                    View Catalog <ArrowRight size={14} />
                  </a>
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
                      Find guided paths for mastering zero-trust container security from beginner to advanced topics.
                    </p>
                  </div>
                  <a href="#learning" style={{ fontSize: '0.825rem', fontWeight: 600, color: '#CBD5E1', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    Start learning <ExternalLink size={13} />
                  </a>
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
                      Discover architecture guides, CLI manuals, and cryptographic reference documentation.
                    </p>
                  </div>
                  <a href="#docs" style={{ fontSize: '0.825rem', fontWeight: 600, color: '#CBD5E1', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    Go to Docs <ExternalLink size={13} />
                  </a>
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
                      Reach out to SentinelKey enterprise cryptographic and cluster support for help.
                    </p>
                  </div>
                  <a href="mailto:support@sentinelkey.io" style={{ fontSize: '0.825rem', fontWeight: 600, color: '#CBD5E1', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    Open a ticket <ExternalLink size={13} />
                  </a>
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
                  <a href="#forums" style={{ fontSize: '0.825rem', fontWeight: 600, color: '#CBD5E1', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    Go to Forums <ExternalLink size={13} />
                  </a>
                </div>
              </div>
            </section>

            {/* 4. Hardware Attestation Daemon Status Dock */}
            <HardwareStatusDock />

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
                <a href="#terms" style={{ color: '#64748B' }}>Terms</a>
                <a href="#agreement" style={{ color: '#64748B' }}>Subscription Agreement</a>
                <a href="#privacy" style={{ color: '#64748B' }}>Privacy</a>
                <a href="#legal" style={{ color: '#64748B' }}>Legal</a>
                <a href="#status" style={{ color: '#10B981', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981' }} />
                  System Status
                </a>
              </div>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
};
