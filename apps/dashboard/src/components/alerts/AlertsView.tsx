import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import type { IAlert, AlertStatus, AlertSeverity } from '@sentinelkey/shared-types';
import * as api from '../../services/api';
import {
  ShieldCheck,
  CheckCircle,
  Clock,
  RefreshCw,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Loader2,
  X,
  Layers,
} from 'lucide-react';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { BottomSheet } from '../common/BottomSheet';
import { SeverityBadge } from '../common/SeverityBadge';
import { TapToCopy } from '../common/TapToCopy';

interface AlertsViewProps {
  onRefreshAlertCount?: () => void;
}

export const AlertsView: React.FC<AlertsViewProps> = ({ onRefreshAlertCount }) => {
  const { canAccess } = useAuth();
  const isMobile = useIsMobile(768);

  const [alerts, setAlerts] = useState<IAlert[]>([]);
  const [statusFilter, setStatusFilter] = useState<AlertStatus | ''>('open');
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | ''>('');
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [expandedAlertIds, setExpandedAlertIds] = useState<Record<string, boolean>>({});

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

  const toggleExpand = (id: string) => {
    setExpandedAlertIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const activeFiltersCount = (statusFilter ? 1 : 0) + (severityFilter ? 1 : 0);

  return (
    <div className="content-body">
      {/* Desktop Filters Bar */}
      {!isMobile ? (
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
            {(['open', 'acknowledged', 'resolved', ''] as const).map((status) => (
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
              onChange={(e) => setSeverityFilter(e.target.value as AlertSeverity | '')}
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
      ) : (
        /* Mobile Sticky Controls & Filter Sheet Trigger */
        <div style={{ marginBottom: 14 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              marginBottom: 10,
            }}
          >
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsFilterSheetOpen(true)}
              style={{
                flex: 1,
                minHeight: 44,
                justifyContent: 'space-between',
                padding: '0 14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <SlidersHorizontal size={16} color="var(--color-cyan)" />
                <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Filter & Triage</span>
              </div>
              {activeFiltersCount > 0 && (
                <span
                  style={{
                    background: 'var(--color-indigo)',
                    color: '#fff',
                    borderRadius: 999,
                    fontSize: '0.7rem',
                    padding: '2px 8px',
                    fontWeight: 700,
                  }}
                >
                  {activeFiltersCount}
                </span>
              )}
            </button>

            <button
              onClick={fetchAlerts}
              disabled={isLoading}
              className="btn btn-secondary"
              style={{ width: 44, height: 44, padding: 0 }}
              aria-label="Refresh alerts"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Active Filter Chips */}
          {activeFiltersCount > 0 && (
            <div className="filter-chips-bar">
              {statusFilter && (
                <span className="filter-chip">
                  <span>Status: {statusFilter.toUpperCase()}</span>
                  <button
                    className="filter-chip-remove"
                    onClick={() => setStatusFilter('')}
                    aria-label="Remove status filter"
                  >
                    <X size={13} />
                  </button>
                </span>
              )}

              {severityFilter && (
                <span className="filter-chip">
                  <span>Severity: {severityFilter.toUpperCase()}</span>
                  <button
                    className="filter-chip-remove"
                    onClick={() => setSeverityFilter('')}
                    aria-label="Remove severity filter"
                  >
                    <X size={13} />
                  </button>
                </span>
              )}

              <button
                type="button"
                onClick={() => {
                  setStatusFilter('');
                  setSeverityFilter('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '0.75rem',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                Reset All
              </button>
            </div>
          )}
        </div>
      )}

      {/* Mobile Filter Bottom Sheet */}
      {isMobile && (
        <BottomSheet
          isOpen={isFilterSheetOpen}
          onClose={() => setIsFilterSheetOpen(false)}
          title="Filter Intrusion Alerts"
          subtitle="Refine by alert status or severity"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label className="form-label" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                Alert Status
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { value: 'open', label: 'Open' },
                  { value: 'acknowledged', label: 'Acknowledged' },
                  { value: 'resolved', label: 'Resolved' },
                  { value: '', label: 'All Statuses' },
                ].map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    className={`btn ${statusFilter === s.value ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ minHeight: 44, justifyContent: 'center' }}
                    onClick={() => setStatusFilter(s.value as AlertStatus | '')}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="form-label" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                Severity Level
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { value: '', label: 'All Severities' },
                  { value: 'critical', label: 'Critical Only' },
                  { value: 'high', label: 'High Only' },
                  { value: 'medium', label: 'Medium Only' },
                  { value: 'low', label: 'Low Only' },
                ].map((sev) => (
                  <button
                    key={sev.value}
                    type="button"
                    className={`btn ${severityFilter === sev.value ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ minHeight: 44, justifyContent: 'center' }}
                    onClick={() => setSeverityFilter(sev.value as AlertSeverity | '')}
                  >
                    {sev.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              className="btn btn-primary"
              style={{ width: '100%', minHeight: 48, marginTop: 8 }}
              onClick={() => setIsFilterSheetOpen(false)}
            >
              Apply Filters
            </button>
          </div>
        </BottomSheet>
      )}

      {/* Alerts Feed */}
      {alerts.length === 0 ? (
        <div
          className="glass-panel"
          style={{ textAlign: 'center', padding: isMobile ? '36px 16px' : '48px 24px', color: 'var(--text-muted)' }}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 12 : 14 }}>
          {alerts.map((alert) => {
            const id = alert._id;
            const isExpanded = Boolean(expandedAlertIds[id]);
            const isActionLoading = actionLoadingId === id;

            return (
              <div
                key={id}
                className={isMobile ? 'mobile-sec-card' : 'glass-panel'}
                style={{
                  borderLeft: `4px solid ${
                    alert.severity === 'critical'
                      ? 'var(--color-rose)'
                      : alert.severity === 'high'
                      ? '#fb923c'
                      : alert.severity === 'medium'
                      ? 'var(--color-amber)'
                      : '#38bdf8'
                  }`,
                }}
              >
                {/* Header Row: Severity Badge + Rule + Status + Timestamp */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    marginBottom: 10,
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <SeverityBadge severity={alert.severity} size="md" />
                    <span className="badge badge-info font-mono" style={{ fontSize: '0.72rem' }}>
                      {alert.rule}
                    </span>
                    <span
                      className="badge"
                      style={{
                        background:
                          alert.status === 'open'
                            ? 'rgba(244, 63, 94, 0.12)'
                            : alert.status === 'acknowledged'
                            ? 'rgba(245, 158, 11, 0.12)'
                            : 'rgba(16, 185, 129, 0.12)',
                        color:
                          alert.status === 'open'
                            ? 'var(--color-rose)'
                            : alert.status === 'acknowledged'
                            ? 'var(--color-amber)'
                            : 'var(--color-emerald)',
                        border:
                          alert.status === 'open'
                            ? '1px solid rgba(244, 63, 94, 0.3)'
                            : alert.status === 'acknowledged'
                            ? '1px solid rgba(245, 158, 11, 0.3)'
                            : '1px solid rgba(16, 185, 129, 0.3)',
                      }}
                    >
                      {alert.status.toUpperCase()}
                    </span>
                  </div>

                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* Title & Description */}
                <h3
                  style={{
                    fontSize: isMobile ? '1rem' : '1.05rem',
                    fontWeight: 600,
                    color: '#fff',
                    marginBottom: 6,
                    lineHeight: 1.35,
                  }}
                >
                  {alert.title}
                </h3>
                <p
                  style={{
                    fontSize: '0.875rem',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.5,
                    marginBottom: 12,
                    wordBreak: 'break-word',
                  }}
                >
                  {alert.description}
                </p>

                {/* Metadata Pill Box */}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: 'rgba(11, 17, 32, 0.6)',
                    border: '1px solid var(--border-subtle)',
                    marginBottom: 12,
                    fontSize: '0.8rem',
                  }}
                >
                  <TapToCopy label="IP" value={alert.ip} />

                  {alert.userId && (
                    <TapToCopy label="User" value={alert.userId} />
                  )}

                  {alert.acknowledgedBy && (
                    <span style={{ color: 'var(--text-muted)' }}>
                      Ack: <span style={{ color: 'var(--text-primary)' }}>{alert.acknowledgedBy}</span>
                    </span>
                  )}

                  {alert.triggerEventIds && alert.triggerEventIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => toggleExpand(id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-cyan)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        cursor: 'pointer',
                        fontSize: '0.78rem',
                        marginLeft: 'auto',
                      }}
                    >
                      <Layers size={13} />
                      <span>{alert.triggerEventIds.length} trigger events</span>
                      {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                  )}
                </div>

                {/* Expanded Trigger Events Accordion */}
                {isExpanded && alert.triggerEventIds && (
                  <div
                    style={{
                      padding: 10,
                      background: 'var(--bg-app)',
                      borderRadius: 6,
                      border: '1px solid var(--border-subtle)',
                      marginBottom: 12,
                      fontSize: '0.78rem',
                    }}
                  >
                    <div style={{ color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>
                      Associated Security Event IDs:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {alert.triggerEventIds.map((tid) => (
                        <TapToCopy key={tid} value={tid} displayValue={tid.slice(0, 10) + '…'} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons: Thumb-Friendly */}
                <div
                  style={{
                    display: 'flex',
                    gap: 10,
                    marginTop: 4,
                    flexDirection: isMobile ? 'row' : 'row',
                    justifyContent: isMobile ? 'stretch' : 'flex-end',
                  }}
                >
                  {alert.status === 'open' && (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleAcknowledge(id)}
                      disabled={!canManageAlerts || isActionLoading}
                      style={{
                        flex: isMobile ? 1 : undefined,
                        minHeight: 44,
                      }}
                      title={canManageAlerts ? 'Acknowledge alert' : 'Requires analyst or admin role'}
                    >
                      {isActionLoading ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Clock size={16} />
                      )}
                      <span>Acknowledge</span>
                    </button>
                  )}

                  {alert.status !== 'resolved' && (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleResolve(id)}
                      disabled={!canManageAlerts || isActionLoading}
                      style={{
                        flex: isMobile ? 1 : undefined,
                        minHeight: 44,
                      }}
                      title={canManageAlerts ? 'Resolve alert' : 'Requires analyst or admin role'}
                    >
                      {isActionLoading ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <CheckCircle size={16} />
                      )}
                      <span>Resolve</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
