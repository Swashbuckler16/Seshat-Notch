import React from 'react';
import { TimeKindBreakdown, formatMinutesToHuman } from '../../../utils/timeMath';

interface SvgTimePieChartProps {
  items: TimeKindBreakdown[];
}

const kindColor: Record<TimeKindBreakdown['kind'], string> = {
  deep: 'var(--color-chart-1)',
  learning: 'var(--color-chart-2)',
  shallow: 'var(--color-chart-3)',
};

export const SvgTimePieChart: React.FC<SvgTimePieChartProps> = ({ items }) => {
  const totalMinutes = items.reduce((total, item) => total + item.minutes, 0);

  if (totalMinutes <= 0) {
    return (
      <div className="py-4 px-3 rounded-[var(--radius-xs)] bg-[var(--color-paper-2)] border border-[var(--color-rule)] text-xs text-[var(--color-ink-muted)]">
        No focus sessions logged yet. Start a focus timer or log a block on Today to see your focus breakdown.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Stacked horizontal bar breakdown (no-donut rule) */}
      <div
        className="w-full h-3.5 rounded-[var(--radius-xs)] bg-[var(--color-paper-3)] border border-[var(--color-rule)] overflow-hidden flex"
        role="img"
        aria-label={`Focus breakdown: ${items.map((i) => `${i.label} ${i.percentage}%`).join(', ')}`}
      >
        {items
          .filter((item) => item.minutes > 0)
          .map((item) => (
            <div
              key={item.kind}
              style={{
                width: `${Math.max(4, item.percentage)}%`,
                backgroundColor: kindColor[item.kind],
              }}
              title={`${item.label}: ${formatMinutesToHuman(item.minutes)} (${item.percentage}%)`}
              className="h-full border-r border-[var(--color-paper)] last:border-r-0"
            />
          ))}
      </div>

      <ul className="time-pie-legend" aria-label="Focus time by type">
        {items.map((item) => (
          <li key={item.kind}>
            <span className="time-pie-key" style={{ backgroundColor: kindColor[item.kind] }} aria-hidden="true" />
            <span className="time-pie-name">
              {item.kind === 'deep' ? 'Deep focus' : item.kind === 'learning' ? 'Learning' : 'Light focus'}
            </span>
            <span className="time-pie-value tabular-figure font-mono">
              {item.minutes > 0 ? `${formatMinutesToHuman(item.minutes)} (${item.percentage}%)` : '0 min'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};
