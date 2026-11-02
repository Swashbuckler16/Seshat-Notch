import React from 'react';

interface SvgBulletChartProps {
  actual: number; // e.g. 75
  max?: number;   // e.g. 100
  height?: number;
  width?: string | number;
  className?: string;
}

export const SvgBulletChart: React.FC<SvgBulletChartProps> = ({
  actual,
  max = 100,
  height = 20,
  width = '100%',
  className = '',
}) => {
  const normActual = Math.min(max, Math.max(0, actual));
  const actualPct = (normActual / max) * 100;

  return (
    <div className={`flex flex-col gap-1 w-full ${className}`}>
      {/* SVG Container */}
      <svg
        width={width}
        height={height}
        viewBox="0 0 100 20"
        preserveAspectRatio="none"
        className="w-full rounded-[1px] overflow-hidden border border-[var(--color-rule)] select-none"
        aria-hidden="true"
      >
        {/* Actual progress against an unsegmented track. */}
        <rect x="0" y="0" width="100" height="20" fill="var(--color-paper-3)" />

        {/* Actual Progress Bar */}
        <rect
          x="0"
          y="5"
          width="100"
          height="10"
          fill="var(--color-accent)"
          className="chart-fill-transition"
          style={{ transform: `scaleX(${actualPct / 100})` }}
        />
      </svg>

      {/* Direct Value Labels */}
      <div className="flex items-center justify-between text-[11px] font-mono tabular-figure text-[var(--color-ink-muted)] px-0.5">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-[1px] bg-[var(--color-accent)] inline-block" />
          <span className="font-semibold text-[var(--color-ink)]">{actual}% complete</span>
        </span>
        <span>Based on completed goals</span>
      </div>
    </div>
  );
};

