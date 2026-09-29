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
  KeyRound,
  ShieldCheck,
  PauseCircle,
  PlayCircle,
  X,
  AlertOctagon,
} from 'lucide-react';
import type { IDomain, ISubscription, DomainEnvironment } from '@sentinelkey/shared-types';
import { api, getErrorMessage } from '../../services/api.js';

interface ClientDomainManagerProps {
  subscription: ISubscription | null;
}

const RESERVED_PORTS = [4000, 5001, 5173, 5174];
const ALLOWED_HOSTS = ['localhost', '127.0.0.1', '[::1]'];

export const ClientDomainManager: React.FC<ClientDomainManagerProps> = ({ subscription }) => {
  const [domains, setDomains] = useState<IDomain[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form state
  const [label, setLabel] = useState('');
  const [host, setHost] = useState('localhost');
  const [port, setPort] = useState<number>(3000);
  const [environment, setEnvironment] = useState<DomainEnvironment>('development');

  // One-time Key Reveal Modal State
  const [revealedKeyInfo, setRevealedKeyInfo] = useState<{
    siteKey: string;
    label: string;
    origin: string;
    isRotation?: boolean;
  } | null>(null);
  const [copiedKeyText, setCopiedKeyText] = useState(false);

  // Card operation states
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
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
  const activeDomainsCount = domains.filter((d) => d.status !== 'deleted').length;
  const isLimitReached = activeDomainsCount >= maxAllowed;

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
    const cleanLabel = label.trim();
    if (!cleanLabel) {
      setErrorMsg('Please enter an application label.');
      return;
    }

    if (RESERVED_PORTS.includes(Number(port))) {
      setErrorMsg(`Port ${port} is reserved for internal SentinelKey services (4000 API, 5001 ML, 5173 SOC, 5174 Website).`);
      return;
    }

    if (port < 1 || port > 65535) {
      setErrorMsg('Port must be an integer between 1 and 65535.');
      return;
    }

    setIsRegistering(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await api.registerDomain({
        label: cleanLabel,
        host: host.trim(),
        port: Number(port),
        environment,
      });

      setDomains((prev) => [res.domain, ...prev.filter((d) => d._id !== res.domain._id)]);
      setShowRegisterModal(false);
      setLabel('');
      setPort(3000);

      // Open one-time plain key reveal modal
      setRevealedKeyInfo({
        siteKey: res.siteKey,
        label: res.domain.label || cleanLabel,
        origin: res.domain.origin || `${host}:${port}`,
        isRotation: false,
      });
    } catch (err) {
      setErrorMsg(getErrorMessage(err, 'Failed to register domain.'));
    } finally {
      setIsRegistering(false);
    }
  };

  const handleRotateKey = async (domain: IDomain) => {
    if (
      !confirm(
        `Are you sure you want to rotate the site key for "${domain.label || domain.origin}"?\n\nThe previous key will immediately be invalidated and API calls using it will fail.`,
      )
    ) {
      return;
    }

    setActionLoadingId(domain._id);
    setErrorMsg(null);
    try {
      const res = await api.rotateDomainKey(domain._id);
      setDomains((prev) => prev.map((d) => (d._id === domain._id ? res.domain : d)));

      // Open one-time reveal modal with the newly minted key
      setRevealedKeyInfo({
        siteKey: res.siteKey,
        label: res.domain.label || domain.label,
        origin: res.domain.origin || domain.origin,
        isRotation: true,
      });
    } catch (err) {
      setErrorMsg(getErrorMessage(err, 'Failed to rotate site key.'));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleSuspend = async (domain: IDomain) => {
    const isSuspended = domain.status === 'suspended';
    const actionName = isSuspended ? 'reactivate' : 'suspend';

    setActionLoadingId(domain._id);
    setErrorMsg(null);
    try {
      const updated = isSuspended
        ? await api.reactivateDomain(domain._id)
        : await api.suspendDomain(domain._id);

      setDomains((prev) => prev.map((d) => (d._id === domain._id ? updated : d)));
      setSuccessMsg(
        isSuspended
          ? `Domain "${domain.label || domain.origin}" reactivated successfully!`
          : `Domain "${domain.label || domain.origin}" has been suspended. Incoming site-key traffic will receive HTTP 403.`,
      );
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setErrorMsg(getErrorMessage(err, `Failed to ${actionName} domain.`));
      setTimeout(() => setErrorMsg(null), 5000);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleProbe = async (domain: IDomain) => {
    setProbingId(domain._id);
    try {
      const probeRes = await api.probeDomain(domain._id);
      setSuccessMsg(`Probe result for ${domain.origin}: ${probeRes.message}`);
      setTimeout(() => setSuccessMsg(null), 4000);
      await loadDomains();
    } catch (err) {
      setErrorMsg(getErrorMessage(err, 'Failed to ping domain host.'));
      setTimeout(() => setErrorMsg(null), 4000);
    } finally {
      setProbingId(null);
    }
  };

  const handleSimulate = async (domain: IDomain, isThreat: boolean) => {
    setSimulatingId(domain._id);
    try {
      await api.simulateDomainTraffic(domain._id, isThreat);
      setSuccessMsg(
        isThreat
          ? `⚠️ Attack simulated against ${domain.origin}! Live threat telemetry dispatched to SOC Console.`
          : `✅ Clean telemetry ping dispatched from ${domain.origin} to SOC Console!`,
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
    if (!confirm(`Are you sure you want to delete "${domainName}"?\nHistorical usage records and invoices will be preserved.`)) {
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

  const copyKeyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKeyText(true);
    setTimeout(() => setCopiedKeyText(false), 2500);
  };

  const quickPorts = [
    { label: ':3000 (React / Next.js)', port: 3000 },
    { label: ':5175 (Client App)', port: 5175 },
    { label: ':8080 (Java / Spring)', port: 8080 },
    { label: ':8000 (FastAPI / Django)', port: 8000 },
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
              {activeDomainsCount} / {maxAllowed} {planId.toUpperCase()} Quota
            </span>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#94A3B8', margin: 0, maxWidth: '720px' }}>
            Register your client web application or localhost service (e.g.{' '}
            <code style={{ color: '#A78BFA' }}>localhost:3000</code>) to generate cryptographically hashed site keys and establish a live security &amp; metering bridge.
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
          {errorMsg.includes('limit') && (
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
            SentinelKey protects target web applications. Register your localhost origin (e.g.{' '}
            <code style={{ color: '#A78BFA' }}>localhost:3000</code>) to generate client site keys and establish a live telemetry &amp; metering bridge.
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
          const isSdkOpen = expandedSdkDomainId === domain._id;
          const isActionLoading = actionLoadingId === domain._id;
          const isProbing = probingId === domain._id;
          const isSimulating = simulatingId === domain._id;

          const isActive = domain.status === 'active';
          const isSuspended = domain.status === 'suspended';

          const originUrl = `http://${domain.origin || `${domain.host}:${domain.port}`}`;

          return (
            <div
              key={domain._id}
              className="hub-card"
              style={{
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                border: isActive
                  ? '1px solid rgba(16, 185, 129, 0.35)'
                  : isSuspended
                  ? '1px solid rgba(239, 68, 68, 0.35)'
                  : '1px solid rgba(245, 158, 11, 0.35)',
              }}
            >
              <div>
                {/* Top Row: Name + Environment + Status Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#F8FAFC', margin: '0 0 0.25rem 0' }}>
                      {domain.label || domain.name || 'Untitled Application'}
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
                        {domain.environment || 'development'}
                      </span>
                      <a
                        href={originUrl}
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
                        {domain.origin || `${domain.host}:${domain.port}`}
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
                      backgroundColor: isActive
                        ? 'rgba(16, 185, 129, 0.15)'
                        : isSuspended
                        ? 'rgba(239, 68, 68, 0.15)'
                        : 'rgba(245, 158, 11, 0.15)',
                      color: isActive ? '#34D399' : isSuspended ? '#F87171' : '#FBBF24',
                    }}
                  >
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: isActive ? '#10B981' : isSuspended ? '#EF4444' : '#F59E0B',
                        boxShadow: isActive ? '0 0 6px #10B981' : isSuspended ? '0 0 6px #EF4444' : 'none',
                      }}
                    />
                    <span>
                      {isActive
                        ? 'ACTIVE'
                        : isSuspended
                        ? `SUSPENDED${domain.suspensionReason ? ` (${domain.suspensionReason.toUpperCase()})` : ''}`
                        : 'PENDING'}
                    </span>
                  </div>
                </div>

                {/* Suspension Alert if applicable */}
                {isSuspended && (
                  <div
                    style={{
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: '6px',
                      padding: '0.5rem 0.75rem',
                      marginBottom: '1rem',
                      fontSize: '0.775rem',
                      color: '#FCA5A5',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                    }}
                  >
                    <AlertOctagon size={14} color="#F87171" />
                    <span>
                      Domain suspended ({domain.suspensionReason || 'manual'}). Calls using its site key return HTTP 402/403.
                    </span>
                  </div>
                )}

                {/* Site Key Box */}
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
                    <span>Site Key (SHA-256 Hashed)</span>
                    <button
                      onClick={() => handleRotateKey(domain)}
                      disabled={isActionLoading}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#A78BFA',
                        fontSize: '0.75rem',
                        cursor: isActionLoading ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                      }}
                    >
                      <KeyRound size={12} />
                      Rotate Key
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
                      {domain.siteKeyPrefix ? `${domain.siteKeyPrefix}••••••••••••••••••••••••` : 'sk_live_••••••••••••••••••••••••'}
                    </code>
                    <span style={{ fontSize: '0.7rem', color: '#64748B', fontFamily: 'var(--font-mono)' }}>
                      SECURED
                    </span>
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
                      // Install: pnpm add @sentinelkey/security-stack-sdk
                    </div>
                    <div><span style={{ color: '#C084FC' }}>import</span> &#123; createSentinelKeyClient &#125; <span style={{ color: '#C084FC' }}>from</span> <span style={{ color: '#34D399' }}>&apos;@sentinelkey/security-stack-sdk&apos;</span>;</div>
                    <br />
                    <div><span style={{ color: '#60A5FA' }}>const</span> sentinel = <span style={{ color: '#FCD34D' }}>createSentinelKeyClient</span>(&#123;</div>
                    <div style={{ paddingLeft: '1rem' }}>baseUrl: <span style={{ color: '#34D399' }}>&apos;http://localhost:4000&apos;</span>,</div>
                    <div style={{ paddingLeft: '1rem' }}>siteKey: <span style={{ color: '#FCD34D' }}>process.env.SENTINELKEY_SITE_KEY</span>,</div>
                    <div style={{ paddingLeft: '1rem' }}>origin: <span style={{ color: '#34D399' }}>&apos;{domain.origin || `${domain.host}:${domain.port}`}&apos;</span>,</div>
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
                    onClick={() => handleToggleSuspend(domain)}
                    disabled={isActionLoading}
                    style={{
                      background: isSuspended ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.1)',
                      border: `1px solid ${isSuspended ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                      color: isSuspended ? '#34D399' : '#FCA5A5',
                      borderRadius: '6px',
                      padding: '0.4rem 0.65rem',
                      fontSize: '0.75rem',
                      cursor: isActionLoading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                    title={isSuspended ? 'Reactivate domain traffic' : 'Suspend domain traffic'}
                  >
                    {isSuspended ? <PlayCircle size={12} /> : <PauseCircle size={12} />}
                    {isSuspended ? 'Reactivate' : 'Suspend'}
                  </button>

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
                    Traffic
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
                    Attack
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
                    SDK
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
                    SOC
                  </a>

                  <button
                    onClick={() => handleDelete(domain._id, domain.label || domain.origin)}
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

      {/* One-Time Site Key Reveal Modal */}
      {revealedKeyInfo && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 110,
            padding: '1rem',
          }}
        >
          <div
            style={{
              backgroundColor: '#1E293B',
              border: '1px solid #8B5CF6',
              borderRadius: '16px',
              padding: '2.25rem',
              maxWidth: '560px',
              width: '100%',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(139, 92, 246, 0.25)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(16, 185, 129, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <KeyRound size={22} color="#34D399" />
              </div>
              <div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#F8FAFC', margin: 0 }}>
                  {revealedKeyInfo.isRotation ? 'Site Key Rotated' : 'Site Key Generated'}
                </h3>
                <span style={{ fontSize: '0.85rem', color: '#CBD5E1' }}>
                  {revealedKeyInfo.label} (<code style={{ color: '#A78BFA' }}>{revealedKeyInfo.origin}</code>)
                </span>
              </div>
            </div>

            {/* Warning Alert */}
            <div
              style={{
                backgroundColor: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                borderRadius: '8px',
                padding: '0.85rem 1rem',
                marginBottom: '1.5rem',
                fontSize: '0.825rem',
                color: '#FDE68A',
                lineHeight: 1.5,
              }}
            >
              <strong>Important Security Notice:</strong> This high-entropy site key is shown <strong>only once</strong>. For security, SentinelKey stores only its cryptographic SHA-256 hash. You will not be able to view this key again after closing this window.
            </div>

            {/* Site Key Copy Box */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#94A3B8', marginBottom: '0.4rem' }}>
                Your Plaintext Site Key
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  backgroundColor: '#0B0F19',
                  border: '1px solid rgba(139, 92, 246, 0.4)',
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                }}
              >
                <code
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.875rem',
                    color: '#34D399',
                    flex: 1,
                    wordBreak: 'break-all',
                    letterSpacing: '0.02em',
                  }}
                >
                  {revealedKeyInfo.siteKey}
                </code>
                <button
                  onClick={() => copyKeyToClipboard(revealedKeyInfo.siteKey)}
                  style={{
                    backgroundColor: copiedKeyText ? '#10B981' : '#8B5CF6',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.55rem 0.85rem',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {copiedKeyText ? <Check size={14} /> : <Copy size={14} />}
                  {copiedKeyText ? 'Copied!' : 'Copy Key'}
                </button>
              </div>
            </div>

            {/* Quick integration snippet */}
            <div
              style={{
                backgroundColor: '#0F172A',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '0.85rem 1rem',
                marginBottom: '1.75rem',
                fontSize: '0.75rem',
                color: '#94A3B8',
                fontFamily: 'var(--font-mono)',
              }}
            >
              <div style={{ color: '#64748B', marginBottom: '0.25rem' }}>// Environment file (.env):</div>
              <div style={{ color: '#E2E8F0' }}>SENTINELKEY_SITE_KEY=&quot;{revealedKeyInfo.siteKey}&quot;</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setRevealedKeyInfo(null)}
                style={{
                  backgroundColor: '#8B5CF6',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.7rem 1.75rem',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(139, 92, 246, 0.4)',
                }}
              >
                I Have Saved This Key Securely
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Structured Register Modal */}
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
                    Register Application Domain
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
                    Connect your target service origin to SentinelKey
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
                  padding: '4px',
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRegister}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#CBD5E1', marginBottom: '0.4rem' }}>
                  Application Label / Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Local React Storefront, API Gateway"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
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

              {/* Host and Port Split */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#CBD5E1', marginBottom: '0.4rem' }}>
                    Host Origin
                  </label>
                  <select
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
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
                    {ALLOWED_HOSTS.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#CBD5E1', marginBottom: '0.4rem' }}>
                    Port (1–65535)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={65535}
                    value={port}
                    onChange={(e) => setPort(Number(e.target.value))}
                    required
                    style={{
                      width: '100%',
                      backgroundColor: '#0F172A',
                      border: RESERVED_PORTS.includes(port) ? '1px solid #EF4444' : '1px solid #334155',
                      borderRadius: '8px',
                      padding: '0.65rem 0.9rem',
                      color: '#FFFFFF',
                      fontSize: '0.875rem',
                      fontFamily: 'var(--font-mono)',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Reserved port alert */}
              {RESERVED_PORTS.includes(port) && (
                <div style={{ fontSize: '0.75rem', color: '#F87171', marginBottom: '1rem' }}>
                  ⚠️ Port {port} is reserved by SentinelKey internal services and cannot be used.
                </div>
              )}

              {/* Quick Presets */}
              <div style={{ marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#94A3B8', display: 'block', marginBottom: '0.4rem' }}>
                  Quick Port Presets:
                </span>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {quickPorts.map((preset) => (
                    <button
                      key={preset.port}
                      type="button"
                      onClick={() => setPort(preset.port)}
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: port === preset.port ? '#A78BFA' : '#94A3B8',
                        borderColor: port === preset.port ? '#8B5CF6' : 'rgba(255, 255, 255, 0.1)',
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
                  onChange={(e) => setEnvironment(e.target.value as DomainEnvironment)}
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
                  disabled={isRegistering || RESERVED_PORTS.includes(port)}
                  style={{
                    background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.65rem 1.35rem',
                    color: '#FFFFFF',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: isRegistering || RESERVED_PORTS.includes(port) ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  {isRegistering ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      Registering Domain...
                    </>
                  ) : (
                    'Register & Reveal Key'
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
