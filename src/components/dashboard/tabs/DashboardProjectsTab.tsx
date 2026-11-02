import React, { useState } from 'react';
import { ProjectGoal, Area, MilestonePhase, Target, Task, ProgressLog, Blocker, TimeSession } from '../../../types';
import { evaluateCompleteProjectMetrics, MetricCalculationTrace } from '../../../utils/metricEngine';
import { FormulaInspectorModal } from '../../metrics/FormulaInspectorModal';
import { formatMinutesToHuman } from '../../../utils/timeMath';
import {
  Briefcase,
  AlertTriangle,
  HelpCircle,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';

interface DashboardProjectsTabProps {
  todayStr: string;
  projects: ProjectGoal[];
  areas: Area[];
  milestones: MilestonePhase[];
  targets: Target[];
  tasks: Task[];
  progressLogs: ProgressLog[];
  blockers: Blocker[];
  timeSessions: TimeSession[];
  onOpenProjectDetail?: (projectId: string) => void;
}

export const DashboardProjectsTab: React.FC<DashboardProjectsTabProps> = ({
  todayStr,
  projects,
  areas,
  milestones,
  targets,
  tasks,
  progressLogs,
  blockers,
  timeSessions,
  onOpenProjectDetail,
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    projects.length > 0 ? projects[0].id : null
  );
  const [activeInspectorTrace, setActiveInspectorTrace] = useState<MetricCalculationTrace | null>(null);

  // Evaluate metrics for each project
  const projectMetricsList = projects.map((p) => {
    const metrics = evaluateCompleteProjectMetrics(
      p,
      milestones,
      targets,
      tasks,
      progressLogs,
      blockers,
      todayStr
    );

    const projectTasks = tasks.filter((t) => !t.isDeleted && (t.projectId === p.id || t.targetId === p.id));
    const relatedEntityIds = new Set([
      p.id,
      ...targets.filter((target) => !target.isDeleted && target.projectId === p.id).map((target) => target.id),
      ...projectTasks.map((task) => task.id),
    ]);
    const projectSessions = timeSessions.filter((s) => s.entityType === 'project' && s.entityId === p.id);
    
    // Estimate vs Actual hours
    const totalEstMins = projectTasks.reduce((acc, t) => acc + (t.estimateMinutes || 0), 0);
    const totalLoggedMins = projectSessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0) +
      projectTasks.reduce((acc, t) => acc + (t.actualMinutes || 0), 0);

    // Days since last activity
    let daysSinceLastActivity: number | null = null;
    const taskDates = projectTasks
      .map((t) => t.scheduleDate || t.updatedAt?.slice(0, 10))
      .filter((d): d is string => Boolean(d));
    const logDates = progressLogs
      .filter((l) => !l.isDeleted && relatedEntityIds.has(l.entityId))
      .map((l) => l.date)
      .filter((d): d is string => Boolean(d));
    const allDates = [...taskDates, ...logDates].sort().reverse();

    if (allDates.length > 0) {
      const latest = allDates[0];
      const todayD = new Date(`${todayStr}T00:00:00Z`);
      const actD = new Date(`${latest}T00:00:00Z`);
      daysSinceLastActivity = Math.max(0, Math.round((todayD.getTime() - actD.getTime()) / 86400000));
    }

    const area = areas.find((a) => a.id === p.areaId);

    return {
      project: p,
      metrics,
      areaName: area ? area.name : 'General',
      totalEstMins,
      totalLoggedMins,
      daysSinceLastActivity,
      activeBlockersCount: metrics.blockers.openBlockersCount,
    };
  });

  const selectedItem = projectMetricsList.find((item) => item.project.id === selectedProjectId) || projectMetricsList[0];

  return (
    <div className="flex flex-col gap-5">
      {/* 1. Projects Health Ledger (PRD 7.3) */}
      <div className="surface-card rounded-[var(--radius-sm)] p-4 flex flex-col gap-3 border border-[var(--color-rule)]">
        <div className="flex items-center justify-between hairline-b pb-2.5">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-[var(--color-accent)]" />
            <h2 className="text-base font-semibold text-[var(--color-ink)]">
              Project progress and timing
            </h2>
          </div>
          <span className="text-[11px] font-mono text-[var(--color-ink-muted)]">
            Progress and timing
          </span>
        </div>

        {projectMetricsList.length === 0 ? (
          <div className="py-8 text-center text-xs text-[var(--color-ink-muted)]">
            No active projects found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="hairline-b text-[11px] font-mono text-[var(--color-ink-muted)] bg-[var(--color-paper-2)]">
                  <th className="py-2 px-3 font-medium">Project</th>
                  <th className="py-2 px-3 font-medium">Status & Ratio</th>
                  <th className="py-2 px-3 font-medium">Progress</th>
                  <th className="py-2 px-3 font-medium">Forecast Date</th>
                  <th className="py-2 px-3 font-medium">Time (Log/Est)</th>
                  <th className="py-2 px-3 font-medium">Blockers</th>
                  <th className="py-2 px-3 font-medium">Last Activity</th>
                  <th className="py-2 px-2 text-right font-medium">Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-rule)]">
                {projectMetricsList.map((item) => {
                  const { project, metrics, areaName, totalEstMins, totalLoggedMins, daysSinceLastActivity, activeBlockersCount } = item;
                  const isSelected = project.id === selectedProjectId;
                  const sched = metrics.scheduleRatio;

                  let statusBadgeClass = 'text-[var(--color-ink-muted)] bg-[var(--color-paper-2)]';
                  if (sched.status === 'on_track') {
                    statusBadgeClass = 'text-[var(--color-emerald)] bg-[var(--color-emerald)]/10 border-[var(--color-emerald)]/30';
                  } else if (sched.status === 'at_risk') {
                    statusBadgeClass = 'text-[var(--color-status-at-risk)] bg-[var(--color-status-at-risk)]/10 border-[var(--color-status-at-risk)]/30';
                  } else if (sched.status === 'behind') {
                    statusBadgeClass = 'text-[var(--color-status-behind)] bg-[var(--color-status-behind)]/10 border-[var(--color-status-behind)]/30';
                  }

                  return (
                    <tr
                      key={project.id}
                      onClick={() => setSelectedProjectId(project.id)}
                      className={`cursor-pointer transition-colors hover:bg-[var(--color-paper-2)]/60 ${
                        isSelected ? 'bg-[var(--color-paper-2)]' : ''
                      }`}
                    >
                      {/* Project & Area */}
                      <td className="py-2.5 px-3">
                        <div className="flex flex-col">
                          <span className="font-semibold text-[var(--color-ink)] flex items-center gap-1.5">
                            {isSelected && <ChevronRight className="w-3.5 h-3.5 text-[var(--color-accent)] inline shrink-0" />}
                            {project.title}
                          </span>
                          <span className="text-xs text-[var(--color-ink-muted)]">
                            {areaName}
                          </span>
                        </div>
                      </td>

                      {/* Status Glyph & Schedule Ratio */}
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[var(--radius-xs)] text-[11px] font-mono border ${statusBadgeClass}`}
                        >
                          <span>{sched.glyph}</span>
                          <span className="font-medium">{sched.statusLabel}</span>
                          <span className="opacity-80">({sched.scheduleRatio.toFixed(2)})</span>
                        </span>
                      </td>

                      {/* Progress % */}
                      <td className="py-2.5 px-3">
                        <div className="flex flex-col gap-1 w-24">
                          <div className="flex justify-between text-[11px] font-mono">
                            <span className="font-semibold tabular-figure text-[var(--color-ink)]">
                              {metrics.progress.progressPercent}%
                            </span>
                            <span className="text-[var(--color-ink-muted)]">
                              exp {metrics.expectedProgress.expectedPercent}%
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-[var(--color-paper-3)] rounded-[1px] overflow-hidden">
                            <div
                              className="chart-fill-transition h-full bg-[var(--color-accent)]"
                              style={{ transform: `scaleX(${Math.max(0, Math.min(100, metrics.progress.progressPercent)) / 100})` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Forecast Finish */}
                      <td className="py-2.5 px-3 font-mono text-[11px] tabular-figure text-[var(--color-ink-muted)]">
                        {metrics.forecast.forecastDateExpected ? (
                          <span className="text-[var(--color-ink)] font-medium">
                            {metrics.forecast.forecastDateExpected}
                          </span>
                        ) : (
                          <span className="text-[var(--color-ink-muted)] italic">Insufficient logs</span>
                        )}
                      </td>

                      {/* Time: Logged vs Estimated */}
                      <td className="py-2.5 px-3 font-mono text-[11px] tabular-figure">
                        <span className="text-[var(--color-ink)] font-medium">
                          {formatMinutesToHuman(totalLoggedMins)}
                        </span>
                        <span className="text-[var(--color-ink-muted)]">
                          {' '}/ {formatMinutesToHuman(totalEstMins)}
                        </span>
                      </td>

                      {/* Blockers */}
                      <td className="py-2.5 px-3 font-mono text-[11px]">
                        {activeBlockersCount > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[var(--color-status-behind)] font-semibold">
                            <AlertTriangle className="w-3 h-3 text-[var(--color-status-behind)]" />
                            {activeBlockersCount}
                          </span>
                        ) : (
                          <span className="text-[var(--color-ink-muted)]">0</span>
                        )}
                      </td>

                      {/* Days Since Last Activity */}
                      <td className="py-2.5 px-3 font-mono text-[11px] tabular-figure">
                        {daysSinceLastActivity !== null ? (
                          <span
                            className={
                              daysSinceLastActivity >= 5
                                ? 'text-[var(--color-status-at-risk)] font-medium'
                                : 'text-[var(--color-ink-muted)]'
                            }
                          >
                            {daysSinceLastActivity === 0 ? 'Today' : `${daysSinceLastActivity}d ago`}
                          </span>
                        ) : (
                          <span className="text-[var(--color-ink-muted)]">Not available</span>
                        )}
                      </td>

                      {/* Audit Trace Button */}
                      <td className="py-2.5 px-2 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveInspectorTrace(sched.trace);
                          }}
                          className="p-1 rounded-[var(--radius-xs)] text-[var(--color-ink-muted)] hover:text-[var(--color-accent)] hover:bg-[var(--color-paper-3)] transition-colors"
                          title="Inspect formula & calculation trace"
                        >
                          <HelpCircle className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 2. Current project progress */}
      {selectedItem && (
        <div className="surface-card rounded-[var(--radius-sm)] p-4 flex flex-col gap-3 border border-[var(--color-rule)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 hairline-b pb-2.5">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-[var(--color-accent)]" />
              <h3 className="text-xs font-bold text-[var(--color-ink)]">Project progress: {selectedItem.project.title}</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveInspectorTrace(selectedItem.metrics.progress.trace)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[var(--radius-xs)] border border-[var(--color-rule)] text-[11px] font-mono text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] bg-[var(--color-paper)]"
              >
                <HelpCircle className="w-3 h-3 text-[var(--color-accent)]" />
                <span>Progress Math ({selectedItem.metrics.progress.progressPercent}%)</span>
              </button>
              {onOpenProjectDetail && (
                <button
                  type="button"
                  onClick={() => onOpenProjectDetail(selectedItem.project.id)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[var(--radius-xs)] border border-[var(--color-rule)] text-[11px] font-mono text-[var(--color-accent)] hover:underline"
                >
                  <span>Project Planner</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          <div className="p-4 surface-well rounded-[var(--radius-xs)] border border-[var(--color-rule)] flex flex-col gap-2">
            <div className="flex justify-between items-baseline gap-3">
              <span className="text-sm font-semibold text-[var(--color-ink)]">{selectedItem.metrics.progress.progressPercent}% complete</span>
              <span className="text-xs text-[var(--color-ink-muted)]">
                {selectedItem.metrics.progress.totalPlannedValue > 0
                  ? `${selectedItem.metrics.progress.completedValue} of ${selectedItem.metrics.progress.totalPlannedValue} weighted progress`
                  : 'Add targets, milestones, or tasks to track progress'}
              </span>
            </div>
            <div
              className="h-3 overflow-hidden rounded-full bg-[var(--color-paper-3)]"
              role="progressbar"
              aria-label={`${selectedItem.project.title} progress`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={selectedItem.metrics.progress.progressPercent}
            >
              <div className="chart-fill-transition h-full rounded-full bg-[var(--color-accent)]" style={{ transform: `scaleX(${Math.max(0, Math.min(100, selectedItem.metrics.progress.progressPercent)) / 100})` }} />
            </div>
          </div>

          {/* Forecast Range & Methodology Footnote */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs pt-1">
            <div className="surface-well p-2.5 rounded-[var(--radius-xs)] border border-[var(--color-rule)] flex flex-col gap-1">
              <span className="text-[11px] font-mono text-[var(--color-ink-muted)]">Optimistic Finish</span>
              <span className="font-mono tabular-figure font-bold text-[var(--color-ink)]">
                {selectedItem.metrics.forecast.forecastDateOptimistic || 'No estimate'}
              </span>
              <span className="text-[10px] text-[var(--color-ink-muted)]">Top historical velocity rate</span>
            </div>

            <div className="surface-well p-2.5 rounded-[var(--radius-xs)] border border-[var(--color-rule)] flex flex-col gap-1">
              <span className="text-[11px] font-mono text-[var(--color-accent)] font-semibold">Expected Finish</span>
              <span className="font-mono tabular-figure font-bold text-sm text-[var(--color-accent)]">
                {selectedItem.metrics.forecast.forecastDateExpected || 'Pending logs'}
              </span>
              <span className="text-[10px] text-[var(--color-ink-muted)]">Rolling 4-week average</span>
            </div>

            <div className="surface-well p-2.5 rounded-[var(--radius-xs)] border border-[var(--color-rule)] flex flex-col gap-1">
              <span className="text-[11px] font-mono text-[var(--color-ink-muted)]">Pessimistic Finish</span>
              <span className="font-mono tabular-figure font-bold text-[var(--color-ink)]">
                {selectedItem.metrics.forecast.forecastDatePessimistic || 'No estimate'}
              </span>
              <span className="text-[10px] text-[var(--color-ink-muted)]">Slowest historical velocity</span>
            </div>
          </div>
        </div>
      )}

      {/* Formula Inspector Modal */}
      <FormulaInspectorModal
        isOpen={Boolean(activeInspectorTrace)}
        onClose={() => setActiveInspectorTrace(null)}
        trace={activeInspectorTrace}
      />
    </div>
  );
};
