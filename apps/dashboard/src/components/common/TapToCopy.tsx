import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface TapToCopyProps {
  value: string;
  displayValue?: string;
  label?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const TapToCopy: React.FC<TapToCopyProps> = ({
  value,
  displayValue,
  label,
  className = '',
  style,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback if clipboard API is restricted
      const textarea = document.createElement('textarea');
      textarea.value = value;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      type="button"
      className={`tap-to-copy-pill ${copied ? 'copied' : ''} ${className}`}
      onClick={handleCopy}
      title={`Click to copy: ${value}`}
      aria-label={`Copy ${label || value}`}
      style={style}
    >
      {label && <span className="copy-label">{label}:</span>}
      <span className="copy-text font-mono">{displayValue || value}</span>
      <span className="copy-icon" aria-hidden="true">
        {copied ? <Check size={13} className="text-emerald" /> : <Copy size={13} />}
      </span>
      {copied && <span className="copy-status">Copied!</span>}
    </button>
  );
};
