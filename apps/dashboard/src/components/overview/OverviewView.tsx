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
} from 'lucide-react';
import type { ISecurityEvent, IAlert, IClientDomain } from '@sentinelkey/shared-types';
import * as api from '../../services/api';
import { ServiceGuide } from './ServiceGuide';

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
  const [events, setEvents] = useState<ISecurityEvent[]>([]);
  const [alerts, setAlerts] = useState<IAlert[]>([]);
  const [domains, setDomains] = useState<IClientDomain[]>([]);
  const [selectedDomainId, setSelectedDomainId] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testFeedback, setTestFeedback] = useState<string | null>(null);

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
    const interval = setInterval(loadData, 10000); // 10s auto-refresh
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
    return a.ip && filteredEvents.some((e) => e.ip === a.ip);
  });

  // Compute stat metrics based on actual data
  const totalEvents = filteredEvents.length;
  const openAlerts = filteredAlerts.filter((a) => a.status === 'open');
  const criticalThreats = filteredAlerts.filter((a) => a.severity === 'critical');
  const loginAttempts = filteredEvents.filter((e) => e.type.startsWith('AUTH_LOGIN_'));
  const successfulLogins = filteredEvents.filter((e) => e.type === 'AUTH_LOGIN_SUCCESS').length;
  const loginSuccessRate =
    loginAttempts.length > 0 ? Math.round((successfulLogins / loginAttempts.length) * 100) : 100;

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
    } catch (err) {
      setTestFeedback('Failed to dispatch test telemetry.');
      setTimeout(() => setTestFeedback(null), 4000);
    } finally {
      setIsSendingTest(false);
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
            },
            {
              label: 'Failed / Anomaly Events',
              data: failureData,
              borderColor: '#f43f5e',
              backgroundColor: 'rgba(244, 63, 94, 0.1)',
              tension: 0.3,
              fill: true,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: { color: '#94a3b8', font: { family: 'Inter' } },
            },
          },
          scales: {
            x: {
              grid: { color: 'rgba(30, 41, 59, 0.5)' },
              ticks: { color: '#64748b' },
            },
            y: {
              beginAtZero: true,
              grid: { color: 'rgba(30, 41, 59, 0.5)' },
              ticks: { color: '#64748b', precision: 0 },
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
              labels: { color: '#94a3b8', font: { family: 'Inter' } },
            },
          },
        },
      });
    }

    // 3. Bar Chart: Real Top Flagged IP Sources
    if (barChartRef.current) {
      if (barChartInstance.current) barChartInstance.current.destroy();

      const ipCounts: Record<string, number> = {};
      for (const e of filteredEvents) {
        if (e.ip) {
          ipCounts[e.ip] = (ipCounts[e.ip] || 0) + 1;
        }
      }
      const sortedIps = Object.entries(ipCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

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
      doughnutChartInstance.current?.destroy();
      barChartInstance.current?.destroy();
    };
  }, [filteredEvents, filteredAlerts]);

  return (
    <div className="content-body">
      {/* Target Application & Domain Hook Header */}
      <div
        className="glass-panel"
        style={{
          padding: '1rem 1.25rem',
          marginBottom: '1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
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
            }}
          >
            <Radio size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Live Telemetry Target
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 2 }}>
              <select
                value={selectedDomainId}
                onChange={(e) => setSelectedDomainId(e.target.value)}
                style={{
                  backgroundColor: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 6,
                  padding: '4px 8px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <option value="all">All Protected Domains ({domains.length})</option>
                {domains.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name} ({d.domainUrl})
                  </option>
                ))}
              </select>

              {activeDomain && (
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
                  ● {activeDomain.healthStatus.toUpperCase()}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions & Ingestion Trigger */}
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
      </div>

      {/* Test Feedback Toast */}
      {testFeedback && (
        <div
          style={{
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#6ee7b7',
            padding: '8px 14px',
            borderRadius: 6,
            marginBottom: 12,
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <CheckCircle2 size={16} />
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
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.875rem',
            color: '#fcd34d',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Server size={18} />
            <span>
              <strong>No Client Website Registered:</strong> Go to the Hub Console at{' '}
              <code>http://localhost:5174/app</code> to add your localhost port (e.g. <code>http://localhost:3000</code>)
              and generate client API keys.
            </span>
          </div>
          <a
            href="http://localhost:5174/app"
            target="_blank"
            rel="noreferrer"
            style={{ color: '#fff', textDecoration: 'underline', fontWeight: 600 }}
          >
            Register Now →
          </a>
        </div>
      )}

      {/* Metrics Row */}
      <div className="stats-grid">
        <div
          className="stat-card"
          onClick={() => onNavigateTab('logs')}
          style={{ cursor: 'pointer' }}
          title="Click to view full security audit log"
        >
          <div>
            <div className="stat-label">Security Events ({activeDomain ? activeDomain.name : 'All Domains'})</div>
            <div className="stat-value font-mono">{totalEvents}</div>
          </div>
          <div className="stat-icon" style={{ background: 'rgba(0, 240, 255, 0.1)', color: 'var(--color-cyan)' }}>
            <Activity size={22} />
          </div>
        </div>

        <div
          className="stat-card"
          onClick={() => onNavigateTab('alerts')}
          style={{ cursor: 'pointer' }}
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

        <div className="stat-card">
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
        <div className="glass-panel" style={{ height: 320 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>
              Live Telemetry — {activeDomain ? activeDomain.domainUrl : 'Aggregated Stream'}
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Real 60-minute window</span>
          </div>
          <div style={{ height: 'calc(100% - 36px)' }}>
            <canvas ref={lineChartRef} />
          </div>
        </div>

        <div className="glass-panel" style={{ height: 320 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Alert Severity Breakdown</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {openAlerts.length} active
            </span>
          </div>
          <div style={{ height: 'calc(100% - 36px)' }}>
            <canvas ref={doughnutChartRef} />
          </div>
        </div>
      </div>

      {/* Bottom Grid: Top Flagged Sources & Live Attack Simulation Box */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20 }}>
        <div className="glass-panel" style={{ height: 280 }}>
          <div style={{ marginBottom: 12 }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Top Flagged IP Sources (Actual)</h3>
          </div>
          <div style={{ height: 'calc(100% - 36px)' }}>
            <canvas ref={barChartRef} />
          </div>
        </div>

        <ServiceGuide onNavigateTab={onNavigateTab} />
      </div>
    </div>
  );
};
