import React, { useEffect, useState } from 'react';
import type { ISecurityEvent, EventSeverity } from '@sentinelkey/shared-types';
import * as api from '../../services/api';
import {
  Search,
  RefreshCw,
  Eye,
  Terminal,
  SlidersHorizontal,
  X,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { BottomSheet } from '../common/BottomSheet';
import { SeverityBadge } from '../common/SeverityBadge';
import { TapToCopy } from '../common/TapToCopy';

export const LogsView: React.FC = () => {
  const isMobile = useIsMobile(768);

  const [logs, setLogs] = useState<ISecurityEvent[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [ipFilter, setIpFilter] = useState<string>('');
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  // Selected event for metadata inspect modal or bottom sheet
  const [selectedEvent, setSelectedEvent] = useState<ISecurityEvent | null>(null);
  const [jsonCopied, setJsonCopied] = useState(false);

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

  const handleCopyJson = async () => {
    if (!selectedEvent) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(selectedEvent, null, 2));
      setJsonCopied(true);
      setTimeout(() => setJsonCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const activeFiltersCount = (typeFilter ? 1 : 0) + (severityFilter ? 1 : 0) + (ipFilter ? 1 : 0);

  return (
    <div className="content-body">
      {/* Desktop Controls Bar */}
      {!isMobile ? (
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
                onChange={(e) => setIpFilter(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-secondary btn-sm">
              Search
            </button>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Event Type Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <select
                className="form-select font-mono"
                style={{ padding: '6px 12px', fontSize: '0.8rem', width: 190 }}
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
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
              onChange={(e) => setSeverityFilter(e.target.value)}
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
      ) : (
        /* Mobile Controls: Sticky Search + Filter Bottom Sheet Trigger */
        <div style={{ marginBottom: 14 }}>
          <form
            onSubmit={handleSearchSubmit}
            style={{ display: 'flex', gap: 8, marginBottom: 10 }}
          >
            <div style={{ position: 'relative', flex: 1 }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: 38, minHeight: 44 }}
                placeholder="Search by IP address..."
                value={ipFilter}
                onChange={(e) => setIpFilter(e.target.value)}
              />
              {ipFilter && (
                <button
                  type="button"
                  onClick={() => {
                    setIpFilter('');
                    fetchLogs(1);
                  }}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsFilterSheetOpen(true)}
              style={{ width: 44, height: 44, padding: 0 }}
              aria-label="Filter events"
            >
              <SlidersHorizontal size={16} color={activeFiltersCount > 0 ? 'var(--color-cyan)' : 'inherit'} />
            </button>

            <button
              type="button"
              onClick={() => fetchLogs(page)}
              disabled={isLoading}
              className="btn btn-secondary"
              style={{ width: 44, height: 44, padding: 0 }}
              aria-label="Refresh events"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </form>

          {/* Active Filter Chips */}
          {activeFiltersCount > 0 && (
            <div className="filter-chips-bar">
              {typeFilter && (
                <span className="filter-chip">
                  <span>Type: {typeFilter}</span>
                  <button
                    className="filter-chip-remove"
                    onClick={() => setTypeFilter('')}
                    aria-label="Remove type filter"
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

              {ipFilter && (
                <span className="filter-chip">
                  <span>IP: {ipFilter}</span>
                  <button
                    className="filter-chip-remove"
                    onClick={() => {
                      setIpFilter('');
                      fetchLogs(1);
                    }}
                    aria-label="Remove IP filter"
                  >
                    <X size={13} />
                  </button>
                </span>
              )}

              <button
                type="button"
                onClick={() => {
                  setTypeFilter('');
                  setSeverityFilter('');
                  setIpFilter('');
                  fetchLogs(1);
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

      {/* Mobile Filters Bottom Sheet */}
      {isMobile && (
        <BottomSheet
          isOpen={isFilterSheetOpen}
          onClose={() => setIsFilterSheetOpen(false)}
          title="Filter Security Audit Stream"
          subtitle="Refine by event type and severity"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="form-label">Event Type</label>
              <select
                className="form-select font-mono"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
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

            <div>
              <label className="form-label">Severity Level</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { value: '', label: 'All Severities' },
                  { value: 'critical', label: 'Critical Only' },
                  { value: 'high', label: 'High Only' },
                  { value: 'medium', label: 'Medium Only' },
                  { value: 'low', label: 'Low / Info' },
                ].map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    className={`btn ${severityFilter === s.value ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ minHeight: 44, justifyContent: 'center' }}
                    onClick={() => setSeverityFilter(s.value as EventSeverity | '')}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              className="btn btn-primary"
              style={{ width: '100%', minHeight: 48, marginTop: 8 }}
              onClick={() => {
                setIsFilterSheetOpen(false);
                fetchLogs(1);
              }}
            >
              Apply Filters
            </button>
          </div>
        </BottomSheet>
      )}

      {/* Desktop Table View (>= 768px) */}
      {!isMobile && (
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
                logs.map((evt) => (
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
                          color:
                            evt.type.includes('FAIL') ||
                            evt.type.includes('REUSE') ||
                            evt.type.includes('LOCKOUT') ||
                            evt.type.includes('DENIED')
                              ? 'var(--color-rose)'
                              : 'var(--color-cyan)',
                        }}
                      >
                        {evt.type}
                      </span>
                    </td>
                    <td>
                      <SeverityBadge severity={evt.severity} size="sm" />
                    </td>
                    <td className="font-mono" style={{ fontSize: '0.85rem' }}>
                      <TapToCopy value={evt.ip} />
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
                        aria-label="Inspect event"
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
      )}

      {/* Mobile Card Stream (< 768px): Purpose-Built Security Cards */}
      {isMobile && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {logs.length === 0 ? (
            <div
              className="glass-panel"
              style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-muted)' }}
            >
              <Terminal size={36} style={{ color: 'var(--color-cyan)', marginBottom: 8, opacity: 0.6 }} />
              <p style={{ fontSize: '0.9rem' }}>
                {isLoading ? 'Streaming audit events...' : 'No security events found matching criteria.'}
              </p>
            </div>
          ) : (
            logs.map((evt) => {
              const isAnomaly =
                evt.type.includes('FAIL') ||
                evt.type.includes('REUSE') ||
                evt.type.includes('LOCKOUT') ||
                evt.type.includes('DENIED');

              return (
                <div
                  key={evt._id}
                  className="mobile-sec-card"
                  onClick={() => setSelectedEvent(evt)}
                  style={{
                    cursor: 'pointer',
                    borderLeft: `4px solid ${
                      evt.severity === 'critical'
                        ? 'var(--color-rose)'
                        : evt.severity === 'high'
                        ? '#fb923c'
                        : evt.severity === 'medium'
                        ? 'var(--color-amber)'
                        : 'var(--color-cyan)'
                    }`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <SeverityBadge severity={evt.severity} size="sm" />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>

                  <div
                    className="font-mono"
                    style={{
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      color: isAnomaly ? 'var(--color-rose)' : 'var(--color-cyan)',
                      marginBottom: 8,
                      wordBreak: 'break-all',
                    }}
                  >
                    {evt.type}
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                    <TapToCopy label="IP" value={evt.ip} />

                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {evt.metadata?.email ?? evt.userId ?? 'Anonymous'}
                    </span>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      borderTop: '1px solid var(--border-subtle)',
                      paddingTop: 8,
                    }}
                  >
                    <span>
                      {evt.metadata?.location?.city
                        ? `📍 ${evt.metadata.location.city} (${evt.metadata.location.country ?? ''})`
                        : evt.metadata?.path
                        ? `Route: ${evt.metadata.path}`
                        : 'System Probe'}
                    </span>
                    <span style={{ color: 'var(--color-cyan)', fontWeight: 600 }}>Inspect &rarr;</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Pagination Footer */}
      <div
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'stretch' : 'center',
          gap: 12,
          marginTop: 16,
          padding: '0 4px',
          fontSize: '0.85rem',
          color: 'var(--text-secondary)',
        }}
      >
        <span style={{ textAlign: isMobile ? 'center' : 'left' }}>
          Showing {logs.length} of {totalCount} events
        </span>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => fetchLogs(page - 1)}
            disabled={page <= 1 || isLoading}
            style={{ flex: isMobile ? 1 : undefined, minHeight: 44 }}
          >
            <ChevronLeft size={16} />
            Previous
          </button>
          <span style={{ display: 'flex', alignItems: 'center', padding: '0 8px', fontFamily: 'var(--font-mono)' }}>
            Page {page} of {totalPages}
          </span>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => fetchLogs(page + 1)}
            disabled={page >= totalPages || isLoading}
            style={{ flex: isMobile ? 1 : undefined, minHeight: 44 }}
          >
            Next
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Event Details: Desktop Modal or Mobile Bottom Sheet */}
      {selectedEvent && (
        isMobile ? (
          <BottomSheet
            isOpen={Boolean(selectedEvent)}
            onClose={() => setSelectedEvent(null)}
            title="Event Audit Telemetry"
            subtitle={`${selectedEvent.type} • ${new Date(selectedEvent.timestamp).toLocaleTimeString()}`}
            maxHeight="90vh"
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <SeverityBadge severity={selectedEvent.severity} size="md" />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleCopyJson}
                  style={{ marginLeft: 'auto', gap: 6, minHeight: 36 }}
                >
                  {jsonCopied ? <Check size={14} color="var(--color-emerald)" /> : <Copy size={14} />}
                  <span>{jsonCopied ? 'Copied JSON' : 'Copy JSON'}</span>
                </button>
              </div>

              {/* Formatted Attributes */}
              <div
                style={{
                  background: 'var(--bg-app)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 14,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  fontSize: '0.82rem',
                }}
              >
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Event ID: </span>
                  <TapToCopy value={selectedEvent._id} />
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Source IP: </span>
                  <TapToCopy value={selectedEvent.ip} />
                </div>
                {selectedEvent.userId && (
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>User Account: </span>
                    <span style={{ color: 'var(--text-primary)' }}>{selectedEvent.userId}</span>
                  </div>
                )}
                {selectedEvent.metadata?.location && (
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Geo-Location: </span>
                    <span style={{ color: 'var(--text-primary)' }}>
                      {selectedEvent.metadata.location.city}, {selectedEvent.metadata.location.country}
                    </span>
                  </div>
                )}
              </div>

              <pre
                className="font-mono"
                style={{
                  background: 'var(--bg-app)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 8,
                  padding: 14,
                  fontSize: '0.78rem',
                  color: 'var(--color-cyan)',
                  maxHeight: 260,
                  overflowY: 'auto',
                  WebkitOverflowScrolling: 'touch',
                }}
              >
                {JSON.stringify(selectedEvent, null, 2)}
              </pre>

              <button
                type="button"
                className="btn btn-secondary"
                style={{ width: '100%', minHeight: 44, marginTop: 16 }}
                onClick={() => setSelectedEvent(null)}
              >
                Close Inspector
              </button>
            </div>
          </BottomSheet>
        ) : (
          /* Desktop Centered Modal */
          <div className="modal-overlay" onClick={() => setSelectedEvent(null)}>
            <div className="modal-content" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
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

              <div style={{ marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
                <SeverityBadge severity={selectedEvent.severity} size="md" />
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
        )
      )}
    </div>
  );
};
