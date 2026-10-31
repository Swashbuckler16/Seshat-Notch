import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { TargetHorizon, EntityId } from '../../types';
import { domainService } from '../../services/domainService';
import { getAdjacentPeriod, formatPeriodLabel } from '../../utils/periodUtils';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Check } from 'lucide-react';

interface CopyForwardModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPeriod: string;
  horizon: TargetHorizon;
}

export const CopyForwardModal: React.FC<CopyForwardModalProps> = ({
  isOpen,
  onClose,
  currentPeriod,
  horizon,
}) => {
  const previousPeriod = getAdjacentPeriod(currentPeriod, horizon, 'prev');
  const [selectedIds, setSelectedIds] = useState<EntityId[]>([]);

  // Query source targets from previous period
  const sourceTargets = useLiveQuery(
    () =>
      db.targets
        .where('period')
        .equals(previousPeriod)
        .filter((t) => !t.isDeleted && t.horizon === horizon)
        .toArray(),
    [previousPeriod, horizon]
  );

  // Initialize selected IDs with all source targets
  useEffect(() => {
    if (sourceTargets) {
      setSelectedIds(sourceTargets.map((t) => t.id));
    }
  }, [sourceTargets]);

  const handleToggle = (id: EntityId) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (!sourceTargets) return;
    if (selectedIds.length === sourceTargets.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(sourceTargets.map((t) => t.id));
    }
  };

  const handleConfirmCopy = async () => {
    if (selectedIds.length === 0) return;

    await domainService.copyForwardPeriod({
      sourcePeriod: previousPeriod,
      targetPeriod: currentPeriod,
      horizon,
      targetIds: selectedIds,
    });

    onClose();
  };

  const prevLabel = formatPeriodLabel(previousPeriod, horizon);
  const currLabel = formatPeriodLabel(currentPeriod, horizon);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Copy targets from previous period"
      subtitle={`Bring goals forward from ${prevLabel} into ${currLabel}.`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirmCopy}
            disabled={selectedIds.length === 0}
          >
            <Check className="w-3.5 h-3.5" />
            <span>Copy {selectedIds.length} target{selectedIds.length === 1 ? '' : 's'}</span>
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-xs text-[var(--color-ink-muted)]">
          Targets will be added to <strong>{currLabel}</strong> with a fresh starting progress of 0.
        </p>

        {(!sourceTargets || sourceTargets.length === 0) ? (
          <div className="py-8 text-center text-xs text-[var(--color-ink-muted)] surface-well rounded-[var(--radius-xs)] border border-[var(--color-rule)]">
            No targets found in {prevLabel} to copy forward.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-mono hairline-b pb-2">
              <span className="text-[var(--color-ink-muted)]">
                Available targets ({sourceTargets.length})
              </span>
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-[var(--color-accent)] hover:underline focus-visible:outline-2"
              >
                {selectedIds.length === sourceTargets.length ? 'Deselect all' : 'Select all'}
              </button>
            </div>

            <div className="flex flex-col divide-y divide-[var(--color-rule)] max-h-[300px] overflow-y-auto">
              {sourceTargets.map((tgt) => {
                const isSelected = selectedIds.includes(tgt.id);
                return (
                  <label
                    key={tgt.id}
                    className="py-2 px-1.5 flex items-center gap-3 cursor-pointer hover:bg-[var(--color-paper-2)] rounded-[var(--radius-xs)] transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggle(tgt.id)}
                      className="accent-[var(--color-accent)] w-4 h-4 rounded"
                    />
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-xs font-medium text-[var(--color-ink)] truncate">
                        {tgt.title}
                      </span>
                      <span className="text-[11px] font-mono text-[var(--color-ink-muted)]">
                        Target: {tgt.targetValue} {tgt.unit}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
