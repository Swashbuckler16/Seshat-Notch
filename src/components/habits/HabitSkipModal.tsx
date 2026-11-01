import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Habit } from '../../types';
import { domainService } from '../../services/domainService';
import { Coffee, ShieldCheck } from 'lucide-react';

interface HabitSkipModalProps {
  isOpen: boolean;
  onClose: () => void;
  habit: Habit;
  defaultDate?: string;
}

export const HabitSkipModal: React.FC<HabitSkipModalProps> = ({
  isOpen,
  onClose,
  habit,
  defaultDate,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(defaultDate || todayStr);
  const [reason, setReason] = useState('Planned rest day');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) return;

    setIsSubmitting(true);
    try {
      await domainService.logHabitSkip(habit.id, date, reason.trim() || 'Excused rest day');
      onClose();
    } catch (err) {
      console.error('Failed to log excused skip:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record excused rest day"
      subtitle="Preserves your habit streak without penalty per fair streak logic."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Fair Streak Protection Notice */}
        <div className="surface-well border border-[var(--color-rule)] rounded-[var(--radius-xs)] p-3 text-xs flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-[var(--color-accent)] shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1 text-[var(--color-ink-muted)]">
            <span className="font-semibold text-[var(--color-ink)]">
              {habit.title}
            </span>
            <span>
              Excused days do not break your streak or lower your consistency rating.
            </span>
          </div>
        </div>

        <Input
          label="Skip date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[var(--color-ink)]">
            Reason or context
          </label>
          <input
            type="text"
            className="input-field px-3 py-1.5 text-xs rounded-[var(--radius-xs)] border border-[var(--color-rule)] bg-[var(--color-paper)] focus:outline-none focus:border-[var(--color-accent)]"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Scheduled rest day, feeling unwell, heavy travel"
          />
          <div className="flex items-center gap-2 mt-1">
            <button
              type="button"
              onClick={() => setReason('Scheduled rest day')}
              className="text-[11px] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] underline"
            >
              Rest day
            </button>
            <span className="text-[11px] text-[var(--color-ink-muted)]">·</span>
            <button
              type="button"
              onClick={() => setReason('Recovery / Feeling unwell')}
              className="text-[11px] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] underline"
            >
              Sick day
            </button>
            <span className="text-[11px] text-[var(--color-ink-muted)]">·</span>
            <button
              type="button"
              onClick={() => setReason('Travel / Commute day')}
              className="text-[11px] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] underline"
            >
              Travel
            </button>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 hairline-t pt-3 mt-1">
          <Button variant="secondary" size="sm" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit" disabled={isSubmitting}>
            <Coffee className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Recording...' : 'Record excused day'}</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
};
