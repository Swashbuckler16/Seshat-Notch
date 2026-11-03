import React from 'react';
import { ScheduleStatus } from '../types';

interface StatusBadgeProps {
  status: ScheduleStatus;
  ratio?: number;
  customLabel?: string;
  className?: string;
}

const STATUS_CONFIG: Record<ScheduleStatus, { label: string; glyph: string; colorVar: string; bgVar: string }> = {
  on_track: {
    label: 'On track',
    glyph: '●',
    colorVar: 'var(--color-status-on-track)',
    bgVar: 'var(--color-status-on-track-bg)',
  },
  at_risk: {
    label: 'At risk',
    glyph: '▲',
    colorVar: 'var(--color-status-at-risk)',
    bgVar: 'var(--color-status-at-risk-bg)',
  },
  behind: {
    label: 'Behind',
    glyph: '■',
    colorVar: 'var(--color-status-behind)',
    bgVar: 'var(--color-status-behind-bg)',
  },
  paused: {
    label: 'Paused',
    glyph: '◆',
    colorVar: 'var(--color-status-paused)',
    bgVar: 'var(--color-status-paused-bg)',
  },
};

/**
 * Hallmark Status Badge
 * Never relies on color alone: binds explicit word + geometric glyph + ratio figure
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  ratio,
  customLabel,
  className = '',
}) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.paused;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[var(--radius-xs)] text-xs font-medium border border-[var(--color-rule)] ${className}`}
      style={{
        backgroundColor: config.bgVar,
        color: config.colorVar,
      }}
    >
      <span className="text-[10px] leading-none" aria-hidden="true">
        {config.glyph}
      </span>
      <span>{customLabel || config.label}</span>
      {ratio !== undefined && (
        <span className="font-mono text-[11px] tabular-figure opacity-85">
          ({(ratio * 100).toFixed(0)}%)
        </span>
      )}
    </span>
  );
};

