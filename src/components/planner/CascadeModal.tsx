import React, { useState, useEffect } from 'react';
import { Target, TargetHorizon } from '../../types';
import { domainService } from '../../services/domainService';
import { getSubPeriods } from '../../utils/periodUtils';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { GitFork, Check, Calculator } from 'lucide-react';

interface CascadeModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: Target | null;
}

interface SplitItem {
  period: string;
  label: string;
  title: string;
  value: number;
}

export const CascadeModal: React.FC<CascadeModalProps> = ({
  isOpen,
  onClose,
  target,
}) => {
  const [splits, setSplits] = useState<SplitItem[]>([]);
  const [childHorizon, setChildHorizon] = useState<TargetHorizon>('week');

  useEffect(() => {
    if (!target) return;

    const childH: TargetHorizon = target.horizon === 'month' ? 'week' : 'day';
    setChildHorizon(childH);

    const subPeriods = getSubPeriods(target.period, target.horizon);
    const count = subPeriods.length || 1;
    const defaultPerItem = Math.round((target.targetValue / count) * 10) / 10;

    const initialSplits: SplitItem[] = subPeriods.map((sub, idx) => ({
      period: sub.period,
      label: sub.label,
      title: `${target.title} (${childH === 'week' ? `W${idx + 1}` : sub.period.slice(-5)})`,
      value: defaultPerItem,
    }));

    setSplits(initialSplits);
  }, [target]);

  if (!target) return null;

  const currentSum = splits.reduce((acc, s) => acc + (Number(s.value) || 0), 0);
  const roundedSum = Math.round(currentSum * 100) / 100;
  const targetVal = target.targetValue;
  const isMatch = Math.abs(roundedSum - targetVal) < 0.01;

  const handleEqualSplit = () => {
    if (splits.length === 0) return;
    const count = splits.length;
    const equalVal = Math.round((targetVal / count) * 10) / 10;
    setSplits(splits.map((s) => ({ ...s, value: equalVal })));
  };

  const handleValueChange = (index: number, val: number) => {
    const updated = [...splits];
    updated[index].value = val;
    setSplits(updated);
  };

  const handleTitleChange = (index: number, title: string) => {
    const updated = [...splits];
    updated[index].title = title;
    setSplits(updated);
  };

  const handleConfirmCascade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (splits.length === 0) return;

    await domainService.cascadeTarget({
      parentTargetId: target.id,
      childHorizon,
      distribution: splits.map((s) => ({
        period: s.period,
        title: s.title,
        value: Number(s.value),
      })),
    });

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Distribute into ${childHorizon === 'week' ? 'weekly' : 'daily'} goals`}
      subtitle={`Break down "${target.title}" (${target.targetValue} ${target.unit}) across the period.`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirmCascade}
            disabled={splits.length === 0 || splits.every((s) => s.value <= 0)}
          >
            <Check className="w-3.5 h-3.5" />
            <span>Create {childHorizon === 'week' ? 'weekly' : 'daily'} targets</span>
          </Button>
        </>
      }
    >
      <form onSubmit={handleConfirmCascade} className="flex flex-col gap-4">
        {/* Arithmetic Balance Card */}
        <div className="surface-well p-3 rounded-[var(--radius-xs)] border border-[var(--color-rule)] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-[var(--color-accent)]" />
            <div>
              <span className="text-[var(--color-ink-muted)]">Sum allocated: </span>
              <strong className="font-mono tabular-figure text-[var(--color-ink)]">
                {roundedSum} / {targetVal} {target.unit}
              </strong>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isMatch && (
              <span className="text-[11px] font-mono text-[var(--color-status-at-risk)]">
                {roundedSum < targetVal
                  ? `${Math.round((targetVal - roundedSum) * 10) / 10} unallocated`
                  : `${Math.round((roundedSum - targetVal) * 10) / 10} over allocation`}
              </span>
            )}
            <Button size="sm" variant="secondary" onClick={handleEqualSplit}>
              Equal split
            </Button>
          </div>
        </div>

        {/* Sub-period Distribution List */}
        <div className="flex flex-col gap-2 max-h-[360px] overflow-y-auto pr-1">
          {splits.map((split, idx) => (
            <div
              key={split.period}
              className="bg-[var(--color-paper-2)]/60 p-2.5 rounded-[var(--radius-xs)] border border-[var(--color-rule)] flex flex-col gap-2"
            >
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-semibold text-[var(--color-ink)] flex items-center gap-1.5">
                  <GitFork className="w-3 h-3 text-[var(--color-accent)]" />
                  <span>{split.label}</span>
                </span>
                <span className="text-[var(--color-ink-muted)] text-[11px]">{split.period}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="sm:col-span-2">
                  <Input
                    placeholder="Sub-target description"
                    value={split.title}
                    onChange={(e) => handleTitleChange(idx, e.target.value)}
                  />
                </div>
                <div>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    value={split.value}
                    onChange={(e) => handleValueChange(idx, parseFloat(e.target.value) || 0)}
                    helperText={target.unit}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </form>
    </Modal>
  );
};

