import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { HabitCard } from './HabitCard';
import { HabitEditorModal } from './HabitEditorModal';
import { StatTile } from '../ui/StatTile';
import { Button } from '../ui/Button';
import { calculateHabitMetrics } from '../../utils/habitMath';
import { Sparkles, Plus, Flame, Activity } from 'lucide-react';

export const HabitsView: React.FC = () => {
  const todayStr = new Date().toISOString().split('T')[0];

  const [filter, setFilter] = useState<'all' | 'daily' | 'flexible' | 'avoidance' | 'archived'>('all');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  // Live query habits
  const habits = useLiveQuery(
    () => db.habits.filter((h) => !h.isDeleted).toArray(),
    []
  );

  // Live query progress logs
  const allLogs = useLiveQuery(
    () => db.progressLogs.filter((l) => !l.isDeleted && l.entityType === 'habit').toArray(),
    []
  );

  const activeHabits = (habits || []).filter((h) => !h.isArchived);
  const archivedHabits = (habits || []).filter((h) => h.isArchived);

  // Filter selection
  const displayedHabits = (habits || []).filter((h) => {
    if (filter === 'archived') return h.isArchived;
    if (h.isArchived) return false;
    if (filter === 'daily') return h.scheduleType === 'daily' || h.scheduleType === 'weekdays';
    if (filter === 'flexible') return h.scheduleType === 'n_per_week' || h.scheduleType === 'every_n_days';
    if (filter === 'avoidance') return h.isAvoidance;
    return true; // 'all'
  });

  // Calculate aggregated stats across active habits
  const activeMetrics = activeHabits.map((h) => calculateHabitMetrics(h, allLogs || [], todayStr));

  const totalActive = activeHabits.length;
  const avg30dConsistency =
    activeMetrics.length > 0
      ? Math.round(
          activeMetrics.reduce((acc, m) => acc + m.consistency30d, 0) / activeMetrics.length
        )
      : 0;

  const longestStreak =
    activeMetrics.length > 0
      ? Math.max(...activeMetrics.map((m) => m.currentStreak))
      : 0;

  const avoidanceHabits = activeHabits.filter((h) => h.isAvoidance);
  const avoidanceCleanDays =
    avoidanceHabits.length > 0
      ? activeMetrics
          .filter((_, idx) => activeHabits[idx].isAvoidance)
          .reduce((acc, m) => acc + (m.daysClean || 0), 0)
      : 0;

  // Aggregate weekday patterns across all active non-avoidance habits
  const weekdayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const aggregateWeekdayStats = weekdayNames.map((dayLabel, idx) => {
    let totalComp = 0;
    let totalSched = 0;

    activeMetrics.forEach((m) => {
      const dayStat = m.weekdayRates.find((w) => w.dayIndex === idx);
      if (dayStat) {
        totalComp += dayStat.completions;
        totalSched += dayStat.scheduled;
      }
    });

    const rate = totalSched > 0 ? Math.round((totalComp / totalSched) * 100) : 0;
    return { dayLabel, rate, completions: totalComp, scheduled: totalSched };
  });

  return (
    <div className="flex-1 flex flex-col gap-6 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 hairline-b pb-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-[var(--color-accent)]" />
            <h1 className="text-xl font-bold tracking-tight text-[var(--color-ink)]">
              Habits & fair streak ledger
            </h1>
          </div>
          <p className="text-xs text-[var(--color-ink-muted)]">
            Flexible schedules with rest days and vacation pauses preserved per PRD Section 6.4 & HB-3.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsNewModalOpen(true)}
          className="min-h-11 sm:min-h-9 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New habit</span>
        </Button>
      </div>

      {/* Aggregate Overview Stat Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile
          label="Active habits"
          value={totalActive}
          unit="habits"
          formulaExplanation="Total active, unarchived habit routines currently tracked."
        />
        <StatTile
          label="Average 30d consistency"
          value={`${avg30dConsistency}%`}
          formulaExplanation="Mean 30-day consistency rate across all active habits, excluding declared rest and pause days."
        />
        <StatTile
          label="Longest active streak"
          value={longestStreak}
          unit="intervals"
          formulaExplanation="Highest active streak among all currently tracked habits."
        />
        <StatTile
          label="Avoidance clean days"
          value={avoidanceCleanDays}
          unit="days"
          formulaExplanation="Cumulative days clean across all avoidance targets without recorded relapses."
        />
      </div>

      {/* Weekday Completion Pattern Ledger (PRD 7.2 & 7.3) */}
      <div className="surface-card rounded-[var(--radius-sm)] p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between hairline-b pb-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[var(--color-accent)]" />
            <span className="text-xs font-semibold text-[var(--color-ink)]">
              Weekday completion patterns
            </span>
          </div>
          <span className="text-[11px] font-mono text-[var(--color-ink-muted)]">
            Historical aggregate by day of week
          </span>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {aggregateWeekdayStats.map((item) => (
            <div
              key={item.dayLabel}
              className="flex flex-col items-center gap-1.5 p-2 rounded-[var(--radius-xs)] surface-well border border-[var(--color-rule)]"
            >
              <span className="text-[11px] font-medium text-[var(--color-ink)]">
                {item.dayLabel}
              </span>
              <div className="w-full bg-[var(--color-paper-3)] h-2 rounded-[1px] overflow-hidden">
                <div
                  className="bg-[var(--color-accent)] h-full transition-all duration-300"
                  style={{ width: `${item.rate}%` }}
                />
              </div>
              <span className="text-[11px] font-mono tabular-figure font-semibold text-[var(--color-ink)]">
                {item.rate}%
              </span>
              <span className="text-[10px] font-mono text-[var(--color-ink-muted)]">
                {item.completions}/{item.scheduled}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Filter Navigation Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-[var(--radius-xs)] font-medium border transition-colors ${
            filter === 'all'
              ? 'bg-[var(--color-paper-2)] border-[var(--color-ink)] text-[var(--color-ink)] font-semibold'
              : 'border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:border-[var(--color-rule-strong)]'
          }`}
        >
          All habits ({activeHabits.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('daily')}
          className={`px-3 py-1.5 rounded-[var(--radius-xs)] font-medium border transition-colors ${
            filter === 'daily'
              ? 'bg-[var(--color-paper-2)] border-[var(--color-ink)] text-[var(--color-ink)] font-semibold'
              : 'border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:border-[var(--color-rule-strong)]'
          }`}
        >
          Daily & Weekdays
        </button>
        <button
          type="button"
          onClick={() => setFilter('flexible')}
          className={`px-3 py-1.5 rounded-[var(--radius-xs)] font-medium border transition-colors ${
            filter === 'flexible'
              ? 'bg-[var(--color-paper-2)] border-[var(--color-ink)] text-[var(--color-ink)] font-semibold'
              : 'border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:border-[var(--color-rule-strong)]'
          }`}
        >
          Flexible weekly
        </button>
        <button
          type="button"
          onClick={() => setFilter('avoidance')}
          className={`px-3 py-1.5 rounded-[var(--radius-xs)] font-medium border transition-colors ${
            filter === 'avoidance'
              ? 'bg-[var(--color-paper-2)] border-[var(--color-ink)] text-[var(--color-ink)] font-semibold'
              : 'border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:border-[var(--color-rule-strong)]'
          }`}
        >
          Avoidance targets ({avoidanceHabits.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('archived')}
          className={`px-3 py-1.5 rounded-[var(--radius-xs)] font-medium border transition-colors ${
            filter === 'archived'
              ? 'bg-[var(--color-paper-2)] border-[var(--color-ink)] text-[var(--color-ink)] font-semibold'
              : 'border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:border-[var(--color-rule-strong)]'
          }`}
        >
          Archived ({archivedHabits.length})
        </button>
      </div>

      {/* Habits List */}
      <div className="flex flex-col gap-4">
        {displayedHabits.length === 0 ? (
          <div className="surface-card rounded-[var(--radius-sm)] p-12 text-center flex flex-col items-center justify-center gap-3">
            <Sparkles className="w-8 h-8 text-[var(--color-accent)] opacity-60" />
            <h3 className="font-semibold text-sm text-[var(--color-ink)]">
              No habits found
            </h3>
            <p className="text-xs text-[var(--color-ink-muted)] max-w-sm">
              {filter === 'archived'
                ? 'No habits have been archived.'
                : 'Configure consistent routines and track them with fair streak logic.'}
            </p>
            {filter !== 'archived' && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsNewModalOpen(true)}
                className="mt-2"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create your first habit</span>
              </Button>
            )}
          </div>
        ) : (
          displayedHabits.map((habit) => (
            <HabitCard key={habit.id} habit={habit} todayStr={todayStr} />
          ))
        )}
      </div>

      {/* New Habit Modal */}
      {isNewModalOpen && (
        <HabitEditorModal
          isOpen={isNewModalOpen}
          onClose={() => setIsNewModalOpen(false)}
        />
      )}
    </div>
  );
};
