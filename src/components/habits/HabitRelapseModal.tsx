import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Habit } from '../../types';
import { domainService } from '../../services/domainService';
import { AlertCircle, RotateCcw } from 'lucide-react';

interface HabitRelapseModalProps {
  isOpen: boolean;
  onClose: () => void;
  habit: Habit;
}

export const HabitRelapseModal: React.FC<HabitRelapseModalProps> = ({
  isOpen,
  onClose,
  habit,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(todayStr);
  const [trigger, setTrigger] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) return;

    setIsSubmitting(true);
    try {
      await domainService.logAvoidanceRelapse(
        habit.id,
        date,
        trigger.trim() || 'Relapse recorded'
      );
      onClose();
    } catch (err) {
      console.error('Failed to log relapse:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Log relapse event"
      subtitle="Record an occurrence honestly to reset your clean-days ledger."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="surface-well border border-[var(--color-rule)] rounded-[var(--radius-xs)] p-3 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-[var(--color-status-at-risk)] shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1 text-[var(--color-ink-muted)]">
            <span className="font-semibold text-[var(--color-ink)]">
              {habit.title}
            </span>
            <span>
              Honest logging maintains ledger trust. Your previous clean streaks remain permanently in your history.
            </span>
          </div>
        </div>

        <Input
          label="Relapse date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[var(--color-ink)]">
            Trigger / Context note
          </label>
          <textarea
            rows={2}
            className="input-field px-3 py-2 text-xs rounded-[var(--radius-xs)] border border-[var(--color-rule)] bg-[var(--color-paper)] focus:outline-none focus:border-[var(--color-accent)]"
            value={trigger}
            onChange={(e) => setTrigger(e.target.value)}
            placeholder="What triggered this? (e.g. fatigue, late-night stress, social pressure)"
          />
        </div>

        <div className="flex items-center justify-end gap-2 hairline-t pt-3 mt-1">
          <Button variant="secondary" size="sm" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit" disabled={isSubmitting}>
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Recording...' : 'Record relapse'}</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
};
