import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { seedDatabase } from '../db/seedData';
import { domainService } from '../services/domainService';
import { Database, RotateCcw, Plus, History, AlertCircle } from 'lucide-react';

export const StorageInspector: React.FC = () => {
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [selectedEntityFilter, setSelectedEntityFilter] = useState<string>('all');

  // Live queries from Dexie database
  const areas = useLiveQuery(() => db.areas.toArray(), []);
  const projects = useLiveQuery(() => db.projects.filter((x) => !x.isDeleted).toArray(), []);
  const milestones = useLiveQuery(() => db.milestones.filter((x) => !x.isDeleted).toArray(), []);
  const targets = useLiveQuery(() => db.targets.filter((x) => !x.isDeleted).toArray(), []);
  const tasks = useLiveQuery(() => db.tasks.filter((x) => !x.isDeleted).toArray(), []);
  const habits = useLiveQuery(() => db.habits.filter((x) => !x.isDeleted).toArray(), []);
  const routines = useLiveQuery(() => db.routines.filter((x) => !x.isDeleted).toArray(), []);
  const progressLogs = useLiveQuery(() => db.progressLogs.toArray(), []);
  const changeLogs = useLiveQuery(() => db.changeLogs.reverse().sortBy('timestamp'), []);

  const counts = {
    areas: areas?.length ?? 0,
    projects: projects?.length ?? 0,
    milestones: milestones?.length ?? 0,
    targets: targets?.length ?? 0,
    tasks: tasks?.length ?? 0,
    habits: habits?.length ?? 0,
    routines: routines?.length ?? 0,
    progressLogs: progressLogs?.length ?? 0,
    changeLogs: changeLogs?.length ?? 0,
  };
  const isLoading = [areas, projects, milestones, targets, tasks, habits, routines, progressLogs, changeLogs]
    .some((records) => records === undefined);

  const notify = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleSeed = async (force: boolean) => {
    if (force && !window.confirm('This replaces all planning data on this device with sample data. Continue?')) return;
    try {
      await seedDatabase(force);
      notify(force ? 'All local data was replaced with sample data.' : 'Sample data is ready.');
    } catch (err: unknown) {
      notify(`Seed error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleTestMutation = async () => {
    try {
      // Find active target
      const activeTarget = targets?.find(t => t.id === 'tgt_month_11_techniques');
      if (activeTarget) {
        await domainService.updateTargetProgress(activeTarget.id, 1, 'Logged 1 simulated technique via Storage Inspector test');
        notify(`Progress updated for ${activeTarget.title}.`);
      } else {
        notify('No sample target found. Restore the sample data to begin.');
      }
    } catch (err: unknown) {
      notify(`Mutation error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleTestDropWithoutReason = async () => {
    const task = tasks?.[0];
    if (!task) {
      notify(tasks === undefined ? 'Tasks are still loading. Try again in a moment.' : 'Add a task before trying this check.');
      return;
    }

    try {
        // Should throw per PRD TR-3
        await domainService.setTaskStatus(task.id, 'dropped');
    } catch (err: unknown) {
      notify('The change was blocked because it has no reason.');
    }
  };

  const filteredChangeLogs = (changeLogs ?? []).filter(c => {
    if (selectedEntityFilter === 'all') return true;
    return c.entityType === selectedEntityFilter;
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Header & Controls Strip */}
      <div className="surface-card rounded-[var(--radius-sm)] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[var(--color-paper-3)] border border-[var(--color-rule)] rounded-[var(--radius-xs)]">
            <Database className="w-5 h-5 text-[var(--color-accent)]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm">Data on this device</h3>
              <span className="text-[11px] px-1.5 py-0.2 bg-[var(--color-paper-3)] border border-[var(--color-rule)] rounded text-[var(--color-accent)]">
                Local storage
              </span>
            </div>
            <p className="text-xs text-[var(--color-ink-muted)]">
              Review the records saved in this browser and the changes made to them.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleSeed(true)}
            className="min-h-11 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[var(--color-paper-3)] hover:bg-[var(--color-rule)] border border-[var(--color-rule)] rounded-[var(--radius-xs)] text-[var(--color-ink)]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Replace data with sample</span>
          </button>
          <button
            type="button"
            onClick={handleTestMutation}
            className="min-h-11 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[var(--color-accent)] text-[var(--color-accent-ink)] rounded-[var(--radius-xs)] hover:opacity-90"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Update sample progress</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 bg-[var(--color-paper-2)] border border-[var(--color-rule)] rounded-[var(--radius-xs)] flex items-center gap-2 text-xs font-mono text-[var(--color-accent)]">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Entity Table Count Ledger */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {[
          { label: 'Projects & Goals', count: counts.projects, entity: 'project' },
          { label: 'Milestones', count: counts.milestones, entity: 'milestone' },
          { label: 'Targets', count: counts.targets, entity: 'target' },
          { label: 'Tasks', count: counts.tasks, entity: 'task' },
          { label: 'Habits & Routines', count: counts.habits + counts.routines, entity: 'habit' },
          { label: 'Progress Logs', count: counts.progressLogs, entity: 'log' },
          { label: 'Areas', count: counts.areas, entity: 'area' },
          { label: 'Changes', count: counts.changeLogs, entity: 'change' },
        ].map((item, idx) => (
          <div
            key={idx}
            className="surface-card rounded-[var(--radius-xs)] p-3 flex flex-col justify-between"
          >
            <span className="text-[11px] text-[var(--color-ink-muted)] truncate">{item.label}</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="tabular-figure font-mono text-lg font-semibold text-[var(--color-ink)]">
                {isLoading ? '…' : item.count}
              </span>
              <span className="text-[11px] text-[var(--color-ink-subtle)]">stored</span>
            </div>
          </div>
        ))}
      </div>

      {/* Immutable Append-Only Change Log Explorer */}
      <div className="surface-card rounded-[var(--radius-sm)] flex flex-col overflow-hidden">
        <div className="p-3 bg-[var(--color-paper-2)] hairline-b flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[var(--color-accent)]" />
              <span className="text-xs font-semibold">Change history</span>
            <span className="tabular-figure font-mono text-[11px] text-[var(--color-ink-muted)]">
              ({isLoading ? 'loading' : `${filteredChangeLogs.length} changes`})
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-[var(--color-ink-muted)] text-[11px]">Show:</span>
            <select
              value={selectedEntityFilter}
              onChange={(e) => setSelectedEntityFilter(e.target.value)}
              className="bg-[var(--color-paper)] border border-[var(--color-rule)] rounded-[var(--radius-xs)] px-2 py-1 text-xs text-[var(--color-ink)]"
            >
              <option value="all">All records</option>
              <option value="project">Project</option>
              <option value="milestone">Milestone</option>
              <option value="target">Target</option>
              <option value="task">Task</option>
              <option value="habit">Habit</option>
            </select>

            <button
              type="button"
              onClick={handleTestDropWithoutReason}
              className="min-h-11 whitespace-nowrap px-2 py-1 text-[11px] border border-[var(--color-rule)] rounded-[var(--radius-xs)] hover:bg-[var(--color-paper-3)] text-[var(--color-ink-muted)]"
              title="Try removing a task without a reason"
            >
              Check drop rule
            </button>
          </div>
        </div>

        {/* Change Log Table */}
        <div className="overflow-x-auto max-h-80">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="hairline-b bg-[var(--color-paper-2)] text-[var(--color-ink-muted)] text-xs">
                <th className="py-2 px-3 w-32">Time (UTC)</th>
                <th className="py-2 px-3 w-24">Record</th>
                <th className="py-2 px-3 w-24">Action</th>
                <th className="py-2 px-3">Changed value</th>
                <th className="py-2 px-3">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-rule)] text-[11px]">
              {isLoading ? (
                <tr><td colSpan={5} role="status" className="py-6 text-center text-[var(--color-ink-muted)]">Loading change history…</td></tr>
              ) : filteredChangeLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-[var(--color-ink-muted)]">
                    No changes for this selection.
                  </td>
                </tr>
              ) : (
                filteredChangeLogs.map((entry) => (
                  <tr key={entry.id} className="hover:bg-[var(--color-paper-3)] transition-opacity">
                    <td className="py-2 px-3 text-[var(--color-ink-muted)] whitespace-nowrap">
                      {entry.timestamp.replace('T', ' ').slice(0, 19)}
                    </td>
                    <td className="py-2 px-3 font-semibold text-[var(--color-accent)]">
                      {entry.entityType}
                    </td>
                    <td className="py-2 px-3">
                      <span className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                        entry.action === 'create'
                          ? 'bg-[var(--color-status-on-track-bg)] text-[var(--color-status-on-track)]'
                          : entry.action === 'soft_delete'
                          ? 'bg-[var(--color-status-behind-bg)] text-[var(--color-status-behind)]'
                          : 'bg-[var(--color-paper-3)] text-[var(--color-ink)]'
                      }`}>
                        {entry.action.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-[var(--color-ink)] max-w-xs truncate">
                      {entry.fieldChanged ? (
                        <span>
                          <span className="text-[var(--color-ink-muted)]">{entry.fieldChanged}: </span>
                          <span className="line-through opacity-70">{JSON.stringify(entry.oldValue)}</span>
                          <span className="mx-1">→</span>
                          <span className="text-[var(--color-accent)] font-semibold">{JSON.stringify(entry.newValue)}</span>
                        </span>
                      ) : (
                        <span>{JSON.stringify(entry.newValue || { id: entry.entityId })}</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-[var(--color-ink-muted)] max-w-xs truncate">
                      {entry.reason || 'No reason recorded'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
