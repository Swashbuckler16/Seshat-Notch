import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';

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
 * - PRD 7.1: Every number shows its formula and explanation on tap or hover.
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
            onClick={() => setShowFormula(!showFormula)}
            className="p-0.5 rounded text-[var(--color-ink-subtle)] hover:text-[var(--color-accent)] hover:bg-[var(--color-paper-3)] transition-opacity"
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

      {/* Transparent Formula Popover (PRD Section 7 & 7.3) */}
      {showFormula && (formula || formulaExplanation) && (
        <div className="absolute inset-x-0 bottom-full mb-1.5 p-2.5 bg-[var(--color-paper)] border border-[var(--color-rule-strong)] shadow-md rounded-[var(--radius-xs)] z-20 text-xs flex flex-col gap-1">
          <div className="flex items-center justify-between text-[11px] font-mono text-[var(--color-accent)] font-semibold">
            <span>Formula Inspector</span>
            <button
              type="button"
              onClick={() => setShowFormula(false)}
              className="text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
            >
              ✕
            </button>
          </div>
          {formula && (
            <div className="font-mono text-[11px] bg-[var(--color-paper-2)] p-1.5 rounded-[var(--radius-xs)] text-[var(--color-ink)]">
              {formula}
            </div>
          )}
          {formulaExplanation && (
            <p className="text-[10px] text-[var(--color-ink-muted)] leading-tight">
              {formulaExplanation}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

