import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { MorningSummary } from './MorningSummary';
import { ExecutionStrip } from './ExecutionStrip';
import { TodayTasks } from './TodayTasks';
import { TodayTargets } from './TodayTargets';
import { TodayHabits } from './TodayHabits';
import { getISOWeekString } from '../../utils/periodUtils';
import { getLocalDateString, shiftDateString } from '../../utils/dateUtils';
import { Inbox, ArrowRight } from 'lucide-react';

interface TodayViewProps {
  onOpenQuickAdd: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const TodayView: React.FC<TodayViewProps> = ({ onOpenQuickAdd, onNavigateTab }) => {
  // Default to today's local date YYYY-MM-DD
  const [dateStr, setDateStr] = useState<string>(() => {
    return getLocalDateString();
  });

  const handlePrevDay = () => {
    setDateStr(shiftDateString(dateStr, -1));
  };

  const handleNextDay = () => {
    setDateStr(shiftDateString(dateStr, 1));
  };

  const handleToday = () => {
    setDateStr(getLocalDateString());
  };

  // Query tasks for dateStr (scheduled on or due on this date)
  const tasks = useLiveQuery(
    () =>
      db.tasks
        .filter(
          (t) =>
            !t.isDeleted &&
            (t.scheduleDate === dateStr || t.dueDate === dateStr)
        )
        .toArray(),
    [dateStr]
  );

  const currentWeekStr = getISOWeekString(new Date(`${dateStr}T00:00:00`));

  // Query daily targets for dateStr and weekly targets for current week (consistent calculation)
  const targets = useLiveQuery(
    () =>
      db.targets
        .filter(
          (t) =>
            !t.isDeleted &&
            ((t.horizon === 'day' && t.period === dateStr) ||
              (t.horizon === 'week' && t.period === currentWeekStr))
        )
        .toArray(),
    [dateStr, currentWeekStr]
  );

  // Query habits and logs for dateStr
  const habits = useLiveQuery(
    () => db.habits.filter((h) => !h.isDeleted && !h.isArchived).toArray()
  );

  const habitLogs = useLiveQuery(
    () =>
      db.progressLogs
        .where('date')
        .equals(dateStr)
        .filter((l) => l.entityType === 'habit')
        .toArray(),
    [dateStr]
  );

  // Query time sessions logged today
  const sessions = useLiveQuery(
    () =>
      db.timeSessions
        .filter((s) => s.startTime.startsWith(dateStr))
        .toArray(),
    [dateStr]
  );

  // Compute summary numbers with consistent math
  const targetsTotal = targets?.length ?? 0;
  const targetsDone = (targets || []).filter((t) => t.status === 'done' || t.currentValue >= t.targetValue).length;

  const tasksTotal = tasks?.length ?? 0;
  const tasksDone = (tasks || []).filter((t) => t.status === 'done').length;

  const habitsTotal = habits?.length ?? 0;
  const habitsDone = (habitLogs || []).filter((l) => l.value > 0).length;

  const minutesLogged = (sessions || []).reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
  const minutesEstimated = (tasks || []).reduce((acc, t) => acc + (t.estimateMinutes || 0), 0);

  const isSunday = new Date(`${dateStr}T00:00:00`).getDay() === 0;

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Morning Summary Scan Strip (<5s scan) */}
      <MorningSummary
        dateStr={dateStr}
        onPrevDay={handlePrevDay}
        onNextDay={handleNextDay}
        onToday={handleToday}
        targetsDone={targetsDone}
        targetsTotal={targetsTotal}
        tasksDone={tasksDone}
        tasksTotal={tasksTotal}
        habitsDone={habitsDone}
        habitsTotal={habitsTotal}
        minutesLogged={minutesLogged}
        minutesEstimated={minutesEstimated}
      />

      {/* Sunday Weekly Review & Triage Prompt */}
      {isSunday && (
        <div className="surface-card rounded-[var(--radius-sm)] p-4 border border-[var(--color-accent)]/50 bg-[var(--color-paper-2)] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30 flex items-center justify-center text-[var(--color-accent)]">
              <Inbox className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-xs text-[var(--color-ink)]">
                Sunday Weekly Review & Triage
              </h3>
              <p className="text-xs text-[var(--color-ink-muted)]">
                It's Sunday. Reflect on this week's progress and review any carry-over tasks.
              </p>
            </div>
          </div>
          {onNavigateTab && (
            <button
              type="button"
              onClick={() => onNavigateTab('reviews')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[var(--color-accent)] text-[var(--color-accent-ink)] rounded-[var(--radius-xs)] hover:opacity-90 transition-opacity"
            >
              <span>Start Review</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* 2. Rapid Execution & Focus Strip */}
      <ExecutionStrip tasks={tasks || []} dateStr={dateStr} />

      {/* 3. Main Operational Grid: Tasks & Targets (Left) | Habits (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Tasks and Targets */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <TodayTasks
            tasks={tasks || []}
            dateStr={dateStr}
            onOpenQuickAdd={onOpenQuickAdd}
          />
          <TodayTargets targets={targets || []} dateStr={dateStr} />
        </div>

        {/* Right Column: Habits & Daily Routines */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <TodayHabits dateStr={dateStr} />
        </div>
      </div>
    </div>
  );
};

