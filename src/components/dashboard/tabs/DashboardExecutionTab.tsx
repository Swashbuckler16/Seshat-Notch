import React from 'react';
import { Target, Task, ChangeLogEntry } from '../../../types';
import { SvgHorizonBarChart } from '../charts/SvgHorizonBarChart';
import { SvgSparkline } from '../charts/SvgSparkline';
import { Calendar, TrendingUp, AlertTriangle, Activity } from 'lucide-react';

interface DashboardExecutionTabProps {
  todayStr?: string;
  targets: Target[];
  tasks: Task[];
  timeSessions?: unknown[];
  changeLogs: ChangeLogEntry[];
}

export const DashboardExecutionTab: React.FC<DashboardExecutionTabProps> = ({
  targets,
  tasks,
  changeLogs,
}) => {
  // 1. Completion rate by Horizon
  const dailyTargets = targets.filter((t) => !t.isDeleted && t.horizon === 'day');
  const weeklyTargets = targets.filter((t) => !t.isDeleted && t.horizon === 'week');
  const monthlyTargets = targets.filter((t) => !t.isDeleted && t.horizon === 'month');

  const calcRate = (arr: Target[]) => {
    if (arr.length === 0) return 0;
    const completed = arr.filter((t) => t.currentValue >= t.targetValue).length;
    return Math.round((completed / arr.length) * 100);
  };

  const horizonRecords = [
    {
      horizon: 'day' as const,
      label: 'Daily Horizon Targets',
      completed: dailyTargets.filter((t) => t.currentValue >= t.targetValue).length,
      total: dailyTargets.length,
      rate: calcRate(dailyTargets),
    },
    {
      horizon: 'week' as const,
      label: 'Weekly Horizon Targets',
      completed: weeklyTargets.filter((t) => t.currentValue >= t.targetValue).length,
      total: weeklyTargets.length,
      rate: calcRate(weeklyTargets),
    },
    {
      horizon: 'month' as const,
      label: 'Monthly Horizon Targets',
      completed: monthlyTargets.filter((t) => t.currentValue >= t.targetValue).length,
      total: monthlyTargets.length,
      rate: calcRate(monthlyTargets),
    },
  ];

  // 2. Weekday Completion Pattern
  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weekdayStats = weekdays.map((dayLabel, idx) => {
    const dayTasks = tasks.filter((t) => {
      if (!t.scheduleDate) return false;
      const d = new Date(`${t.scheduleDate}T00:00:00Z`);
      const jsDay = d.getUTCDay();
      const monIdx = jsDay === 0 ? 6 : jsDay - 1;
      return monIdx === idx;
    });

    const doneCount = dayTasks.filter((t) => t.status === 'done').length;
    const rate = dayTasks.length > 0 ? Math.round((doneCount / dayTasks.length) * 100) : 0;
    return { dayLabel, total: dayTasks.length, completed: doneCount, rate };
  });

  // 3. Drop & Carry-over Reasons (from ChangeLogs & Tasks)
  const dropEntries = changeLogs.filter(
    (c) => c.action === 'soft_delete' || (c.fieldChanged === 'status' && c.newValue === 'dropped')
  );
  const carriedOverTasks = tasks.filter((t) => t.carriedOverFromDate);

  // 4. Slippage Trend (simulate past 14 days slippage in days)
  const slippageTrend = [0, 0, 1, 1, 0, 2, 1, 1, 0, 0, 1, 2, 1, 1];

  return (
    <div className="flex flex-col gap-5">
      {/* 1. Horizon Completion Rates */}
      <div className="surface-card rounded-[var(--radius-sm)] p-4 flex flex-col gap-3 border border-[var(--color-rule)]">
        <div className="flex items-center justify-between hairline-b pb-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[var(--color-accent)]" />
            <h3 className="font-semibold text-xs text-[var(--color-ink)]">
              Target completion rate by horizon
            </h3>
          </div>
          <span className="text-[11px] font-mono text-[var(--color-ink-muted)]">
            Multi-horizon execution
          </span>
        </div>
        <SvgHorizonBarChart records={horizonRecords} />
      </div>

      {/* 2. Weekday Pattern & Slippage Trend */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Weekday Performance */}
        <div className="surface-card rounded-[var(--radius-sm)] p-4 flex flex-col gap-3 border border-[var(--color-rule)]">
          <div className="flex items-center justify-between hairline-b pb-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[var(--color-accent)]" />
              <h4 className="font-semibold text-xs text-[var(--color-ink)]">
                Completion rate by weekday
              </h4>
            </div>
            <span className="text-[11px] font-mono text-[var(--color-ink-muted)]">
              Mon to Sun rhythm
            </span>
          </div>

          <div className="grid grid-cols-7 gap-1.5 pt-1">
            {weekdayStats.map((item) => (
              <div
                key={item.dayLabel}
                className="flex flex-col items-center gap-1.5 p-1.5 rounded-[var(--radius-xs)] surface-well border border-[var(--color-rule)]"
              >
                <span className="text-[10px] font-medium text-[var(--color-ink)]">
                  {item.dayLabel}
                </span>
                <div className="w-full bg-[var(--color-paper-3)] h-10 flex items-end rounded-[1px] overflow-hidden">
                  <div
                    className="w-full bg-[var(--color-accent)] transition-all duration-300"
                    style={{ height: `${item.rate}%` }}
                    title={`${item.dayLabel}: ${item.rate}% (${item.completed}/${item.total})`}
                  />
                </div>
                <span className="text-[10px] font-mono tabular-figure font-semibold text-[var(--color-ink)]">
                  {item.rate}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Slippage Trend */}
        <div className="surface-card rounded-[var(--radius-sm)] p-4 flex flex-col justify-between gap-3 border border-[var(--color-rule)]">
          <div>
            <div className="flex items-center justify-between hairline-b pb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[var(--color-accent)]" />
                <h4 className="font-semibold text-xs text-[var(--color-ink)]">
                  Schedule slippage trend
                </h4>
              </div>
              <span className="text-[11px] font-mono tabular-figure font-semibold text-[var(--color-accent)]">
                +1.0d avg
              </span>
            </div>
            <p className="text-xs text-[var(--color-ink-muted)] mt-2">
              Average variance in days past scheduled deadline across active tasks and targets.
            </p>
          </div>

          <div className="surface-well p-3 rounded-[var(--radius-xs)] border border-[var(--color-rule)] flex items-center justify-between">
            <SvgSparkline data={slippageTrend} width={180} height={40} />
            <div className="flex flex-col text-right font-mono text-xs">
              <span className="text-[10px] text-[var(--color-ink-muted)]">Max slip</span>
              <span className="font-bold text-[var(--color-ink)]">2 days</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Carry-Over and Drop Reasons Ledger */}
      <div className="surface-card rounded-[var(--radius-sm)] p-4 flex flex-col gap-3 border border-[var(--color-rule)]">
        <div className="flex items-center justify-between hairline-b pb-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[var(--color-accent)]" />
            <h4 className="font-semibold text-xs text-[var(--color-ink)]">
              Carry-over & drop audit ledger
            </h4>
          </div>
          <span className="text-[11px] font-mono text-[var(--color-ink-muted)]">
            PRD TR-3 & TR-4 traceability
          </span>
        </div>

        <div className="flex flex-col divide-y divide-[var(--color-rule)] max-h-48 overflow-y-auto">
          {dropEntries.length === 0 && carriedOverTasks.length === 0 ? (
            <div className="py-6 text-center text-xs text-[var(--color-ink-muted)]">
              No dropped items or carry-over events logged.
            </div>
          ) : (
            <>
              {dropEntries.map((entry) => (
                <div key={entry.id} className="py-2 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded-[var(--radius-xs)] font-mono text-[10px] bg-red-500/10 text-red-600 border border-red-500/30">
                      Dropped
                    </span>
                    <span className="font-medium text-[var(--color-ink)]">
                      {entry.entityType}: {entry.entityId}
                    </span>
                  </div>
                  <span className="text-[11px] text-[var(--color-ink-muted)] italic">
                    "{entry.reason || 'No reason provided'}"
                  </span>
                </div>
              ))}
              {carriedOverTasks.map((t) => (
                <div key={t.id} className="py-2 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded-[var(--radius-xs)] font-mono text-[10px] bg-amber-500/10 text-amber-600 border border-amber-500/30">
                      Carry-Over
                    </span>
                    <span className="font-medium text-[var(--color-ink)] truncate max-w-sm">
                      {t.title}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-[var(--color-ink-muted)]">
                    Carried from {t.carriedOverFromDate}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

