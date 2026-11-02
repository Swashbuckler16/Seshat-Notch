import React from 'react';

export interface HorizonCompletionRecord {
  horizon: 'day' | 'week' | 'month';
  label: string; // "Daily Targets", "Weekly Targets", "Monthly Targets"
  completed: number;
  total: number;
  rate: number; // 0 to 100
}

interface SvgHorizonBarChartProps {
  records: HorizonCompletionRecord[];
  className?: string;
}

export const SvgHorizonBarChart: React.FC<SvgHorizonBarChartProps> = ({ records, className = '' }) => {
  return (
    <div className={`flex flex-col gap-3 w-full ${className}`}>
      {records.map((r) => (
        <div key={r.horizon} className="flex flex-col gap-1 surface-well p-3 rounded-[var(--radius-xs)] border border-[var(--color-rule)]">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-[var(--color-ink)]">{r.label}</span>
            <div className="flex items-center gap-2">
              <span className="text-[var(--color-ink-muted)]">
                {r.completed}/{r.total} completed
              </span>
              <span className="font-semibold tabular-figure text-[var(--color-accent)] w-10 text-right">
                {r.rate}%
              </span>
            </div>
          </div>

          {/* SVG Progress Bar */}
          <svg
            width="100%"
            height="10"
            viewBox="0 0 100 10"
            preserveAspectRatio="none"
            className="w-full rounded-[1px] overflow-hidden bg-[var(--color-paper-3)] border border-[var(--color-rule)]"
            aria-hidden="true"
          >
            <rect
              x="0"
              y="0"
              width="100"
              height="10"
              fill="var(--color-accent)"
              className="chart-fill-transition"
              style={{ transform: `scaleX(${Math.max(0, Math.min(100, r.rate)) / 100})` }}
            />
          </svg>
        </div>
      ))}
    </div>
  );
};

