import React from 'react';
import { DailyTimeRecord, formatMinutesToHuman } from '../../../utils/timeMath';

interface SvgWeeklyFocusChartProps {
  days: DailyTimeRecord[];
}

export const SvgWeeklyFocusChart: React.FC<SvgWeeklyFocusChartProps> = ({ days }) => {
  const recentDays = days.slice(-7);
  const maxMinutes = Math.max(60, ...recentDays.map((day) => day.totalMinutes));
  const chartTop = 18;
  const chartBottom = 150;
  const chartRange = chartBottom - chartTop;
  const step = 332 / Math.max(recentDays.length, 1);
  const barWidth = Math.min(24, step * 0.56);
  const summary = recentDays.map((day) => `${day.dayLabel} ${formatMinutesToHuman(day.totalMinutes)}`).join(', ');

  if (recentDays.length === 0 || recentDays.every((day) => day.totalMinutes === 0)) {
    return <p className="focus-chart-empty">Your daily focus time will appear here.</p>;
  }

  return (
    <svg className="weekly-focus-chart" viewBox="0 0 360 184" role="img" aria-label={`Daily focus time for the last seven days: ${summary}`}>
      <line x1="18" y1={chartBottom} x2="350" y2={chartBottom} stroke="var(--color-rule)" strokeWidth="1" />
      {[0.5, 1].map((fraction) => {
        const y = chartBottom - chartRange * fraction;
        return <line key={fraction} x1="18" y1={y} x2="350" y2={y} stroke="var(--color-rule-subtle)" strokeWidth="1" />;
      })}
      {recentDays.map((day, index) => {
        const x = step * index + (step - barWidth) / 2 + 18;
        const height = Math.max(0, (day.totalMinutes / maxMinutes) * chartRange);
        const y = chartBottom - height;
        const valueLabel = formatMinutesToHuman(day.totalMinutes);
        return (
          <g key={day.dateStr}>
            <rect x={x} y={y} width={barWidth} height={height} rx="7" fill="var(--color-accent)" />
            <text x={x + barWidth / 2} y="174" textAnchor="middle" fill="var(--color-ink-muted)" fontSize="12">{day.dayLabel}</text>
            <text x={x + barWidth / 2} y={Math.max(chartTop + 12, y - 6)} textAnchor="middle" fill="var(--color-ink)" fontSize="11" fontWeight="600">{valueLabel}</text>
            <title>{`${day.dateStr}: ${formatMinutesToHuman(day.totalMinutes)}`}</title>
          </g>
        );
      })}
      <title>Daily focus time</title>
      <desc>{summary}</desc>
    </svg>
  );
};
