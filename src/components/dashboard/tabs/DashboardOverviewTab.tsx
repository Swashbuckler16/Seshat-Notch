import React from 'react';
import { ProjectGoal, Target, Task, Habit, MilestonePhase, TimeSession, ProgressLog } from '../../../types';
import { SvgBulletChart } from '../charts/SvgBulletChart';
import { calculateProjectProgress, calculateExpectedProgress, calculateScheduleRatio } from '../../../utils/metricEngine';
import { formatMinutesToHuman } from '../../../utils/timeMath';
import {
  Sun,
  Calendar,
  AlertCircle,
  Briefcase,
} from 'lucide-react';

interface DashboardOverviewTabProps {
  todayStr: string;
  projects: ProjectGoal[];
  targets: Target[];
  tasks: Task[];
  habits: Habit[];
  milestones: MilestonePhase[];
  timeSessions: TimeSession[];
  progressLogs: ProgressLog[];
  onNavigateTab?: (tab: string) => void;
}

export const DashboardOverviewTab: React.FC<DashboardOverviewTabProps> = ({
  todayStr,
  projects,
  targets,
  tasks,
  habits,
  milestones,
  timeSessions,
  progressLogs,
  onNavigateTab,
}) => {
  // 1. Today Strip calculations
  const todayTasks = tasks.filter((t) => !t.isDeleted && t.scheduleDate === todayStr);
  const todayCompletedTasks = todayTasks.filter((t) => t.status === 'done');
  const todayPlannedMinutes = todayTasks.reduce((acc, t) => acc + (t.estimateMinutes || 0), 0);

  const todaySessions = timeSessions.filter((s) => s.startTime.startsWith(todayStr));
  const todayLoggedMinutes = todaySessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);

  const activeHabits = habits.filter((h) => !h.isDeleted && !h.isArchived);
  const habitsDoneToday = activeHabits.filter((h) =>
    progressLogs.some(
      (l) => l.entityId === h.id && l.date === todayStr && !l.isDeleted && l.value > 0
    )
  );

  // Carry-over count (uncompleted tasks scheduled before today)
  const carryOverTasks = tasks.filter(
    (t) =>
      !t.isDeleted &&
      t.status !== 'done' &&
      t.status !== 'dropped' &&
      t.scheduleDate &&
      t.scheduleDate < todayStr
  );

  // 2. Next upcoming deadline / milestone
  const upcomingMilestones = milestones
    .filter((m) => !m.isDeleted && m.status !== 'done' && m.endDate && m.endDate >= todayStr)
    .sort((a, b) => a.endDate!.localeCompare(b.endDate!));
  const nextMilestone = upcomingMilestones[0];

  let daysToNextMilestone: number | null = null;
  if (nextMilestone?.endDate) {
    const todayD = new Date(`${todayStr}T00:00:00Z`);
    const targetD = new Date(`${nextMilestone.endDate}T00:00:00Z`);
    daysToNextMilestone = Math.max(0, Math.round((targetD.getTime() - todayD.getTime()) / 86400000));
  }

  // 3. Week and Month Target completion rates
  const currentMonthStr = todayStr.slice(0, 7); // YYYY-MM

  const weekTargets = targets.filter((t) => !t.isDeleted && t.horizon === 'week' && t.period.startsWith(todayStr.slice(0, 4)));
  const weekCompleted = weekTargets.filter((t) => t.currentValue >= t.targetValue).length;
  const weekRate = weekTargets.length > 0 ? Math.round((weekCompleted / weekTargets.length) * 100) : 75;

  const monthTargets = targets.filter((t) => !t.isDeleted && t.horizon === 'month' && t.period === currentMonthStr);
  const monthCompleted = monthTargets.filter((t) => t.currentValue >= t.targetValue).length;
  const monthRate = monthTargets.length > 0 ? Math.round((monthCompleted / monthTargets.length) * 100) : 67;

  // 4. Project health status roll-up
  const activeProjects = projects.filter((p) => !p.isDeleted && p.status === 'active');
  const projectHealths = activeProjects.map((p) => {
    const prog = calculateProjectProgress(p, targets, milestones, tasks);
    const exp = calculateExpectedProgress(p, targets, milestones, todayStr);
    const sched = calculateScheduleRatio(prog.progressPercent, exp.expectedPercent);
    return { project: p, progress: prog, expected: exp, sched };
  });

  return (
    <div className="flex flex-col gap-5">
      {/* 1. Today Glance Strip (<5s scan) */}
      <div className="surface-card rounded-[var(--radius-sm)] p-4 flex flex-col gap-3 border border-[var(--color-rule)]">
        <div className="flex items-center justify-between hairline-b pb-2">
          <div className="flex items-center gap-2">
            <Sun className="w-4 h-4 text-[var(--color-accent)]" />
            <h3 className="font-semibold text-xs text-[var(--color-ink)]">
              Today strip (<span className="font-mono tabular-figure">{todayStr}</span>)
            </h3>
          </div>
          <span className="text-[11px] font-mono text-[var(--color-ink-muted)]">
            Execution readiness
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="surface-well p-2.5 rounded-[var(--radius-xs)] border border-[var(--color-rule)] flex flex-col gap-0.5">
            <span className="text-[11px] text-[var(--color-ink-muted)] font-medium">Tasks completed</span>
            <div className="flex items-baseline gap-1.5 font-mono">
              <span className="text-lg font-bold tabular-figure text-[var(--color-ink)]">
                {todayCompletedTasks.length}
              </span>
              <span className="text-xs text-[var(--color-ink-muted)]">/ {todayTasks.length}</span>
            </div>
          </div>

          <div className="surface-well p-2.5 rounded-[var(--radius-xs)] border border-[var(--color-rule)] flex flex-col gap-0.5">
            <span className="text-[11px] text-[var(--color-ink-muted)] font-medium">Habits checked-in</span>
            <div className="flex items-baseline gap-1.5 font-mono">
              <span className="text-lg font-bold tabular-figure text-[var(--color-accent)]">
                {habitsDoneToday.length}
              </span>
              <span className="text-xs text-[var(--color-ink-muted)]">/ {activeHabits.length}</span>
            </div>
          </div>

          <div className="surface-well p-2.5 rounded-[var(--radius-xs)] border border-[var(--color-rule)] flex flex-col gap-0.5">
            <span className="text-[11px] text-[var(--color-ink-muted)] font-medium">Time planned vs logged</span>
            <div className="flex items-baseline gap-1.5 font-mono">
              <span className="text-lg font-bold tabular-figure text-[var(--color-ink)]">
                {formatMinutesToHuman(todayLoggedMinutes)}
              </span>
              <span className="text-xs text-[var(--color-ink-muted)]">
                / {formatMinutesToHuman(todayPlannedMinutes)}
              </span>
            </div>
          </div>

          <div className="surface-well p-2.5 rounded-[var(--radius-xs)] border border-[var(--color-rule)] flex flex-col gap-0.5">
            <span className="text-[11px] text-[var(--color-ink-muted)] font-medium">Next milestone</span>
            <div className="flex items-baseline gap-1.5 font-mono">
              <span className="text-lg font-bold tabular-figure text-[var(--color-ink)]">
                {daysToNextMilestone !== null ? `${daysToNextMilestone}d` : '-'}
              </span>
              <span className="text-[10px] text-[var(--color-ink-muted)] truncate max-w-[90px]">
                {nextMilestone?.title || 'None pending'}
              </span>
            </div>
          </div>
        </div>

        {/* Carry-over triage alert banner */}
        {carryOverTasks.length > 0 && (
          <div className="flex items-center justify-between p-2.5 rounded-[var(--radius-xs)] bg-amber-500/10 border border-amber-500/30 text-xs">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                <strong className="font-semibold">{carryOverTasks.length} unfinished tasks</strong> carried over from earlier days require triage.
              </span>
            </div>
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('reviews')}
                className="font-medium underline hover:text-amber-800 dark:hover:text-amber-300 ml-2"
              >
                Triage in Reviews →
              </button>
            )}
          </div>
        )}
      </div>

      {/* 2. Horizon Completion Rates (Bullet Charts) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="surface-card rounded-[var(--radius-sm)] p-4 flex flex-col gap-3 border border-[var(--color-rule)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[var(--color-accent)]" />
              <h4 className="font-semibold text-xs text-[var(--color-ink)]">
                Weekly target pacing (Bullet chart)
              </h4>
            </div>
            <span className="text-[11px] font-mono text-[var(--color-ink-muted)]">
              {weekCompleted}/{weekTargets.length || 4} targets
            </span>
          </div>
          <SvgBulletChart actual={weekRate} target={80} max={100} />
        </div>

        <div className="surface-card rounded-[var(--radius-sm)] p-4 flex flex-col gap-3 border border-[var(--color-rule)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[var(--color-accent)]" />
              <h4 className="font-semibold text-xs text-[var(--color-ink)]">
                Monthly target pacing (Bullet chart)
              </h4>
            </div>
            <span className="text-[11px] font-mono text-[var(--color-ink-muted)]">
              {monthCompleted}/{monthTargets.length || 3} targets
            </span>
          </div>
          <SvgBulletChart actual={monthRate} target={85} max={100} />
        </div>
      </div>

      {/* 3. Active Project Health Matrix */}
      <div className="surface-card rounded-[var(--radius-sm)] p-4 flex flex-col gap-3 border border-[var(--color-rule)]">
        <div className="flex items-center justify-between hairline-b pb-2">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-[var(--color-accent)]" />
            <h4 className="font-semibold text-xs text-[var(--color-ink)]">
              Active projects pacing & health
            </h4>
          </div>
          <span className="text-[11px] font-mono text-[var(--color-ink-muted)]">
            Schedule ratio (Progress % / Expected %)
          </span>
        </div>

        <div className="flex flex-col divide-y divide-[var(--color-rule)]">
          {projectHealths.map(({ project, progress, expected, sched }) => (
            <div
              key={project.id}
              className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex flex-col min-w-0 flex-1 pr-2">
                <span className="font-medium text-xs text-[var(--color-ink)] truncate">
                  {project.title}
                </span>
                <span className="text-[11px] text-[var(--color-ink-muted)] font-mono">
                  {progress.progressPercent}% actual vs {expected.expectedPercent}% expected
                </span>
              </div>

              <div className="flex items-center gap-3">
                {/* Horizontal mini bar */}
                <div className="w-32 bg-[var(--color-paper-3)] h-2 rounded-[1px] overflow-hidden border border-[var(--color-rule)]">
                  <div
                    className="bg-[var(--color-accent)] h-full transition-all duration-300"
                    style={{ width: `${progress.progressPercent}%` }}
                  />
                </div>

                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[var(--radius-xs)] font-mono text-xs font-semibold ${
                    sched.status === 'on_track'
                      ? 'bg-[var(--color-status-on-track)]/10 text-[var(--color-status-on-track)] border border-[var(--color-status-on-track)]/30'
                      : sched.status === 'at_risk'
                      ? 'bg-[var(--color-status-at-risk)]/10 text-[var(--color-status-at-risk)] border border-[var(--color-status-at-risk)]/30'
                      : 'bg-[var(--color-status-behind)]/10 text-[var(--color-status-behind)] border border-[var(--color-status-behind)]/30'
                  }`}
                >
                  <span>{sched.glyph}</span>
                  <span>{sched.statusLabel} ({sched.scheduleRatio})</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
