import React from 'react';

interface SvgBulletChartProps {
  actual: number; // e.g. 75
  target: number; // e.g. 85 (target/expected marker)
  max?: number;   // e.g. 100
  height?: number;
  width?: string | number;
  qualitativeRanges?: { poor: number; satisfactory: number; good: number }; // default 50, 75, 100
  unit?: string;
  className?: string;
}

export const SvgBulletChart: React.FC<SvgBulletChartProps> = ({
  actual,
  target,
  max = 100,
  height = 20,
  width = '100%',
  qualitativeRanges = { poor: 50, satisfactory: 75, good: 100 },
  unit = '%',
  className = '',
}) => {
  const normActual = Math.min(max, Math.max(0, actual));
  const normTarget = Math.min(max, Math.max(0, target));

  const actualPct = (normActual / max) * 100;
  const targetPct = (normTarget / max) * 100;

  const poorPct = (qualitativeRanges.poor / max) * 100;
  const satPct = (qualitativeRanges.satisfactory / max) * 100;

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
        {/* Qualitative Background Ranges */}
        {/* Range 1: Good (0 to 100%) */}
        <rect x="0" y="0" width="100" height="20" fill="var(--color-paper-3)" />
        {/* Range 2: Satisfactory (0 to satPct) */}
        <rect x="0" y="0" width={satPct} height="20" fill="var(--color-paper-2)" />
        {/* Range 3: Poor (0 to poorPct) */}
        <rect x="0" y="0" width={poorPct} height="20" fill="var(--color-paper-1)" fillOpacity={0.6} />

        {/* Actual Progress Bar */}
        <rect
          x="0"
          y="5"
          width={actualPct}
          height="10"
          fill="var(--color-accent)"
          className="transition-all duration-300"
        />

        {/* Target / Expected Pin Marker */}
        <line
          x1={targetPct}
          y1="1"
          x2={targetPct}
          y2="19"
          stroke="var(--color-ink)"
          strokeWidth="2"
          strokeLinecap="square"
        />
      </svg>

      {/* Direct Value Labels */}
      <div className="flex items-center justify-between text-[11px] font-mono tabular-figure text-[var(--color-ink-muted)] px-0.5">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-[1px] bg-[var(--color-accent)] inline-block" />
          <span className="font-semibold text-[var(--color-ink)]">{actual}{unit} actual</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-0.5 h-2.5 bg-[var(--color-ink)] inline-block" />
          <span>{target}{unit} target expected</span>
        </span>
      </div>
    </div>
  );
};

