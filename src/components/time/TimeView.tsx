import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { calculateTimeMetrics } from '../../utils/timeMath';
import { StatTile } from '../ui/StatTile';
import { FocusTimerWidget } from './FocusTimerWidget';
import { TimeDistributionWidget } from './TimeDistributionWidget';
import { TimeSessionLedger } from './TimeSessionLedger';
import { ManualTimeModal } from './ManualTimeModal';
import { Clock } from 'lucide-react';

export const TimeView: React.FC = () => {
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  // Live query timeSessions, tasks, projects, areas
  const sessions = useLiveQuery(
    () => db.timeSessions.reverse().toArray(),
    []
  );

  const tasks = useLiveQuery(
    () => db.tasks.filter((t) => !t.isDeleted).toArray(),
    []
  );

  const projects = useLiveQuery(
    () => db.projects.filter((p) => !p.isDeleted).toArray(),
    []
  );

  const areas = useLiveQuery(
    () => db.areas.filter((a) => !a.isArchived).toArray(),
    []
  );

  const metrics = calculateTimeMetrics(
    sessions || [],
    tasks || [],
    projects || [],
    areas || []
  );

  return (
    <div className="flex-1 flex flex-col gap-6 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 hairline-b pb-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-[var(--color-accent)]" />
            <h1 className="text-xl font-bold tracking-tight text-[var(--color-ink)]">
              Focus mode & time ledger
            </h1>
          </div>
          <p className="text-xs text-[var(--color-ink-muted)]">
            Stopwatch and countdown intervals tagged by deep, shallow, or learning focus (PRD Section 6.5 & TM-1 to TM-3).
          </p>
        </div>
      </div>

      {/* Hero Stat Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile
          label="Total hours logged"
          value={`${metrics.totalHours}h`}
          formulaExplanation="Formula: Sum of all recorded work session durations in minutes divided by 60."
        />
        <StatTile
          label="Deep work ratio"
          value={`${metrics.deepWorkRatio}%`}
          formulaExplanation="Formula: (Deep work minutes / Total logged work minutes) * 100. Measures high-cognition flow state."
        />
        <StatTile
          label="Avg session length"
          value={`${metrics.averageSessionMinutes}m`}
          formulaExplanation="Formula: Total minutes logged / Number of focus sessions completed."
        />
        <StatTile
          label="Estimate accuracy"
          value={`${metrics.estimateAccuracy.overallAccuracyRate}%`}
          formulaExplanation="Formula: Mean accuracy across completed tasks with estimates: 1 - |actual - estimated| / max(actual, estimated)."
        />
      </div>

      {/* Interactive Focus Timer Instrument */}
      <FocusTimerWidget />

      {/* Distribution & Project Allocation */}
      <TimeDistributionWidget metrics={metrics} />

      {/* Session History Ledger */}
      <TimeSessionLedger
        sessions={sessions || []}
        tasks={tasks || []}
        projects={projects || []}
        onOpenManualModal={() => setIsManualModalOpen(true)}
      />

      {/* Manual Time Entry Modal */}
      {isManualModalOpen && (
        <ManualTimeModal
          isOpen={isManualModalOpen}
          onClose={() => setIsManualModalOpen(false)}
        />
      )}
    </div>
  );
};
