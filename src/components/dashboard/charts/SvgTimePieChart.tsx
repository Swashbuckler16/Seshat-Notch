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

function pointOnCircle(cx: number, cy: number, radius: number, angle: number) {
  const radians = (angle - 90) * (Math.PI / 180);
  return { x: cx + radius * Math.cos(radians), y: cy + radius * Math.sin(radians) };
}

export const SvgTimePieChart: React.FC<SvgTimePieChartProps> = ({ items }) => {
  const totalMinutes = items.reduce((total, item) => total + item.minutes, 0);
  const slices = items.filter((item) => item.minutes > 0);
  let angle = 0;

  return (
    <div className="time-pie-layout">
      {totalMinutes > 0 ? (
        <svg className="time-pie-chart" viewBox="0 0 160 160" role="img" aria-labelledby="time-pie-title time-pie-description">
          <title id="time-pie-title">Focus time by type</title>
          <desc id="time-pie-description">
            {slices.map((item) => `${item.label}: ${item.percentage}%`).join(', ')}.
          </desc>
          {slices.length === 1 ? (
            <circle cx="80" cy="80" r="69" fill={kindColor[slices[0].kind]} />
          ) : slices.map((item) => {
            const span = (item.minutes / totalMinutes) * 360;
            const start = pointOnCircle(80, 80, 69, angle);
            const end = pointOnCircle(80, 80, 69, angle + span);
            const path = `M 80 80 L ${start.x} ${start.y} A 69 69 0 ${span > 180 ? 1 : 0} 1 ${end.x} ${end.y} Z`;
            angle += span;
            return (
              <path key={item.kind} d={path} fill={kindColor[item.kind]} stroke="var(--color-paper-2)" strokeWidth="2">
                <title>{`${item.label}: ${item.percentage}% (${formatMinutesToHuman(item.minutes)})`}</title>
              </path>
            );
          })}
        </svg>
      ) : (
        <div className="time-pie-empty" role="img" aria-label="No focus time logged yet">
          <span>No focus time yet</span>
        </div>
      )}

      <ul className="time-pie-legend" aria-label="Focus time by type">
        {items.map((item) => (
          <li key={item.kind}>
            <span className="time-pie-key" style={{ backgroundColor: kindColor[item.kind] }} aria-hidden="true" />
            <span className="time-pie-name">{item.kind === 'deep' ? 'Deep focus' : item.kind === 'learning' ? 'Learning' : 'Light focus'}</span>
            <span className="time-pie-value">{item.minutes > 0 ? `${formatMinutesToHuman(item.minutes)} (${item.percentage}%)` : '0 min'}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
