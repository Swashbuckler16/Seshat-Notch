import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { domainService } from '../../services/domainService';
import { NotchRib, DayNotch } from '../NotchRib';
import { isDateExcused } from '../../utils/habitMath';
import { Sparkles, CheckCircle2, Circle } from 'lucide-react';

interface TodayHabitsProps {
  dateStr: string;
}

export const TodayHabits: React.FC<TodayHabitsProps> = ({ dateStr }) => {
  // Query active habits
  const habits = useLiveQuery(
    () => db.habits.filter((h) => !h.isDeleted && !h.isArchived).toArray()
  );

  // Generate 7-day window dates ending at dateStr
  const past7Days: string[] = [];
  const baseDate = new Date(`${dateStr}T00:00:00Z`);

  for (let i = 6; i >= 0; i--) {
    const d = new Date(baseDate.getTime());
    d.setUTCDate(d.getUTCDate() - i);
    past7Days.push(d.toISOString().split('T')[0]);
  }

  // Query progress logs for these 7 days
  const logs = useLiveQuery(
    () =>
      db.progressLogs
        .where('date')
        .anyOf(past7Days)
        .filter((l) => l.entityType === 'habit')
        .toArray(),
    [past7Days.join(',')]
  );

  const handleToggleHabit = async (habitId: string) => {
    await domainService.toggleHabitForDate(habitId, dateStr);
  };

  const handleToggleSpecificDate = async (habitId: string, specificDate: string) => {
    await domainService.toggleHabitForDate(habitId, specificDate);
  };

  return (
    <div className="surface-card rounded-[var(--radius-sm)] p-4 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between hairline-b pb-2.5">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[var(--color-accent)]" />
          <h3 className="font-semibold text-xs text-[var(--color-ink)]">
            Habits & daily routines
          </h3>
        </div>
        <span className="text-[11px] font-mono text-[var(--color-ink-muted)]">
          7-day notch rib ledger
        </span>
      </div>

      {/* Habit List */}
      <div className="flex flex-col divide-y divide-[var(--color-rule)]">
        {(!habits || habits.length === 0) ? (
          <div className="py-6 text-center text-xs text-[var(--color-ink-muted)]">
            No habits configured yet.
          </div>
        ) : (
          habits.map((habit) => {
            // Find today's completion
            const isCompletedToday = (logs || []).some(
              (l) => l.entityId === habit.id && l.date === dateStr && l.value > 0
            );

            const dayNamesShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

            // Construct 7-day notches for NotchRib
            const notches: DayNotch[] = past7Days.map((dStr) => {
              const isLogged = (logs || []).some(
                (l) => l.entityId === habit.id && l.date === dStr && l.value > 0
              );
              const isExcused = isDateExcused(habit, dStr, logs || []);
              const isToday = dStr === dateStr;
              const d = new Date(`${dStr}T00:00:00Z`);
              const dayLabel = dayNamesShort[d.getUTCDay()];

              return {
                dayLabel,
                dateStr: dStr,
                isCompleted: isLogged,
                isSkipped: isExcused,
                isToday,
              };
            });

            return (
              <div
                key={habit.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[var(--color-paper-2)]/30 px-2 rounded-[var(--radius-xs)] transition-colors"
              >
                {/* Left: Quick toggle & title */}
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => handleToggleHabit(habit.id)}
                    className="text-[var(--color-ink-muted)] hover:text-[var(--color-accent)] focus-visible:outline-2"
                    title={isCompletedToday ? 'Mark not done' : 'Mark done for today'}
                    aria-label={isCompletedToday ? 'Mark not done' : 'Mark done for today'}
                  >
                    {isCompletedToday ? (
                      <CheckCircle2 className="w-4 h-4 text-[var(--color-status-on-track)]" />
                    ) : (
                      <Circle className="w-4 h-4" />
                    )}
                  </button>

                  <div className="flex flex-col min-w-0 flex-1">
                    <span
                      className={`text-xs font-semibold ${
                        isCompletedToday ? 'text-[var(--color-ink)]' : 'text-[var(--color-ink)]'
                      }`}
                    >
                      {habit.title}
                    </span>
                    <span className="text-[11px] font-mono text-[var(--color-ink-muted)] capitalize">
                      {habit.scheduleType.replace('_', ' ')}
                      {habit.targetValue > 1 ? ` · Target: ${habit.targetValue} ${habit.unit || ''}` : ''}
                    </span>
                  </div>
                </div>

                {/* Right: 7-day NotchRib */}
                <div className="shrink-0 flex items-center gap-3">
                  <NotchRib
                    notches={notches}
                    onToggleNotch={(toggleDateStr) => {
                      handleToggleSpecificDate(habit.id, toggleDateStr);
                    }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
