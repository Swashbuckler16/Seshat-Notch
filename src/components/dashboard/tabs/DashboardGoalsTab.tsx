import React, { useState } from 'react';
import { Area, ProjectGoal, MilestonePhase, Target, Habit, ProgressLog } from '../../../types';
import { calculateProjectProgress } from '../../../utils/metricEngine';
import { calculateHabitMetrics } from '../../../utils/habitMath';
import {
  Target as TargetIcon,
  ChevronDown,
  ChevronRight,
  Flame,
  CheckCircle2,
  Compass,
  Zap,
} from 'lucide-react';

interface DashboardGoalsTabProps {
  todayStr: string;
  areas: Area[];
  projects: ProjectGoal[];
  milestones: MilestonePhase[];
  targets: Target[];
  habits: Habit[];
  progressLogs: ProgressLog[];
  onOpenGoalDetail?: (goalId: string) => void;
}

export const DashboardGoalsTab: React.FC<DashboardGoalsTabProps> = ({
  todayStr,
  areas,
  projects,
  milestones,
  targets,
  habits,
  progressLogs,
}) => {
  // Track expanded areas & goals
  const [expandedAreaIds, setExpandedAreaIds] = useState<Record<string, boolean>>(() => {
    // Expand all areas by default
    const initial: Record<string, boolean> = {};
    areas.forEach((a) => {
      initial[a.id] = true;
    });
    return initial;
  });

  const [expandedGoalIds, setExpandedGoalIds] = useState<Record<string, boolean>>({});

  const toggleArea = (areaId: string) => {
    setExpandedAreaIds((prev) => ({ ...prev, [areaId]: !prev[areaId] }));
  };

  const toggleGoal = (goalId: string) => {
    setExpandedGoalIds((prev) => ({ ...prev, [goalId]: !prev[goalId] }));
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Overview Banner */}
      <div className="surface-card rounded-[var(--radius-sm)] p-4 border border-[var(--color-rule)] flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-[var(--color-accent)]" />
          <h2 className="text-xs font-bold text-[var(--color-ink)] uppercase tracking-wider">
            Strategic Goal Tree & Multi-Horizon Alignment
          </h2>
        </div>
        <p className="text-xs text-[var(--color-ink-muted)]">
          Hierarchical tree cascading from Life Areas down to Project Goals, Horizons, and supporting Habits (PRD Section 5 & HB-7).
        </p>
      </div>

      {/* Goal Tree */}
      <div className="flex flex-col gap-4">
        {areas.map((area) => {
          const isAreaExpanded = expandedAreaIds[area.id] ?? true;
          const areaProjects = projects.filter((p) => !p.isDeleted && p.areaId === area.id);

          return (
            <div
              key={area.id}
              className="surface-card rounded-[var(--radius-sm)] border border-[var(--color-rule)] overflow-hidden"
            >
              {/* Area Header Row */}
              <div
                onClick={() => toggleArea(area.id)}
                className="flex items-center justify-between p-3.5 bg-[var(--color-paper-2)] cursor-pointer select-none transition-colors hover:bg-[var(--color-paper-3)]/60 hairline-b"
              >
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    className="p-0.5 rounded-[var(--radius-xs)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
                  >
                    {isAreaExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                  <div className="flex flex-col">
                    <span className="font-bold text-xs text-[var(--color-ink)] tracking-tight">
                      {area.name}
                    </span>
                    {area.description && (
                      <span className="text-[10px] text-[var(--color-ink-muted)]">
                        {area.description}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 font-mono text-[11px] tabular-figure text-[var(--color-ink-muted)]">
                  <span>{areaProjects.length} projects/goals</span>
                </div>
              </div>

              {/* Area Content */}
              {isAreaExpanded && (
                <div className="p-3 flex flex-col gap-3">
                  {areaProjects.length === 0 ? (
                    <div className="py-4 text-center text-xs text-[var(--color-ink-muted)] italic">
                      No goals or projects defined in this area yet.
                    </div>
                  ) : (
                    areaProjects.map((project) => {
                      const isGoalExpanded = expandedGoalIds[project.id] ?? false;
                      const projTargets = targets.filter(
                        (t) => !t.isDeleted && t.projectId === project.id
                      );
                      const projMilestones = milestones.filter(
                        (m) => !m.isDeleted && m.projectId === project.id
                      );

                      // Calculate progress
                      const progress = calculateProjectProgress(
                        project,
                        projTargets,
                        projMilestones,
                        []
                      );

                      // Linked Habits per PRD HB-7
                      const linkedHabits = habits.filter(
                        (h) => !h.isDeleted && h.linkedGoalId === project.id
                      );

                      return (
                        <div
                          key={project.id}
                          className="surface-well rounded-[var(--radius-xs)] border border-[var(--color-rule)] p-3 flex flex-col gap-2.5"
                        >
                          {/* Project Header Row */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => toggleGoal(project.id)}
                                className="p-0.5 rounded-[var(--radius-xs)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
                              >
                                {isGoalExpanded ? (
                                  <ChevronDown className="w-3.5 h-3.5" />
                                ) : (
                                  <ChevronRight className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <div className="flex items-baseline gap-2">
                                <span className="font-semibold text-xs text-[var(--color-ink)]">
                                  {project.title}
                                </span>
                                <span
                                  className={`text-[9px] font-mono px-1.5 py-0.2 rounded-[1px] border uppercase ${
                                    project.isGoal
                                      ? 'text-[var(--color-accent)] border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10'
                                      : 'text-[var(--color-ink-muted)] border-[var(--color-rule)]'
                                  }`}
                                >
                                  {project.isGoal ? 'Strategic Goal' : 'Project'}
                                </span>
                              </div>
                            </div>

                            {/* Progress Bar & Rate */}
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2 w-32">
                                <div className="w-full h-1.5 bg-[var(--color-paper-3)] rounded-[1px] overflow-hidden">
                                  <div
                                    className="h-full bg-[var(--color-accent)] transition-all duration-300"
                                    style={{ width: `${progress.progressPercent}%` }}
                                  />
                                </div>
                                <span className="font-mono tabular-figure text-xs font-bold text-[var(--color-ink)] w-8 text-right">
                                  {progress.progressPercent}%
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Why & Success Criteria if present */}
                          {(project.why || project.successCriteria) && (
                            <div className="text-[11px] text-[var(--color-ink-muted)] pl-6 flex flex-col gap-0.5 border-l-2 border-[var(--color-rule)] ml-2">
                              {project.why && (
                                <div>
                                  <span className="font-medium text-[var(--color-ink)]">Why: </span>
                                  {project.why}
                                </div>
                              )}
                              {project.successCriteria && (
                                <div>
                                  <span className="font-medium text-[var(--color-ink)]">Success Criteria: </span>
                                  {project.successCriteria}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Linked Habits (PRD HB-7) */}
                          {linkedHabits.length > 0 && (
                            <div className="pl-6 flex flex-wrap gap-2 items-center text-[11px]">
                              <span className="text-[var(--color-ink-muted)] flex items-center gap-1 font-mono text-[10px] uppercase">
                                <Zap className="w-3 h-3 text-[var(--color-amber)]" />
                                <span>Supporting Habits:</span>
                              </span>
                              {linkedHabits.map((habit) => {
                                const habitStats = calculateHabitMetrics(habit, progressLogs, todayStr);
                                const isHealthy = habitStats.consistency30d >= 70;

                                return (
                                  <span
                                    key={habit.id}
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[var(--radius-xs)] font-mono text-[10px] border ${
                                      isHealthy
                                        ? 'text-[var(--color-emerald)] bg-[var(--color-emerald)]/10 border-[var(--color-emerald)]/30'
                                        : 'text-[var(--color-amber)] bg-[var(--color-amber)]/10 border-[var(--color-amber)]/30'
                                    }`}
                                  >
                                    <Flame className="w-2.5 h-2.5" />
                                    <span>{habit.title}</span>
                                    <span className="tabular-figure font-semibold">
                                      {habitStats.consistency30d}% support
                                    </span>
                                  </span>
                                );
                              })}
                            </div>
                          )}

                          {/* Expanded Targets & Milestones */}
                          {isGoalExpanded && (
                            <div className="pl-6 pt-2 border-t border-[var(--color-rule)] flex flex-col gap-2">
                              <span className="text-[10px] font-mono uppercase text-[var(--color-ink-muted)] tracking-wider">
                                Horizon Targets & Milestones
                              </span>

                              {projTargets.length === 0 && projMilestones.length === 0 ? (
                                <span className="text-xs text-[var(--color-ink-muted)] italic">
                                  No breakdown targets or milestones configured.
                                </span>
                              ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {projMilestones.map((m) => (
                                    <div
                                      key={m.id}
                                      className="p-2 rounded-[var(--radius-xs)] bg-[var(--color-paper)] border border-[var(--color-rule)] flex items-center justify-between text-xs"
                                    >
                                      <div className="flex items-center gap-2">
                                        <CheckCircle2
                                          className={`w-3.5 h-3.5 ${
                                            m.status === 'done'
                                              ? 'text-[var(--color-emerald)]'
                                              : 'text-[var(--color-ink-muted)]'
                                          }`}
                                        />
                                        <span className="font-medium text-[var(--color-ink)]">
                                          {m.title}
                                        </span>
                                      </div>
                                      <span className="text-[10px] font-mono text-[var(--color-ink-muted)]">
                                        Phase {m.order}
                                      </span>
                                    </div>
                                  ))}

                                  {projTargets.map((t) => {
                                    const isDone = t.currentValue >= t.targetValue;
                                    return (
                                      <div
                                        key={t.id}
                                        className="p-2 rounded-[var(--radius-xs)] bg-[var(--color-paper)] border border-[var(--color-rule)] flex items-center justify-between text-xs"
                                      >
                                        <div className="flex items-center gap-2">
                                          <TargetIcon
                                            className={`w-3.5 h-3.5 ${
                                              isDone
                                                ? 'text-[var(--color-emerald)]'
                                                : 'text-[var(--color-accent)]'
                                            }`}
                                          />
                                          <div className="flex flex-col">
                                            <span className="font-medium text-[var(--color-ink)]">
                                              {t.title}
                                            </span>
                                            <span className="text-[10px] font-mono text-[var(--color-ink-muted)]">
                                              Horizon: {t.horizon} ({t.period})
                                            </span>
                                          </div>
                                        </div>
                                        <span className="font-mono tabular-figure text-xs font-semibold text-[var(--color-ink)]">
                                          {t.currentValue} / {t.targetValue} {t.unit}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
