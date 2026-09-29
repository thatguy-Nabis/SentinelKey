import React, { useEffect, useState, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  LineController,
  DoughnutController,
  BarController,
} from 'chart.js';
import {
  ShieldAlert,
  AlertOctagon,
  Activity,
  CheckCircle2,
  RefreshCw,
  Globe,
  Radio,
  ExternalLink,
  Zap,
  AlertTriangle,
  Server,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Shield,
  ArrowRight,
} from 'lucide-react';
import type { ISecurityEvent, IAlert, IClientDomain } from '@sentinelkey/shared-types';
import * as api from '../../services/api';
import { ServiceGuide } from './ServiceGuide';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { BottomSheet } from '../common/BottomSheet';
import { TapToCopy } from '../common/TapToCopy';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  LineController,
  DoughnutController,
  BarController,
);

interface OverviewProps {
  onNavigateTab: (tab: string) => void;
}

export const OverviewView: React.FC<OverviewProps> = ({ onNavigateTab }) => {
  const isMobile = useIsMobile(768);
  const [events, setEvents] = useState<ISecurityEvent[]>([]);
  const [alerts, setAlerts] = useState<IAlert[]>([]);
  const [domains, setDomains] = useState<IClientDomain[]>([]);
  const [selectedDomainId, setSelectedDomainId] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testFeedback, setTestFeedback] = useState<string | null>(null);
  const [isMobileProbeSheetOpen, setIsMobileProbeSheetOpen] = useState(false);
  const [isServiceGuideOpen, setIsServiceGuideOpen] = useState(false);

  const lineChartRef = useRef<HTMLCanvasElement | null>(null);
  const doughnutChartRef = useRef<HTMLCanvasElement | null>(null);
  const barChartRef = useRef<HTMLCanvasElement | null>(null);

  const lineChartInstance = useRef<ChartJS | null>(null);
  const doughnutChartInstance = useRef<ChartJS | null>(null);
  const barChartInstance = useRef<ChartJS | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [logsRes, alertsRes, domainsData] = await Promise.all([
        api.fetchLogs({ limit: 150 }),
        api.fetchAlerts({ limit: 150 }),
        api.fetchDomains().catch(() => [] as IClientDomain[]),
      ]);
      setEvents(logsRes.data || []);
      setAlerts(alertsRes.data || []);
      setDomains(domainsData || []);

      // If user has domains and none selected yet, default to first domain if available
      if (domainsData && domainsData.length > 0 && selectedDomainId === 'all') {
        setSelectedDomainId(domainsData[0]._id);
      }
    } catch (err) {
      console.error('Error loading dashboard telemetry:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      loadData();
    }, 10000); // 10s auto-refresh, paused when tab is hidden
    return () => clearInterval(interval);
  }, []);

  const activeDomain = domains.find((d) => d._id === selectedDomainId);

  // Filter events and alerts by selected client website / domain
  const filteredEvents = events.filter((e) => {
    if (selectedDomainId === 'all') return true;
    if (!activeDomain) return true;
    return (
      e.metadata?.domainId === activeDomain._id ||
      e.metadata?.domainUrl === activeDomain.domainUrl
    );
  });

  const filteredAlerts = alerts.filter((a) => {
    if (selectedDomainId === 'all') return true;
    if (!activeDomain) return true;
    return (
      a.domainId === activeDomain._id ||
      a.metadata?.domainId === activeDomain._id ||
      (a.ip && filteredEvents.some((e) => e.ip === a.ip))
    );
  });

  // Compute stat metrics based on actual data
  const totalEvents = filteredEvents.length;
  const openAlerts = filteredAlerts.filter((a) => a.status === 'open');
  const criticalThreats = filteredAlerts.filter((a) => a.severity === 'critical');
  const loginAttempts = filteredEvents.filter((e) => e.type.startsWith('AUTH_LOGIN_'));
  const successfulLogins = filteredEvents.filter((e) => e.type === 'AUTH_LOGIN_SUCCESS').length;
  const loginSuccessRate =
    loginAttempts.length > 0 ? Math.round((successfulLogins / loginAttempts.length) * 100) : 100;

  // Top IP calculations for mobile list & bar chart
  const ipCounts: Record<string, number> = {};
  for (const e of filteredEvents) {
    if (e.ip) {
      ipCounts[e.ip] = (ipCounts[e.ip] || 0) + 1;
    }
  }
  const sortedIps = Object.entries(ipCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const maxIpCount = sortedIps.length > 0 ? sortedIps[0][1] : 1;

  // Send real test telemetry ping to currently selected domain
  const handleSendTestTelemetry = async (isThreat = false) => {
    if (!activeDomain) return;
    setIsSendingTest(true);
    setTestFeedback(null);
    try {
      await api.simulateDomainTraffic(activeDomain._id, isThreat);
      setTestFeedback(
        isThreat
          ? `⚠️ Test attack event ingested for ${activeDomain.domainUrl}!`
          : `✅ Clean telemetry probe ingested for ${activeDomain.domainUrl}!`,
      );
      await loadData();
      setTimeout(() => setTestFeedback(null), 4000);
    } catch {
      setTestFeedback('Failed to dispatch test telemetry.');
      setTimeout(() => setTestFeedback(null), 4000);
    } finally {
      setIsSendingTest(false);
      setIsMobileProbeSheetOpen(false);
    }
  };

  // Render Chart.js charts with real data
  useEffect(() => {
    // 1. Line Chart: Real Activity Timeline (6 x 10m windows)
    if (lineChartRef.current) {
      if (lineChartInstance.current) lineChartInstance.current.destroy();

      const labels = ['50m ago', '40m ago', '30m ago', '20m ago', '10m ago', 'Just Now'];
      const now = Date.now();
      const bucketSizeMs = 10 * 60 * 1000;
      const successData = [0, 0, 0, 0, 0, 0];
      const failureData = [0, 0, 0, 0, 0, 0];

      filteredEvents.forEach((e) => {
        const time = new Date(e.timestamp).getTime();
        const diff = now - time;
        const bucketIdx = 5 - Math.floor(diff / bucketSizeMs);
        if (bucketIdx >= 0 && bucketIdx <= 5) {
          if (e.type === 'AUTH_LOGIN_SUCCESS') {
            successData[bucketIdx]++;
          } else if (
            e.type === 'AUTH_LOGIN_FAILED' ||
            e.type === 'RATE_LIMIT_EXCEEDED' ||
            e.severity === 'high' ||
            e.severity === 'critical'
          ) {
            failureData[bucketIdx]++;
          }
        }
      });

      lineChartInstance.current = new ChartJS(lineChartRef.current, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Clean Requests / Success',
              data: successData,
              borderColor: '#10b981',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              tension: 0.3,
              fill: true,
              pointRadius: isMobile ? 3 : 4,
            },
            {
              label: 'Failed / Anomaly Events',
              data: failureData,
              borderColor: '#f43f5e',
              backgroundColor: 'rgba(244, 63, 94, 0.1)',
              tension: 0.3,
              fill: true,
              pointRadius: isMobile ? 3 : 4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: {
                color: '#94a3b8',
                font: { family: 'Inter', size: isMobile ? 11 : 12 },
                boxWidth: isMobile ? 12 : 24,
              },
            },
            tooltip: {
              intersect: false,
              mode: 'index',
            },
          },
          scales: {
            x: {
              grid: { color: 'rgba(30, 41, 59, 0.5)' },
              ticks: {
                color: '#64748b',
                font: { size: isMobile ? 10 : 12 },
                maxTicksLimit: isMobile ? 4 : 6,
              },
            },
            y: {
              beginAtZero: true,
              grid: { color: 'rgba(30, 41, 59, 0.5)' },
              ticks: { color: '#64748b', precision: 0, font: { size: isMobile ? 10 : 12 } },
            },
          },
        },
      });
    }

    // 2. Doughnut Chart: Real Alert Severity Breakdown
    if (doughnutChartRef.current) {
      if (doughnutChartInstance.current) doughnutChartInstance.current.destroy();

      const critical = filteredAlerts.filter((a) => a.severity === 'critical').length;
      const high = filteredAlerts.filter((a) => a.severity === 'high').length;
      const medium = filteredAlerts.filter((a) => a.severity === 'medium').length;
      const low = filteredAlerts.filter((a) => a.severity === 'low').length;

      const totalAlerts = critical + high + medium + low;
      const chartData = totalAlerts > 0 ? [critical, high, medium, low] : [0, 0, 0, 0];

      doughnutChartInstance.current = new ChartJS(doughnutChartRef.current, {
        type: 'doughnut',
        data: {
          labels: ['Critical', 'High', 'Medium', 'Low'],
          datasets: [
            {
              data: chartData,
              backgroundColor: ['#f43f5e', '#fb923c', '#f59e0b', '#38bdf8'],
              borderColor: '#0f172a',
              borderWidth: 2,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                color: '#94a3b8',
                font: { family: 'Inter', size: isMobile ? 11 : 12 },
                boxWidth: isMobile ? 10 : 20,
              },
            },
          },
        },
      });
    }

    // 3. Bar Chart: Real Top Flagged IP Sources (Desktop)
    if (barChartRef.current && !isMobile) {
      if (barChartInstance.current) barChartInstance.current.destroy();

      const labels = sortedIps.length > 0 ? sortedIps.map((x) => x[0]) : ['No traffic yet'];
      const data = sortedIps.length > 0 ? sortedIps.map((x) => x[1]) : [0];

      barChartInstance.current = new ChartJS(barChartRef.current, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Actual Events Count',
              data,
              backgroundColor: 'rgba(99, 102, 241, 0.7)',
              borderColor: '#6366f1',
              borderWidth: 1,
              borderRadius: 6,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: 'y',
          plugins: {
            legend: { display: false },
          },
          scales: {
            x: {
              beginAtZero: true,
              grid: { color: 'rgba(30, 41, 59, 0.5)' },
              ticks: { color: '#64748b', precision: 0 },
            },
            y: {
              grid: { display: false },
              ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono' } },
            },
          },
        },
      });
    }

    return () => {
      lineChartInstance.current?.destroy();
      lineChartInstance.current = null;
      doughnutChartInstance.current?.destroy();
      doughnutChartInstance.current = null;
      barChartInstance.current?.destroy();
      barChartInstance.current = null;
    };
  }, [filteredEvents, filteredAlerts, isMobile]);

  return (
    <div className="content-body">
      {/* Mobile Glanceable Security Posture Hero */}
      {isMobile && (
        <div
          className="mobile-sec-card"
          style={{
            background: openAlerts.length > 0
              ? 'linear-gradient(135deg, rgba(244, 63, 94, 0.12), rgba(15, 23, 42, 0.9))'
              : 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(15, 23, 42, 0.9))',
            borderColor: openAlerts.length > 0 ? 'rgba(244, 63, 94, 0.35)' : 'rgba(16, 185, 129, 0.35)',
            marginBottom: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: openAlerts.length > 0 ? 'rgba(244, 63, 94, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                  color: openAlerts.length > 0 ? 'var(--color-rose)' : 'var(--color-emerald)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {openAlerts.length > 0 ? <AlertOctagon size={20} /> : <Shield size={20} />}
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
                  Security Posture
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>
                  {openAlerts.length > 0 ? 'Action Required' : 'All Systems Nominal'}
                </div>
              </div>
            </div>

            <button
              onClick={loadData}
              disabled={isLoading}
              className="btn btn-secondary btn-sm"
              style={{ minHeight: 36, padding: '4px 10px', gap: 6 }}
              aria-label="Refresh telemetry"
            >
              <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
              <span>{isLoading ? 'Syncing' : 'Sync'}</span>
            </button>
          </div>

          {openAlerts.length > 0 && (
            <div
              onClick={() => onNavigateTab('alerts')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: 8,
                background: 'rgba(244, 63, 94, 0.15)',
                border: '1px solid rgba(244, 63, 94, 0.3)',
                color: '#fff',
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="badge badge-critical" style={{ fontSize: '0.7rem' }}>
                  {criticalThreats.length} CRITICAL
                </span>
                <span>{openAlerts.length} open alert{openAlerts.length > 1 ? 's' : ''} pending triage</span>
              </div>
              <ArrowRight size={16} color="var(--color-rose)" />
            </div>
          )}
        </div>
      )}

      {/* Target Application & Domain Hook Header */}
      <div
        className="glass-panel"
        style={{
          padding: isMobile ? '12px 14px' : '1rem 1.25rem',
          marginBottom: '1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'stretch' : 'center',
          flexDirection: isMobile ? 'column' : 'row',
          gap: '0.85rem',
          borderLeft: '4px solid var(--color-cyan)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              backgroundColor: 'rgba(0, 240, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-cyan)',
              flexShrink: 0,
            }}
          >
            <Radio size={20} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Live Telemetry Target
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 2, flexWrap: 'wrap' }}>
              <select
                value={selectedDomainId}
                onChange={(e) => setSelectedDomainId(e.target.value)}
                className="form-select"
                style={{
                  padding: '5px 8px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  width: isMobile ? '100%' : 'auto',
                }}
              >
                <option value="all">All Protected Domains ({domains.length})</option>
                {domains.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name} ({d.domainUrl})
                  </option>
                ))}
              </select>

              {activeDomain && !isMobile && (
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: 10,
                    backgroundColor:
                      activeDomain.healthStatus === 'healthy'
                        ? 'rgba(16, 185, 129, 0.15)'
                        : 'rgba(239, 68, 68, 0.15)',
                    color: activeDomain.healthStatus === 'healthy' ? '#10b981' : '#f43f5e',
                  }}
                >
                  ● {(activeDomain.healthStatus ?? 'unverified').toUpperCase()}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions (Desktop: horizontal inline bar; Mobile: trigger probe bottom sheet) */}
        {!isMobile ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            {activeDomain && (
              <>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleSendTestTelemetry(false)}
                  disabled={isSendingTest}
                  title="Send test clean web traffic event"
                  style={{ gap: 5 }}
                >
                  <Zap size={13} color="var(--color-emerald)" />
                  {isSendingTest ? 'Sending...' : 'Send Live Telemetry Ping'}
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleSendTestTelemetry(true)}
                  disabled={isSendingTest}
                  title="Send test IDS attack event to trigger alert"
                  style={{ gap: 5 }}
                >
                  <AlertTriangle size={13} color="var(--color-rose)" />
                  Simulate Attack Probe
                </button>
              </>
            )}

            <a
              href="http://localhost:5174/app"
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary btn-sm"
              style={{ gap: 5, color: '#a78bfa' }}
              title="Open Hub Website to register new domain / port"
            >
              <Globe size={13} />
              Manage Domains in Hub
              <ExternalLink size={11} />
            </a>

            <button
              className="btn btn-secondary btn-sm"
              onClick={loadData}
              disabled={isLoading}
              style={{ gap: 6 }}
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              {isLoading ? 'Syncing...' : 'Sync'}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            {activeDomain && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setIsMobileProbeSheetOpen(true)}
                style={{ flex: 1, minHeight: 40, justifyContent: 'center' }}
              >
                <SlidersHorizontal size={14} color="var(--color-cyan)" />
                Telemetry Actions & Probes
              </button>
            )}
            <a
              href="http://localhost:5174/app"
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary btn-sm"
              style={{ minHeight: 40, padding: '0 12px' }}
              title="Hub Console"
            >
              <Globe size={14} />
            </a>
          </div>
        )}
      </div>

      {/* Mobile Telemetry Probes Bottom Sheet */}
      {isMobile && (
        <BottomSheet
          isOpen={isMobileProbeSheetOpen}
          onClose={() => setIsMobileProbeSheetOpen(false)}
          title="Telemetry Simulation & Probes"
          subtitle={`Target: ${activeDomain?.name || 'Selected Domain'} (${activeDomain?.domainUrl || ''})`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button
              className="btn btn-secondary"
              onClick={() => handleSendTestTelemetry(false)}
              disabled={isSendingTest}
              style={{ minHeight: 48, justifyContent: 'flex-start', padding: '12px 16px' }}
            >
              <Zap size={18} color="var(--color-emerald)" />
              <div style={{ textAlign: 'left', marginLeft: 8 }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Send Clean Telemetry Ping</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ingests a benign HTTP probe event</div>
              </div>
            </button>

            <button
              className="btn btn-danger"
              onClick={() => handleSendTestTelemetry(true)}
              disabled={isSendingTest}
              style={{ minHeight: 48, justifyContent: 'flex-start', padding: '12px 16px' }}
            >
              <AlertTriangle size={18} color="var(--color-rose)" />
              <div style={{ textAlign: 'left', marginLeft: 8 }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Simulate IDS Attack Probe</div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(244, 63, 94, 0.8)' }}>Triggers heuristic intrusion alert</div>
              </div>
            </button>

            <a
              href="http://localhost:5174/app"
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary"
              style={{ minHeight: 48, justifyContent: 'flex-start', padding: '12px 16px', color: '#a78bfa' }}
            >
              <Globe size={18} />
              <div style={{ textAlign: 'left', marginLeft: 8, flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Manage Domains in Hub</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Add new ports or client API keys</div>
              </div>
              <ExternalLink size={16} />
            </a>
          </div>
        </BottomSheet>
      )}

      {/* Test Feedback Toast */}
      {testFeedback && (
        <div
          style={{
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#6ee7b7',
            padding: '10px 14px',
            borderRadius: 8,
            marginBottom: 14,
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
          <span>{testFeedback}</span>
        </div>
      )}

      {/* No Domain Notice */}
      {domains.length === 0 && !isLoading && (
        <div
          style={{
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 8,
            padding: '12px 16px',
            marginBottom: 16,
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'flex-start' : 'center',
            justifyContent: 'space-between',
            gap: 10,
            fontSize: '0.875rem',
            color: '#fcd34d',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Server size={18} style={{ flexShrink: 0 }} />
            <span>
              <strong>No Client Website Registered:</strong> Go to the Hub Console at{' '}
              <code>http://localhost:5174/app</code> to register your app.
            </span>
          </div>
          <a
            href="http://localhost:5174/app"
            target="_blank"
            rel="noreferrer"
            style={{ color: '#fff', textDecoration: 'underline', fontWeight: 600, minHeight: 36, display: 'inline-flex', alignItems: 'center' }}
          >
            Register Now →
          </a>
        </div>
      )}

      {/* Metrics Row: Urgency Ordered */}
      <div className="stats-grid">
        <div
          className="stat-card"
          onClick={() => onNavigateTab('alerts')}
          style={{ cursor: 'pointer', borderLeft: openAlerts.length > 0 ? '3px solid var(--color-rose)' : undefined }}
          title="Click to view IDS triage alerts"
        >
          <div>
            <div className="stat-label">Active IDS Alerts</div>
            <div className="stat-value font-mono" style={{ color: openAlerts.length > 0 ? 'var(--color-rose)' : 'inherit' }}>
              {openAlerts.length}
            </div>
          </div>
          <div className="stat-icon" style={{ background: 'rgba(244, 63, 94, 0.1)', color: 'var(--color-rose)' }}>
            <AlertOctagon size={22} />
          </div>
        </div>

        <div
          className="stat-card"
          onClick={() => onNavigateTab('alerts')}
          style={{ cursor: 'pointer', borderLeft: criticalThreats.length > 0 ? '3px solid #fb923c' : undefined }}
          title="Click to view critical alerts"
        >
          <div>
            <div className="stat-label">Critical Threats</div>
            <div className="stat-value font-mono" style={{ color: criticalThreats.length > 0 ? 'var(--color-rose)' : 'inherit' }}>
              {criticalThreats.length}
            </div>
          </div>
          <div className="stat-icon" style={{ background: 'rgba(249, 115, 22, 0.1)', color: '#fb923c' }}>
            <ShieldAlert size={22} />
          </div>
        </div>

        <div
          className="stat-card"
          onClick={() => onNavigateTab('logs')}
          style={{ cursor: 'pointer' }}
          title="Click to view full security audit log"
        >
          <div>
            <div className="stat-label">Total Events ({activeDomain ? activeDomain.name : 'All'})</div>
            <div className="stat-value font-mono">{totalEvents}</div>
          </div>
          <div className="stat-icon" style={{ background: 'rgba(0, 240, 255, 0.1)', color: 'var(--color-cyan)' }}>
            <Activity size={22} />
          </div>
        </div>

        <div className="stat-card">
          <div>
            <div className="stat-label">Login Success Rate</div>
            <div className="stat-value font-mono" style={{ color: 'var(--color-emerald)' }}>
              {loginSuccessRate}%
            </div>
          </div>
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-emerald)' }}>
            <CheckCircle2 size={22} />
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">
        <div className="glass-panel" style={{ height: isMobile ? 260 : 320 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: '0.92rem', fontWeight: 600 }}>
              Live Telemetry — {activeDomain ? activeDomain.domainUrl : 'Aggregated'}
            </h3>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>60m window</span>
          </div>
          <div style={{ height: 'calc(100% - 32px)' }}>
            <canvas ref={lineChartRef} />
          </div>
        </div>

        <div className="glass-panel" style={{ height: isMobile ? 260 : 320 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: '0.92rem', fontWeight: 600 }}>Alert Severity</h3>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {openAlerts.length} active
            </span>
          </div>
          <div style={{ height: 'calc(100% - 32px)' }}>
            <canvas ref={doughnutChartRef} />
          </div>
        </div>
      </div>

      {/* Bottom Section: Top Flagged IP Sources & Service Guide */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1.2fr 1fr',
          gap: 20,
          marginTop: 4,
        }}
      >
        {/* Top Flagged IPs: Sleek Mobile Ranked List on Mobile, Bar Chart on Desktop */}
        <div className="glass-panel" style={{ height: isMobile ? 'auto' : 280 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Top Flagged IP Sources</h3>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Observed traffic</span>
          </div>

          {isMobile ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {sortedIps.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '12px 0' }}>
                  No traffic ingested yet.
                </div>
              ) : (
                sortedIps.map(([ip, count], index) => {
                  const percentage = Math.round((count / maxIpCount) * 100);
                  return (
                    <div
                      key={ip}
                      style={{
                        background: 'rgba(11, 17, 32, 0.5)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 8,
                        padding: '10px 12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                            #{index + 1}
                          </span>
                          <TapToCopy value={ip} />
                        </div>
                        <span className="font-mono" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          {count} {count === 1 ? 'event' : 'events'}
                        </span>
                      </div>
                      <div
                        style={{
                          width: '100%',
                          height: 5,
                          background: 'rgba(30, 41, 59, 0.5)',
                          borderRadius: 3,
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${percentage}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, var(--color-indigo), var(--color-cyan))',
                            borderRadius: 3,
                          }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div style={{ height: 'calc(100% - 36px)' }}>
              <canvas ref={barChartRef} />
            </div>
          )}
        </div>

        {/* Service Guide: Accordion Collapsible on Mobile, Fixed Height on Desktop */}
        {isMobile ? (
          <div className="glass-panel" style={{ padding: '14px 16px' }}>
            <button
              type="button"
              onClick={() => setIsServiceGuideOpen(!isServiceGuideOpen)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'none',
                border: 'none',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                minHeight: 44,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Shield size={18} color="var(--color-cyan)" />
                <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Service Capabilities Guide</span>
              </div>
              {isServiceGuideOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>

            {isServiceGuideOpen && (
              <div style={{ marginTop: 12 }}>
                <ServiceGuide onNavigateTab={onNavigateTab} />
              </div>
            )}
          </div>
        ) : (
          <ServiceGuide onNavigateTab={onNavigateTab} />
        )}
      </div>
    </div>
  );
};
