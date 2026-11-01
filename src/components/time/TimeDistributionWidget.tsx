import React from 'react';
import { TimeMetricsResult, formatMinutesToHuman } from '../../utils/timeMath';
import { Brain, Layers, BarChart3, Target } from 'lucide-react';

interface TimeDistributionWidgetProps {
  metrics: TimeMetricsResult;
}

export const TimeDistributionWidget: React.FC<TimeDistributionWidgetProps> = ({ metrics }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Left: Classification Breakdown & 7-Day Trend */}
      <div className="surface-card rounded-[var(--radius-sm)] p-4 flex flex-col gap-4 border border-[var(--color-rule)]">
        {/* Kind Breakdown */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between hairline-b pb-2">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-[var(--color-accent)]" />
              <h3 className="font-semibold text-xs text-[var(--color-ink)]">
                Classification distribution
              </h3>
            </div>
            <span className="text-[11px] font-mono tabular-figure text-[var(--color-ink-muted)]">
              {metrics.deepWorkRatio}% Deep flow
            </span>
          </div>

          {/* Stacked Ratio Bar */}
          <div className="w-full h-3 rounded-[1px] bg-[var(--color-paper-3)] overflow-hidden flex border border-[var(--color-rule)]">
            {metrics.kindBreakdown.map((kb) => (
              <div
                key={kb.kind}
                className={`h-full transition-all duration-300 ${
                  kb.kind === 'deep'
                    ? 'bg-[var(--color-accent)]'
                    : kb.kind === 'learning'
                    ? 'bg-indigo-500/70'
                    : 'bg-[var(--color-ink-muted)]/40'
                }`}
                style={{ width: `${kb.percentage}%` }}
                title={`${kb.label}: ${kb.percentage}% (${formatMinutesToHuman(kb.minutes)})`}
              />
            ))}
          </div>

          {/* Kind Details */}
          <div className="flex flex-col gap-1.5 pt-1">
            {metrics.kindBreakdown.map((kb) => (
              <div
                key={kb.kind}
                className="flex items-center justify-between text-xs py-1 hairline-b last:border-b-0"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-[1px] ${
                      kb.kind === 'deep'
                        ? 'bg-[var(--color-accent)]'
                        : kb.kind === 'learning'
                        ? 'bg-indigo-500/70'
                        : 'bg-[var(--color-ink-muted)]/40'
                    }`}
                  />
                  <span className="text-[var(--color-ink)] font-medium">{kb.label}</span>
                </div>
                <div className="flex items-center gap-2 font-mono tabular-figure text-[11px]">
                  <span className="text-[var(--color-ink-muted)]">{kb.hours}h</span>
                  <span className="font-semibold text-[var(--color-ink)] w-8 text-right">
                    {kb.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 7-Day Trend */}
        <div className="flex flex-col gap-2 hairline-t pt-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-[var(--color-accent)]" />
              <span className="text-xs font-semibold text-[var(--color-ink)]">
                Daily volume (last 7 days)
              </span>
            </div>
            <span className="text-[11px] font-mono text-[var(--color-ink-muted)]">
              Minutes logged per day
            </span>
          </div>

          <div className="grid grid-cols-7 gap-1.5 pt-1">
            {metrics.dailyTrend.map((day) => {
              const maxMinutes = Math.max(120, ...metrics.dailyTrend.map((d) => d.totalMinutes));
              const heightPercent = Math.min(100, Math.round((day.totalMinutes / maxMinutes) * 100));

              return (
                <div
                  key={day.dateStr}
                  className="flex flex-col items-center gap-1 p-1 rounded-[var(--radius-xs)] surface-well border border-[var(--color-rule)]"
                >
                  <span className="text-[10px] font-medium text-[var(--color-ink)]">
                    {day.dayLabel}
                  </span>
                  <div className="w-full bg-[var(--color-paper-3)] h-12 flex items-end rounded-[1px] overflow-hidden">
                    <div
                      className="w-full bg-[var(--color-accent)] transition-all duration-300"
                      style={{ height: `${heightPercent}%` }}
                      title={`${day.dateStr}: ${formatMinutesToHuman(day.totalMinutes)} (${day.deepMinutes}m deep)`}
                    />
                  </div>
                  <span className="text-[10px] font-mono tabular-figure text-[var(--color-ink-muted)]">
                    {day.totalMinutes > 0 ? `${day.totalMinutes}m` : '-'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right: Project Allocation & Estimate Accuracy */}
      <div className="surface-card rounded-[var(--radius-sm)] p-4 flex flex-col gap-4 border border-[var(--color-rule)]">
        {/* Project Breakdown Table */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between hairline-b pb-2">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[var(--color-accent)]" />
              <h3 className="font-semibold text-xs text-[var(--color-ink)]">
                Hours by project & area
              </h3>
            </div>
            <span className="text-[11px] font-mono text-[var(--color-ink-muted)]">
              {metrics.projectBreakdown.length} buckets
            </span>
          </div>

          <div className="flex flex-col divide-y divide-[var(--color-rule)] max-h-48 overflow-y-auto">
            {metrics.projectBreakdown.length === 0 ? (
              <div className="py-6 text-center text-xs text-[var(--color-ink-muted)]">
                No time logged yet.
              </div>
            ) : (
              metrics.projectBreakdown.map((pb) => (
                <div key={pb.projectId} className="py-2 flex items-center justify-between text-xs">
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className="font-medium text-[var(--color-ink)] truncate">
                      {pb.projectTitle}
                    </span>
                    {pb.areaName && (
                      <span className="text-[10px] text-[var(--color-ink-muted)] truncate">
                        {pb.areaName}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 font-mono tabular-figure text-[11px] shrink-0">
                    <span className="text-[var(--color-ink-muted)]">{pb.hours}h</span>
                    <span className="font-semibold text-[var(--color-ink)] w-8 text-right">
                      {pb.percentage}%
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Estimate Accuracy Section (PRD 7.2) */}
        <div className="flex flex-col gap-2 hairline-t pt-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-[var(--color-accent)]" />
              <span className="text-xs font-semibold text-[var(--color-ink)]">
                Estimate accuracy
              </span>
            </div>
            <span className="text-[11px] font-mono tabular-figure font-semibold text-[var(--color-accent)]">
              {metrics.estimateAccuracy.overallAccuracyRate}%
            </span>
          </div>

          <div className="surface-well p-2.5 rounded-[var(--radius-xs)] border border-[var(--color-rule)] text-xs flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[var(--color-ink-muted)]">Tasks with logged estimates:</span>
              <span className="font-mono tabular-figure font-semibold text-[var(--color-ink)]">
                {metrics.estimateAccuracy.evaluatedTasksCount} tasks
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[var(--color-ink-muted)]">Total estimated vs actual:</span>
              <span className="font-mono tabular-figure text-[var(--color-ink)]">
                {formatMinutesToHuman(metrics.estimateAccuracy.totalEstimatedMinutes)} est /{' '}
                {formatMinutesToHuman(metrics.estimateAccuracy.totalActualMinutes)} act
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[var(--color-ink-muted)]">Estimation variance:</span>
              <span
                className={`font-mono tabular-figure font-semibold ${
                  metrics.estimateAccuracy.varianceMinutes > 0
                    ? 'text-amber-600'
                    : 'text-[var(--color-status-on-track)]'
                }`}
              >
                {metrics.estimateAccuracy.varianceMinutes > 0 ? '+' : ''}
                {formatMinutesToHuman(metrics.estimateAccuracy.varianceMinutes)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

