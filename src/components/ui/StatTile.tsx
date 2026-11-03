import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

export interface StatTileProps {
  label: string;
  value: number | string;
  unit?: string;
  qualifier?: string;
  formula?: string;
  formulaExplanation?: string;
  statusVariant?: 'on_track' | 'at_risk' | 'behind' | 'neutral';
  className?: string;
}

/**
 * Hallmark Stat Tile Primitive
 * - Numbers are the hero: large tabular numerals with explicit units.
 * - Hairline rule separation, no heavy box-in-box cards.
 * - PRD 7.1: Every number shows its formula and explanation in an accessible dialog on click.
 */
export const StatTile: React.FC<StatTileProps> = ({
  label,
  value,
  unit,
  qualifier,
  formula,
  formulaExplanation,
  statusVariant = 'neutral',
  className = '',
}) => {
  const [showFormula, setShowFormula] = useState(false);

  const statusColorVar = {
    on_track: 'var(--color-status-on-track)',
    at_risk: 'var(--color-status-at-risk)',
    behind: 'var(--color-status-behind)',
    neutral: 'var(--color-ink)',
  }[statusVariant];

  return (
    <div className={`surface-card rounded-[var(--radius-xs)] p-3.5 flex flex-col justify-between relative ${className}`}>
      {/* Title & Formula button */}
      <div className="flex items-center justify-between gap-2 text-xs text-[var(--color-ink-muted)]">
        <span className="font-medium truncate">{label}</span>
        {(formula || formulaExplanation) && (
          <button
            type="button"
            onClick={() => setShowFormula(true)}
            className="p-1 min-w-6 min-h-6 inline-flex items-center justify-center rounded text-[var(--color-ink-subtle)] hover:text-[var(--color-accent)] hover:bg-[var(--color-paper-3)] transition-opacity"
            title="Inspect calculation formula"
            aria-label={`View formula for ${label}`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Large Tabular Numeral Hero */}
      <div className="my-2 flex items-baseline gap-1.5">
        <span
          className="tabular-figure font-mono font-bold text-2xl tracking-tight"
          style={{ color: statusColorVar }}
        >
          {value}
        </span>
        {unit && (
          <span className="text-xs text-[var(--color-ink-muted)] font-mono font-medium">
            {unit}
          </span>
        )}
      </div>

      {/* Worded Qualifier */}
      {qualifier && (
        <div className="text-[11px] text-[var(--color-ink-subtle)] leading-none truncate">
          {qualifier}
        </div>
      )}

      {/* Formula Inspector Modal Dialog (PRD Section 7 & 7.3) */}
      {(formula || formulaExplanation) && (
        <Modal
          isOpen={showFormula}
          onClose={() => setShowFormula(false)}
          title={`Formula Inspector: ${label}`}
          subtitle="Exact local calculation used for this metric"
          maxWidth="sm"
          footer={
            <Button size="sm" variant="primary" onClick={() => setShowFormula(false)}>
              Close
            </Button>
          }
        >
          <div className="flex flex-col gap-3">
            <div className="flex items-baseline gap-2 p-2.5 surface-well rounded-[var(--radius-xs)] border border-[var(--color-rule)]">
              <span className="text-xs text-[var(--color-ink-muted)]">Current value:</span>
              <span className="font-mono font-bold text-sm tabular-figure text-[var(--color-ink)]">
                {value} {unit || ''}
              </span>
            </div>
            {formula && (
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-[var(--color-ink-muted)]">Formula</span>
                <div className="font-mono text-xs bg-[var(--color-paper-2)] p-2.5 rounded-[var(--radius-xs)] border border-[var(--color-rule)] text-[var(--color-ink)]">
                  {formula}
                </div>
              </div>
            )}
            {formulaExplanation && (
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-[var(--color-ink-muted)]">How it works</span>
                <p className="text-xs text-[var(--color-ink-muted)] leading-relaxed">
                  {formulaExplanation}
                </p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
