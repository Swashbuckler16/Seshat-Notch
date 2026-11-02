import React, { useState } from 'react';

export interface MoodEnergyDataPoint {
  period: string; // date or week
  energy?: number; // 1 to 5
  mood?: number;   // 1 to 5
}

interface SvgMoodEnergyTrendProps {
  data: MoodEnergyDataPoint[];
  height?: number;
  className?: string;
}

export const SvgMoodEnergyTrend: React.FC<SvgMoodEnergyTrendProps> = ({
  data,
  height = 120,
  className = '',
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="h-28 flex items-center justify-center text-xs text-[var(--color-ink-muted)] surface-well rounded-[var(--radius-xs)] border border-[var(--color-rule)]">
        No energy or mood ratings recorded in reviews yet.
      </div>
    );
  }

  const chartW = 380;
  const paddingX = 24;
  const paddingY = 16;
  const innerW = chartW - paddingX * 2;
  const innerH = height - paddingY * 2;

  const getX = (idx: number) => paddingX + (idx / Math.max(1, data.length - 1)) * innerW;
  // Ratings from 1 to 5
  const getY = (rating: number) => paddingY + innerH - ((rating - 1) / 4) * innerH;

  const getSegments = (rating: 'energy' | 'mood') => {
    const segments: string[][] = [];
    data.forEach((point, index) => {
      const value = point[rating];
      if (value === undefined) return;
      let segment = segments[segments.length - 1];
      if (index === 0 || data[index - 1][rating] === undefined) {
        segment = [];
        segments.push(segment);
      }
      segment.push(`${getX(index)},${getY(value)}`);
    });
    return segments.filter((segment) => segment.length > 1);
  };

  const energySegments = getSegments('energy');
  const moodSegments = getSegments('mood');

  const activePoint = hoverIndex !== null && data[hoverIndex] ? data[hoverIndex] : data[data.length - 1];
  const chartSummary = data.map((point) =>
    `${point.period}: energy ${point.energy ?? 'not rated'} out of 5, mood ${point.mood ?? 'not rated'} out of 5`
  ).join('; ');

  return (
    <div className={`flex flex-col gap-2 w-full ${className}`}>
      {/* Top Value Readout */}
      <div className="flex items-center justify-between text-xs font-mono tabular-figure text-[var(--color-ink-muted)]">
        <span className="font-semibold text-[var(--color-ink)]">
          {activePoint.period}
        </span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-[var(--color-accent)] inline-block" />
            <span className="text-[var(--color-ink)]">
              Energy: {activePoint.energy ? `${activePoint.energy}/5` : '-'}
            </span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-[var(--color-chart-2)] inline-block" />
            <span className="text-[var(--color-ink)]">
              Mood: {activePoint.mood ? `${activePoint.mood}/5` : '-'}
            </span>
          </span>
        </div>
      </div>

      {/* SVG Container */}
      <div className="surface-well rounded-[var(--radius-xs)] border border-[var(--color-rule)] p-2 overflow-hidden">
        <svg
          viewBox={`0 0 ${chartW} ${height}`}
          className="w-full h-auto overflow-visible select-none"
          preserveAspectRatio="none"
          role="img"
          aria-label={`Mood and energy ratings over time. ${chartSummary}`}
        >
          {/* Horizontal Level Guides 1 to 5 */}
          {[1, 2, 3, 4, 5].map((level) => {
            const y = getY(level);
            return (
              <g key={level}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={chartW - paddingX}
                  y2={y}
                  stroke="var(--color-rule)"
                  strokeWidth={1}
                  strokeDasharray="2,2"
                />
                <text
                  x={paddingX - 6}
                  y={y + 3}
                  textAnchor="end"
                  fontSize="9"
                  fill="var(--color-ink-muted)"
                  fontFamily="monospace"
                >
                  {level}
                </text>
              </g>
            );
          })}

          {/* Energy Rating Line */}
          {energySegments.map((points, index) => (
            <polyline
              key={`energy-${index}`}
              points={points.join(' ')}
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {/* Mood Rating Line */}
          {moodSegments.map((points, index) => (
            <polyline
              key={`mood-${index}`}
              points={points.join(' ')}
              fill="none"
              stroke="var(--color-chart-2)"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {/* Points & Interactive Scrubber */}
          {data.map((d, idx) => {
            const x = getX(idx);
            const isHovered = hoverIndex === idx;

            return (
              <g
                key={idx}
                onMouseEnter={() => setHoverIndex(idx)}
                onMouseLeave={() => setHoverIndex(null)}
                className="cursor-pointer"
              >
                <rect
                  x={x - (innerW / data.length) / 2}
                  y={paddingY}
                  width={innerW / data.length}
                  height={innerH}
                  fill="transparent"
                />

                {d.energy !== undefined && (
                  <circle
                    cx={x}
                    cy={getY(d.energy)}
                    r={isHovered ? 4 : 2.5}
                    fill="var(--color-accent)"
                  />
                )}

                {d.mood !== undefined && (
                  <circle
                    cx={x}
                    cy={getY(d.mood)}
                    r={isHovered ? 4 : 2}
                    fill="var(--color-chart-2)"
                  />
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

