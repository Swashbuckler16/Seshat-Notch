import React, { useState } from 'react';
import { ProjectGoal, Task, Habit, TimeSession, Blocker, ProgressLog } from '../../../types';
import { calculateHabitMetrics } from '../../../utils/habitMath';
import { calculateTimeMetrics, formatMinutesToHuman } from '../../../utils/timeMath';
import {
  Lightbulb,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Calculator,
} from 'lucide-react';

interface DashboardInsightsTabProps {
  todayStr: string;
  projects: ProjectGoal[];
  tasks: Task[];
  habits: Habit[];
  timeSessions: TimeSession[];
  blockers: Blocker[];
  progressLogs: ProgressLog[];
}

export interface RuleInsight {
  id: string;
  category: 'Velocity' | 'Focus' | 'Risk' | 'Consistency' | 'Calibration';
  severity: 'info' | 'positive' | 'warning' | 'alert';
  title: string;
  observation: string;
  ruleFormula: string;
  triggeredValue: string;
  recommendation: string;
}

export const DashboardInsightsTab: React.FC<DashboardInsightsTabProps> = ({
  todayStr,
  projects,
  tasks,
  habits,
  timeSessions,
  blockers,
  progressLogs,
}) => {
  const [expandedInsightIds, setExpandedInsightIds] = useState<Record<string, boolean>>({});

  const toggleInsight = (id: string) => {
    setExpandedInsightIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Check history breadth before evaluating insights
  const allDates = new Set<string>();
  tasks.forEach((t) => { if (t.scheduleDate) allDates.add(t.scheduleDate); });
  progressLogs.forEach((l) => { if (l.date) allDates.add(l.date); });
  timeSessions.forEach((s) => { if (s.startTime) allDates.add(s.startTime.slice(0, 10)); });

  const hasEnoughData = allDates.size >= 14 && tasks.filter((t) => t.status === 'done').length >= 10;

  // 1. Evaluate Rule: Weekday Velocity Anomaly
  const insights: RuleInsight[] = [];

  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayStats = weekdays.map((name, idx) => {
    const dayTasks = tasks.filter((t) => {
      if (!t.scheduleDate) return false;
      const d = new Date(`${t.scheduleDate}T00:00:00Z`);
      return d.getUTCDay() === idx;
    });
    const done = dayTasks.filter((t) => t.status === 'done').length;
    const rate = dayTasks.length > 0 ? Math.round((done / dayTasks.length) * 100) : 0;
    return { name, total: dayTasks.length, done, rate };
  });

  // Only trigger weekday velocity insight when there is statistically credible data (>= 8 tasks and >= 14 days)
  const qualifiedDays = dayStats.filter((d) => d.total >= 8);
  if (hasEnoughData && qualifiedDays.length > 0) {
    const bestDay = [...qualifiedDays].sort((a, b) => b.rate - a.rate)[0];
    if (bestDay && bestDay.rate >= 70) {
      insights.push({
        id: 'velocity-best-day',
        category: 'Velocity',
        severity: 'positive',
        title: `${bestDay.name} is your highest velocity execution day`,
        observation: `Historical completion rate peaks at ${bestDay.rate}% on ${bestDay.name}s (${bestDay.done}/${bestDay.total} tasks completed).`,
        ruleFormula: `rate = (doneTasks[day] / totalTasks[day]) * 100; condition: totalTasks >= 8 && history >= 14 days && rate >= 70%`,
        triggeredValue: `${bestDay.rate}% completion rate on ${bestDay.name}`,
        recommendation: `Schedule your highest-priority or most challenging milestones on ${bestDay.name}s.`,
      });
    }
  }

  // 2. Evaluate Rule: Project Inactivity / Stagnation
  const activeProjects = projects.filter((p) => !p.isDeleted && p.status === 'active');
  const todayD = new Date(`${todayStr}T00:00:00Z`);

  for (const proj of activeProjects) {
    const projTasks = tasks.filter((t) => !t.isDeleted && t.projectId === proj.id);
    const projLogs = progressLogs.filter((l) => !l.isDeleted && l.entityId === proj.id);

    const dates = [
      ...projTasks.map((t) => t.scheduleDate || t.updatedAt.slice(0, 10)),
      ...projLogs.map((l) => l.date),
    ].filter(Boolean).sort().reverse();

    if (dates.length > 0) {
      const latest = dates[0];
      const actD = new Date(`${latest}T00:00:00Z`);
      const daysSince = Math.max(0, Math.round((todayD.getTime() - actD.getTime()) / 86400000));

      if (daysSince >= 5) {
        insights.push({
          id: `inactivity-${proj.id}`,
          category: 'Risk',
          severity: 'warning',
          title: `Stagnation alert: ${proj.title} has had no activity for ${daysSince} days`,
          observation: `The project '${proj.title}' has no scheduled tasks or progress logs since ${latest}.`,
          ruleFormula: `daysSinceLastActivity = (today - max(log.date, task.date)) / 86400000; condition: daysSince >= 5`,
          triggeredValue: `${daysSince} days without logged activity`,
          recommendation: `Break the impasse by scheduling a 20-minute unblocking task or reviewing open blockers.`,
        });
      }
    }
  }

  // 3. Evaluate Rule: Deep Work Allocation
  const timeMetrics = calculateTimeMetrics(timeSessions, tasks, projects, []);
  if (timeMetrics.sessionCount >= 2) {
    if (timeMetrics.deepWorkRatio >= 60) {
      insights.push({
        id: 'deep-work-optimal',
        category: 'Focus',
        severity: 'positive',
        title: `Optimal deep work density (${timeMetrics.deepWorkRatio}%)`,
        observation: `You logged ${formatMinutesToHuman(timeMetrics.totalMinutes)} with ${timeMetrics.deepWorkRatio}% classified as deep uninterrupted flow, meeting the ≥60% standard.`,
        ruleFormula: `deepWorkRatio = (deepMinutes / totalMinutes) * 100; benchmark: >= 60%`,
        triggeredValue: `${timeMetrics.deepWorkRatio}% deep work ratio`,
        recommendation: `Protect this focus cadence by keeping morning calendar blocks free of administrative overhead.`,
      });
    } else {
      insights.push({
        id: 'deep-work-low',
        category: 'Focus',
        severity: 'warning',
        title: `Shallow work consuming bandwidth (deep work at ${timeMetrics.deepWorkRatio}%)`,
        observation: `Only ${timeMetrics.deepWorkRatio}% of logged time was spent in uninterrupted deep work. Benchmark standard is ≥60%.`,
        ruleFormula: `deepWorkRatio = (deepMinutes / totalMinutes) * 100; benchmark: >= 60%`,
        triggeredValue: `${timeMetrics.deepWorkRatio}% deep work ratio (< 60%)`,
        recommendation: `Consolidate shallow administrative tasks into a single batch at the end of the day.`,
      });
    }
  }

  // 4. Evaluate Rule: Estimation Bias Calibration
  if (timeMetrics.estimateAccuracy.evaluatedTasksCount >= 3) {
    const { totalEstimatedMinutes, totalActualMinutes, varianceMinutes } = timeMetrics.estimateAccuracy;
    const ratio = totalEstimatedMinutes > 0 ? (totalActualMinutes / totalEstimatedMinutes).toFixed(2) : '1.0';

    if (totalActualMinutes > totalEstimatedMinutes * 1.15) {
      insights.push({
        id: 'estimate-bias-under',
        category: 'Calibration',
        severity: 'warning',
        title: `Systematic under-estimation bias (${ratio}x multiplier)`,
        observation: `Tasks took ${formatMinutesToHuman(varianceMinutes)} longer than estimated (${formatMinutesToHuman(totalActualMinutes)} actual vs ${formatMinutesToHuman(totalEstimatedMinutes)} planned).`,
        ruleFormula: `biasRatio = totalActualMinutes / totalEstimatedMinutes; condition: actual > 1.15 * estimated`,
        triggeredValue: `${ratio}x actual/estimated ratio`,
        recommendation: `Apply a 1.25x buffer to upcoming task estimates to avoid schedule slippage.`,
      });
    } else if (totalActualMinutes < totalEstimatedMinutes * 0.85) {
      insights.push({
        id: 'estimate-bias-over',
        category: 'Calibration',
        severity: 'info',
        title: `Tasks finishing faster than estimated (${ratio}x ratio)`,
        observation: `Tasks completed ahead of schedule by ${formatMinutesToHuman(Math.abs(varianceMinutes))}.`,
        ruleFormula: `biasRatio = totalActualMinutes / totalEstimatedMinutes; condition: actual < 0.85 * estimated`,
        triggeredValue: `${ratio}x actual/estimated ratio`,
        recommendation: `Tighten estimates to unlock capacity for additional horizon targets.`,
      });
    }
  }

  // 5. Evaluate Rule: Carry-Over Accumulation
  const overdueTasks = tasks.filter(
    (t) =>
      !t.isDeleted &&
      t.status !== 'done' &&
      t.status !== 'dropped' &&
      t.scheduleDate &&
      t.scheduleDate < todayStr
  );

  if (overdueTasks.length >= 3) {
    insights.push({
      id: 'carry-over-pileup',
      category: 'Risk',
      severity: 'alert',
      title: `Carry-over accumulation: ${overdueTasks.length} uncompleted past tasks`,
      observation: `Multiple tasks have slipped past their scheduled dates without being completed or rescheduled.`,
      ruleFormula: `carryOverCount = count(tasks where status != 'done' && scheduleDate < today); condition: count >= 3`,
      triggeredValue: `${overdueTasks.length} slipped tasks`,
      recommendation: `Conduct a Carry-Over Inbox sweep to drop stale tasks or reschedule high-priority items.`,
    });
  }

  // 6. Evaluate Rule: Habit Streak Milestone
  const activeHabits = habits.filter((h) => !h.isDeleted && !h.isArchived);
  for (const habit of activeHabits) {
    const stats = calculateHabitMetrics(habit, progressLogs, todayStr);
    const streak = habit.isAvoidance ? stats.daysClean || 0 : stats.currentStreak;

    if (streak >= 7 && streak % 7 === 0) {
      insights.push({
        id: `habit-streak-${habit.id}`,
        category: 'Consistency',
        severity: 'positive',
        title: `${streak}-interval streak reached for ${habit.title}`,
        observation: `Maintained uninterrupted consistency across ${streak} consecutive intervals under Fair Streak rules.`,
        ruleFormula: `streak = countConsecutiveValidIntervals(); condition: streak % 7 == 0 && streak >= 7`,
        triggeredValue: `${streak} interval streak`,
        recommendation: `Protect this routine anchor: anchor it to an existing automatic daily habit.`,
      });
    }
  }

  // 7. Evaluate Rule: Blocker Impediment
  const activeBlockersList = blockers.filter((b) => !b.dateCleared);
  if (activeBlockersList.length > 0) {
    insights.push({
      id: 'blocker-impediment',
      category: 'Risk',
      severity: 'warning',
      title: `${activeBlockersList.length} active blockers impeding execution`,
      observation: `There are currently ${activeBlockersList.length} unresolved blockers logged against your projects or milestones.`,
      ruleFormula: `openBlockers = count(blockers where dateCleared is null); condition: openBlockers > 0`,
      triggeredValue: `${activeBlockersList.length} active blockers`,
      recommendation: `Conduct a targeted unblocking session to clear external dependencies.`,
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Overview Banner */}
      <div className="surface-card rounded-[var(--radius-sm)] p-4 border border-[var(--color-rule)] flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-[var(--color-accent)]" />
          <h2 className="text-xs font-bold text-[var(--color-ink)] uppercase tracking-wider">
            Insights & Pattern Analysis
          </h2>
        </div>
        <p className="text-xs text-[var(--color-ink-muted)]">
          Observations are derived from your execution logs with transparent mathematical formulas and clear thresholds.
        </p>
      </div>

      {/* Insights Ledger */}
      {!hasEnoughData ? (
        <div className="surface-card rounded-[var(--radius-sm)] p-8 border border-[var(--color-rule)] text-center flex flex-col items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-[var(--color-paper-2)] border border-[var(--color-rule)] flex items-center justify-center text-[var(--color-ink-muted)]">
            <Lightbulb className="w-5 h-5 text-[var(--color-accent)]" />
          </div>
          <h3 className="font-semibold text-xs text-[var(--color-ink)]">Needs more data</h3>
          <p className="text-xs text-[var(--color-ink-muted)] max-w-md">
            Pattern analysis requires at least 14 days of logged activity to detect genuine trends without false assumptions. You currently have {allDates.size} day{allDates.size === 1 ? '' : 's'} recorded.
          </p>
        </div>
      ) : insights.length === 0 ? (
        <div className="surface-card rounded-[var(--radius-sm)] p-8 border border-[var(--color-rule)] text-center text-xs text-[var(--color-ink-muted)]">
          All systems operating smoothly within expected bounds. Continue logging sessions and tasks to reveal advanced observations.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {insights.map((insight) => {
            const isExpanded = expandedInsightIds[insight.id] ?? false;

            let badgeClass = 'text-[var(--color-ink-muted)] bg-[var(--color-paper-2)] border-[var(--color-rule)]';
            if (insight.severity === 'positive') {
              badgeClass = 'text-[var(--color-emerald)] bg-[var(--color-emerald)]/10 border-[var(--color-emerald)]/30';
            } else if (insight.severity === 'warning') {
              badgeClass = 'text-[var(--color-amber)] bg-[var(--color-amber)]/10 border-[var(--color-amber)]/30';
            } else if (insight.severity === 'alert') {
              badgeClass = 'text-[var(--color-rose)] bg-[var(--color-rose)]/10 border-[var(--color-rose)]/30';
            }

            return (
              <div
                key={insight.id}
                className="surface-card rounded-[var(--radius-sm)] border border-[var(--color-rule)] p-4 flex flex-col gap-3 transition-colors"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-[var(--radius-xs)] text-[10px] font-mono border uppercase tracking-wider ${badgeClass}`}>
                      {insight.category} · {insight.severity}
                    </span>
                    <h3 className="font-semibold text-xs text-[var(--color-ink)]">
                      {insight.title}
                    </h3>
                  </div>

                  <span className="font-mono text-[11px] tabular-figure text-[var(--color-ink-muted)]">
                    {insight.triggeredValue}
                  </span>
                </div>

                {/* Observation & Recommendation */}
                <div className="text-xs flex flex-col gap-2">
                  <p className="text-[var(--color-ink)] leading-relaxed">
                    {insight.observation}
                  </p>
                  <div className="p-2.5 rounded-[var(--radius-xs)] bg-[var(--color-paper-2)] border border-[var(--color-rule)] flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-accent)] shrink-0 mt-0.5" />
                    <span className="text-[11px] text-[var(--color-ink)]">
                      <span className="font-semibold">Action: </span>
                      {insight.recommendation}
                    </span>
                  </div>
                </div>

                {/* Formula Dropdown Accordion */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => toggleInsight(insight.id)}
                    className="inline-flex items-center gap-1.5 text-[11px] font-mono text-[var(--color-ink-muted)] hover:text-[var(--color-accent)] transition-colors"
                  >
                    <Calculator className="w-3.5 h-3.5" />
                    <span>{isExpanded ? 'Hide mathematical rule' : 'Inspect rule formula & condition'}</span>
                    {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  </button>

                  {isExpanded && (
                    <div className="mt-2 p-2.5 rounded-[var(--radius-xs)] surface-well border border-[var(--color-rule)] flex flex-col gap-1 text-[11px] font-mono text-[var(--color-ink-muted)]">
                      <span className="font-semibold text-[var(--color-ink)]">Underlying Rule:</span>
                      <code className="text-[var(--color-ink)] bg-[var(--color-paper)] p-1.5 rounded-[1px] border border-[var(--color-rule)] overflow-x-auto">
                        {insight.ruleFormula}
                      </code>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
