import React from 'react';
import { TimeSession, Task, ProjectGoal } from '../../types';
import { domainService } from '../../services/domainService';
import { formatMinutesToHuman } from '../../utils/timeMath';
import { Button } from '../ui/Button';
import { Clock, Plus, Trash2, Brain, FileText, BookOpen } from 'lucide-react';

interface TimeSessionLedgerProps {
  sessions: TimeSession[];
  tasks: Task[];
  projects: ProjectGoal[];
  onOpenManualModal: () => void;
}

export const TimeSessionLedger: React.FC<TimeSessionLedgerProps> = ({
  sessions,
  tasks,
  projects,
  onOpenManualModal,
}) => {
  const tasksMap = new Map(tasks.map((t) => [t.id, t]));
  const projectsMap = new Map(projects.map((p) => [p.id, p]));

  const handleDelete = async (session: TimeSession) => {
    if (window.confirm('Delete this recorded time session?')) {
      await domainService.deleteTimeSession(session.id, 'User deleted time entry');
    }
  };

  return (
    <div className="surface-card rounded-[var(--radius-sm)] p-4 flex flex-col gap-3.5 border border-[var(--color-rule)]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 hairline-b pb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[var(--color-accent)]" />
          <h3 className="font-semibold text-xs text-[var(--color-ink)]">
            Focus session ledger
          </h3>
          <span className="text-[11px] font-mono tabular-figure text-[var(--color-ink-muted)]">
            ({sessions.length} recorded entries)
          </span>
        </div>

        <Button variant="secondary" size="sm" onClick={onOpenManualModal}>
          <Plus className="w-3.5 h-3.5" />
          <span>Manual log</span>
        </Button>
      </div>

      {/* Ledger Table */}
      {sessions.length === 0 ? (
        <div className="py-12 text-center text-xs text-[var(--color-ink-muted)] flex flex-col items-center justify-center gap-2">
          <Clock className="w-6 h-6 text-[var(--color-ink-muted)] opacity-50" />
          <span>No focus sessions recorded yet. Start a timer or log manual hours.</span>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="hairline-b text-[var(--color-ink-muted)] font-mono text-[11px]">
                <th className="py-2 px-2.5 font-normal">Timestamp</th>
                <th className="py-2 px-2.5 font-normal">Type</th>
                <th className="py-2 px-2.5 font-normal">Linked Item</th>
                <th className="py-2 px-2.5 font-normal text-right">Duration</th>
                <th className="py-2 px-2.5 font-normal">Notes</th>
                <th className="py-2 px-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-rule)]">
              {sessions.map((session) => {
                let entityLabel = 'Independent Focus';
                if (session.entityType === 'task') {
                  const t = tasksMap.get(session.entityId);
                  entityLabel = t ? `Task: ${t.title}` : 'Task';
                } else if (session.entityType === 'project') {
                  const p = projectsMap.get(session.entityId);
                  entityLabel = p ? `Project: ${p.title}` : 'Project';
                }

                // Format timestamp
                const dateStr = session.startTime.split('T')[0];
                const timeStr = session.startTime.split('T')[1]?.slice(0, 5) || '';

                return (
                  <tr
                    key={session.id}
                    className="hover:bg-[var(--color-paper-2)]/30 transition-colors"
                  >
                    <td className="py-2.5 px-2.5 font-mono tabular-figure text-[var(--color-ink-muted)] whitespace-nowrap">
                      {dateStr} <span className="text-[10px]">{timeStr}</span>
                    </td>
                    <td className="py-2.5 px-2.5 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[var(--radius-xs)] font-mono text-[10px] bg-[var(--color-paper-2)] border border-[var(--color-rule)]">
                        {session.kind === 'deep' ? (
                          <>
                            <Brain className="w-2.5 h-2.5 text-[var(--color-accent)]" />
                            <span className="font-semibold text-[var(--color-ink)]">Deep</span>
                          </>
                        ) : session.kind === 'learning' ? (
                          <>
                            <BookOpen className="w-2.5 h-2.5 text-indigo-500" />
                            <span className="font-medium text-[var(--color-ink)]">Learning</span>
                          </>
                        ) : (
                          <>
                            <FileText className="w-2.5 h-2.5 text-[var(--color-ink-muted)]" />
                            <span className="text-[var(--color-ink-muted)]">Shallow</span>
                          </>
                        )}
                      </span>
                    </td>
                    <td className="py-2.5 px-2.5 text-[var(--color-ink)] font-medium max-w-xs truncate">
                      {entityLabel}
                    </td>
                    <td className="py-2.5 px-2.5 font-mono tabular-figure font-semibold text-right text-[var(--color-ink)] whitespace-nowrap">
                      {formatMinutesToHuman(session.durationMinutes)}
                    </td>
                    <td className="py-2.5 px-2.5 text-[var(--color-ink-muted)] italic max-w-sm truncate text-[11px]">
                      {session.note || '-'}
                    </td>
                    <td className="py-2.5 px-2 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(session)}
                        className="p-1 text-[var(--color-ink-muted)] hover:text-red-500 rounded transition-colors"
                        title="Delete time session"
                        aria-label="Delete time session"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
