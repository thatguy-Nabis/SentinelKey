import React, { useEffect, useState } from 'react';
import type { ISecurityEvent, EventSeverity } from '@sentinelkey/shared-types';
import * as api from '../../services/api';
import { Search, Filter, RefreshCw, Eye, X, Terminal } from 'lucide-react';

export const LogsView: React.FC = () => {
  const [logs, setLogs] = useState<ISecurityEvent[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [ipFilter, setIpFilter] = useState<string>('');

  // Selected event for metadata inspect modal
  const [selectedEvent, setSelectedEvent] = useState<ISecurityEvent | null>(null);

  const fetchLogs = async (currentPage = page) => {
    setIsLoading(true);
    try {
      const res = await api.fetchLogs({
        page: currentPage,
        limit: 20,
        type: typeFilter || undefined,
        severity: severityFilter || undefined,
        ip: ipFilter.trim() || undefined,
      });

      setLogs(res.data || []);
      setTotalPages(res.pagination.totalPages || 1);
      setTotalCount(res.pagination.total || 0);
      setPage(res.pagination.page || 1);
    } catch (err) {
      console.error('Error fetching security logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, [typeFilter, severityFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs(1);
  };

  const getSeverityBadgeClass = (severity: EventSeverity) => {
    switch (severity) {
      case 'critical':
        return 'badge-critical';
      case 'high':
        return 'badge-high';
      case 'medium':
        return 'badge-medium';
      case 'low':
      case 'info':
      default:
        return 'badge-low';
    }
  };

  return (
    <div className="content-body">
      {/* Controls Bar */}
      <div
        className="glass-panel"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 16,
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
          padding: '16px 20px',
        }}
      >
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 10, flex: 1, minWidth: 260 }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: 360 }}>
            <Search
              size={16}
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: 38 }}
              placeholder="Filter by IP address..."
              value={ipFilter}
              onChange={e => setIpFilter(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-secondary btn-sm">
            Search
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Event Type Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Filter size={14} style={{ color: 'var(--text-muted)' }} />
            <select
              className="form-select font-mono"
              style={{ padding: '6px 12px', fontSize: '0.8rem', width: 190 }}
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
            >
              <option value="">All Event Types</option>
              <option value="AUTH_LOGIN_SUCCESS">AUTH_LOGIN_SUCCESS</option>
              <option value="AUTH_LOGIN_FAILED">AUTH_LOGIN_FAILED</option>
              <option value="AUTH_TOKEN_REUSE">AUTH_TOKEN_REUSE</option>
              <option value="MFA_LOGIN_SUCCESS">MFA_LOGIN_SUCCESS</option>
              <option value="MFA_LOGIN_FAILED">MFA_LOGIN_FAILED</option>
              <option value="MFA_LOCKOUT">MFA_LOCKOUT</option>
              <option value="PERMISSION_DENIED">PERMISSION_DENIED</option>
              <option value="RATE_LIMIT_EXCEEDED">RATE_LIMIT_EXCEEDED</option>
            </select>
          </div>

          {/* Severity Filter */}
          <select
            className="form-select"
            style={{ padding: '6px 12px', fontSize: '0.8rem', width: 140 }}
            value={severityFilter}
            onChange={e => setSeverityFilter(e.target.value)}
          >
            <option value="">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
            <option value="info">Info</option>
          </select>

          <button
            onClick={() => fetchLogs(page)}
            className="btn btn-secondary btn-sm"
            title="Refresh logs table"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Event Type</th>
              <th>Severity</th>
              <th>IP Address</th>
              <th>User ID / Account</th>
              <th>Details</th>
              <th>Inspect</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                  {isLoading ? 'Loading security event stream...' : 'No security events found matching criteria.'}
                </td>
              </tr>
            ) : (
              logs.map(evt => (
                <tr key={evt._id}>
                  <td className="font-mono" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {new Date(evt.timestamp).toLocaleString()}
                  </td>
                  <td>
                    <span
                      className="font-mono"
                      style={{
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        color: evt.type.includes('FAIL') || evt.type.includes('REUSE') || evt.type.includes('LOCKOUT') || evt.type.includes('DENIED')
                          ? 'var(--color-rose)'
                          : 'var(--color-cyan)',
                      }}
                    >
                      {evt.type}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${getSeverityBadgeClass(evt.severity)}`}>
                      {evt.severity}
                    </span>
                  </td>
                  <td className="font-mono" style={{ fontSize: '0.85rem' }}>
                    {evt.ip}
                  </td>
                  <td style={{ fontSize: '0.85rem', color: evt.userId ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    {evt.metadata?.email ?? evt.userId ?? 'Anonymous / Unknown'}
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {evt.metadata?.location?.city
                      ? `${evt.metadata.location.city} (${evt.metadata.location.country ?? ''})`
                      : evt.metadata?.path ?? '-'}
                  </td>
                  <td>
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '3px 8px' }}
                      onClick={() => setSelectedEvent(evt)}
                    >
                      <Eye size={12} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 16,
          padding: '0 4px',
          fontSize: '0.85rem',
          color: 'var(--text-secondary)',
        }}
      >
        <span>
          Showing {logs.length} of {totalCount} events
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => fetchLogs(page - 1)}
            disabled={page <= 1 || isLoading}
          >
            Previous
          </button>
          <span style={{ display: 'flex', alignItems: 'center', padding: '0 8px', fontFamily: 'var(--font-mono)' }}>
            Page {page} of {totalPages}
          </span>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => fetchLogs(page + 1)}
            disabled={page >= totalPages || isLoading}
          >
            Next
          </button>
        </div>
      </div>

      {/* Event Details Drawer Modal */}
      {selectedEvent && (
        <div className="modal-overlay" onClick={() => setSelectedEvent(null)}>
          <div className="modal-content" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Terminal size={18} style={{ color: 'var(--color-cyan)' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Security Event Details</h3>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ marginBottom: 16, display: 'flex', gap: 10 }}>
              <span className={`badge ${getSeverityBadgeClass(selectedEvent.severity)}`}>
                {selectedEvent.severity}
              </span>
              <span className="badge badge-info font-mono">{selectedEvent.type}</span>
            </div>

            <pre
              className="font-mono"
              style={{
                background: 'var(--bg-app)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 8,
                padding: 16,
                fontSize: '0.8rem',
                color: 'var(--color-cyan)',
                maxHeight: 360,
                overflowY: 'auto',
              }}
            >
              {JSON.stringify(selectedEvent, null, 2)}
            </pre>

            <div style={{ textAlign: 'right', marginTop: 20 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setSelectedEvent(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
