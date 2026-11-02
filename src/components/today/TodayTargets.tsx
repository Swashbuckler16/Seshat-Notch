import React from 'react';
import { Target } from '../../types';
import { TargetCard } from '../planner/TargetCard';
import { CheckCircle2 } from 'lucide-react';

interface TodayTargetsProps {
  targets: Target[];
  dateStr: string;
}

export const TodayTargets: React.FC<TodayTargetsProps> = ({ targets }) => {
  return (
    <div className="surface-card rounded-[var(--radius-sm)] p-4 flex flex-col gap-3.5">
      <div className="flex items-center justify-between hairline-b pb-2.5">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[var(--color-accent)]" />
          <h3 className="font-semibold text-xs text-[var(--color-ink)]">
            Goals for today
          </h3>
          <span className="font-mono text-xs tabular-figure text-[var(--color-ink-muted)]">
            ({targets.filter((t) => t.status === 'done').length}/{targets.length})
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {targets.length === 0 ? (
          <div className="py-6 text-center text-xs text-[var(--color-ink-muted)]">
            No goals are due today. Your daily and weekly goals will appear here.
          </div>
        ) : (
          targets.map((target) => (
            <TargetCard key={target.id} target={target} />
          ))
        )}
      </div>
    </div>
  );
};

