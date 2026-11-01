import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { domainService } from '../../services/domainService';
import { getLocalDateString } from '../../utils/dateUtils';
import { Clock } from 'lucide-react';

interface ManualTimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDate?: string;
}

export const ManualTimeModal: React.FC<ManualTimeModalProps> = ({
  isOpen,
  onClose,
  defaultDate,
}) => {
  const todayStr = getLocalDateString();

  const activeTasks = useLiveQuery(
    () => db.tasks.filter((t) => !t.isDeleted).toArray(),
    []
  );

  const activeProjects = useLiveQuery(
    () => db.projects.filter((p) => !p.isDeleted).toArray(),
    []
  );

  const [date, setDate] = useState(defaultDate || todayStr);
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [entityChoice, setEntityChoice] = useState('');
  const [kind, setKind] = useState<'deep' | 'shallow' | 'learning'>('deep');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (durationMinutes <= 0) return;

    setIsSubmitting(true);
    try {
      let entityType: 'task' | 'project' = 'project';
      let entityId = 'general_focus';

      if (entityChoice) {
        const [type, id] = entityChoice.split(':');
        entityType = type as 'task' | 'project';
        entityId = id;
      }

      await domainService.logTimeSession({
        entityType,
        entityId,
        durationMinutes: Number(durationMinutes),
        kind,
        note: note.trim() || undefined,
      });

      onClose();
    } catch (err) {
      console.error('Failed to log manual time session:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Log past focus session"
      subtitle="Record off-device work or backfill earlier hours."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />

          <Input
            label="Duration (minutes)"
            type="number"
            min={1}
            max={720}
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(Number(e.target.value))}
            required
          />
        </div>

        {/* Entity Selector */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[var(--color-ink)]">
            Linked task or project
          </label>
          <select
            className="input-field px-2.5 py-1.5 text-xs rounded-[var(--radius-xs)] border border-[var(--color-rule)] bg-[var(--color-paper)] focus:outline-none focus:border-[var(--color-accent)]"
            value={entityChoice}
            onChange={(e) => setEntityChoice(e.target.value)}
          >
            <option value="">General / Independent Focus</option>
            <optgroup label="Projects">
              {(activeProjects || []).map((p) => (
                <option key={p.id} value={`project:${p.id}`}>
                  Project: {p.title}
                </option>
              ))}
            </optgroup>
            <optgroup label="Tasks">
              {(activeTasks || []).map((t) => (
                <option key={t.id} value={`task:${t.id}`}>
                  Task: {t.title}
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        {/* Session Kind */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[var(--color-ink)]">
            Classification
          </label>
          <div className="grid grid-cols-3 gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setKind('deep')}
              className={`px-2 py-1.5 rounded-[var(--radius-xs)] border text-center transition-colors ${
                kind === 'deep'
                  ? 'border-[var(--color-ink)] bg-[var(--color-paper-2)] font-semibold text-[var(--color-ink)]'
                  : 'border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:border-[var(--color-rule-strong)]'
              }`}
            >
              Deep work
            </button>
            <button
              type="button"
              onClick={() => setKind('shallow')}
              className={`px-2 py-1.5 rounded-[var(--radius-xs)] border text-center transition-colors ${
                kind === 'shallow'
                  ? 'border-[var(--color-ink)] bg-[var(--color-paper-2)] font-semibold text-[var(--color-ink)]'
                  : 'border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:border-[var(--color-rule-strong)]'
              }`}
            >
              Shallow work
            </button>
            <button
              type="button"
              onClick={() => setKind('learning')}
              className={`px-2 py-1.5 rounded-[var(--radius-xs)] border text-center transition-colors ${
                kind === 'learning'
                  ? 'border-[var(--color-ink)] bg-[var(--color-paper-2)] font-semibold text-[var(--color-ink)]'
                  : 'border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:border-[var(--color-rule-strong)]'
              }`}
            >
              Learning
            </button>
          </div>
        </div>

        {/* Note */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[var(--color-ink)]">
            Session note or accomplishments
          </label>
          <textarea
            rows={2}
            className="input-field px-3 py-1.5 text-xs rounded-[var(--radius-xs)] border border-[var(--color-rule)] bg-[var(--color-paper)] focus:outline-none focus:border-[var(--color-accent)]"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Completed milestone draft and reviewed test cases"
          />
        </div>

        <div className="flex items-center justify-end gap-2 hairline-t pt-3 mt-1">
          <Button variant="secondary" size="sm" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit" disabled={isSubmitting}>
            <Clock className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Logging...' : 'Save time entry'}</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
};
