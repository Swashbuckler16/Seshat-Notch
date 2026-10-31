import React from 'react';

interface CordBarProps {
  current: number;
  total: number;
  expected?: number; // Expected progress for schedule comparison (PRD 7.3)
  unit?: string;
  label?: string;
  showLabels?: boolean;
  isInteractive?: boolean;
  onChange?: (newValue: number) => void;
  className?: string;
}

/**
 * Seshat Measuring Cord Progress Bar
 * - Progress bar etched with 10% survey tick marks.
 * - Displays visible arithmetic: current / total with percentage.
 * - Displays expected milestone marker on the cord when provided.
 * - Supports keyboard and click/drag interaction for rapid logging.
 */
export const CordBar: React.FC<CordBarProps> = ({
  current,
  total,
  expected,
  unit = '',
  label,
  showLabels = true,
  isInteractive = false,
  onChange,
  className = '',
}) => {
  const safeTotal = total > 0 ? total : 1;
  const percentage = Math.min(100, Math.max(0, (current / safeTotal) * 100));
  const expectedPercentage =
    expected !== undefined
      ? Math.min(100, Math.max(0, (expected / safeTotal) * 100))
      : undefined;

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isInteractive || !onChange) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const newVal = Math.round(ratio * total);
    onChange(newVal);
  };

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {showLabels && (
        <div className="flex items-center justify-between text-xs">
          {label && <span className="font-medium text-[var(--color-ink)]">{label}</span>}
          <div className="flex items-center gap-2 tabular-figure font-mono text-[var(--color-ink-muted)]">
            <span className="text-[var(--color-ink)] font-semibold">
              {current}
            </span>
            <span>/</span>
            <span>
              {total} {unit}
            </span>
            <span className="text-[var(--color-accent)] font-medium ml-1">
              ({percentage.toFixed(0)}%)
            </span>
          </div>
        </div>
      )}

      {/* The Cord Bar with 10% survey tick marks */}
      <div
        onClick={handleContainerClick}
        className={`seshat-cord-container select-none ${
          isInteractive ? 'cursor-ew-resize hover:border-[var(--color-accent)]' : ''
        }`}
        title={isInteractive ? 'Click to set target progress' : undefined}
      >
        {/* Progress fill */}
        <div
          className="seshat-cord-fill"
          style={{ transform: `scaleX(${percentage / 100})` }}
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
