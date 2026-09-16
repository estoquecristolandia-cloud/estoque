import React from 'react';
import { LucideIcon } from 'lucide-react';

export type StatusType = 'success' | 'warning' | 'critical' | 'info' | 'normal' | 'alerta' | 'critico';

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  icon?: LucideIcon;
  showDot?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

function normalizeStatus(s: StatusType): 'success' | 'warning' | 'critical' | 'info' {
  switch (s) {
    case 'normal':
    case 'success':
      return 'success';
    case 'alerta':
    case 'warning':
      return 'warning';
    case 'critico':
    case 'critical':
      return 'critical';
    case 'info':
    default:
      return 'info';
  }
}

const STATUS_CONFIG = {
  success: {
    label: 'NORMAL',
    dotBg: 'bg-status-success',
    badgeClass: 'bg-status-success-bg text-status-success border-status-success-border',
  },
  warning: {
    label: 'ALERTA',
    dotBg: 'bg-status-warning',
    badgeClass: 'bg-status-warning-bg text-status-warning border-status-warning-border',
  },
  critical: {
    label: 'CRÍTICO',
    dotBg: 'bg-status-critical',
    badgeClass: 'bg-status-critical-bg text-status-critical border-status-critical-border',
  },
  info: {
    label: 'INFO',
    dotBg: 'bg-status-info',
    badgeClass: 'bg-status-info-bg text-status-info border-status-info-border',
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  icon: Icon,
  showDot = true,
  size = 'md',
  className = '',
}) => {
  const norm = normalizeStatus(status);
  const config = STATUS_CONFIG[norm];
  const displayLabel = label || config.label;

  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-xs font-medium gap-1'
      : 'px-2.5 py-1 text-xs font-semibold tracking-wider gap-1.5';

  return (
    <span
      className={`inline-flex items-center rounded-full border ${config.badgeClass} ${sizeClasses} ${className}`}
    >
      {showDot && !Icon && (
        <span className={`h-1.5 w-1.5 rounded-full ${config.dotBg} animate-pulse`} />
      )}
      {Icon && <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />}
      <span>{displayLabel}</span>
    </span>
  );
};
