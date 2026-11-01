import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { Habit, ProjectGoal } from '../../types';
import { domainService } from '../../services/domainService';
import { calculateHabitMetrics, isDateExcused } from '../../utils/habitMath';
import { StatTile } from '../ui/StatTile';
import { Button } from '../ui/Button';
import { NotchRib, DayNotch } from '../NotchRib';
import { HabitYearHeatmap } from './HabitYearHeatmap';
import { HabitSkipModal } from './HabitSkipModal';
import { HabitPauseModal } from './HabitPauseModal';
import { HabitRelapseModal } from './HabitRelapseModal';
import { HabitEditorModal } from './HabitEditorModal';
import {
  CheckCircle2,
  Circle,
  Coffee,
  Plane,
  RotateCcw,
  Calendar,
  Flame,
  Shield,
  Edit2,
  Archive,
  Trash2,
  ChevronDown,
  ChevronUp,
  Target as TargetIcon,
} from 'lucide-react';

interface HabitCardProps {
  habit: Habit;
  todayStr: string;
}

export const HabitCard: React.FC<HabitCardProps> = ({ habit, todayStr }) => {
  const [isHeatmapExpanded, setIsHeatmapExpanded] = useState(false);
  const [isSkipModalOpen, setIsSkipModalOpen] = useState(false);
  const [isPauseModalOpen, setIsPauseModalOpen] = useState(false);
  const [isRelapseModalOpen, setIsRelapseModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Live query for all logs for this habit
  const logs = useLiveQuery(
    () =>
      db.progressLogs
        .where('entityId')
        .equals(habit.id)
        .filter((l) => !l.isDeleted && l.entityType === 'habit')
        .toArray(),
    [habit.id]
  );

  // Query linked goal if any
  const linkedGoal = useLiveQuery(
    () => (habit.linkedGoalId ? db.projects.get(habit.linkedGoalId) : undefined),
    [habit.linkedGoalId]
  ) as ProjectGoal | undefined;

  const metrics = calculateHabitMetrics(habit, logs || [], todayStr);

  // Today's log status
  const todayLogs = (logs || []).filter((l) => l.date === todayStr);
  const isCompletedToday = todayLogs.some(
    (l) => !l.note?.startsWith('relapse:') && !l.note?.startsWith('excused_skip') && l.value > 0
  );
  const isExcusedToday = isDateExcused(habit, todayStr, logs || []);

  // Construct 14-day window for NotchRib preview
  const past14Days: string[] = [];
  const baseDate = new Date(`${todayStr}T00:00:00Z`);
  for (let i = 13; i >= 0; i--) {
    const d = new Date(baseDate.getTime());
    d.setUTCDate(d.getUTCDate() - i);
    past14Days.push(d.toISOString().split('T')[0]);
  }

  const dayNamesShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const notches: DayNotch[] = past14Days.map((dStr) => {
    const isLogged = (logs || []).some(
      (l) => l.date === dStr && !l.note?.startsWith('relapse:') && !l.note?.startsWith('excused_skip') && l.value > 0
    );
    const isExcused = isDateExcused(habit, dStr, logs || []);
    const isToday = dStr === todayStr;
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

  const handleToggleToday = async () => {
    await domainService.toggleHabitForDate(habit.id, todayStr);
  };

  const handleToggleSpecificDate = async (dateStr: string) => {
    await domainService.toggleHabitForDate(habit.id, dateStr);
  };

  const handleArchive = async () => {
    await domainService.archiveHabit(habit.id, !habit.isArchived);
  };

  const handleDelete = async () => {
    if (window.confirm(`Delete habit "${habit.title}"? History will be preserved in recovery bin.`)) {
      await domainService.deleteHabit(habit.id, 'Deleted from habit card');
    }
  };

  // Schedule badge label
  let scheduleBadge = 'Daily';
  if (habit.scheduleType === 'weekdays') scheduleBadge = 'Weekdays (M-F)';
  else if (habit.scheduleType === 'n_per_week') scheduleBadge = `${habit.targetFrequency || 3}x / week`;
  else if (habit.scheduleType === 'every_n_days') scheduleBadge = `Every ${habit.intervalDays || 2} days`;

  return (
    <div className="surface-card rounded-[var(--radius-sm)] p-4 flex flex-col gap-3.5 transition-colors">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 hairline-b pb-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          {habit.isAvoidance ? (
            <Shield className="w-4 h-4 text-amber-500 shrink-0" />
          ) : (
            <Flame className="w-4 h-4 text-[var(--color-accent)] shrink-0" />
          )}

          <h3 className="font-semibold text-sm text-[var(--color-ink)] tracking-tight">
            {habit.title}
          </h3>

          <span className="px-2 py-0.5 text-[11px] font-mono rounded-[var(--radius-xs)] bg-[var(--color-paper-2)] border border-[var(--color-rule)] text-[var(--color-ink-muted)]">
            {scheduleBadge}
          </span>

          {habit.isAvoidance && (
            <span className="px-2 py-0.5 text-[11px] font-medium rounded-[var(--radius-xs)] bg-amber-500/10 border border-amber-500/30 text-amber-600">
              Avoidance habit
            </span>
          )}

          {linkedGoal && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-[var(--radius-xs)] bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 text-[var(--color-accent)]">
              <TargetIcon className="w-3 h-3" />
              <span>Goal: {linkedGoal.title}</span>
            </span>
          )}

          {habit.pausedRanges && habit.pausedRanges.length > 0 && (
            <span className="px-2 py-0.5 text-[11px] font-mono rounded-[var(--radius-xs)] bg-[var(--color-paper-3)] border border-[var(--color-rule-strong)] text-[var(--color-ink-muted)]">
              Paused window active
            </span>
          )}
        </div>

        {/* Card Controls */}
        <div className="flex items-center gap-1 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => setIsEditModalOpen(true)}
            className="p-1.5 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper-2)] rounded transition-colors"
            title="Edit habit settings"
            aria-label="Edit habit"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleArchive}
            className="p-1.5 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper-2)] rounded transition-colors"
            title={habit.isArchived ? 'Unarchive habit' : 'Archive habit'}
            aria-label={habit.isArchived ? 'Unarchive habit' : 'Archive habit'}
          >
            <Archive className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="p-1.5 text-[var(--color-ink-muted)] hover:text-red-500 hover:bg-[var(--color-paper-2)] rounded transition-colors"
            title="Delete habit"
            aria-label="Delete habit"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      {habit.isAvoidance ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <StatTile
            label="Days clean"
            value={metrics.daysClean ?? 0}
            unit="days"
            formulaExplanation="Days elapsed since the most recent recorded relapse (or start date if zero relapses)."
          />
          <StatTile
            label="Best clean streak"
            value={metrics.bestCleanStreak ?? 0}
            unit="days"
            formulaExplanation="Longest consecutive clean stretch recorded in history."
          />
          <StatTile
            label="30-day clean rate"
            value={`${metrics.consistency30d}%`}
            formulaExplanation="Percentage of days in the last 30 days without any relapse events."
          />
          <StatTile
            label="Total relapses"
            value={metrics.totalRelapses ?? 0}
            unit="events"
            formulaExplanation="Cumulative count of all logged relapse occurrences."
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <StatTile
            label="Current streak"
            value={metrics.currentStreak}
            unit={habit.scheduleType === 'n_per_week' ? 'wks' : 'days'}
            formulaExplanation="Consecutive scheduled periods completed without unexcused miss. Excused rest days & vacation pauses preserve this count per PRD HB-3."
          />
          <StatTile
            label="Best streak"
            value={metrics.bestStreak}
            unit={habit.scheduleType === 'n_per_week' ? 'wks' : 'days'}
            formulaExplanation="All-time longest completion streak recorded."
          />
          <StatTile
            label="30-day consistency"
            value={`${metrics.consistency30d}%`}
            formulaExplanation="Formula: habit completions in last 30 days divided by scheduled occurrences, excluding declared skip and pause days (PRD 7.3)."
          />
          <StatTile
            label="90-day consistency"
            value={`${metrics.consistency90d}%`}
            formulaExplanation="Quarterly consistency percentage excluding declared skip and pause days."
          />
        </div>
      )}

      {/* 14-Day Notch Rib Ledger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 surface-well p-2.5 rounded-[var(--radius-xs)] border border-[var(--color-rule)]">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-semibold text-[var(--color-ink)]">
            14-day ledger preview
          </span>
          <span className="text-[11px] text-[var(--color-ink-muted)]">
            Click any tick to toggle completion. Diagonal notch marks excused rest days.
          </span>
        </div>
        <NotchRib
          notches={notches}
          onToggleNotch={(dStr) => handleToggleSpecificDate(dStr)}
        />
      </div>

      {/* Action Buttons Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick Check-in */}
          <Button
            variant={isCompletedToday ? 'secondary' : 'primary'}
            size="sm"
            onClick={handleToggleToday}
            className="min-h-11 sm:min-h-9"
          >
            {isCompletedToday ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                <span>Completed today</span>
              </>
            ) : (
              <>
                <Circle className="w-3.5 h-3.5" />
                <span>Check-in today</span>
              </>
            )}
          </Button>

          {/* Excused Skip (PRD HB-3) */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsSkipModalOpen(true)}
            className="min-h-11 sm:min-h-9"
            title="Mark an excused rest or sick day"
          >
            <Coffee className="w-3.5 h-3.5" />
            <span>{isExcusedToday ? 'Excused today' : 'Excused skip'}</span>
          </Button>

          {/* Vacation / Sick Pause (PRD HB-3) */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsPauseModalOpen(true)}
            className="min-h-11 sm:min-h-9"
            title="Configure vacation or sick pause window"
          >
            <Plane className="w-3.5 h-3.5" />
            <span>Pause range</span>
          </Button>

          {/* Avoidance Relapse Button (PRD HB-6) */}
          {habit.isAvoidance && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsRelapseModalOpen(true)}
              className="min-h-11 sm:min-h-9 text-amber-600 hover:text-amber-700 hover:border-amber-400"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Log relapse</span>
            </Button>
          )}
        </div>

        {/* 52-Week Heatmap Toggle */}
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setIsHeatmapExpanded((prev) => !prev)}
          className="min-h-11 sm:min-h-9 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>52-week ledger</span>
          {isHeatmapExpanded ? (
            <ChevronUp className="w-3.5 h-3.5 ml-1" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 ml-1" />
          )}
        </Button>
      </div>

      {/* Expandable 52-Week Year Heatmap (PRD HB-4) */}
      {isHeatmapExpanded && (
        <div className="hairline-t pt-3 mt-1">
          <HabitYearHeatmap habit={habit} logs={logs || []} todayStr={todayStr} />
        </div>
      )}

      {/* Modals */}
      {isSkipModalOpen && (
        <HabitSkipModal
          isOpen={isSkipModalOpen}
          onClose={() => setIsSkipModalOpen(false)}
          habit={habit}
          defaultDate={todayStr}
        />
      )}

      {isPauseModalOpen && (
        <HabitPauseModal
          isOpen={isPauseModalOpen}
          onClose={() => setIsPauseModalOpen(false)}
          habit={habit}
        />
      )}

      {isRelapseModalOpen && (
        <HabitRelapseModal
          isOpen={isRelapseModalOpen}
          onClose={() => setIsRelapseModalOpen(false)}
          habit={habit}
        />
      )}

      {isEditModalOpen && (
        <HabitEditorModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          habitToEdit={habit}
        />
      )}
    </div>
  );
};
