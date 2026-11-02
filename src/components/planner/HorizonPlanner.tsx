import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { Target, TargetHorizon } from '../../types';
import {
  getCurrentPeriod,
  formatPeriodLabel,
  getAdjacentPeriod,
} from '../../utils/periodUtils';
import { TargetCard } from './TargetCard';
import { NewTargetModal } from './NewTargetModal';
import { CascadeModal } from './CascadeModal';
import { CopyForwardModal } from './CopyForwardModal';
import { ShiftPlanModal } from './ShiftPlanModal';
import { Button } from '../ui/Button';
import { CordBar } from '../CordBar';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Copy,
  Clock,
} from 'lucide-react';

interface HorizonPlannerProps {
  initialHorizon?: TargetHorizon;
  selectedProjectId?: string;
}

export const HorizonPlanner: React.FC<HorizonPlannerProps> = ({
  initialHorizon = 'week',
  selectedProjectId,
}) => {
  const [horizon, setHorizon] = useState<TargetHorizon>(initialHorizon);
  const [period, setPeriod] = useState<string>(() => getCurrentPeriod(initialHorizon));

  // Modals state
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [cascadeTarget, setCascadeTarget] = useState<Target | null>(null);

  // When horizon changes, reset period to current for that horizon
  const handleHorizonChange = (newHorizon: TargetHorizon) => {
    setHorizon(newHorizon);
    setPeriod(getCurrentPeriod(newHorizon));
  };

  const handlePrevPeriod = () => {
    setPeriod((prev) => getAdjacentPeriod(prev, horizon, 'prev'));
  };

  const handleNextPeriod = () => {
    setPeriod((prev) => getAdjacentPeriod(prev, horizon, 'next'));
  };

  const handleTodayPeriod = () => {
    setPeriod(getCurrentPeriod(horizon));
  };

  // Query targets matching current period and horizon
  const targets = useLiveQuery(
    () => {
      let query = db.targets
        .where('period')
        .equals(period)
        .filter((t) => !t.isDeleted && t.horizon === horizon);

      if (selectedProjectId) {
        query = query.filter((t) => t.projectId === selectedProjectId);
      }

      return query.toArray();
    },
    [period, horizon, selectedProjectId]
  );

  // Calculate cumulative period completion
  const totalTargetSum = (targets || []).reduce((acc, t) => acc + (t.targetValue || 0), 0);
  const totalCurrentSum = (targets || []).reduce((acc, t) => acc + (t.currentValue || 0), 0);
  const completedCount = (targets || []).filter((t) => t.status === 'done').length;

  const periodLabel = formatPeriodLabel(period, horizon);

  return (
    <div className="flex flex-col gap-5">
      {/* Horizon Switcher & Period Controls */}
      <div className="surface-card rounded-[var(--radius-sm)] p-4 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3 hairline-b pb-3.5">
          {/* Horizon Selection Buttons */}
          <div className="flex items-center gap-1 bg-[var(--color-paper-2)] p-1 rounded-[var(--radius-xs)] border border-[var(--color-rule)]">
            {(['month', 'week', 'day'] as TargetHorizon[]).map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => handleHorizonChange(h)}
                className={`min-h-11 sm:min-h-9 px-3.5 py-1 text-xs font-medium rounded-[var(--radius-xs)] transition-colors ${
                  horizon === h
                    ? 'bg-[var(--color-paper)] text-[var(--color-ink)] shadow-sm font-semibold'
                    : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
                }`}
              >
                {h === 'month' ? 'Monthly' : h === 'week' ? 'Weekly' : 'Daily'}
              </button>
            ))}
          </div>

          {/* Action Tools */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setIsCopyModalOpen(true)}
              title="Copy goals from the previous period"
            >
              <Copy className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Copy previous goals</span>
            </Button>

            <Button
              size="sm"
              variant="secondary"
              onClick={() => setIsShiftModalOpen(true)}
              disabled={!targets || targets.length === 0}
              title="Move your plan to later dates"
            >
              <Clock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Move dates</span>
            </Button>

            <Button
              size="sm"
              variant="primary"
              onClick={() => setIsNewModalOpen(true)}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New goal</span>
            </Button>
          </div>
        </div>

        {/* Period Navigation Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrevPeriod}
              className="min-h-11 sm:min-h-8 p-1.5 rounded hover:bg-[var(--color-paper-2)] border border-[var(--color-rule)] text-[var(--color-ink)] focus-visible:outline-2"
              title="Previous period"
              aria-label="Previous period"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleTodayPeriod}
              className="min-h-11 sm:min-h-8 px-2.5 py-1 text-xs font-mono rounded hover:bg-[var(--color-paper-2)] border border-[var(--color-rule)] text-[var(--color-ink-muted)]"
            >
              This period
            </button>

            <button
              type="button"
              onClick={handleNextPeriod}
              className="min-h-11 sm:min-h-8 p-1.5 rounded hover:bg-[var(--color-paper-2)] border border-[var(--color-rule)] text-[var(--color-ink)] focus-visible:outline-2"
              title="Next period"
              aria-label="Next period"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <span className="text-xs font-semibold text-[var(--color-ink)] ml-2">
              {periodLabel}
            </span>
          </div>

          <div className="text-xs text-[var(--color-ink-muted)] font-mono">
            <span className="tabular-figure">{completedCount}</span> of{' '}
            <span className="tabular-figure">{targets?.length ?? 0}</span> goals complete
          </div>
        </div>

        {/* Summary Measuring Cord Bar */}
        {targets && targets.length > 0 && (
          <div className="surface-well p-3 rounded-[var(--radius-xs)] border border-[var(--color-rule)]">
            <CordBar
              current={totalCurrentSum}
              total={totalTargetSum || 1}
              unit=" units"
              label={`Progress for ${periodLabel}`}
            />
          </div>
        )}
      </div>

      {/* Target Cards Ledger */}
      <div className="flex flex-col gap-3">
        {targets === undefined ? (
          <div role="status" className="surface-well p-6 text-sm text-[var(--color-ink-muted)]">
            Loading goals…
          </div>
        ) : targets.length === 0 ? (
          <div className="surface-card rounded-[var(--radius-sm)] p-10 text-center flex flex-col items-center gap-3">
            <Calendar className="w-8 h-8 text-[var(--color-accent)] opacity-50" />
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-[var(--color-ink)]">
                No goals planned for {periodLabel}
              </span>
              <span className="text-xs text-[var(--color-ink-muted)]">
                Add a goal for this time period or copy one from the last period.
              </span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Button size="sm" variant="primary" onClick={() => setIsNewModalOpen(true)}>
                <Plus className="w-3.5 h-3.5" />
                <span>Add a goal</span>
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setIsCopyModalOpen(true)}>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy previous goals</span>
              </Button>
            </div>
          </div>
        ) : (
          targets.map((tgt) => (
            <TargetCard
              key={tgt.id}
              target={tgt}
              onOpenCascade={(t) => setCascadeTarget(t)}
            />
          ))
        )}
      </div>

      {/* New Target Modal */}
      <NewTargetModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        defaultHorizon={horizon}
        defaultPeriod={period}
        defaultProjectId={selectedProjectId}
      />

      {/* Cascade Distribution Modal */}
      <CascadeModal
        isOpen={cascadeTarget !== null}
        onClose={() => setCascadeTarget(null)}
        target={cascadeTarget}
      />

      {/* Copy-Forward Modal */}
      <CopyForwardModal
        isOpen={isCopyModalOpen}
        onClose={() => setIsCopyModalOpen(false)}
        currentPeriod={period}
        horizon={horizon}
      />

      {/* Shift Plan Modal */}
      <ShiftPlanModal
        isOpen={isShiftModalOpen}
        onClose={() => setIsShiftModalOpen(false)}
        targets={targets || []}
        periodLabel={periodLabel}
      />
    </div>
  );
};
