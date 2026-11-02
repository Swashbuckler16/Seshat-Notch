import React from 'react';
import { TimeSession, Task, ProjectGoal, Area } from '../../../types';
import { calculateTimeMetrics, formatMinutesToHuman } from '../../../utils/timeMath';
import { SvgSparkline } from '../charts/SvgSparkline';
import {
  TrendingUp,
  BrainCircuit,
  Briefcase,
} from 'lucide-react';

interface DashboardTimeTabProps {
  timeSessions: TimeSession[];
  tasks: Task[];
  projects: ProjectGoal[];
  areas: Area[];
  todayStr: string;
}

export const DashboardTimeTab: React.FC<DashboardTimeTabProps> = ({
  timeSessions,
  tasks,
  projects,
  areas,
}) => {
  const metrics = calculateTimeMetrics(timeSessions, tasks, projects, areas);

  // Daily trend minutes for sparkline
  const dailyMinutes = metrics.dailyTrend.map((d) => d.totalMinutes);

  // Deep work badge styling
  const isDeepHealthy = metrics.deepWorkRatio >= 60;

  return (
    <div className="flex flex-col gap-5">
      {/* 1. Time KPI Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="surface-card rounded-[var(--radius-sm)] p-3 border border-[var(--color-rule)] flex flex-col gap-1">
          <span className="text-[11px] font-mono text-[var(--color-ink-muted)]">Cumulative Focus</span>
          <div className="flex items-baseline gap-1">
            <span className="font-mono tabular-figure text-lg font-bold text-[var(--color-ink)]">
              {metrics.totalHours}
            </span>
            <span className="text-xs text-[var(--color-ink-muted)]">hours</span>
          </div>
          <span className="text-[10px] text-[var(--color-ink-muted)]">
            Across {metrics.sessionCount} sessions
          </span>
        </div>

        <div className="surface-card rounded-[var(--radius-sm)] p-3 border border-[var(--color-rule)] flex flex-col gap-1">
          <span className="text-[11px] font-mono text-[var(--color-ink-muted)]">Deep Work Ratio</span>
          <div className="flex items-baseline gap-1">
            <span
              className={`font-mono tabular-figure text-lg font-bold ${
                isDeepHealthy ? 'text-[var(--color-emerald)]' : 'text-[var(--color-accent)]'
              }`}
            >
              {metrics.deepWorkRatio}%
            </span>
            <span className="text-xs text-[var(--color-ink-muted)]">ratio</span>
          </div>
          <span className="text-[10px] text-[var(--color-ink-muted)]">Standard target ≥ 60%</span>
        </div>

        <div className="surface-card rounded-[var(--radius-sm)] p-3 border border-[var(--color-rule)] flex flex-col gap-1">
          <span className="text-[11px] font-mono text-[var(--color-ink-muted)]">Avg Session</span>
          <div className="flex items-baseline gap-1">
            <span className="font-mono tabular-figure text-lg font-bold text-[var(--color-ink)]">
              {metrics.averageSessionMinutes}
            </span>
            <span className="text-xs text-[var(--color-ink-muted)]">min</span>
          </div>
          <span className="text-[10px] text-[var(--color-ink-muted)]">Focus endurance</span>
        </div>

        <div className="surface-card rounded-[var(--radius-sm)] p-3 border border-[var(--color-rule)] flex flex-col gap-1">
          <span className="text-[11px] font-mono text-[var(--color-ink-muted)]">Estimate Accuracy</span>
          <div className="flex items-baseline gap-1">
            <span className="font-mono tabular-figure text-lg font-bold text-[var(--color-ink)]">
              {metrics.estimateAccuracy.overallAccuracyRate}%
            </span>
            <span className="text-xs text-[var(--color-ink-muted)]">accuracy</span>
          </div>
          <span className="text-[10px] text-[var(--color-ink-muted)]">
            {metrics.estimateAccuracy.evaluatedTasksCount} tasks evaluated
          </span>
        </div>
      </div>

      {/* 2. Deep / Shallow / Learning Split (PRD TM-4 & 7.3) */}
      <div className="surface-card rounded-[var(--radius-sm)] p-4 flex flex-col gap-3.5 border border-[var(--color-rule)]">
        <div className="flex items-center justify-between hairline-b pb-2">
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-4 h-4 text-[var(--color-accent)]" />
            <h3 className="text-base font-semibold text-[var(--color-ink)]">
              Focus Classification Distribution
            </h3>
          </div>
          <span className="text-[11px] font-mono text-[var(--color-ink-muted)]">
            Total {formatMinutesToHuman(metrics.totalMinutes)}
          </span>
        </div>

        {/* Proportional Stacked Bar */}
        <div className="flex flex-col gap-2">
          <div className="h-4 w-full bg-[var(--color-paper-3)] rounded-[2px] overflow-hidden flex border border-[var(--color-rule)]">
            {metrics.kindBreakdown.map((item) => {
              if (item.percentage === 0) return null;
              let bg = 'bg-[var(--color-accent)]';
              if (item.kind === 'shallow') bg = 'bg-[var(--color-paper-muted)]';
              if (item.kind === 'learning') bg = 'bg-[var(--color-emerald)]';

              return (
                <div
                  key={item.kind}
                  style={{ width: `${item.percentage}%` }}
                  title={`${item.label}: ${item.percentage}% (${formatMinutesToHuman(item.minutes)})`}
                  className={`h-full ${bg}`}
                />
              );
            })}
          </div>

          {/* Legend */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
            {metrics.kindBreakdown.map((item) => {
              let dotClass = 'bg-[var(--color-accent)]';
              if (item.kind === 'shallow') dotClass = 'bg-[var(--color-paper-muted)]';
              if (item.kind === 'learning') dotClass = 'bg-[var(--color-emerald)]';

              return (
                <div
                  key={item.kind}
                  className="surface-well p-2.5 rounded-[var(--radius-xs)] border border-[var(--color-rule)] flex flex-col gap-0.5"
                >
                  <div className="flex items-center gap-1.5 font-medium text-[var(--color-ink)]">
                    <span className={`w-2 h-2 rounded-[1px] ${dotClass}`} />
                    <span className="capitalize">{item.kind} work</span>
                  </div>
                  <div className="flex items-baseline justify-between font-mono text-[11px]">
                    <span className="text-[var(--color-ink-muted)]">
                      {formatMinutesToHuman(item.minutes)}
                    </span>
                    <span className="font-bold tabular-figure text-[var(--color-ink)]">
                      {item.percentage}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Hours by Project & Area Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Project Breakdown */}
        <div className="surface-card rounded-[var(--radius-sm)] p-4 flex flex-col gap-3 border border-[var(--color-rule)]">
          <div className="flex items-center justify-between hairline-b pb-2">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-[var(--color-accent)]" />
              <h3 className="text-xs font-bold text-[var(--color-ink)]">
                Hours by Project Goal
              </h3>
            </div>
            <span className="text-[11px] font-mono text-[var(--color-ink-muted)]">
              {metrics.projectBreakdown.length} projects logged
            </span>
          </div>

          {metrics.projectBreakdown.length === 0 ? (
            <div className="py-6 text-center text-xs text-[var(--color-ink-muted)]">
              No project focus time logged yet.
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-[var(--color-rule)]">
              {metrics.projectBreakdown.map((pb) => (
                <div key={pb.projectId} className="py-2 flex flex-col gap-1 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[var(--color-ink)]">
                        {pb.projectTitle}
                      </span>
                      <span className="text-xs text-[var(--color-ink-muted)]">
                        {pb.areaName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 font-mono tabular-figure text-[11px]">
                      <span className="font-bold text-[var(--color-ink)]">
                        {formatMinutesToHuman(pb.minutes)}
                      </span>
                      <span className="text-[var(--color-ink-muted)]">
                        ({pb.percentage}%)
                      </span>
                    </div>
                  </div>

                  {/* Horizontal mini bar */}
                  <div className="w-full h-1 bg-[var(--color-paper-3)] rounded-[1px] overflow-hidden">
                    <div
                      className="chart-fill-transition h-full bg-[var(--color-accent)]"
                      style={{ transform: `scaleX(${Math.max(0, Math.min(100, pb.percentage)) / 100})` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 4. Estimation Calibration & Daily Trend */}
        <div className="surface-card rounded-[var(--radius-sm)] p-4 flex flex-col gap-3 border border-[var(--color-rule)]">
          <div className="flex items-center justify-between hairline-b pb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[var(--color-accent)]" />
              <h3 className="text-xs font-bold text-[var(--color-ink)]">
                Estimation Calibration & Variance
              </h3>
            </div>
            <span className="text-[11px] font-mono text-[var(--color-ink-muted)]">
              Planning calibration
            </span>
          </div>

          <div className="surface-well p-3 rounded-[var(--radius-xs)] border border-[var(--color-rule)] flex flex-col gap-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-medium text-[var(--color-ink)]">Estimated vs Actual</span>
              <span className="font-mono tabular-figure text-[11px] font-bold text-[var(--color-ink)]">
                {formatMinutesToHuman(metrics.estimateAccuracy.totalActualMinutes)} act /{' '}
                {formatMinutesToHuman(metrics.estimateAccuracy.totalEstimatedMinutes)} est
              </span>
            </div>

            <p className="text-[11px] text-[var(--color-ink-muted)]">
              {metrics.estimateAccuracy.varianceMinutes > 0
                ? `Tasks took on average ${formatMinutesToHuman(metrics.estimateAccuracy.varianceMinutes)} longer than initially planned. Consider padding future estimates by 15-20%.`
                : metrics.estimateAccuracy.varianceMinutes < 0
                ? `Tasks completed ${formatMinutesToHuman(Math.abs(metrics.estimateAccuracy.varianceMinutes))} faster than estimated.`
                : 'Estimates closely match actual execution time.'}
            </p>
          </div>

          {/* 14d Activity Sparkline */}
          <div className="flex flex-col gap-1.5 pt-1">
            <div className="flex items-center justify-between text-[11px] font-mono text-[var(--color-ink-muted)]">
              <span>Daily Focus Trend (Past 14 Days)</span>
              <span>{metrics.dailyTrend.length} days active</span>
            </div>
            <div className="p-2 surface-well rounded-[var(--radius-xs)] border border-[var(--color-rule)] flex justify-center">
              <SvgSparkline
                data={dailyMinutes}
                width={320}
                height={40}
                color="var(--color-accent)"
                showEndpoints={true}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
