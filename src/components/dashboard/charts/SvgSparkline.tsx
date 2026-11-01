import React from 'react';

interface SvgSparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fillOpacity?: number;
  strokeWidth?: number;
  showEndpoints?: boolean;
  className?: string;
}

export const SvgSparkline: React.FC<SvgSparklineProps> = ({
  data,
  width = 120,
  height = 32,
  color = 'var(--color-accent)',
  fillOpacity = 0.12,
  strokeWidth = 1.5,
  showEndpoints = true,
  className = '',
}) => {
  if (!data || data.length === 0) {
    return (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className={`overflow-visible ${className}`}
        aria-hidden="true"
      >
        <line
          x1={0}
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke="var(--color-rule)"
          strokeWidth={1}
          strokeDasharray="2,2"
        />
      </svg>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padding = 4;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;

  const points = data.map((val, idx) => {
    const x = padding + (idx / Math.max(1, data.length - 1)) * innerW;
    const y = padding + innerH - ((val - min) / range) * innerH;
    return { x, y, val };
  });

  const pathD = points.reduce((acc, pt, idx) => {
    return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, '');

  // Closed path for subtle fill
  const firstPt = points[0];
  const lastPt = points[points.length - 1];
  const fillD = `${pathD} L ${lastPt.x} ${height - padding} L ${firstPt.x} ${height - padding} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`overflow-visible select-none font-mono tabular-figure ${className}`}
      aria-hidden="true"
    >
      {/* Background Fill Area */}
      <path d={fillD} fill={color} fillOpacity={fillOpacity} />

      {/* Main Hairline Stroke */}
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Endpoints & Latest Value Dot */}
      {showEndpoints && points.length > 1 && (
        <>
          <circle
            cx={firstPt.x}
            cy={firstPt.y}
            r={2}
            fill="var(--color-paper)"
            stroke={color}
            strokeWidth={1.5}
          />
          <circle
            cx={lastPt.x}
            cy={lastPt.y}
            r={2.5}
            fill={color}
          />
        </>
      )}
    </svg>
  );
};

