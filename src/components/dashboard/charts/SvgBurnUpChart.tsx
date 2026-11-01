import React, { useState } from 'react';

export interface BurnUpPoint {
  date: string; // YYYY-MM-DD
  label: string; // e.g. "W42", "Oct 15"
  scope: number; // total planned
  completed: number; // cumulative completed
}

interface SvgBurnUpChartProps {
  data: BurnUpPoint[];
  width?: number;
  height?: number;
  unit?: string;
  className?: string;
}

export const SvgBurnUpChart: React.FC<SvgBurnUpChartProps> = ({
  data,
  height = 140,
  unit = 'pts',
  className = '',
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="h-32 flex items-center justify-center text-xs text-[var(--color-ink-muted)] surface-well rounded-[var(--radius-xs)] border border-[var(--color-rule)]">
        Not enough historical log points for burn-up analysis.
      </div>
    );
  }

  const maxVal = Math.max(1, ...data.map((d) => Math.max(d.scope, d.completed)));
  const paddingX = 24;
  const paddingY = 16;
  const chartW = 400; // viewBox width
  const chartH = height;
  const innerW = chartW - paddingX * 2;
  const innerH = chartH - paddingY * 2;

  const getX = (idx: number) => paddingX + (idx / Math.max(1, data.length - 1)) * innerW;
  const getY = (val: number) => paddingY + innerH - (val / maxVal) * innerH;

  const scopePoints = data.map((d, i) => `${getX(i)},${getY(d.scope)}`).join(' ');
  const completedPoints = data.map((d, i) => `${getX(i)},${getY(d.completed)}`).join(' ');

  // Filled polygon between completed and baseline
  const firstX = getX(0);
  const lastX = getX(data.length - 1);
  const baseY = getY(0);
  const completedFill = `${completedPoints} ${lastX},${baseY} ${firstX},${baseY}`;

  const activePoint = hoverIndex !== null && data[hoverIndex] ? data[hoverIndex] : data[data.length - 1];

  return (
    <div className={`flex flex-col gap-2 w-full ${className}`}>
      {/* Top Value Readout on Hover */}
      <div className="flex items-center justify-between text-xs font-mono tabular-figure text-[var(--color-ink-muted)]">
        <span className="font-semibold text-[var(--color-ink)]">
          {activePoint.date} ({activePoint.label})
        </span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-0.5 bg-[var(--color-ink)]" />
            <span>Scope: {activePoint.scope} {unit}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-[1px] bg-[var(--color-accent)]" />
            <span className="font-semibold text-[var(--color-accent)]">
              Done: {activePoint.completed} {unit}
            </span>
          </span>
        </div>
      </div>

      {/* SVG Container */}
      <div className="surface-well rounded-[var(--radius-xs)] border border-[var(--color-rule)] p-2 overflow-hidden">
        <svg
          viewBox={`0 0 ${chartW} ${chartH}`}
          className="w-full h-auto overflow-visible select-none"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {/* Horizontal Grid lines (0%, 50%, 100%) */}
          {[0, 0.5, 1].map((pct) => {
            const y = paddingY + innerH - pct * innerH;
            return (
              <line
                key={pct}
                x1={paddingX}
                y1={y}
                x2={chartW - paddingX}
                y2={y}
                stroke="var(--color-rule)"
                strokeWidth={1}
                strokeDasharray={pct === 0 ? undefined : '2,2'}
              />
            );
          })}

          {/* Completed Area Fill */}
          <polygon
            points={completedFill}
            fill="var(--color-accent)"
            fillOpacity={0.12}
          />

          {/* Scope Line (Planned) */}
          <polyline
            points={scopePoints}
            fill="none"
            stroke="var(--color-ink-muted)"
            strokeWidth={1.5}
            strokeDasharray="4,3"
          />

          {/* Completed Line (Actual) */}
          <polyline
            points={completedPoints}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Interactive vertical hover line & scrubber ticks */}
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
                {/* Hit area */}
                <rect
                  x={x - (innerW / data.length) / 2}
                  y={paddingY}
                  width={innerW / data.length}
                  height={innerH}
                  fill="transparent"
                />

                {isHovered && (
                  <>
                    <line
                      x1={x}
                      y1={paddingY}
                      x2={x}
                      y2={paddingY + innerH}
                      stroke="var(--color-focus)"
                      strokeWidth={1}
                      strokeDasharray="2,2"
                    />
                    <circle
                      cx={x}
                      cy={getY(d.completed)}
                      r={3.5}
                      fill="var(--color-accent)"
                    />
                    <circle
                      cx={x}
                      cy={getY(d.scope)}
                      r={3}
                      fill="var(--color-ink)"
                    />
                  </>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
