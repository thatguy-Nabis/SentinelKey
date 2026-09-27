import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import type { IAlert, AlertStatus, AlertSeverity } from '@sentinelkey/shared-types';
import * as api from '../../services/api';
import {
  ShieldCheck,
  CheckCircle,
  Clock,
  RefreshCw,
} from 'lucide-react';

interface AlertsViewProps {
  onRefreshAlertCount?: () => void;
}

export const AlertsView: React.FC<AlertsViewProps> = ({ onRefreshAlertCount }) => {
  const { canAccess } = useAuth();
  const [alerts, setAlerts] = useState<IAlert[]>([]);
  const [statusFilter, setStatusFilter] = useState<AlertStatus | ''>('open');
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | ''>('');
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const canManageAlerts = canAccess('alerts:write');

  const fetchAlerts = async () => {
    setIsLoading(true);
    try {
      const res = await api.fetchAlerts({
        status: statusFilter || undefined,
        severity: severityFilter || undefined,
        limit: 50,
      });
      setAlerts(res.data || []);
      if (onRefreshAlertCount) onRefreshAlertCount();
    } catch (err) {
      console.error('Error fetching IDS alerts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [statusFilter, severityFilter]);

  const handleAcknowledge = async (id: string) => {
    setActionLoadingId(id);
    try {
      await api.acknowledgeAlert(id);
      await fetchAlerts();
    } catch (err) {
      alert(api.getErrorMessage(err, 'Failed to acknowledge alert'));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleResolve = async (id: string) => {
    setActionLoadingId(id);
    try {
      await api.resolveAlert(id);
      await fetchAlerts();
    } catch (err) {
      alert(api.getErrorMessage(err, 'Failed to resolve alert'));
    } finally {
      setActionLoadingId(null);
    }
  };

  const getSeverityBadge = (severity: AlertSeverity) => {
    switch (severity) {
      case 'critical':
        return <span className="badge badge-critical">Critical</span>;
      case 'high':
        return <span className="badge badge-high">High</span>;
      case 'medium':
        return <span className="badge badge-medium">Medium</span>;
      default:
        return <span className="badge badge-low">Low</span>;
    }
  };

  return (
    <div className="content-body">
      {/* Filters Bar */}
      <div
        className="glass-panel"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 20,
          padding: '14px 20px',
        }}
      >
        {/* Status Tabs */}
        <div style={{ display: 'flex', gap: 6 }}>
          {(['open', 'acknowledged', 'resolved', ''] as const).map(status => (
            <button
              key={status}
              className={`btn btn-sm ${statusFilter === status ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setStatusFilter(status)}
            >
              {status === '' ? 'All Alerts' : status.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Severity & Refresh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <select
            className="form-select"
            style={{ padding: '6px 12px', fontSize: '0.8rem', width: 140 }}
            value={severityFilter}
            onChange={e => setSeverityFilter(e.target.value as AlertSeverity | '')}
          >
            <option value="">All Severities</option>
            <option value="critical">Critical Only</option>
            <option value="high">High Only</option>
            <option value="medium">Medium Only</option>
            <option value="low">Low Only</option>
          </select>

          <button onClick={fetchAlerts} className="btn btn-secondary btn-sm" title="Refresh alerts feed">
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Alerts Feed */}
      {alerts.length === 0 ? (
        <div
          className="glass-panel"
          style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)' }}
        >
          <ShieldCheck size={40} style={{ color: 'var(--color-emerald)', marginBottom: 12, opacity: 0.8 }} />
          <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: 6 }}>No Active Threats</h3>
          <p style={{ fontSize: '0.85rem' }}>
            {statusFilter === 'open'
              ? 'No open intrusion alerts detected in this time window.'
              : 'No alerts match the selected status and severity filters.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {alerts.map(alert => {
            const id = alert._id;
            return (
              <div
                key={id}
                className="glass-panel"
                style={{
                  borderLeft: `4px solid ${
                    alert.severity === 'critical'
                      ? 'var(--color-rose)'
                      : alert.severity === 'high'
                      ? '#fb923c'
                      : 'var(--color-amber)'
                  }`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                  {/* Left: Info */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      {getSeverityBadge(alert.severity)}
                      <span className="badge badge-info font-mono">{alert.rule}</span>
                      <span
                        className="badge"
                        style={{
                          background:
                            alert.status === 'open'
                              ? 'rgba(244, 63, 94, 0.1)'
                              : alert.status === 'acknowledged'
                              ? 'rgba(245, 158, 11, 0.1)'
                              : 'rgba(16, 185, 129, 0.1)',
                          color:
                            alert.status === 'open'
                              ? 'var(--color-rose)'
                              : alert.status === 'acknowledged'
                              ? 'var(--color-amber)'
                              : 'var(--color-emerald)',
                        }}
                      >
                        {alert.status.toUpperCase()}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(alert.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#fff', marginBottom: 6 }}>
                      {alert.title}
                    </h3>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 12 }}>
                      {alert.description}
                    </p>

                    {/* Metadata attributes */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      <div>
                        Source IP: <span className="font-mono" style={{ color: 'var(--text-primary)' }}>{alert.ip}</span>
                      </div>
                      {alert.userId && (
                        <div>
                          User: <span className="font-mono" style={{ color: 'var(--text-primary)' }}>{alert.userId}</span>
                        </div>
                      )}
                      {alert.triggerEventIds && alert.triggerEventIds.length > 0 && (
                        <div>
                          Trigger Events: <span className="font-mono" style={{ color: 'var(--color-cyan)' }}>{alert.triggerEventIds.length} event(s)</span>
                        </div>
                      )}
                      {alert.acknowledgedBy && (
                        <div>
                          Ack by: <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>{alert.acknowledgedBy}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 130 }}>
                    {alert.status === 'open' && (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleAcknowledge(id)}
                        disabled={!canManageAlerts || actionLoadingId === id}
                        title={canManageAlerts ? 'Acknowledge alert' : 'Requires analyst or admin role'}
                      >
                        <Clock size={14} />
                        Acknowledge
                      </button>
                    )}

                    {alert.status !== 'resolved' && (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleResolve(id)}
                        disabled={!canManageAlerts || actionLoadingId === id}
                        title={canManageAlerts ? 'Resolve alert' : 'Requires analyst or admin role'}
                      >
                        <CheckCircle size={14} />
                        Resolve
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
