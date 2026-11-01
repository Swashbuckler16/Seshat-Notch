import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Habit, HabitScheduleType } from '../../types';
import { domainService } from '../../services/domainService';
import { Sparkles, Target as TargetIcon } from 'lucide-react';

interface HabitEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  habitToEdit?: Habit | null;
}

export const HabitEditorModal: React.FC<HabitEditorModalProps> = ({
  isOpen,
  onClose,
  habitToEdit,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const goals = useLiveQuery(
    () => db.projects.filter((p) => !p.isDeleted && p.isGoal).toArray(),
    []
  );

  const [title, setTitle] = useState(habitToEdit?.title || '');
  const [scheduleType, setScheduleType] = useState<HabitScheduleType>(
    habitToEdit?.scheduleType || 'daily'
  );
  const [targetFrequency, setTargetFrequency] = useState(habitToEdit?.targetFrequency || 3);
  const [intervalDays, setIntervalDays] = useState(habitToEdit?.intervalDays || 2);
  const [metricType, setMetricType] = useState<'boolean' | 'count' | 'duration'>(
    habitToEdit?.metricType || 'boolean'
  );
  const [targetValue, setTargetValue] = useState(habitToEdit?.targetValue || 1);
  const [unit, setUnit] = useState(habitToEdit?.unit || '');
  const [isAvoidance, setIsAvoidance] = useState(habitToEdit?.isAvoidance || false);
  const [linkedGoalId, setLinkedGoalId] = useState(habitToEdit?.linkedGoalId || '');
  const [startDate, setStartDate] = useState(habitToEdit?.startDate || todayStr);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      if (habitToEdit) {
        await domainService.updateHabit(habitToEdit.id, {
          title: title.trim(),
          scheduleType,
          targetFrequency: scheduleType === 'n_per_week' ? Number(targetFrequency) : undefined,
          intervalDays: scheduleType === 'every_n_days' ? Number(intervalDays) : undefined,
          metricType,
          targetValue: Number(targetValue) || 1,
          unit: unit.trim() || undefined,
          isAvoidance,
          linkedGoalId: linkedGoalId || undefined,
          startDate,
        });
      } else {
        await domainService.createHabit({
          title: title.trim(),
          scheduleType,
          targetFrequency: scheduleType === 'n_per_week' ? Number(targetFrequency) : undefined,
          intervalDays: scheduleType === 'every_n_days' ? Number(intervalDays) : undefined,
          metricType,
          targetValue: Number(targetValue) || 1,
          unit: unit.trim() || undefined,
          isAvoidance,
          linkedGoalId: linkedGoalId || undefined,
          startDate,
        });
      }
      onClose();
    } catch (err) {
      console.error('Failed to save habit:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={habitToEdit ? 'Edit habit' : 'Create new habit'}
      subtitle="Configure cadence, measurable target, and goal links."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Title */}
        <Input
          label="Habit title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Daily Deep Study Block, Strength Training, Sleep Window"
          required
        />

        {/* Avoidance Toggle */}
        <div className="flex items-center justify-between p-2.5 surface-card border border-[var(--color-rule)] rounded-[var(--radius-xs)]">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-semibold text-[var(--color-ink)]">
              Avoidance habit (things to stop)
            </span>
            <span className="text-[11px] text-[var(--color-ink-muted)]">
              Tracks consecutive clean days and records relapses honestly (HB-6).
            </span>
          </div>
          <input
            type="checkbox"
            checked={isAvoidance}
            onChange={(e) => setIsAvoidance(e.target.checked)}
            className="w-4 h-4 rounded text-[var(--color-accent)] focus:ring-[var(--color-focus)]"
          />
        </div>

        {/* Schedule Type */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-[var(--color-ink)]">
            Cadence & schedule
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setScheduleType('daily')}
              className={`px-2.5 py-1.5 rounded-[var(--radius-xs)] border text-center transition-colors ${
                scheduleType === 'daily'
                  ? 'border-[var(--color-ink)] bg-[var(--color-paper-2)] font-semibold text-[var(--color-ink)]'
                  : 'border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:border-[var(--color-rule-strong)]'
              }`}
            >
              Every day
            </button>
            <button
              type="button"
              onClick={() => setScheduleType('weekdays')}
              className={`px-2.5 py-1.5 rounded-[var(--radius-xs)] border text-center transition-colors ${
                scheduleType === 'weekdays'
                  ? 'border-[var(--color-ink)] bg-[var(--color-paper-2)] font-semibold text-[var(--color-ink)]'
                  : 'border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:border-[var(--color-rule-strong)]'
              }`}
            >
              Weekdays (M-F)
            </button>
            <button
              type="button"
              onClick={() => setScheduleType('n_per_week')}
              className={`px-2.5 py-1.5 rounded-[var(--radius-xs)] border text-center transition-colors ${
                scheduleType === 'n_per_week'
                  ? 'border-[var(--color-ink)] bg-[var(--color-paper-2)] font-semibold text-[var(--color-ink)]'
                  : 'border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:border-[var(--color-rule-strong)]'
              }`}
            >
              N / week
            </button>
            <button
              type="button"
              onClick={() => setScheduleType('every_n_days')}
              className={`px-2.5 py-1.5 rounded-[var(--radius-xs)] border text-center transition-colors ${
                scheduleType === 'every_n_days'
                  ? 'border-[var(--color-ink)] bg-[var(--color-paper-2)] font-semibold text-[var(--color-ink)]'
                  : 'border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:border-[var(--color-rule-strong)]'
              }`}
            >
              Every N days
            </button>
          </div>
        </div>

        {/* Frequency / Interval parameters */}
        {scheduleType === 'n_per_week' && (
          <Input
            label="Target times per week"
            type="number"
            min={1}
            max={7}
            value={targetFrequency}
            onChange={(e) => setTargetFrequency(Number(e.target.value))}
            required
          />
        )}

        {scheduleType === 'every_n_days' && (
          <Input
            label="Day interval (e.g. 2 for every other day)"
            type="number"
            min={2}
            value={intervalDays}
            onChange={(e) => setIntervalDays(Number(e.target.value))}
            required
          />
        )}

        {/* Metric Type & Target */}
        {!isAvoidance && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[var(--color-ink)]">
                Metric type
              </label>
              <select
                className="input-field px-2.5 py-1.5 text-xs rounded-[var(--radius-xs)] border border-[var(--color-rule)] bg-[var(--color-paper)] focus:outline-none focus:border-[var(--color-accent)]"
                value={metricType}
                onChange={(e) => setMetricType(e.target.value as 'boolean' | 'count' | 'duration')}
              >
                <option value="boolean">Done / Not done</option>
                <option value="duration">Duration (minutes)</option>
                <option value="count">Numeric count</option>
              </select>
            </div>

            <Input
              label="Target value"
              type="number"
              min={1}
              value={targetValue}
              onChange={(e) => setTargetValue(Number(e.target.value))}
              required
            />

            <Input
              label="Unit label"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder={metricType === 'duration' ? 'minutes' : 'times'}
            />
          </div>
        )}

        {/* Linked Goal Selector (PRD HB-7) */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[var(--color-ink)] flex items-center gap-1.5">
            <TargetIcon className="w-3.5 h-3.5 text-[var(--color-accent)]" />
            <span>Link to strategic goal (optional)</span>
          </label>
          <select
            className="input-field px-2.5 py-1.5 text-xs rounded-[var(--radius-xs)] border border-[var(--color-rule)] bg-[var(--color-paper)] focus:outline-none focus:border-[var(--color-accent)]"
            value={linkedGoalId}
            onChange={(e) => setLinkedGoalId(e.target.value)}
          >
            <option value="">No goal link (standalone habit)</option>
            {(goals || []).map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </select>
          <span className="text-[11px] text-[var(--color-ink-muted)]">
            Habit completions directly contribute to the goal's progress score (PRD HB-7).
          </span>
        </div>

        {/* Start Date */}
        <Input
          label="Habit start date"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          required
        />

        <div className="flex items-center justify-end gap-2 hairline-t pt-3 mt-1">
          <Button variant="secondary" size="sm" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit" disabled={isSubmitting}>
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Saving...' : habitToEdit ? 'Save changes' : 'Create habit'}</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
};
