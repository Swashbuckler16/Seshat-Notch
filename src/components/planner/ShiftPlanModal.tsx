import React, { useState } from 'react';
import { Target, EntityId } from '../../types';
import { domainService } from '../../services/domainService';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Check } from 'lucide-react';

interface ShiftPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  targets: Target[];
  periodLabel: string;
}

export const ShiftPlanModal: React.FC<ShiftPlanModalProps> = ({
  isOpen,
  onClose,
  targets,
  periodLabel,
}) => {
  const [shiftDays, setShiftDays] = useState<number>(7);
  const [reason, setReason] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<EntityId[]>(
    targets.map((t) => t.id)
  );

  const handleToggle = (id: EntityId) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleConfirmShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length === 0 || shiftDays === 0) return;

    await domainService.shiftPlanPeriod({
      targetIds: selectedIds,
      shiftDays: Number(shiftDays),
      reason: reason.trim() || `Shifted schedule by ${shiftDays} days`,
    });

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Adjust schedule"
      subtitle={`Shift due dates and timelines for targets in ${periodLabel}.`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirmShift}
            disabled={selectedIds.length === 0 || shiftDays === 0}
          >
            <Check className="w-3.5 h-3.5" />
            <span>Shift {selectedIds.length} target{selectedIds.length === 1 ? '' : 's'}</span>
          </Button>
        </>
      }
    >
      <form onSubmit={handleConfirmShift} className="flex flex-col gap-4">
        {/* Preset Shift Buttons */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-[var(--color-ink)]">
            Days to shift forward
          </label>
          <div className="flex items-center gap-2">
            {[3, 7, 14, 21].map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => setShiftDays(days)}
                className={`px-2.5 py-1 text-xs rounded-[var(--radius-xs)] border font-mono transition-colors ${
                  shiftDays === days
                    ? 'bg-[var(--color-accent)] text-[var(--color-accent-ink)] border-[var(--color-accent)] font-semibold'
                    : 'bg-[var(--color-paper-2)] border-[var(--color-rule)] text-[var(--color-ink)] hover:border-[var(--color-rule-strong)]'
                }`}
              >
                +{days}d {days === 7 ? '(1w)' : days === 14 ? '(2w)' : ''}
              </button>
            ))}
          </div>
        </div>

        <Input
          label="Custom days"
          type="number"
          min="1"
          max="365"
          value={shiftDays}
          onChange={(e) => setShiftDays(parseInt(e.target.value, 10) || 1)}
          required
        />

        <Input
          label="Reason for adjustment"
          placeholder="e.g. Prioritized blocker remediation / travel"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          helperText="Reason will be saved to the permanent change log."
        />

        {/* Target Selection Checklist */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-[var(--color-ink-muted)]">
            Select targets to adjust ({selectedIds.length}/{targets.length})
          </span>
          <div className="flex flex-col divide-y divide-[var(--color-rule)] max-h-[220px] overflow-y-auto">
            {targets.map((tgt) => (
              <label
                key={tgt.id}
                className="py-2 px-1 flex items-center gap-2.5 cursor-pointer hover:bg-[var(--color-paper-2)] rounded"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(tgt.id)}
                  onChange={() => handleToggle(tgt.id)}
                  className="accent-[var(--color-accent)] w-4 h-4 rounded"
                />
                <span className="text-xs text-[var(--color-ink)] truncate flex-1">
                  {tgt.title}
                </span>
                <span className="text-[11px] font-mono text-[var(--color-ink-muted)] shrink-0">
                  {tgt.period}
                </span>
              </label>
            ))}
          </div>
        </div>
      </form>
    </Modal>
  );
};
