import React, { useState } from 'react';
import { Habit, ProgressLog } from '../../types';
import { buildYearHeatmapMatrix, HabitDayCell } from '../../utils/habitMath';

interface HabitYearHeatmapProps {
  habit: Habit;
  logs: ProgressLog[];
  todayStr: string;
}

export const HabitYearHeatmap: React.FC<HabitYearHeatmapProps> = ({ habit, logs, todayStr }) => {
  const [hoveredCell, setHoveredCell] = useState<HabitDayCell | null>(null);

  const weeks = buildYearHeatmapMatrix(habit, logs, todayStr);
  const dayNames = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  // Month header markers across the 52 weeks
  const monthLabels: { weekIndex: number; label: string }[] = [];
  let lastMonth = -1;

  weeks.forEach((week, wIdx) => {
    // Check first day of week
    const firstDay = week[0];
    if (firstDay) {
      const d = new Date(`${firstDay.dateStr}T00:00:00Z`);
      const month = d.getUTCMonth();
      if (month !== lastMonth) {
        const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        monthLabels.push({ weekIndex: wIdx, label: names[month] });
        lastMonth = month;
      }
    }
  });

  return (
    <div className="flex flex-col gap-2 p-3 bg-[var(--color-paper-2)]/60 border border-[var(--color-rule)] rounded-[var(--radius-xs)] overflow-hidden">
      {/* Header Info */}
      <div className="flex items-center justify-between text-xs text-[var(--color-ink-muted)]">
        <span className="font-mono text-[11px] font-medium text-[var(--color-ink)]">
          52-week ledger heatmap (364 days)
        </span>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-[1px] bg-[var(--color-paper-3)] border border-[var(--color-rule)]" />
            <span>Rest / Off</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-[1px] bg-[var(--color-paper-3)] border border-dashed border-[var(--color-rule-strong)]" />
            <span>Excused</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-[1px] bg-[var(--color-accent)]" />
            <span>Completed</span>
          </span>
        </div>
      </div>

      {/* Matrix Container */}
      <div className="overflow-x-auto pb-1">
        <div className="inline-block min-w-full">
          {/* Month row */}
          <div className="flex text-[10px] text-[var(--color-ink-muted)] font-mono mb-1 pl-4">
            {weeks.map((_, wIdx) => {
              const marker = monthLabels.find((m) => m.weekIndex === wIdx);
              return (
                <div key={wIdx} className="w-3 text-left overflow-visible">
                  {marker ? <span className="font-medium text-[var(--color-ink)]">{marker.label}</span> : null}
                </div>
              );
            })}
          </div>

          {/* Matrix Grid: 7 rows (Mon..Sun) x 52 columns (weeks) */}
          <div className="flex items-start gap-1">
            {/* Day labels column */}
            <div className="flex flex-col gap-1 pr-1 text-[9px] text-[var(--color-ink-muted)] font-mono pt-0.5">
              {dayNames.map((name, idx) => (
                <span key={idx} className="h-2.5 leading-none flex items-center">
                  {idx % 2 === 0 ? name : ''}
                </span>
              ))}
            </div>

            {/* Weeks columns */}
            <div className="flex items-center gap-1">
              {weeks.map((week, wIdx) => (
                <div key={wIdx} className="flex flex-col gap-1">
                  {week.map((cell) => {
                    let cellBg = 'bg-[var(--color-paper-3)]/60 border border-[var(--color-rule)]';
                    let tooltipDesc = `${cell.dateStr}: Not completed`;

                    if (cell.isRelapse) {
                      cellBg = 'bg-[var(--color-status-behind)]/30 border border-[var(--color-status-behind)]/50';
                      tooltipDesc = `${cell.dateStr}: Relapse event ${cell.note ? `(${cell.note})` : ''}`;
                    } else if (cell.isCompleted) {
                      if (cell.intensity === 3) {
                        cellBg = 'bg-[var(--color-accent)] ring-1 ring-[var(--color-accent-strong,var(--color-accent))]';
                      } else {
                        cellBg = 'bg-[var(--color-accent)]';
                      }
                      tooltipDesc = `${cell.dateStr}: Completed ${cell.value > 0 ? `(${cell.value} ${habit.unit || ''})` : ''}`;
                    } else if (cell.isExcused) {
                      cellBg = 'bg-[var(--color-paper-3)] border border-dashed border-[var(--color-rule-strong)]';
                      tooltipDesc = `${cell.dateStr}: Excused rest / pause`;
                    } else if (!cell.isScheduled) {
                      cellBg = 'bg-[var(--color-paper-2)]/40 border border-[var(--color-rule)]/40';
                      tooltipDesc = `${cell.dateStr}: Scheduled rest day`;
                    }

                    if (cell.isToday) {
                      cellBg += ' outline outline-1 outline-[var(--color-focus)] outline-offset-1';
                    }

                    return (
                      <div
                        key={cell.dateStr}
                        className={`w-2.5 h-2.5 rounded-[1px] transition-transform hover:scale-125 cursor-pointer ${cellBg}`}
                        onMouseEnter={() => setHoveredCell(cell)}
                        onMouseLeave={() => setHoveredCell(null)}
                        title={tooltipDesc}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Tooltip Inspector Bar */}
      <div className="h-6 flex items-center justify-between text-[11px] hairline-t pt-1 text-[var(--color-ink-muted)]">
        {hoveredCell ? (
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[var(--color-ink)]">{hoveredCell.dateStr}</span>
            <span>,</span>
            <span>
              {hoveredCell.isRelapse
                ? 'Relapse recorded'
                : hoveredCell.isCompleted
                ? `Completed (${hoveredCell.value} ${habit.unit || ''})`
                : hoveredCell.isExcused
                ? 'Excused pause / rest day'
                : hoveredCell.isScheduled
                ? 'Scheduled day (Pending / Missed)'
                : 'Rest day'}
            </span>
            {hoveredCell.note && <span className="italic text-[var(--color-ink-muted)]">"{hoveredCell.note}"</span>}
          </div>
        ) : (
          <span className="text-[var(--color-ink-muted)] italic">
            Hover over any ledger tick to inspect recorded activity
          </span>
        )}
      </div>
    </div>
  );
};
