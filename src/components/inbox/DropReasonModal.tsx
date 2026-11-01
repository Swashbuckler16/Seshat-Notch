import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { AlertCircle, Check } from 'lucide-react';

interface DropReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemTitle: string;
  onConfirmDrop: (reason: string) => Promise<void>;
}

export const DropReasonModal: React.FC<DropReasonModalProps> = ({
  isOpen,
  onClose,
  itemTitle,
  onConfirmDrop,
}) => {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;

    setIsSubmitting(true);
    try {
      await onConfirmDrop(reason.trim());
      setReason('');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reason required: Dropping item"
      subtitle="Dropping an item requires an explicit reason stored permanently in your audit log."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleSubmit}
            disabled={!reason.trim() || isSubmitting}
          >
            <Check className="w-3.5 h-3.5" />
            <span>Confirm drop with reason</span>
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="surface-well p-3 rounded-[var(--radius-xs)] border border-[var(--color-rule)] flex items-start gap-2.5 text-xs">
          <AlertCircle className="w-4 h-4 text-[var(--color-status-behind)] shrink-0 mt-0.5" />
          <div className="flex flex-col">
            <span className="font-semibold text-[var(--color-ink)]">
              {itemTitle}
            </span>
            <span className="text-[var(--color-ink-muted)] text-[11px] mt-0.5">
              Honest tracking keeps your plan realistic. Explain why this work is being dropped.
            </span>
          </div>
        </div>

        <Input
          label="Why is this item being dropped?"
          placeholder="e.g. Deprecated in favor of alternative approach / Scope reduced"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
          autoFocus
        />
      </form>
    </Modal>
  );
};

