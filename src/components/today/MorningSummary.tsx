import React from 'react';
import { CordBar } from '../CordBar';
import {
  ChevronLeft,
  ChevronRight,
  Sun,
  CheckCircle2,
  ListTodo,
  Clock,
  Sparkles,
} from 'lucide-react';

interface MorningSummaryProps {
  dateStr: string;
  onPrevDay: () => void;
  onNextDay: () => void;
  onToday: () => void;
  targetsDone: number;
  targetsTotal: number;
  tasksDone: number;
  tasksTotal: number;
  habitsDone: number;
  habitsTotal: number;
  minutesLogged: number;
  minutesEstimated: number;
}

export const MorningSummary: React.FC<MorningSummaryProps> = ({
  dateStr,
  onPrevDay,
  onNextDay,
  onToday,
  targetsDone,
  targetsTotal,
  tasksDone,
  tasksTotal,
  habitsDone,
  habitsTotal,
  minutesLogged,
  minutesEstimated,
}) => {
  const dateObj = new Date(`${dateStr}T00:00:00`);
  const isDateValid = !isNaN(dateObj.getTime());
  const dayName = isDateValid
    ? dateObj.toLocaleDateString('en-US', { weekday: 'long' })
    : '';
  const monthDay = isDateValid
    ? dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : dateStr;

  const totalItems = targetsTotal + tasksTotal + habitsTotal;
  const completedItems = targetsDone + tasksDone + habitsDone;

  return (
    <div className="surface-card rounded-[var(--radius-sm)] p-4 flex flex-col gap-4">
      {/* Date Navigation & Morning Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 hairline-b pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[var(--radius-xs)] bg-[var(--color-paper-3)] border border-[var(--color-rule)] flex items-center justify-center text-[var(--color-accent)]">
            <Sun className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-sm text-[var(--color-ink)]">
                {dayName}
              </h2>
              <span className="text-xs text-[var(--color-ink-muted)] font-mono">
                {monthDay}
              </span>
            </div>
            <p className="text-sm text-[var(--color-ink-muted)] mt-0.5">
              A quick look at what you planned and what you have done.
            </p>
          </div>
        </div>

        {/* Date Selector Navigation */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onPrevDay}
            className="min-h-11 sm:min-h-8 p-1.5 rounded hover:bg-[var(--color-paper-2)] border border-[var(--color-rule)] text-[var(--color-ink)] focus-visible:outline-2"
            title="Previous day"
            aria-label="Previous day"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onToday}
            className="min-h-11 sm:min-h-8 px-2.5 py-1 text-xs rounded hover:bg-[var(--color-paper-2)] border border-[var(--color-rule)] text-[var(--color-ink-muted)]"
          >
            Today
          </button>
          <button
            type="button"
            onClick={onNextDay}
            className="min-h-11 sm:min-h-8 p-1.5 rounded hover:bg-[var(--color-paper-2)] border border-[var(--color-rule)] text-[var(--color-ink)] focus-visible:outline-2"
            title="Next day"
            aria-label="Next day"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 4 Glancable Daily Stat Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-5 gap-y-3">
        {/* Targets Tile */}
        <div className="morning-stat flex flex-col gap-1">
          <div className="flex items-center justify-between text-xs text-[var(--color-ink-muted)]">
            <span>Goals</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-accent)]" />
          </div>
          <div className="font-mono text-base font-semibold tabular-figure text-[var(--color-ink)]">
            {targetsDone} / {targetsTotal}
          </div>
          <span className="text-[11px] text-[var(--color-ink-muted)]">
            {targetsTotal === 0 ? 'Nothing due today' : `${Math.round((targetsDone / (targetsTotal || 1)) * 100)}% complete`}
          </span>
        </div>

        {/* Tasks Tile */}
        <div className="morning-stat flex flex-col gap-1">
          <div className="flex items-center justify-between text-xs text-[var(--color-ink-muted)]">
            <span>Tasks</span>
            <ListTodo className="w-3.5 h-3.5 text-[var(--color-accent)]" />
          </div>
          <div className="font-mono text-base font-semibold tabular-figure text-[var(--color-ink)]">
            {tasksDone} / {tasksTotal}
          </div>
          <span className="text-[11px] text-[var(--color-ink-muted)]">
            {tasksTotal === 0 ? 'Nothing planned today' : `${Math.round((tasksDone / (tasksTotal || 1)) * 100)}% complete`}
          </span>
        </div>

        {/* Habits Tile */}
        <div className="morning-stat flex flex-col gap-1">
          <div className="flex items-center justify-between text-xs text-[var(--color-ink-muted)]">
            <span>Habits</span>
            <Sparkles className="w-3.5 h-3.5 text-[var(--color-accent)]" />
          </div>
          <div className="font-mono text-base font-semibold tabular-figure text-[var(--color-ink)]">
            {habitsDone} / {habitsTotal}
          </div>
          <span className="text-[11px] text-[var(--color-ink-muted)]">
            {habitsTotal === 0 ? 'No habits active' : `${habitsTotal - habitsDone} remaining`}
          </span>
        </div>

        {/* Focus Time Tile */}
        <div className="morning-stat flex flex-col gap-1">
          <div className="flex items-center justify-between text-xs text-[var(--color-ink-muted)]">
            <span>Focus time</span>
            <Clock className="w-3.5 h-3.5 text-[var(--color-accent)]" />
          </div>
          <div className="font-mono text-base font-semibold tabular-figure text-[var(--color-ink)]">
            {minutesLogged} min
          </div>
          <span className="text-[11px] text-[var(--color-ink-muted)]">
            {minutesEstimated > 0 ? `of ${minutesEstimated} min planned` : 'focused today'}
          </span>
        </div>
      </div>

      {/* Measuring Cord for Overall Day Fulfillment */}
      <div className="pt-3 hairline-t">
        <CordBar
          current={completedItems}
          total={totalItems || 1}
          unit=" items"
          label={`Today's progress (${completedItems}/${totalItems || 1})`}
        />
      </div>
    </div>
  );
};

