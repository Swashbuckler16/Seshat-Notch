import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { ProjectGoal } from '../../types';
import { domainService } from '../../services/domainService';
import {
  evaluateCompleteProjectMetrics,
  MetricCalculationTrace,
} from '../../utils/metricEngine';
import { StatTile } from '../ui/StatTile';
import { FormulaInspectorModal } from './FormulaInspectorModal';
import {
  CheckCircle2,
  AlertTriangle,
  XSquare,
  HelpCircle,
  Calendar,
  AlertCircle,
  Sliders,
} from 'lucide-react';

interface ProjectHealthCardProps {
  project: ProjectGoal;
  todayStr: string;
}

export const ProjectHealthCard: React.FC<ProjectHealthCardProps> = ({ project, todayStr }) => {
  const [activeTrace, setActiveTrace] = useState<MetricCalculationTrace | null>(null);

  // Live queries for project children
  const milestones = useLiveQuery(
    () => db.milestones.where('projectId').equals(project.id).toArray(),
    [project.id]
  );

  const targets = useLiveQuery(
    () => db.targets.where('projectId').equals(project.id).toArray(),
    [project.id]
  );

  const tasks = useLiveQuery(
    () => db.tasks.where('projectId').equals(project.id).toArray(),
    [project.id]
  );

  const progressLogs = useLiveQuery(
    () => db.progressLogs.toArray(),
    []
  );

  const blockers = useLiveQuery(
    () => db.blockers.where('entityId').equals(project.id).toArray(),
    [project.id]
  );

  const area = useLiveQuery(
    () => (project.areaId ? db.areas.get(project.areaId) : undefined),
    [project.areaId]
  );

  // Pure metric calculation
  const metrics = evaluateCompleteProjectMetrics(
    project,
    milestones || [],
    targets || [],
    tasks || [],
    progressLogs || [],
    blockers || [],
    todayStr
  );

  const handleWeightingChange = async (newWeighting: 'equal' | 'estimate' | 'manual') => {
    await domainService.updateProject(project.id, { weightType: newWeighting });
  };

  // Status shape icon and style
  let StatusIcon = CheckCircle2;
  let statusBadgeClass = 'bg-[var(--color-status-on-track)]/10 text-[var(--color-status-on-track)] border-[var(--color-status-on-track)]/30';

  if (metrics.scheduleRatio.status === 'at_risk') {
    StatusIcon = AlertTriangle;
    statusBadgeClass = 'bg-[var(--color-status-at-risk)]/10 text-[var(--color-status-at-risk)] border-[var(--color-status-at-risk)]/30';
  } else if (metrics.scheduleRatio.status === 'behind') {
    StatusIcon = XSquare;
    statusBadgeClass = 'bg-[var(--color-status-behind)]/10 text-[var(--color-status-behind)] border-[var(--color-status-behind)]/30';
  }

  return (
    <div className="surface-card rounded-[var(--radius-sm)] p-4 flex flex-col gap-4 border border-[var(--color-rule)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 hairline-b pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-semibold text-sm text-[var(--color-ink)]">
            {project.title}
          </h3>

          {area && (
            <span className="px-2 py-0.5 text-[11px] font-mono rounded-[var(--radius-xs)] bg-[var(--color-paper-2)] border border-[var(--color-rule)] text-[var(--color-ink-muted)]">
              {area.name}
            </span>
          )}

          {/* Word and Shape Status Badge (PRD 7.3: word and shape, never color alone) */}
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold rounded-[var(--radius-xs)] border ${statusBadgeClass}`}
            title={`Schedule ratio: ${metrics.scheduleRatio.scheduleRatio}`}
          >
            <StatusIcon className="w-3.5 h-3.5 shrink-0" />
            <span>
              {metrics.scheduleRatio.statusLabel} ({metrics.scheduleRatio.scheduleRatio})
            </span>
          </span>
        </div>

        {/* Weighting Switcher */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto text-xs">
          <Sliders className="w-3.5 h-3.5 text-[var(--color-ink-muted)]" />
          <span className="text-[11px] text-[var(--color-ink-muted)]">Weight:</span>
          <select
            className="input-field px-2 py-0.5 text-[11px] font-mono rounded-[var(--radius-xs)] border border-[var(--color-rule)] bg-[var(--color-paper)] focus:outline-none focus:border-[var(--color-accent)]"
            value={project.weightType || 'equal'}
            onChange={(e) => handleWeightingChange(e.target.value as 'equal' | 'estimate' | 'manual')}
            title="Configure mathematical roll-up weighting (PRD TR-2)"
          >
            <option value="equal">Equal (1/N)</option>
            <option value="estimate">By Estimate</option>
            <option value="manual">Manual Weight</option>
          </select>
        </div>
      </div>

      {/* Measuring Cord Pacing Meter (Brand Motif & PRD 7.3) */}
      <div className="flex flex-col gap-1.5 surface-well p-3 rounded-[var(--radius-xs)] border border-[var(--color-rule)]">
          <div className="flex items-center justify-between text-xs text-[var(--color-ink-muted)]">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[var(--color-ink)]">
              {metrics.progress.progressPercent}% Actual
            </span>
            <span>vs</span>
            <span className="text-[var(--color-ink-muted)]">
              {metrics.expectedProgress.expectedPercent}% Expected pacing
            </span>
          </div>

          <button
            type="button"
            onClick={() => setActiveTrace(metrics.scheduleRatio.trace)}
            className="inline-flex items-center gap-1 text-[11px] text-[var(--color-accent)] hover:underline"
          >
            <HelpCircle className="w-3 h-3" />
            <span>Formula inspect</span>
          </button>
        </div>

        {/* Cord Bar with Pacing Marker */}
        <div className="relative w-full h-3 rounded-[1px] bg-[var(--color-paper-3)] border border-[var(--color-rule)] overflow-hidden">
          {/* Actual Progress Fill */}
          <div
            className="h-full bg-[var(--color-accent)] transition-colors duration-300"
            style={{ width: `${Math.min(100, metrics.progress.progressPercent)}%` }}
          />

          {/* Expected Pacing Pin Marker */}
          {metrics.expectedProgress.expectedPercent > 0 && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-[var(--color-ink)] z-10"
              style={{ left: `${Math.min(100, metrics.expectedProgress.expectedPercent)}%` }}
              title={`Expected pacing pin: ${metrics.expectedProgress.expectedPercent}%`}
            />
          )}
        </div>
      </div>

      {/* 4 Stat Tiles with Formula Inspectors */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="relative group">
          <StatTile
            label="Actual progress"
            value={`${metrics.progress.progressPercent}%`}
            formulaExplanation={metrics.progress.trace.formulaExpression}
          />
          <button
            type="button"
            onClick={() => setActiveTrace(metrics.progress.trace)}
            className="absolute top-2 right-2 p-1 text-[var(--color-ink-subtle)] hover:text-[var(--color-accent)] opacity-80 hover:opacity-100 transition-opacity"
            title="Inspect Progress % formula"
            aria-label="Inspect Progress formula"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="relative group">
          <StatTile
            label="Expected pacing"
            value={`${metrics.expectedProgress.expectedPercent}%`}
            formulaExplanation={metrics.expectedProgress.trace.formulaExpression}
          />
          <button
            type="button"
            onClick={() => setActiveTrace(metrics.expectedProgress.trace)}
            className="absolute top-2 right-2 p-1 text-[var(--color-ink-subtle)] hover:text-[var(--color-accent)] opacity-80 hover:opacity-100 transition-opacity"
            title="Inspect Expected Pacing formula"
            aria-label="Inspect Expected Pacing formula"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="relative group">
          <StatTile
            label="Schedule ratio"
            value={metrics.scheduleRatio.scheduleRatio}
            qualifier={`${metrics.scheduleRatio.statusLabel} ${metrics.scheduleRatio.glyph}`}
            statusVariant={metrics.scheduleRatio.status === 'paused' ? 'neutral' : metrics.scheduleRatio.status}
            formulaExplanation={metrics.scheduleRatio.trace.formulaExpression}
          />
          <button
            type="button"
            onClick={() => setActiveTrace(metrics.scheduleRatio.trace)}
            className="absolute top-2 right-2 p-1 text-[var(--color-ink-subtle)] hover:text-[var(--color-accent)] opacity-80 hover:opacity-100 transition-opacity"
            title="Inspect Schedule Ratio formula"
            aria-label="Inspect Schedule Ratio formula"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="relative group">
          <StatTile
            label="14-day velocity"
            value={metrics.forecast.recentVelocityPerDay}
            unit="pct/day"
            qualifier={metrics.forecast.hasSufficientData ? 'Active velocity' : 'Low data'}
            formulaExplanation={metrics.forecast.trace.formulaExpression}
          />
          <button
            type="button"
            onClick={() => setActiveTrace(metrics.forecast.trace)}
            className="absolute top-2 right-2 p-1 text-[var(--color-ink-subtle)] hover:text-[var(--color-accent)] opacity-80 hover:opacity-100 transition-opacity"
            title="Inspect Velocity formula"
            aria-label="Inspect Velocity formula"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Forecast & Blocker Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1 text-xs">
        {/* Forecast Finish Range (PRD 7.3) */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[var(--color-accent)] shrink-0" />
          <div className="flex flex-col">
            <span className="text-[11px] text-[var(--color-ink-muted)]">
              Forecast completion range (14d pace):
            </span>
            <span className="font-mono tabular-figure font-semibold text-[var(--color-ink)]">
              {metrics.forecast.forecastRangeString}
            </span>
          </div>
        </div>

        {/* Blockers Flag */}
        {metrics.blockers.openBlockersCount > 0 ? (
          <button
            type="button"
            onClick={() => setActiveTrace(metrics.blockers.trace)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-xs)] bg-[var(--color-status-at-risk-bg)] border border-[var(--color-status-at-risk)]/30 text-[var(--color-status-at-risk)] hover:bg-[var(--color-status-at-risk-bg)] transition-colors self-start sm:self-auto"
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span className="font-semibold">
              Review {metrics.blockers.openBlockersCount} blockers
            </span>
          </button>
        ) : (
          <span className="text-[11px] text-[var(--color-ink-muted)] self-start sm:self-auto">
            No open blockers
          </span>
        )}
      </div>

      {/* Formula Inspector Modal */}
      {activeTrace && (
        <FormulaInspectorModal
          isOpen={!!activeTrace}
          onClose={() => setActiveTrace(null)}
          trace={activeTrace}
        />
      )}
    </div>
  );
};
