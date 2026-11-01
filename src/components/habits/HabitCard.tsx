import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { Habit, ProjectGoal } from '../../types';
import { domainService } from '../../services/domainService';
import { calculateHabitMetrics, isDateExcused } from '../../utils/habitMath';

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
            <Shield className="w-4 h-4 text-[var(--color-status-at-risk)] shrink-0" />
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
            <span className="px-2 py-0.5 text-[11px] font-medium rounded-[var(--radius-xs)] bg-[var(--color-status-at-risk-bg)] border border-[var(--color-status-at-risk)]/30 text-[var(--color-status-at-risk)]">
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
            <span className="px-2 py-0.5 text-[11px] rounded-[var(--radius-xs)] bg-[var(--color-paper-3)] border border-[var(--color-rule-strong)] text-[var(--color-ink-muted)]">
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
            className="p-1.5 text-[var(--color-ink-muted)] hover:text-[var(--color-status-behind)] hover:bg-[var(--color-paper-2)] rounded transition-colors"
            title="Delete habit"
            aria-label="Delete habit"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Compact Habit Key Metrics */}
      {habit.isAvoidance ? (
        <div className="flex flex-wrap items-center gap-3 text-xs surface-well px-3 py-2 rounded-[var(--radius-xs)] border border-[var(--color-rule)]">
          <div className="flex items-center gap-1.5 font-mono">
            <span className="text-[var(--color-ink-muted)]">Clean:</span>
            <span className="font-bold text-sm text-[var(--color-ink)] tabular-figure">{metrics.daysClean ?? 0}</span>
            <span className="text-[11px] text-[var(--color-ink-muted)]">days</span>
          </div>
          <span className="text-[var(--color-rule)]">·</span>
          <div className="flex items-center gap-1.5 font-mono">
            <span className="text-[var(--color-ink-muted)]">Best:</span>
            <span className="font-semibold text-[var(--color-ink)] tabular-figure">{metrics.bestCleanStreak ?? 0}d</span>
          </div>
          <span className="text-[var(--color-rule)]">·</span>
          <div className="flex items-center gap-1.5 font-mono">
            <span className="text-[var(--color-ink-muted)]">30-day:</span>
            <span className="font-semibold text-[var(--color-accent)] tabular-figure">{metrics.consistency30d}%</span>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3 text-xs surface-well px-3 py-2 rounded-[var(--radius-xs)] border border-[var(--color-rule)]">
          <div className="flex items-center gap-1.5 font-mono">
            <span className="text-[var(--color-ink-muted)]">Streak:</span>
            <span className="font-bold text-sm text-[var(--color-accent)] tabular-figure">{metrics.currentStreak}</span>
            <span className="text-[11px] text-[var(--color-ink-muted)]">{habit.scheduleType === 'n_per_week' ? 'wks' : 'days'}</span>
          </div>
          <span className="text-[var(--color-rule)]">·</span>
          <div className="flex items-center gap-1.5 font-mono">
            <span className="text-[var(--color-ink-muted)]">Best:</span>
            <span className="font-semibold text-[var(--color-ink)] tabular-figure">{metrics.bestStreak}</span>
          </div>
          <span className="text-[var(--color-rule)]">·</span>
          <div className="flex items-center gap-1.5 font-mono">
            <span className="text-[var(--color-ink-muted)]">30-day:</span>
            <span className="font-semibold text-[var(--color-ink)] tabular-figure">{metrics.consistency30d}%</span>
          </div>
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
              className="min-h-11 sm:min-h-9 text-[var(--color-status-at-risk)] hover:text-[var(--color-status-at-risk)] hover:border-[var(--color-status-at-risk)]"
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
