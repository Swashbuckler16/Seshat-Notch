import React from 'react';
import { ProjectGoal, Target, Task, Habit, MilestonePhase, TimeSession, ProgressLog } from '../../../types';
import { SvgBulletChart } from '../charts/SvgBulletChart';
import { SvgTimePieChart } from '../charts/SvgTimePieChart';
import { SvgWeeklyFocusChart } from '../charts/SvgWeeklyFocusChart';
import {
  calculateProjectProgress,
  calculateExpectedProgress,
  calculateScheduleRatio,
  calculateWeeklyTargetSummary,
  calculateMonthlyTargetSummary,
} from '../../../utils/metricEngine';
import { calculateTimeMetrics, formatMinutesToHuman } from '../../../utils/timeMath';
import {
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
  habits: _habits,
  milestones,
  timeSessions,
  progressLogs: _progressLogs,
  onNavigateTab,
}) => {
  const timeMetrics = calculateTimeMetrics(timeSessions, tasks, projects);

  // Carry-over count (uncompleted tasks scheduled before today)
  const carryOverTasks = tasks.filter(
    (t) =>
      !t.isDeleted &&
      t.status !== 'done' &&
      t.status !== 'dropped' &&
      t.scheduleDate &&
      t.scheduleDate < todayStr
  );

  // 3. Week and Month Target completion rates (Centralized calculation)
  const weekSummary = calculateWeeklyTargetSummary(targets, todayStr);
  const monthSummary = calculateMonthlyTargetSummary(targets, todayStr);
  const weekTargets = weekSummary.targets;
  const weekCompleted = weekSummary.completed;
  const weekRate = weekSummary.ratePercent;

  const monthTargets = monthSummary.targets;
  const monthCompleted = monthSummary.completed;
  const monthRate = monthSummary.ratePercent;

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
      {/* Carry-over triage alert banner */}
      {carryOverTasks.length > 0 && (
        <div className="flex items-center justify-between p-3 rounded-[var(--radius-sm)] bg-[var(--color-status-at-risk-bg)] border border-[var(--color-status-at-risk)]/40 text-xs">
          <div className="flex items-center gap-2 text-[var(--color-status-at-risk)]">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              <strong className="font-semibold">{carryOverTasks.length} unfinished tasks</strong> carried over from earlier days require triage.
            </span>
          </div>
          {onNavigateTab && (
            <button
              type="button"
              onClick={() => onNavigateTab('reviews')}
              className="font-medium underline hover:text-[var(--color-status-at-risk)] ml-2"
            >
              Review tasks
            </button>
          )}
        </div>
      )}

      <section className="surface-card overview-focus-card" aria-labelledby="overview-focus-heading">
        <div className="section-heading-row">
          <div>
            <h3 id="overview-focus-heading">Your time at a glance</h3>
            <p>Based on your logged focus sessions</p>
          </div>
        </div>
        <div className="overview-charts">
          <figure className="overview-chart-block" aria-labelledby="focus-type-heading">
            <figcaption className="overview-chart-caption">
              <h4 id="focus-type-heading">Focus by type</h4>
              <span>{formatMinutesToHuman(timeMetrics.totalMinutes)} logged</span>
            </figcaption>
            <SvgTimePieChart items={timeMetrics.kindBreakdown} />
          </figure>
          <figure className="overview-chart-block" aria-labelledby="weekly-focus-heading">
            <figcaption className="overview-chart-caption">
              <h4 id="weekly-focus-heading">This week</h4>
              <span>Minutes focused each day</span>
            </figcaption>
            <SvgWeeklyFocusChart days={timeMetrics.dailyTrend} />
          </figure>
        </div>
      </section>

      {/* 2. Weekly and monthly goals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="surface-card rounded-[var(--radius-sm)] p-4 flex flex-col gap-3 border border-[var(--color-rule)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[var(--color-accent)]" />
              <h4 className="font-semibold text-xs text-[var(--color-ink)]">
                Weekly goals
              </h4>
            </div>
            <span className="text-[11px] text-[var(--color-ink-muted)]">
              {weekCompleted} of {weekTargets.length} complete
            </span>
          </div>
          <SvgBulletChart actual={weekRate} max={100} />
          {weekTargets.length === 0 && <span className="text-[11px] text-[var(--color-ink-muted)]">No goals set for this week yet.</span>}
        </div>

        <div className="surface-card rounded-[var(--radius-sm)] p-4 flex flex-col gap-3 border border-[var(--color-rule)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[var(--color-accent)]" />
              <h4 className="font-semibold text-xs text-[var(--color-ink)]">
                Monthly goals
              </h4>
            </div>
            <span className="text-[11px] text-[var(--color-ink-muted)]">
              {monthCompleted} of {monthTargets.length} complete
            </span>
          </div>
          <SvgBulletChart actual={monthRate} max={100} />
          {monthTargets.length === 0 && <span className="text-[11px] text-[var(--color-ink-muted)]">No goals set for this month yet.</span>}
        </div>
      </div>

      {/* 3. Active Project Health Matrix */}
      <div className="surface-card rounded-[var(--radius-sm)] p-4 flex flex-col gap-3 border border-[var(--color-rule)]">
        <div className="flex items-center justify-between hairline-b pb-2">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-[var(--color-accent)]" />
            <h4 className="font-semibold text-xs text-[var(--color-ink)]">
              Your projects
            </h4>
          </div>
          <span className="text-[11px] text-[var(--color-ink-muted)]">
            Progress and timing
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
                <span className="text-[11px] text-[var(--color-ink-muted)]">
                  {progress.progressPercent}% actual vs {expected.expectedPercent}% expected
                </span>
              </div>

              <div className="flex items-center gap-3">
                {/* Horizontal mini bar */}
                <div className="w-32 bg-[var(--color-paper-3)] h-2 rounded-[1px] overflow-hidden border border-[var(--color-rule)]">
                  <div
                    className="bg-[var(--color-accent)] h-full transition-colors duration-300"
                    style={{ width: `${progress.progressPercent}%` }}
                  />
                </div>

                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[var(--radius-xs)] text-xs font-semibold ${
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

