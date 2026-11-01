import React from 'react';
import { Modal } from '../ui/Modal';
import { MetricCalculationTrace } from '../../utils/metricEngine';
import { HelpCircle, Layers, Calculator, Database } from 'lucide-react';

interface FormulaInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  trace: MetricCalculationTrace | null;
}

export const FormulaInspectorModal: React.FC<FormulaInspectorModalProps> = ({
  isOpen,
  onClose,
  trace,
}) => {
  if (!trace) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Formula Inspector: ${trace.metricName}`}
      subtitle="Transparent calculation breakdown and underlying source entries."
      maxWidth="lg"
    >
      <div className="flex flex-col gap-4 max-h-[75vh] overflow-y-auto pr-1">
        {/* Hero Result & Mathematical Formula Box */}
        <div className="surface-well p-3.5 rounded-[var(--radius-xs)] border border-[var(--color-rule-strong)] flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--color-ink)] flex items-center gap-1.5">
              <Calculator className="w-4 h-4 text-[var(--color-accent)]" />
              <span>Mathematical Formula</span>
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-[11px] text-[var(--color-ink-muted)]">Result:</span>
              <span className="font-mono tabular-figure font-bold text-sm text-[var(--color-accent)]">
                {trace.resultValue} {trace.resultUnit || ''}
              </span>
            </div>
          </div>

          <div className="font-mono text-xs p-2.5 rounded-[var(--radius-xs)] bg-[var(--color-paper)] border border-[var(--color-rule)] text-[var(--color-ink)] overflow-x-auto">
            {trace.formulaExpression}
          </div>
        </div>

        {/* Variables Table */}
        {trace.variables.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-ink)]">
              <Layers className="w-3.5 h-3.5 text-[var(--color-accent)]" />
              <span>Input Variables & Parameters</span>
            </div>

            <div className="overflow-x-auto surface-card border border-[var(--color-rule)] rounded-[var(--radius-xs)]">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="hairline-b font-mono text-[11px] text-[var(--color-ink-muted)] bg-[var(--color-paper-2)]/40">
                    <th className="py-2 px-3 font-normal">Symbol</th>
                    <th className="py-2 px-3 font-normal">Variable Name</th>
                    <th className="py-2 px-3 font-normal text-right">Value</th>
                    <th className="py-2 px-3 font-normal">Provenance / Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-rule)]">
                  {trace.variables.map((v, idx) => (
                    <tr key={idx} className="hover:bg-[var(--color-paper-2)]/30">
                      <td className="py-2 px-3 font-mono font-semibold text-[var(--color-accent)] whitespace-nowrap">
                        {v.symbol}
                      </td>
                      <td className="py-2 px-3 font-medium text-[var(--color-ink)]">
                        {v.name}
                      </td>
                      <td className="py-2 px-3 font-mono tabular-figure text-right font-semibold text-[var(--color-ink)] whitespace-nowrap">
                        {v.value} {v.unit || ''}
                      </td>
                      <td className="py-2 px-3 text-[var(--color-ink-muted)] text-[11px]">
                        {v.sourceDescription}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Step-by-step Evaluation Trace */}
        {trace.steps.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-ink)]">
              <HelpCircle className="w-3.5 h-3.5 text-[var(--color-accent)]" />
              <span>Calculation Steps</span>
            </div>

            <div className="flex flex-col gap-1.5 surface-well p-3 rounded-[var(--radius-xs)] border border-[var(--color-rule)] text-xs font-mono">
              {trace.steps.map((s, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-[var(--color-ink-muted)] select-none">
                    {idx + 1}.
                  </span>
                  <span className="text-[var(--color-ink)]">{s}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Source Entries Drill-Down (PRD Section 7) */}
        {trace.sourceEntries.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-semibold text-[var(--color-ink)]">
              <div className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                <span>Underlying Source Records ({trace.sourceEntries.length})</span>
              </div>
              <span className="text-[11px] font-mono text-[var(--color-ink-muted)]">
                Direct database records
              </span>
            </div>

            <div className="overflow-x-auto surface-card border border-[var(--color-rule)] rounded-[var(--radius-xs)] max-h-48">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="hairline-b font-mono text-[11px] text-[var(--color-ink-muted)] bg-[var(--color-paper-2)]/40">
                    <th className="py-2 px-3 font-normal">Item</th>
                    <th className="py-2 px-3 font-normal">Type</th>
                    <th className="py-2 px-3 font-normal text-right">Value</th>
                    <th className="py-2 px-3 font-normal text-right">Contribution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-rule)]">
                  {trace.sourceEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-[var(--color-paper-2)]/30">
                      <td className="py-2 px-3 font-medium text-[var(--color-ink)] truncate max-w-xs">
                        {entry.title}
                      </td>
                      <td className="py-2 px-3 font-mono text-[11px] text-[var(--color-ink-muted)] uppercase">
                        {entry.type}
                      </td>
                      <td className="py-2 px-3 font-mono tabular-figure text-right text-[var(--color-ink)] whitespace-nowrap">
                        {entry.value}
                      </td>
                      <td className="py-2 px-3 font-mono tabular-figure text-right text-[var(--color-accent)] whitespace-nowrap">
                        {entry.contribution}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

