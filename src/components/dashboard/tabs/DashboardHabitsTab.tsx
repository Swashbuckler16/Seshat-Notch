import React from 'react';
import { Habit, ProgressLog } from '../../../types';
import { calculateHabitMetrics } from '../../../utils/habitMath';
import { SvgSparkline } from '../charts/SvgSparkline';
import {
  Flame,
  ShieldAlert,
  CheckCircle2,
  Info,
} from 'lucide-react';

interface DashboardHabitsTabProps {
  todayStr: string;
  habits: Habit[];
  progressLogs: ProgressLog[];
  onOpenHabitsView?: () => void;
}

export const DashboardHabitsTab: React.FC<DashboardHabitsTabProps> = ({
  todayStr,
  habits,
  progressLogs,
}) => {
  const activeHabits = habits.filter((h) => !h.isDeleted && !h.isArchived);

  // Calculate metrics for all active habits
  const habitData = activeHabits.map((habit) => {
    const stats = calculateHabitMetrics(habit, progressLogs, todayStr);

    // Compute last 14 days values for sparkline
    const todayD = new Date(`${todayStr}T00:00:00Z`);
    const sparklineData: number[] = [];

    for (let i = 13; i >= 0; i--) {
      const d = new Date(todayD);
      d.setUTCDate(todayD.getUTCDate() - i);
      const dStr = d.toISOString().slice(0, 10);

      const logsOnDay = progressLogs.filter(
        (l) => l.entityId === habit.id && l.date === dStr && !l.isDeleted
      );

      if (habit.isAvoidance) {
        // 1 if clean (no relapse), 0 if relapsed
        const hasRelapse = logsOnDay.some((l) => l.value > 0);
        sparklineData.push(hasRelapse ? 0 : 1);
      } else {
        const totalVal = logsOnDay.reduce((acc, l) => acc + l.value, 0);
        sparklineData.push(totalVal >= habit.targetValue ? 1 : totalVal > 0 ? 0.5 : 0);
      }
    }

    return {
      habit,
      stats,
      sparklineData,
    };
  });

  // Global KPIs
  const maxStreak = Math.max(0, ...habitData.map((d) => (d.habit.isAvoidance ? d.stats.daysClean || 0 : d.stats.currentStreak)));
  const avgConsistency30d = habitData.length > 0
    ? Math.round(habitData.reduce((acc, d) => acc + d.stats.consistency30d, 0) / habitData.length)
    : 0;

  // Recent Skip/Pause/Relapse logs
  const notableLogs = progressLogs
    .filter((l) => {
      if (l.isDeleted) return false;
      const isHabitLog = habits.some((h) => h.id === l.entityId);
      if (!isHabitLog) return false;
      const isRelapse = l.note?.includes('relapse');
      const isExcused = l.note?.includes('skip') || l.note?.includes('excused') || l.note?.includes('pause');
      return isRelapse || isExcused;
    })
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-5">
      {/* 1. Habit KPI Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="surface-card rounded-[var(--radius-sm)] p-3 border border-[var(--color-rule)] flex flex-col gap-1">
          <span className="text-[11px] font-mono text-[var(--color-ink-muted)]">Active Habits</span>
          <span className="font-mono tabular-figure text-lg font-bold text-[var(--color-ink)]">
            {activeHabits.length}
          </span>
          <span className="text-[10px] text-[var(--color-ink-muted)]">Tracked daily & weekly</span>
        </div>

        <div className="surface-card rounded-[var(--radius-sm)] p-3 border border-[var(--color-rule)] flex flex-col gap-1">
          <span className="text-[11px] font-mono text-[var(--color-ink-muted)]">Longest Streak</span>
          <div className="flex items-baseline gap-1">
            <span className="font-mono tabular-figure text-lg font-bold text-[var(--color-accent)]">
              {maxStreak}
            </span>
            <span className="text-xs text-[var(--color-ink-muted)]">intervals</span>
          </div>
          <span className="text-[10px] text-[var(--color-ink-muted)]">Fair streak logic</span>
        </div>

        <div className="surface-card rounded-[var(--radius-sm)] p-3 border border-[var(--color-rule)] flex flex-col gap-1">
          <span className="text-[11px] font-mono text-[var(--color-ink-muted)]">30d Consistency</span>
          <span className="font-mono tabular-figure text-lg font-bold text-[var(--color-ink)]">
            {avgConsistency30d}%
          </span>
          <span className="text-[10px] text-[var(--color-ink-muted)]">Excused days excluded</span>
        </div>

        <div className="surface-card rounded-[var(--radius-sm)] p-3 border border-[var(--color-rule)] flex flex-col gap-1">
          <span className="text-[11px] font-mono text-[var(--color-ink-muted)]">Avoidance Habits</span>
          <span className="font-mono tabular-figure text-lg font-bold text-[var(--color-ink)]">
            {activeHabits.filter((h) => h.isAvoidance).length}
          </span>
          <span className="text-[10px] text-[var(--color-ink-muted)]">Relapse resistance</span>
        </div>
      </div>

      {/* 2. Multi-Habit Performance Ledger (PRD 7.3 & HB-1 through HB-6) */}
      <div className="surface-card rounded-[var(--radius-sm)] p-4 flex flex-col gap-3 border border-[var(--color-rule)]">
        <div className="flex items-center justify-between hairline-b pb-2.5">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-[var(--color-accent)]" />
            <h2 className="text-xs font-bold text-[var(--color-ink)] uppercase tracking-wider">
              Habit Performance & Streak Consistency Matrix
            </h2>
          </div>
          <span className="text-[11px] font-mono text-[var(--color-ink-muted)]">
            Fair Streaks
          </span>
        </div>

        {habitData.length === 0 ? (
          <div className="py-8 text-center text-xs text-[var(--color-ink-muted)]">
            No habits active. Create habits in the Habit Tracker tab.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="hairline-b text-[11px] font-mono text-[var(--color-ink-muted)] bg-[var(--color-paper-2)]">
                  <th className="py-2 px-3 font-medium">Habit</th>
                  <th className="py-2 px-3 font-medium">Cadence</th>
                  <th className="py-2 px-3 font-medium">14d Trend</th>
                  <th className="py-2 px-3 font-medium">Streak (Current / Best)</th>
                  <th className="py-2 px-3 font-medium">7d / 30d / 90d</th>
                  <th className="py-2 px-3 font-medium">Weekday Rhythm (M-S)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-rule)]">
                {habitData.map(({ habit, stats, sparklineData }) => {
                  const currentStreakVal = habit.isAvoidance ? stats.daysClean || 0 : stats.currentStreak;
                  const bestStreakVal = habit.isAvoidance ? stats.bestCleanStreak || 0 : stats.bestStreak;

                  return (
                    <tr key={habit.id} className="hover:bg-[var(--color-paper-2)]/60 transition-colors">
                      {/* Habit Name */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          {habit.isAvoidance ? (
                            <ShieldAlert className="w-3.5 h-3.5 text-[var(--color-rose)] shrink-0" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-accent)] shrink-0" />
                          )}
                          <div className="flex flex-col">
                            <span className="font-semibold text-[var(--color-ink)]">
                              {habit.title}
                            </span>
                            {habit.unit && (
                              <span className="text-[10px] text-[var(--color-ink-muted)] font-mono">
                                Target: {habit.targetValue} {habit.unit}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Cadence Tag */}
                      <td className="py-2.5 px-3 font-mono text-[11px]">
                        <span className="px-1.5 py-0.5 rounded-[var(--radius-xs)] bg-[var(--color-paper-3)] text-[var(--color-ink)] uppercase text-[10px]">
                          {habit.isAvoidance
                            ? 'Avoidance'
                            : habit.scheduleType === 'n_per_week'
                            ? `${habit.targetFrequency}x / wk`
                            : habit.scheduleType}
                        </span>
                      </td>

                      {/* 14d SVG Sparkline */}
                      <td className="py-2.5 px-3">
                        <SvgSparkline
                          data={sparklineData}
                          width={100}
                          height={22}
                          color={habit.isAvoidance ? 'var(--color-rose)' : 'var(--color-accent)'}
                          showEndpoints={true}
                        />
                      </td>

                      {/* Current & Best Streak */}
                      <td className="py-2.5 px-3 font-mono text-[11px] tabular-figure">
                        <span className="font-bold text-[var(--color-ink)]">
                          {currentStreakVal}
                        </span>
                        <span className="text-[var(--color-ink-muted)]">
                          {' '}/ {bestStreakVal} {habit.isAvoidance ? 'days' : 'int'}
                        </span>
                      </td>

                      {/* 7d / 30d / 90d Consistency */}
                      <td className="py-2.5 px-3 font-mono text-[11px] tabular-figure">
                        <span className="text-[var(--color-ink)] font-medium">
                          {stats.consistency7d}%
                        </span>
                        <span className="text-[var(--color-ink-muted)]"> / </span>
                        <span className="text-[var(--color-ink)] font-medium">
                          {stats.consistency30d}%
                        </span>
                        <span className="text-[var(--color-ink-muted)]"> / </span>
                        <span className="text-[var(--color-ink-muted)]">
                          {stats.consistency90d}%
                        </span>
                      </td>

                      {/* Weekday Rhythm Mini-Bars (Mon through Sun) */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-end gap-1 h-5">
                          {stats.weekdayRates.map((wd) => {
                            const barH = Math.max(3, Math.round((wd.rate / 100) * 18));
                            return (
                              <div
                                key={wd.dayIndex}
                                title={`${wd.dayLabel}: ${wd.rate}% (${wd.completions}/${wd.scheduled})`}
                                className="flex flex-col items-center gap-0.5"
                              >
                                <div
                                  className="w-1.5 rounded-t-[1px] bg-[var(--color-accent)]"
                                  style={{
                                    height: `${barH}px`,
                                    opacity: wd.rate > 0 ? Math.max(0.3, wd.rate / 100) : 0.15,
                                  }}
                                />
                                <span className="text-[8px] font-mono text-[var(--color-ink-muted)]">
                                  {wd.dayLabel.slice(0, 1)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3. Recent Pauses, Skips, & Avoidance Relapse Notes */}
      {notableLogs.length > 0 && (
        <div className="surface-card rounded-[var(--radius-sm)] p-4 flex flex-col gap-2.5 border border-[var(--color-rule)]">
          <div className="flex items-center gap-2 hairline-b pb-2">
            <Info className="w-3.5 h-3.5 text-[var(--color-ink-muted)]" />
            <h3 className="text-xs font-semibold text-[var(--color-ink)]">
              Fair Streak Ledger: Recent Excused Pauses & Relapses
            </h3>
          </div>
          <div className="flex flex-col divide-y divide-[var(--color-rule)] text-xs">
            {notableLogs.map((log) => {
              const habit = habits.find((h) => h.id === log.entityId);
              return (
                <div key={log.id} className="py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-[var(--color-ink-muted)]">
                      {log.date}
                    </span>
                    <span className="font-medium text-[var(--color-ink)]">
                      {habit?.title || 'Habit'}
                    </span>
                  </div>
                  <div className="font-mono text-[11px] text-[var(--color-ink-muted)]">
                    {log.note || 'Excused or logged entry'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
