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
  const projects = useLiveQuery(() => db.projects.where('isDeleted').equals(0).toArray(), []);
  const milestones = useLiveQuery(() => db.milestones.where('isDeleted').equals(0).toArray(), []);
  const targets = useLiveQuery(() => db.targets.where('isDeleted').equals(0).toArray(), []);
  const tasks = useLiveQuery(() => db.tasks.where('isDeleted').equals(0).toArray(), []);
  const habits = useLiveQuery(() => db.habits.where('isDeleted').equals(0).toArray(), []);
  const routines = useLiveQuery(() => db.routines.where('isDeleted').equals(0).toArray(), []);
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

  const notify = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleSeed = async (force: boolean) => {
    try {
      await seedDatabase(force);
      notify(force ? 'Database reset and re-seeded with Heimdall SOC Lab data.' : 'Database seeded successfully.');
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
        notify(`Target updated: ${activeTarget.title} (+1 logged)`);
      } else {
        notify('Active target not found. Please click "Seed Real Data" first.');
      }
    } catch (err: unknown) {
      notify(`Mutation error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleTestDropWithoutReason = async () => {
    try {
      const task = tasks?.[0];
      if (task) {
        // Should throw per PRD TR-3
        await domainService.setTaskStatus(task.id, 'dropped');
      }
    } catch (err: unknown) {
      notify(`Expected TR-3 validation caught: ${err instanceof Error ? err.message : String(err)}`);
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
              <h3 className="font-semibold text-sm">IndexedDB Local Storage & Change Log Engine</h3>
              <span className="font-mono text-[11px] px-1.5 py-0.2 bg-[var(--color-paper-3)] border border-[var(--color-rule)] rounded text-[var(--color-accent)]">
                Dexie v4 · Offline
              </span>
            </div>
            <p className="text-xs text-[var(--color-ink-muted)]">
              All writes append an immutable record to the change log for auditability, conflict-free sync, and undo.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleSeed(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[var(--color-paper-3)] hover:bg-[var(--color-rule)] border border-[var(--color-rule)] rounded-[var(--radius-xs)] text-[var(--color-ink)]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset / Re-Seed Data</span>
          </button>
          <button
            type="button"
            onClick={handleTestMutation}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[var(--color-accent)] text-[var(--color-accent-ink)] rounded-[var(--radius-xs)] hover:opacity-90"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Log Test Technique (+1)</span>
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
          { label: 'Phases & Milestones', count: counts.milestones, entity: 'milestone' },
          { label: 'Targets (M/W/D)', count: counts.targets, entity: 'target' },
          { label: 'Tasks & Subtasks', count: counts.tasks, entity: 'task' },
          { label: 'Habits & Routines', count: counts.habits + counts.routines, entity: 'habit' },
          { label: 'Progress Logs', count: counts.progressLogs, entity: 'log' },
          { label: 'Life Areas', count: counts.areas, entity: 'area' },
          { label: 'Total Change Logs', count: counts.changeLogs, entity: 'change' },
        ].map((item, idx) => (
          <div
            key={idx}
            className="surface-card rounded-[var(--radius-xs)] p-3 flex flex-col justify-between"
          >
            <span className="text-[11px] text-[var(--color-ink-muted)] truncate">{item.label}</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="tabular-figure font-mono text-lg font-semibold text-[var(--color-ink)]">
                {item.count}
              </span>
              <span className="text-[10px] text-[var(--color-ink-subtle)] font-mono">stored</span>
            </div>
          </div>
        ))}
      </div>

      {/* Immutable Append-Only Change Log Explorer */}
      <div className="surface-card rounded-[var(--radius-sm)] flex flex-col overflow-hidden">
        <div className="p-3 bg-[var(--color-paper-2)] hairline-b flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[var(--color-accent)]" />
            <span className="text-xs font-semibold">Append-Only Change Log (PRD Section 10.3)</span>
            <span className="tabular-figure font-mono text-[11px] text-[var(--color-ink-muted)]">
              ({filteredChangeLogs.length} events)
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-[var(--color-ink-muted)] text-[11px]">Filter:</span>
            <select
              value={selectedEntityFilter}
              onChange={(e) => setSelectedEntityFilter(e.target.value)}
              className="bg-[var(--color-paper)] border border-[var(--color-rule)] rounded-[var(--radius-xs)] px-2 py-1 text-xs text-[var(--color-ink)]"
            >
              <option value="all">All Entities</option>
              <option value="project">Project</option>
              <option value="milestone">Milestone</option>
              <option value="target">Target</option>
              <option value="task">Task</option>
              <option value="habit">Habit</option>
            </select>

            <button
              type="button"
              onClick={handleTestDropWithoutReason}
              className="px-2 py-1 text-[11px] border border-[var(--color-rule)] rounded-[var(--radius-xs)] hover:bg-[var(--color-paper-3)] text-[var(--color-ink-muted)]"
              title="Tests PRD TR-3: Dropping requires an explicit reason"
            >
              Test TR-3 Drop Guard
            </button>
          </div>
        </div>

        {/* Change Log Table */}
        <div className="overflow-x-auto max-h-80">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="hairline-b bg-[var(--color-paper-2)] text-[var(--color-ink-muted)] font-mono text-[11px]">
                <th className="py-2 px-3 w-32">Timestamp (UTC)</th>
                <th className="py-2 px-3 w-24">Entity</th>
                <th className="py-2 px-3 w-24">Action</th>
                <th className="py-2 px-3">Diff / Values</th>
                <th className="py-2 px-3">Reason / Audit Trail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-rule)] font-mono text-[11px]">
              {filteredChangeLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-[var(--color-ink-muted)]">
                    No change log entries found. Click "Reset / Re-Seed Data" to populate.
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
                      <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold ${
                        entry.action === 'create'
                          ? 'bg-[var(--color-status-on-track-bg)] text-[var(--color-status-on-track)]'
                          : entry.action === 'soft_delete'
                          ? 'bg-[var(--color-status-behind-bg)] text-[var(--color-status-behind)]'
                          : 'bg-[var(--color-paper-3)] text-[var(--color-ink)]'
                      }`}>
                        {entry.action}
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
                      {entry.reason || '—'}
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
