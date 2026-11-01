import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Habit } from '../../types';
import { domainService } from '../../services/domainService';
import { Plane, Plus, Trash2, Calendar } from 'lucide-react';

interface HabitPauseModalProps {
  isOpen: boolean;
  onClose: () => void;
  habit: Habit;
}

export const HabitPauseModal: React.FC<HabitPauseModalProps> = ({ isOpen, onClose, habit }) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [reason, setReason] = useState('Vacation / Travel');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddPause = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) return;

    setIsSubmitting(true);
    try {
      await domainService.addHabitPauseRange(
        habit.id,
        startDate,
        endDate,
        reason.trim() || 'Vacation or sick pause'
      );
      // reset form
      setReason('Vacation / Travel');
    } catch (err) {
      console.error('Failed to add pause range:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemovePause = async (index: number) => {
    try {
      await domainService.removeHabitPauseRange(habit.id, index);
    } catch (err) {
      console.error('Failed to remove pause range:', err);
    }
  };

  const existingRanges = habit.pausedRanges || [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Vacation & sick pause"
      subtitle="Freeze streaks during planned absences or medical recovery."
    >
      <div className="flex flex-col gap-4">
        {/* Active Pause Ranges */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-[var(--color-ink)]">
            Configured pause ranges
          </label>
          {existingRanges.length === 0 ? (
            <div className="p-3 text-center text-xs text-[var(--color-ink-muted)] surface-card border border-[var(--color-rule)] rounded-[var(--radius-xs)]">
              No pause ranges active for this habit.
            </div>
          ) : (
            <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
              {existingRanges.map((range, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 surface-card border border-[var(--color-rule)] rounded-[var(--radius-xs)] text-xs"
                >
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                    <span className="font-mono tabular-figure">
                      {range.startDate} → {range.endDate}
                    </span>
                    <span className="text-[var(--color-ink-muted)]">
                      ({range.reason || 'Pause'})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemovePause(idx)}
                    className="text-[var(--color-ink-muted)] hover:text-[var(--color-status-behind)] p-1 transition-colors"
                    title="Remove pause range"
                    aria-label="Remove pause range"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add New Pause Range */}
        <form onSubmit={handleAddPause} className="flex flex-col gap-3 hairline-t pt-3">
          <span className="text-xs font-semibold text-[var(--color-ink)]">
            Add new pause window
          </span>

          <div className="grid grid-cols-2 gap-2">
            <Input
              label="Start date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
            <Input
              label="End date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--color-ink)]">
              Reason
            </label>
            <input
              type="text"
              className="input-field px-3 py-1.5 text-xs rounded-[var(--radius-xs)] border border-[var(--color-rule)] bg-[var(--color-paper)] focus:outline-none focus:border-[var(--color-accent)]"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Annual leave, conference, sick leave"
            />
          </div>

          <div className="flex items-center justify-end gap-2 mt-1">
            <Button
              variant="secondary"
              size="sm"
              type="submit"
              disabled={isSubmitting || !startDate || !endDate}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Adding...' : 'Add pause window'}</span>
            </Button>
          </div>
        </form>

        <div className="flex items-center justify-end hairline-t pt-3">
          <Button variant="primary" size="sm" type="button" onClick={onClose}>
            <Plane className="w-3.5 h-3.5" />
            <span>Done</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
};
