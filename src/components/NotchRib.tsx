import React from 'react';

export interface DayNotch {
  dayLabel: string; // e.g. "Mon", "Tue", "D1"
  dateStr: string;  // YYYY-MM-DD
  isCompleted: boolean;
  isToday?: boolean;
  isSkipped?: boolean; // Excused rest day per fair streak logic (HB-3)
  value?: number;
  unit?: string;
}

interface NotchRibProps {
  notches: DayNotch[];
  label?: string;
  onToggleNotch?: (dateStr: string, currentState: boolean) => void;
  className?: string;
}

/**
 * Seshat Notch on a Rib Primitive
 * - Renders days/check-ins grouped in 7s (weekly ribs).
 * - Tactile interaction: click or press Enter on any tick to toggle completion.
 * - Supports fair streak excused skips (PRD HB-3).
 */
export const NotchRib: React.FC<NotchRibProps> = ({ notches, label, onToggleNotch, className = '' }) => {
  // Chunk notches into groups of 7 (weekly ribs)
  const chunks: DayNotch[][] = [];
  for (let i = 0; i < notches.length; i += 7) {
    chunks.push(notches.slice(i, i + 7));
  }

  const completedCount = notches.filter((n) => n.isCompleted).length;

  return (
    <div className={`inline-flex flex-col gap-1.5 ${className}`}>
      {label && (
        <div className="flex items-center justify-between text-xs text-[var(--color-ink-muted)]">
          <span className="font-medium text-[var(--color-ink)]">{label}</span>
          <span className="tabular-figure text-[11px] font-mono">
            {completedCount}/{notches.length} notches
          </span>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {chunks.map((week, wIdx) => (
          <div
            key={wIdx}
            className="seshat-notch-group surface-well border border-[var(--color-rule)] rounded-[var(--radius-xs)]"
            title={`Week ${wIdx + 1}: ${week.filter((d) => d.isCompleted).length}/7 completed`}
          >
            {week.map((notch) => {
              const tooltip = `${notch.dayLabel} (${notch.dateStr}): ${
                notch.isCompleted
                  ? 'Completed'
                  : notch.isSkipped
                  ? 'Excused rest day'
                  : 'Pending'
              }`;

              return (
                <button
                  type="button"
                  key={notch.dateStr}
                  onClick={() => onToggleNotch?.(notch.dateStr, notch.isCompleted)}
                  className="seshat-notch-tick p-0 border-0 cursor-pointer focus:outline-none"
                  data-completed={notch.isCompleted}
                  data-today={notch.isToday}
                  data-skipped={notch.isSkipped}
                  title={tooltip}
                  aria-label={tooltip}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
