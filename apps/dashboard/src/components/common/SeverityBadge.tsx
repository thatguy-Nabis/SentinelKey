import React from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  AlertOctagon,
  Info,
  CheckCircle2,
} from 'lucide-react';
import type { AlertSeverity, EventSeverity } from '@sentinelkey/shared-types';

type AnySeverity = AlertSeverity | EventSeverity | 'success';

interface SeverityBadgeProps {
  severity: AnySeverity;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({
  severity,
  size = 'md',
  showIcon = true,
  className = '',
}) => {
  const norm = severity.toLowerCase() as AnySeverity;

  const getConfig = () => {
    switch (norm) {
      case 'critical':
        return {
          label: 'CRITICAL',
          cssClass: 'badge-critical',
          Icon: ShieldAlert,
        };
      case 'high':
        return {
          label: 'HIGH',
          cssClass: 'badge-high',
          Icon: AlertTriangle,
        };
      case 'medium':
        return {
          label: 'MEDIUM',
          cssClass: 'badge-medium',
          Icon: AlertOctagon,
        };
      case 'success':
        return {
          label: 'SUCCESS',
          cssClass: 'badge-success',
          Icon: CheckCircle2,
        };
      case 'low':
      case 'info':
      default:
        return {
          label: norm.toUpperCase(),
          cssClass: 'badge-low',
          Icon: Info,
        };
    }
  };

  const { label, cssClass, Icon } = getConfig();
  const iconSize = size === 'sm' ? 11 : size === 'lg' ? 16 : 13;

  return (
    <span className={`badge ${cssClass} severity-badge-${size} ${className}`}>
      {showIcon && <Icon size={iconSize} aria-hidden="true" />}
      <span>{label}</span>
    </span>
  );
};
