import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { Task } from '../../types';
import { domainService } from '../../services/domainService';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Clock, Plus, Check } from 'lucide-react';

interface ExecutionStripProps {
  tasks: Task[];
  dateStr: string;
}

export const ExecutionStrip: React.FC<ExecutionStripProps> = ({ tasks, dateStr }) => {
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [durationMinutes, setDurationMinutes] = useState<number>(25);
  const [kind, setKind] = useState<'deep' | 'shallow' | 'learning'>('deep');
  const [note, setNote] = useState<string>('');
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Query time sessions logged today
  const sessions = useLiveQuery(
    () =>
      db.timeSessions
        .filter((s) => s.startTime.startsWith(dateStr))
        .reverse()
        .toArray(),
    [dateStr]
  );

  const handleQuickLogMinutes = async (mins: number) => {
    await domainService.logTimeSession({
      entityType: selectedTaskId ? 'task' : 'project',
      entityId: selectedTaskId || 'independent_focus',
      durationMinutes: mins,
      kind,
      note: note.trim() || undefined,
    });
    setNote('');
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (durationMinutes <= 0) return;

    await domainService.logTimeSession({
      entityType: selectedTaskId ? 'task' : 'project',
      entityId: selectedTaskId || 'independent_focus',
      durationMinutes: Number(durationMinutes),
      kind,
      note: note.trim() || undefined,
    });

    setNote('');
    setIsFormOpen(false);
  };

  const totalMinutes = (sessions || []).reduce((acc, s) => acc + (s.durationMinutes || 0), 0);

  return (
    <div className="surface-card rounded-[var(--radius-sm)] p-4 flex flex-col gap-3.5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 hairline-b pb-2.5">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[var(--color-accent)]" />
          <h3 className="font-semibold text-xs text-[var(--color-ink)]">
            Focus time & rapid session logger
          </h3>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-[var(--color-ink-muted)]">Logged today:</span>
          <span className="font-semibold tabular-figure text-[var(--color-accent)]">
            {totalMinutes}m
          </span>
          <span className="text-[10px] text-[var(--color-ink-subtle)]">
            ({sessions?.length ?? 0} sessions)
          </span>
        </div>
      </div>

      {/* Quick Action Strip: 1-Click Session Loggers */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--color-paper-2)]/50 p-2.5 rounded-[var(--radius-xs)] border border-[var(--color-rule)]">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-[var(--color-ink-muted)] font-medium mr-1">
            Log focus:
          </span>
          {[
            { label: '+15m', mins: 15 },
            { label: '+25m Pomodoro', mins: 25 },
            { label: '+45m Deep work', mins: 45 },
            { label: '+90m Lab block', mins: 90 },
          ].map((preset) => (
            <button
              key={preset.mins}
              type="button"
              onClick={() => handleQuickLogMinutes(preset.mins)}
              className="min-h-11 sm:min-h-8 px-2.5 py-1 text-xs font-mono rounded bg-[var(--color-paper)] border border-[var(--color-rule)] text-[var(--color-ink)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] focus-visible:outline-2 transition-colors"
            >
              {preset.label}
            </button>
          ))}
        </div>

        <Button
          size="sm"
          variant="secondary"
          onClick={() => setIsFormOpen(!isFormOpen)}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{isFormOpen ? 'Close' : 'Custom log'}</span>
        </Button>
      </div>

      {/* Expanded Custom Logger Form */}
      {isFormOpen && (
        <form
          onSubmit={handleCustomSubmit}
          className="surface-well p-3 rounded-[var(--radius-xs)] border border-[var(--color-rule)] flex flex-col gap-3 text-xs"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <label className="font-medium text-[var(--color-ink)]">
                Task attribution (optional)
              </label>
              <select
                value={selectedTaskId}
                onChange={(e) => setSelectedTaskId(e.target.value)}
                className="h-9 px-2 text-xs bg-[var(--color-paper)] border border-[var(--color-rule)] rounded text-[var(--color-ink)]"
              >
                <option value="">General focus (No specific task)</option>
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-medium text-[var(--color-ink)]">
                Duration (minutes)
              </label>
              <input
                type="number"
                min="1"
                max="720"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10) || 1)}
                className="h-9 px-2.5 text-xs font-mono bg-[var(--color-paper)] border border-[var(--color-rule)] rounded text-[var(--color-ink)]"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-medium text-[var(--color-ink)]">
                Session kind
              </label>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as 'deep' | 'shallow' | 'learning')}
                className="h-9 px-2 text-xs bg-[var(--color-paper)] border border-[var(--color-rule)] rounded text-[var(--color-ink)]"
              >
                <option value="deep">Deep work</option>
                <option value="learning">Learning / Study</option>
                <option value="shallow">Shallow / Admin</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Input
                placeholder="Optional note on what was accomplished"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            <Button size="sm" variant="primary" onClick={handleCustomSubmit}>
              <Check className="w-3.5 h-3.5" />
              <span>Record</span>
            </Button>
          </div>
        </form>
      )}

      {/* Recent Sessions Ledger */}
      {sessions && sessions.length > 0 && (
        <div className="flex flex-col gap-1.5 pt-1">
          <span className="text-[11px] font-mono text-[var(--color-ink-muted)]">
            Recorded blocks today:
          </span>
          <div className="flex flex-wrap gap-2">
            {sessions.map((s) => (
              <div
                key={s.id}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-[var(--color-paper-2)] border border-[var(--color-rule)] text-[11px] font-mono"
              >
                <span className="font-semibold tabular-figure text-[var(--color-accent)]">
                  {s.durationMinutes}m
                </span>
                <span className="text-[var(--color-ink-muted)] capitalize">
                  {s.kind}
                </span>
                {s.note && (
                  <span className="text-[var(--color-ink-subtle)] truncate max-w-[120px]">
                    · {s.note}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
