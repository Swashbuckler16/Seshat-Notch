import React from 'react';

interface CordBarProps {
  current: number;
  total: number;
  expected?: number; // Expected progress for schedule comparison
  unit?: string;
  label?: string;
  showLabels?: boolean;
  className?: string;
}

/**
 * Seshat Measuring Cord Progress Bar
 * Progress bar etched with survey tick marks and visible arithmetic
 */
export const CordBar: React.FC<CordBarProps> = ({
  current,
  total,
  expected,
  unit = '',
  label,
  showLabels = true,
  className = ''
}) => {
  const safeTotal = total > 0 ? total : 1;
  const percentage = Math.min(100, Math.max(0, (current / safeTotal) * 100));
  const expectedPercentage = expected !== undefined
    ? Math.min(100, Math.max(0, (expected / safeTotal) * 100))
    : undefined;

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {showLabels && (
        <div className="flex items-center justify-between text-xs">
          {label && <span className="font-medium text-[var(--color-ink)]">{label}</span>}
          <div className="flex items-center gap-2 tabular-figure font-mono text-[var(--color-ink-muted)]">
            <span className="text-[var(--color-ink)] font-semibold">
              {current}
            </span>
            <span>/</span>
            <span>{total} {unit}</span>
            <span className="text-[var(--color-accent)] font-medium ml-1">
              ({percentage.toFixed(0)}%)
            </span>
          </div>
        </div>
      )}

      {/* The Cord Bar with 10% survey tick marks */}
      <div className="seshat-cord-container">
        {/* Progress fill */}
        <div
          className="seshat-cord-fill"
          style={{ width: `${percentage}%` }}
        />

        {/* Expected marker (if supplied) */}
        {expectedPercentage !== undefined && (
          <div
            className="absolute top-0 bottom-0 w-[2px] bg-[var(--color-ink)] z-10"
            style={{ left: `${expectedPercentage}%` }}
            title={`Expected by today: ${expected} ${unit} (${expectedPercentage.toFixed(0)}%)`}
          />
        )}

        {/* Survey tick scale at 10%, 20%, 30%, 40%, 50%, 60%, 70%, 80%, 90% */}
        <div className="seshat-cord-ticks">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="seshat-cord-tick" />
          ))}
        </div>
      </div>
    </div>
  );
};

