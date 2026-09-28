import React, { useState } from 'react';
import { Terminal, Copy, Check } from 'lucide-react';

export const HardwareStatusDock: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const copyStatusCmd = () => {
    navigator.clipboard.writeText('sentinel ids status');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        backgroundColor: 'var(--hub-dock-bg)',
        border: '1px solid var(--hub-dock-border)',
        borderRadius: '8px',
        padding: '0.75rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        marginTop: '3.5rem',
      }}
    >
      {/* Left: Live Daemon Indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
        <span
          className="pulse-emerald"
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: 'var(--hub-status-emerald)',
            display: 'inline-block',
            boxShadow: '0 0 8px #10B981',
          }}
        />
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.825rem',
            color: 'var(--hub-status-emerald)',
            letterSpacing: '0.01em',
          }}
        >
          Security Stack Daemon: <strong style={{ color: '#34D399' }}>OK (IDS active)</strong>{' '}
          <span style={{ color: '#475569' }}>|</span> ML Service: port 5001
        </span>
      </div>

      {/* Right: Quick Terminal Command */}
      <button
        onClick={copyStatusCmd}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          backgroundColor: '#1C1536',
          border: '1px solid #33265D',
          borderRadius: '6px',
          padding: '0.35rem 0.75rem',
          color: '#CBD5E1',
          fontSize: '0.775rem',
          fontFamily: 'var(--font-mono)',
          transition: 'border-color 0.15s, background-color 0.15s',
        }}
        title="Copy status command"
      >
        <Terminal size={14} color="#8B5CF6" />
        <span>sentinel ids status</span>
        {copied ? <Check size={13} color="#10B981" /> : <Copy size={13} color="#94A3B8" />}
      </button>
    </div>
  );
};
