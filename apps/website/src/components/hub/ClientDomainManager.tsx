import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Globe,
  Plus,
  Radio,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  ExternalLink,
  Trash2,
  RefreshCw,
  Zap,
  Code2,
  Eye,
  EyeOff,
  ShieldCheck,
} from 'lucide-react';
import type { IClientDomain, ISubscription } from '@sentinelkey/shared-types';
import { api, getErrorMessage } from '../../services/api.js';

interface ClientDomainManagerProps {
  subscription: ISubscription | null;
}

export const ClientDomainManager: React.FC<ClientDomainManagerProps> = ({ subscription }) => {
  const [domains, setDomains] = useState<IClientDomain[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [domainUrl, setDomainUrl] = useState('http://localhost:3000');
  const [environment, setEnvironment] = useState<'development' | 'staging' | 'production'>('development');

  // Key visibility & copy state
  const [revealedKeys, setRevealedKeys] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [probingId, setProbingId] = useState<string | null>(null);
  const [simulatingId, setSimulatingId] = useState<string | null>(null);
  const [expandedSdkDomainId, setExpandedSdkDomainId] = useState<string | null>(null);

  const planId = subscription?.planId || 'free';
  const planLimits: Record<string, number> = {
    free: 1,
    pro: 5,
    enterprise: 50,
  };
  const maxAllowed = planLimits[planId] || 1;
  const isLimitReached = domains.length >= maxAllowed;

  const loadDomains = async () => {
    setIsLoading(true);
    try {
      const data = await api.listDomains();
      setDomains(data || []);
    } catch (err) {
      console.error('Failed to load registered domains:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDomains();
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !domainUrl.trim()) {
      setErrorMsg('Please enter both application name and domain/port URL.');
      return;
    }

    setIsRegistering(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const newDomain = await api.registerDomain({
        name: name.trim(),
        domainUrl: domainUrl.trim(),
        environment,
      });

      setDomains((prev) => [newDomain, ...prev]);
      setShowRegisterModal(false);
      setName('');
      setDomainUrl('http://localhost:3000');
      setSuccessMsg(`"${newDomain.name}" (${newDomain.domainUrl}) registered and hooked to SentinelKey!`);
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err) {
      setErrorMsg(getErrorMessage(err, 'Failed to register domain.'));
    } finally {
      setIsRegistering(false);
    }
  };

  const handleProbe = async (domain: IClientDomain) => {
    setProbingId(domain._id);
    try {
      const probeRes = await api.probeDomain(domain._id);
      setSuccessMsg(`Probe result for ${domain.domainUrl}: ${probeRes.message}`);
      setTimeout(() => setSuccessMsg(null), 4000);
      await loadDomains();
    } catch (err) {
      setErrorMsg(getErrorMessage(err, 'Failed to ping domain.'));
      setTimeout(() => setErrorMsg(null), 4000);
    } finally {
      setProbingId(null);
    }
  };

  const handleSimulate = async (domain: IClientDomain, isThreat: boolean) => {
    setSimulatingId(domain._id);
    try {
      await api.simulateDomainTraffic(domain._id, isThreat);
      setSuccessMsg(
        isThreat
          ? `⚠️ Attack simulated against ${domain.domainUrl}! Live threat telemetry dispatched to SOC Dashboard.`
          : `✅ Clean telemetry ping dispatched from ${domain.domainUrl} to SOC Dashboard!`,
      );
      setTimeout(() => setSuccessMsg(null), 4000);
      await loadDomains();
    } catch (err) {
      setErrorMsg(getErrorMessage(err, 'Failed to simulate telemetry.'));
      setTimeout(() => setErrorMsg(null), 4000);
    } finally {
      setSimulatingId(null);
    }
  };

  const handleDelete = async (domainId: string, domainName: string) => {
    if (!confirm(`Are you sure you want to delete and revoke monitoring for "${domainName}"?`)) {
      return;
    }

    try {
      await api.deleteDomain(domainId);
      setDomains((prev) => prev.filter((d) => d._id !== domainId));
      setSuccessMsg(`Domain "${domainName}" deleted.`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setErrorMsg(getErrorMessage(err, 'Failed to delete domain.'));
      setTimeout(() => setErrorMsg(null), 4000);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const toggleKeyReveal = (id: string) => {
    setRevealedKeys((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const quickPorts = [
    { label: ':3000 (React / Next.js)', url: 'http://localhost:3000' },
    { label: ':5173 (Vite Client)', url: 'http://localhost:5173' },
    { label: ':8080 (Java / API)', url: 'http://localhost:8080' },
    { label: ':8000 (FastAPI / Django)', url: 'http://localhost:8000' },
  ];

  return (
    <section style={{ marginBottom: '3.5rem' }}>
      {/* Header bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.25rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#F8FAFC', margin: 0 }}>
              Protected Client Applications &amp; Domains
            </h3>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                padding: '0.2rem 0.65rem',
                borderRadius: '12px',
                backgroundColor: isLimitReached ? 'rgba(239, 68, 68, 0.2)' : 'rgba(139, 92, 246, 0.2)',
                color: isLimitReached ? '#FCA5A5' : '#C4B5FD',
                border: `1px solid ${isLimitReached ? 'rgba(239, 68, 68, 0.4)' : 'rgba(139, 92, 246, 0.4)'}`,
              }}
            >
              {domains.length} / {maxAllowed} {planId.toUpperCase()} Quota
            </span>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#94A3B8', margin: 0, maxWidth: '720px' }}>
            Register your client website or localhost port (e.g.{' '}
            <code style={{ color: '#A78BFA' }}>http://localhost:3000</code>). Hook up live telemetry so the SOC
            Dashboard displays genuine real-time traffic instead of dummy fallbacks.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            onClick={loadDomains}
            disabled={isLoading}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '0.55rem 0.85rem',
              color: '#CBD5E1',
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
            title="Refresh domains"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>

          <button
            onClick={() => setShowRegisterModal(true)}
            disabled={isLimitReached}
            style={{
              background: isLimitReached ? '#334155' : 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
              color: isLimitReached ? '#94A3B8' : '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              padding: '0.6rem 1.15rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: isLimitReached ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: isLimitReached ? 'none' : '0 4px 14px rgba(139, 92, 246, 0.35)',
            }}
          >
            <Plus size={16} />
            Register Application Domain
          </button>
        </div>
      </div>

      {/* Alert Banners */}
      {successMsg && (
        <div
          style={{
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            color: '#6EE7B7',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            marginBottom: '1.25rem',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            color: '#FCA5A5',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            marginBottom: '1.25rem',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={16} />
            <span>{errorMsg}</span>
          </div>
          {errorMsg.includes('limit reached') && (
            <Link
              to="/app/billing"
              style={{
                color: '#FFFFFF',
                fontWeight: 600,
                textDecoration: 'underline',
                fontSize: '0.85rem',
              }}
            >
              Upgrade in Billing →
            </Link>
          )}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && domains.length === 0 && (
        <div
          className="hub-card"
          style={{
            padding: '2.5rem',
            textAlign: 'center',
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            border: '1px dashed rgba(139, 92, 246, 0.3)',
            borderRadius: '12px',
          }}
        >
          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              backgroundColor: 'rgba(139, 92, 246, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
            }}
          >
            <Radio size={28} color="#A78BFA" />
          </div>
          <h4 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '0.5rem' }}>
            No Client Domains Registered Yet
          </h4>
          <p style={{ color: '#94A3B8', fontSize: '0.875rem', maxWidth: '580px', margin: '0 auto 1.5rem', lineHeight: 1.5 }}>
            SentinelKey protects target web applications. Register your localhost port (e.g.{' '}
            <code style={{ color: '#A78BFA' }}>http://localhost:3000</code>) to generate client API keys and establish
            a live telemetry bridge to the SOC Console.
          </p>
          <button
            onClick={() => setShowRegisterModal(true)}
            style={{
              backgroundColor: '#8B5CF6',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              padding: '0.65rem 1.4rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 14px rgba(139, 92, 246, 0.35)',
            }}
          >
            <Plus size={16} />
            Register Localhost Application Now
          </button>
        </div>
      )}

      {/* Domains Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1.25rem' }}>
        {domains.map((domain) => {
          const isRevealed = revealedKeys[domain._id];
          const isCopied = copiedKey === domain._id;
          const isProbing = probingId === domain._id;
          const isSimulating = simulatingId === domain._id;
          const isSdkOpen = expandedSdkDomainId === domain._id;

          const isHealthy = domain.healthStatus === 'healthy';
          const isOffline = domain.healthStatus === 'offline';

          return (
            <div
              key={domain._id}
              className="hub-card"
              style={{
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                border: isHealthy
                  ? '1px solid rgba(16, 185, 129, 0.35)'
                  : isOffline
                  ? '1px solid rgba(239, 68, 68, 0.35)'
                  : '1px solid rgba(139, 92, 246, 0.25)',
              }}
            >
              <div>
                {/* Top Row: Name + Environment + Health Pill */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#F8FAFC', margin: '0 0 0.25rem 0' }}>
                      {domain.name}
                    </h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px',
                          backgroundColor:
                            domain.environment === 'production'
                              ? 'rgba(239, 68, 68, 0.2)'
                              : domain.environment === 'staging'
                              ? 'rgba(245, 158, 11, 0.2)'
                              : 'rgba(59, 130, 246, 0.2)',
                          color:
                            domain.environment === 'production'
                              ? '#FCA5A5'
                              : domain.environment === 'staging'
                              ? '#FCD34D'
                              : '#93C5FD',
                        }}
                      >
                        {domain.environment}
                      </span>
                      <a
                        href={domain.domainUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          fontSize: '0.85rem',
                          color: '#A78BFA',
                          fontFamily: 'var(--font-mono)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          textDecoration: 'none',
                        }}
                      >
                        {domain.domainUrl}
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.25rem 0.65rem',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      backgroundColor: isHealthy
                        ? 'rgba(16, 185, 129, 0.15)'
                        : isOffline
                        ? 'rgba(239, 68, 68, 0.15)'
                        : 'rgba(245, 158, 11, 0.15)',
                      color: isHealthy ? '#34D399' : isOffline ? '#F87171' : '#FBBF24',
                    }}
                  >
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: isHealthy ? '#10B981' : isOffline ? '#EF4444' : '#F59E0B',
                        boxShadow: isHealthy ? '0 0 6px #10B981' : isOffline ? '0 0 6px #EF4444' : 'none',
                      }}
                    />
                    <span>{(domain.healthStatus ?? 'unverified').toUpperCase()}</span>
                  </div>
                </div>

                {/* Metrics ribbon */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '0.75rem',
                    backgroundColor: 'rgba(15, 23, 42, 0.5)',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    margin: '1rem 0',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                      Requests Ingested
                    </div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#F8FAFC' }}>
                      {domain.stats?.requestsTotal || 0}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                      Threats Blocked
                    </div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#F43F5E' }}>
                      {domain.stats?.threatsBlocked || 0}
                    </div>
                  </div>
                </div>

                {/* API Key Box */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '0.35rem',
                      fontSize: '0.75rem',
                      color: '#94A3B8',
                    }}
                  >
                    <span>Client API Key</span>
                    <button
                      onClick={() => toggleKeyReveal(domain._id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#A78BFA',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                      }}
                    >
                      {isRevealed ? <EyeOff size={12} /> : <Eye size={12} />}
                      {isRevealed ? 'Hide' : 'Reveal'}
                    </button>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      backgroundColor: '#0B0F19',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '6px',
                      padding: '0.45rem 0.75rem',
                    }}
                  >
                    <code
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.8rem',
                        color: '#E2E8F0',
                        flex: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {isRevealed && domain.apiKey
                        ? domain.apiKey
                        : domain.siteKeyPrefix || (domain.apiKey ? `${domain.apiKey.substring(0, 12)}••••••••••••••••••••••••` : 'sk_live_••••••••••••••••••••••••')}
                    </code>
                    <button
                      onClick={() => domain.apiKey && copyToClipboard(domain.apiKey, domain._id)}
                      disabled={!domain.apiKey}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: isCopied ? '#10B981' : domain.apiKey ? '#94A3B8' : '#475569',
                        cursor: domain.apiKey ? 'pointer' : 'default',
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      title={domain.apiKey ? 'Copy API key' : 'Site key hidden after generation'}
                    >
                      {isCopied ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>

                {/* Collapsible SDK Snippet */}
                {isSdkOpen && (
                  <div
                    style={{
                      backgroundColor: '#0B0F19',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      borderRadius: '8px',
                      padding: '0.85rem',
                      marginBottom: '1rem',
                      fontSize: '0.775rem',
                      fontFamily: 'var(--font-mono)',
                      color: '#E2E8F0',
                      lineHeight: 1.45,
                    }}
                  >
                    <div style={{ color: '#64748B', marginBottom: '0.4rem' }}>
                      // Install: npm install @sentinelkey/security-stack-sdk
                    </div>
                    <div><span style={{ color: '#C084FC' }}>import</span> &#123; createSentinelKeyClient &#125; <span style={{ color: '#C084FC' }}>from</span> <span style={{ color: '#34D399' }}>&apos;@sentinelkey/security-stack-sdk&apos;</span>;</div>
                    <br />
                    <div><span style={{ color: '#60A5FA' }}>const</span> sentinel = <span style={{ color: '#FCD34D' }}>createSentinelKeyClient</span>(&#123;</div>
                    <div style={{ paddingLeft: '1rem' }}>baseUrl: <span style={{ color: '#34D399' }}>&apos;http://localhost:4000&apos;</span>,</div>
                    <div style={{ paddingLeft: '1rem' }}>apiKey: <span style={{ color: '#34D399' }}>&apos;{domain.apiKey || domain.siteKeyPrefix || 'YOUR_SITE_KEY'}&apos;</span>,</div>
                    <div style={{ paddingLeft: '1rem' }}>domainUrl: <span style={{ color: '#34D399' }}>&apos;{domain.domainUrl}&apos;</span>,</div>
                    <div>&#125;);</div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '1rem',
                  borderTop: '1px solid rgba(255, 255, 255, 0.07)',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                }}
              >
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => handleProbe(domain)}
                    disabled={isProbing}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#CBD5E1',
                      borderRadius: '6px',
                      padding: '0.4rem 0.65rem',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                    title="Ping domain reachability"
                  >
                    <RefreshCw size={12} className={isProbing ? 'animate-spin' : ''} />
                    {isProbing ? 'Pinging...' : 'Ping Host'}
                  </button>

                  <button
                    onClick={() => handleSimulate(domain, false)}
                    disabled={isSimulating}
                    style={{
                      background: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      color: '#34D399',
                      borderRadius: '6px',
                      padding: '0.4rem 0.65rem',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                    title="Simulate normal web traffic"
                  >
                    <Zap size={12} />
                    Send Traffic
                  </button>

                  <button
                    onClick={() => handleSimulate(domain, true)}
                    disabled={isSimulating}
                    style={{
                      background: 'rgba(244, 63, 94, 0.1)',
                      border: '1px solid rgba(244, 63, 94, 0.3)',
                      color: '#FDA4AF',
                      borderRadius: '6px',
                      padding: '0.4rem 0.65rem',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                    title="Simulate intrusion attack to test IDS detection"
                  >
                    <AlertTriangle size={12} />
                    Simulate Attack
                  </button>

                  <button
                    onClick={() => setExpandedSdkDomainId(isSdkOpen ? null : domain._id)}
                    style={{
                      background: 'rgba(139, 92, 246, 0.1)',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      color: '#C4B5FD',
                      borderRadius: '6px',
                      padding: '0.4rem 0.65rem',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    <Code2 size={12} />
                    SDK Code
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <a
                    href="http://localhost:5173"
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      backgroundColor: '#6D28D9',
                      color: '#FFFFFF',
                      borderRadius: '6px',
                      padding: '0.4rem 0.75rem',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      textDecoration: 'none',
                    }}
                  >
                    <ShieldCheck size={13} />
                    View in SOC
                  </a>

                  <button
                    onClick={() => handleDelete(domain._id, domain.name)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#94A3B8',
                      cursor: 'pointer',
                      padding: '0.4rem',
                      borderRadius: '4px',
                    }}
                    title="Delete domain"
                  >
                    <Trash2 size={14} color="#EF4444" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Register Modal */}
      {showRegisterModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1rem',
          }}
        >
          <div
            style={{
              backgroundColor: '#1E293B',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              borderRadius: '14px',
              padding: '2rem',
              maxWidth: '540px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(139, 92, 246, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Globe size={18} color="#A78BFA" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#F8FAFC', margin: 0 }}>
                    Register Application Website / Port
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
                    Connect your target service to SentinelKey
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowRegisterModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  fontSize: '1.25rem',
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRegister}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#CBD5E1', marginBottom: '0.4rem' }}>
                  Application / Service Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Local React Storefront, API Gateway"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    backgroundColor: '#0F172A',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    padding: '0.65rem 0.9rem',
                    color: '#FFFFFF',
                    fontSize: '0.875rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#CBD5E1', marginBottom: '0.4rem' }}>
                  Target Domain or Localhost URL
                </label>
                <input
                  type="text"
                  placeholder="http://localhost:3000 or https://mysite.com"
                  value={domainUrl}
                  onChange={(e) => setDomainUrl(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    backgroundColor: '#0F172A',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    padding: '0.65rem 0.9rem',
                    color: '#FFFFFF',
                    fontSize: '0.875rem',
                    fontFamily: 'var(--font-mono)',
                    boxSizing: 'border-box',
                  }}
                />
                {/* Quick Presets */}
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                  {quickPorts.map((preset) => (
                    <button
                      key={preset.url}
                      type="button"
                      onClick={() => setDomainUrl(preset.url)}
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: domainUrl === preset.url ? '#A78BFA' : '#94A3B8',
                        borderColor: domainUrl === preset.url ? '#8B5CF6' : 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '6px',
                        padding: '0.25rem 0.55rem',
                        fontSize: '0.725rem',
                        cursor: 'pointer',
                      }}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '1.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#CBD5E1', marginBottom: '0.4rem' }}>
                  Environment
                </label>
                <select
                  value={environment}
                  onChange={(e) => setEnvironment(e.target.value as any)}
                  style={{
                    width: '100%',
                    backgroundColor: '#0F172A',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    padding: '0.65rem 0.9rem',
                    color: '#FFFFFF',
                    fontSize: '0.875rem',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="development">Development (Localhost / Sandbox)</option>
                  <option value="staging">Staging (QA / Pre-production)</option>
                  <option value="production">Production (Live Public)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  style={{
                    background: 'none',
                    border: '1px solid #475569',
                    borderRadius: '8px',
                    padding: '0.65rem 1.25rem',
                    color: '#94A3B8',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRegistering}
                  style={{
                    background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.65rem 1.35rem',
                    color: '#FFFFFF',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: isRegistering ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  {isRegistering ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      Registering &amp; Probing...
                    </>
                  ) : (
                    'Register & Connect'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
