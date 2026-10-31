import React from 'react';

export interface DayNotch {
  dayLabel: string; // e.g. "Mon", "Tue", "D1"
  dateStr: string;  // YYYY-MM-DD
  isCompleted: boolean;
  isToday?: boolean;
  isSkipped?: boolean;
  value?: number;
  unit?: string;
}

interface NotchRibProps {
  notches: DayNotch[];
  label?: string;
  className?: string;
}

/**
 * Seshat Notch on a Rib Component
 * Groups days/check-ins in sevens (weeks), rendering tactile vertical ledger ticks
 */
export const NotchRib: React.FC<NotchRibProps> = ({ notches, label, className = '' }) => {
  // Chunk notches into groups of 7 (weekly ribs)
  const chunks: DayNotch[][] = [];
  for (let i = 0; i < notches.length; i += 7) {
    chunks.push(notches.slice(i, i + 7));
  }

  const completedCount = notches.filter(n => n.isCompleted).length;

  return (
    <div className={`inline-flex flex-col gap-1 ${className}`}>
      {label && (
        <div className="flex items-center justify-between text-xs text-[var(--color-ink-muted)]">
          <span>{label}</span>
          <span className="tabular-figure text-[11px] font-mono">
            {completedCount}/{notches.length} notches
          </span>
        </div>
      )}
      <div className="flex items-center gap-2">
        {chunks.map((week, wIdx) => (
          <div
            key={wIdx}
            className="seshat-notch-group surface-well border border-[var(--color-rule)] rounded-[var(--radius-xs)]"
            title={`Week ${wIdx + 1}: ${week.filter(d => d.isCompleted).length}/7 completed`}
          >
            {week.map((notch, dIdx) => (
              <div
                key={dIdx}
                className="seshat-notch-tick cursor-pointer"
                data-completed={notch.isCompleted}
                data-today={notch.isToday}
                data-skipped={notch.isSkipped}
                title={`${notch.dayLabel} (${notch.dateStr}): ${notch.isCompleted ? 'Completed' : notch.isSkipped ? 'Excused skip' : 'Pending'}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

