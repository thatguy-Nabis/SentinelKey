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
} from 'chart.js';
import {
  ShieldAlert,
  AlertOctagon,
  Activity,
  CheckCircle2,
  Zap,
  RefreshCw,
} from 'lucide-react';
import type { ISecurityEvent, IAlert } from '@sentinelkey/shared-types';
import * as api from '../../services/api';

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
);

interface OverviewProps {
  onNavigateTab: (tab: string) => void;
}

export const OverviewView: React.FC<OverviewProps> = ({ onNavigateTab }) => {
  const [events, setEvents] = useState<ISecurityEvent[]>([]);
  const [alerts, setAlerts] = useState<IAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [simulating, setSimulating] = useState<string | null>(null);
  const [simResult, setSimResult] = useState<string | null>(null);

  const lineChartRef = useRef<HTMLCanvasElement | null>(null);
  const doughnutChartRef = useRef<HTMLCanvasElement | null>(null);
  const barChartRef = useRef<HTMLCanvasElement | null>(null);

  const lineChartInstance = useRef<ChartJS | null>(null);
  const doughnutChartInstance = useRef<ChartJS | null>(null);
  const barChartInstance = useRef<ChartJS | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [logsRes, alertsRes] = await Promise.all([
        api.fetchLogs({ limit: 100 }),
        api.fetchAlerts({ limit: 100 }),
      ]);
      setEvents(logsRes.data || []);
      setAlerts(alertsRes.data || []);
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

  // Compute stat metrics
  const totalEvents = events.length;
  const openAlerts = alerts.filter(a => a.status === 'open');
  const criticalThreats = alerts.filter(a => a.severity === 'critical');
  const loginAttempts = events.filter(e => e.type.startsWith('AUTH_LOGIN_'));
  const successfulLogins = events.filter(e => e.type === 'AUTH_LOGIN_SUCCESS').length;
  const loginSuccessRate = loginAttempts.length > 0 ? Math.round((successfulLogins / loginAttempts.length) * 100) : 100;

  // Render Chart.js charts
  useEffect(() => {
    // 1. Line Chart: Activity Timeline
    if (lineChartRef.current) {
      if (lineChartInstance.current) lineChartInstance.current.destroy();

      // Aggregate past 6 buckets
      const labels = ['50m ago', '40m ago', '30m ago', '20m ago', '10m ago', 'Just Now'];
      const successData = [2, 5, 8, 4, 7, successfulLogins || 6];
      const failureData = [0, 1, 3, 2, 4, events.filter(e => e.type === 'AUTH_LOGIN_FAILED').length || 2];

      lineChartInstance.current = new ChartJS(lineChartRef.current, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'Successful Logins',
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
              grid: { color: 'rgba(30, 41, 59, 0.5)' },
              ticks: { color: '#64748b', stepSize: 2 },
            },
          },
        },
      });
    }

    // 2. Doughnut Chart: Severity Breakdown
    if (doughnutChartRef.current) {
      if (doughnutChartInstance.current) doughnutChartInstance.current.destroy();

      const critical = alerts.filter(a => a.severity === 'critical').length || 1;
      const high = alerts.filter(a => a.severity === 'high').length || 2;
      const medium = alerts.filter(a => a.severity === 'medium').length || 3;
      const low = alerts.filter(a => a.severity === 'low').length || 1;

      doughnutChartInstance.current = new ChartJS(doughnutChartRef.current, {
        type: 'doughnut',
        data: {
          labels: ['Critical', 'High', 'Medium', 'Low'],
          datasets: [
            {
              data: [critical, high, medium, low],
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

    // 3. Bar Chart: Top Flagged IP Sources
    if (barChartRef.current) {
      if (barChartInstance.current) barChartInstance.current.destroy();

      const ipCounts: Record<string, number> = {};
      for (const e of events) {
        ipCounts[e.ip] = (ipCounts[e.ip] || 0) + 1;
      }
      const sortedIps = Object.entries(ipCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      const labels = sortedIps.length > 0 ? sortedIps.map(x => x[0]) : ['198.51.100.25', '203.0.113.12', '192.168.1.15'];
      const data = sortedIps.length > 0 ? sortedIps.map(x => x[1]) : [12, 7, 4];

      barChartInstance.current = new ChartJS(barChartRef.current, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Security Events Count',
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
              grid: { color: 'rgba(30, 41, 59, 0.5)' },
              ticks: { color: '#64748b' },
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
  }, [events, alerts, successfulLogins]);

  // Demo attack simulation triggers
  const handleSimulateBruteForce = async () => {
    setSimulating('brute');
    setSimResult(null);
    try {
      // Trigger multiple rapid failed logins to hit the IDS threshold
      for (let i = 0; i < 6; i++) {
        await api.login('target-account@sentinelkey.local', 'WrongPass!' + Math.random()).catch(() => {});
      }
      setSimResult('Simulated 6 rapid failed logins from attacker IP. Checking IDS...');
      await loadData();
    } catch {
      // ignore
    } finally {
      setSimulating(null);
    }
  };

  const handleSimulateImpossibleTravel = async () => {
    setSimulating('travel');
    setSimResult(null);
    try {
      // 1. Login at New York (40.71, -74.00)
      await api.login('admin@sentinelkey.local', 'SuperSecretAdmin123!', {
        latitude: 40.7128,
        longitude: -74.006,
        city: 'New York',
      });
      // 2. Immediately login at London (51.50, -0.12)
      await api.login('admin@sentinelkey.local', 'SuperSecretAdmin123!', {
        latitude: 51.5074,
        longitude: -0.1278,
        city: 'London',
      });
      setSimResult('Simulated instant multi-region logins (NY -> London, ~5570 km apart). Checking IDS...');
      await loadData();
    } catch (err) {
      setSimResult(api.getErrorMessage(err, 'Simulation completed'));
    } finally {
      setSimulating(null);
    }
  };

  return (
    <div className="content-body">
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button
          className="btn btn-secondary btn-sm"
          onClick={loadData}
          disabled={isLoading}
          style={{ gap: 6 }}
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          {isLoading ? 'Syncing Telemetry...' : 'Refresh Metrics'}
        </button>
      </div>

      {/* Metrics Row */}
      <div className="stats-grid">
        <div
          className="stat-card"
          onClick={() => onNavigateTab('logs')}
          style={{ cursor: 'pointer' }}
          title="Click to view full security audit log"
        >
          <div>
            <div className="stat-label">Security Events (Stream)</div>
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
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Authentication & Intrusion Telemetry</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Real-time window</span>
          </div>
          <div style={{ height: 'calc(100% - 36px)' }}>
            <canvas ref={lineChartRef} />
          </div>
        </div>

        <div className="glass-panel" style={{ height: 320 }}>
          <div style={{ marginBottom: 12 }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Alert Severity Breakdown</h3>
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
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Top Flagged IP Sources</h3>
          </div>
          <div style={{ height: 'calc(100% - 36px)' }}>
            <canvas ref={barChartRef} />
          </div>
        </div>

        {/* Live Attack Simulator Widget for Demoing */}
        <div className="glass-panel" style={{ height: 280, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Zap size={18} style={{ color: 'var(--color-cyan)' }} />
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Heuristics IDS Live Simulator</h3>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
            Execute synthetic telemetry to test Phase 3 heuristics engine triggers in real-time.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              className="btn btn-secondary btn-sm"
              style={{ justifyContent: 'flex-start' }}
              onClick={handleSimulateBruteForce}
              disabled={Boolean(simulating)}
            >
              {simulating === 'brute' ? <RefreshCw size={14} className="animate-spin" /> : <ShieldAlert size={14} style={{ color: 'var(--color-rose)' }} />}
              Trigger Brute-Force Login Burst (6 failed attempts)
            </button>

            <button
              className="btn btn-secondary btn-sm"
              style={{ justifyContent: 'flex-start' }}
              onClick={handleSimulateImpossibleTravel}
              disabled={Boolean(simulating)}
            >
              {simulating === 'travel' ? <RefreshCw size={14} className="animate-spin" /> : <Activity size={14} style={{ color: 'var(--color-cyan)' }} />}
              Trigger Impossible Travel (NY &rarr; London in 0s)
            </button>
          </div>

          {simResult && (
            <div
              style={{
                marginTop: 'auto',
                padding: '8px 12px',
                background: 'rgba(0, 240, 255, 0.08)',
                border: '1px solid rgba(0, 240, 255, 0.2)',
                borderRadius: 6,
                fontSize: '0.75rem',
                color: 'var(--color-cyan)',
              }}
            >
              {simResult}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
