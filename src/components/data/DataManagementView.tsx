import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { seedDatabase } from '../../db/seedData';
import { domainService } from '../../services/domainService';
import { RecoveryBinPanel } from './RecoveryBinPanel';
import { DataExportPanel } from './DataExportPanel';
import { DataImportPanel } from './DataImportPanel';
import { SnapshotsPanel } from './SnapshotsPanel';
import { PrivacySecurityPanel } from './PrivacySecurityPanel';
import {
  Database,
  Trash2,
  Download,
  Upload,
  Camera,
  History,
  Shield,
  RotateCcw,
  AlertCircle,
  Plus,
} from 'lucide-react';

export type DataSubTab =
  | 'overview'
  | 'recovery'
  | 'export'
  | 'import'
  | 'backups'
  | 'changelog'
  | 'privacy';

export const DataManagementView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<DataSubTab>('overview');
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

  // Recovery bin count (soft-deleted items)
  const deletedTasks = useLiveQuery(() => db.tasks.filter((t) => Boolean(t.isDeleted)).count(), []) || 0;
  const deletedProjects = useLiveQuery(() => db.projects.filter((p) => Boolean(p.isDeleted)).count(), []) || 0;
  const deletedTargets = useLiveQuery(() => db.targets.filter((t) => Boolean(t.isDeleted)).count(), []) || 0;
  const totalRecoveryBinCount = deletedTasks + deletedProjects + deletedTargets;

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
      const activeTarget = targets?.find((t) => t.id === 'tgt_month_11_techniques');
      if (activeTarget) {
        await domainService.updateTargetProgress(activeTarget.id, 1, 'Logged 1 simulated technique via Storage Inspector test');
        notify(`Progress updated for ${activeTarget.title}.`);
      } else {
        notify('No sample target found. Restore sample data to begin.');
      }
    } catch (err: unknown) {
      notify(`Mutation error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const filteredChangeLogs = (changeLogs ?? []).filter((c) => {
    if (selectedEntityFilter === 'all') return true;
    return c.entityType === selectedEntityFilter;
  });

  const subTabs: { id: DataSubTab; label: string; icon: React.FC<{ className?: string }>; badge?: number }[] = [
    { id: 'overview', label: 'Database Ledger', icon: Database },
    { id: 'recovery', label: 'Recovery Bin', icon: Trash2, badge: totalRecoveryBinCount },
    { id: 'export', label: 'Export Data', icon: Download },
    { id: 'import', label: 'Bulk Import', icon: Upload },
    { id: 'backups', label: 'Snapshots', icon: Camera },
    { id: 'changelog', label: 'Change History', icon: History },
    { id: 'privacy', label: 'Privacy & Security', icon: Shield },
  ];

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full pb-16">
      {/* 1. Master Header Strip */}
      <div className="surface-card rounded-[var(--radius-sm)] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-[var(--color-rule)]">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[var(--color-paper-3)] border border-[var(--color-rule)] rounded-[var(--radius-xs)]">
            <Database className="w-5 h-5 text-[var(--color-accent)]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-semibold text-sm text-[var(--color-ink)]">
                Data Ownership, Export & Recovery
              </h1>
              <span className="text-[11px] font-mono px-1.5 py-0.2 bg-[var(--color-paper-3)] border border-[var(--color-rule)] rounded text-[var(--color-accent)]">
                Local-First
              </span>
            </div>
            <p className="text-xs text-[var(--color-ink-muted)]">
              PRD Section 6.8 & 6.1 (DT-1 to DT-7): Full data control, multi-format export, soft-delete recovery bin, and immutable change history.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleSeed(true)}
            className="min-h-11 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[var(--color-paper-3)] hover:bg-[var(--color-rule)] border border-[var(--color-rule)] rounded-[var(--radius-xs)] text-[var(--color-ink)] transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Seed Sample Plans</span>
          </button>
          <button
            type="button"
            onClick={handleTestMutation}
            className="min-h-11 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[var(--color-accent)] text-[var(--color-accent-ink)] rounded-[var(--radius-xs)] hover:opacity-90 transition-opacity"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Test Progress Log</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 bg-[var(--color-paper-2)] border border-[var(--color-rule)] rounded-[var(--radius-xs)] flex items-center gap-2 text-xs font-mono text-[var(--color-accent)]">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* 2. Sub-Tab Navigation Bar */}
      <div className="flex items-center gap-1 overflow-x-auto p-1 surface-card rounded-[var(--radius-sm)] border border-[var(--color-rule)] select-none">
        {subTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-xs)] text-xs font-medium whitespace-nowrap transition-colors min-h-8 ${
                isActive
                  ? 'bg-[var(--color-paper-3)] text-[var(--color-ink)] font-semibold shadow-xs'
                  : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper-2)]'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[var(--color-accent)]' : ''}`} />
              <span>{tab.label}</span>
              {Boolean(tab.badge && tab.badge > 0) && (
                <span className="px-1.5 py-0.2 rounded-full font-mono text-[10px] bg-[var(--color-rose)]/15 text-[var(--color-rose)] font-bold">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 3. Sub-Tab Panes */}
      <div className="flex flex-col">
        {/* Overview: Database Entity Ledger */}
        {activeTab === 'overview' && (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {[
                { label: 'Projects & Goals', count: counts.projects, entity: 'project' },
                { label: 'Milestones & Phases', count: counts.milestones, entity: 'milestone' },
                { label: 'Horizon Targets', count: counts.targets, entity: 'target' },
                { label: 'Active Tasks', count: counts.tasks, entity: 'task' },
                { label: 'Habits & Routines', count: counts.habits + counts.routines, entity: 'habit' },
                { label: 'Progress Logs', count: counts.progressLogs, entity: 'log' },
                { label: 'Life Areas', count: counts.areas, entity: 'area' },
                { label: 'Immutable Changes', count: counts.changeLogs, entity: 'change' },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="surface-card rounded-[var(--radius-xs)] p-3.5 border border-[var(--color-rule)] flex flex-col justify-between"
                >
                  <span className="text-[11px] text-[var(--color-ink-muted)] truncate">{item.label}</span>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="tabular-figure font-mono text-lg font-bold text-[var(--color-ink)]">
                      {isLoading ? '…' : item.count}
                    </span>
                    <span className="text-[10px] font-mono text-[var(--color-ink-muted)] uppercase">
                      active records
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Actions Card */}
            <div className="surface-card rounded-[var(--radius-sm)] p-4 border border-[var(--color-rule)] flex flex-col gap-3">
              <span className="font-semibold text-xs text-[var(--color-ink)] uppercase tracking-wider">
                Data Management Quick Actions
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab('recovery')}
                  className="p-3 surface-well rounded-[var(--radius-xs)] border border-[var(--color-rule)] flex flex-col items-start gap-1 hover:border-[var(--color-accent)] transition-colors text-left"
                >
                  <div className="flex items-center gap-1.5 font-semibold text-[var(--color-ink)]">
                    <Trash2 className="w-3.5 h-3.5 text-[var(--color-rose)]" />
                    <span>Recovery Bin</span>
                  </div>
                  <span className="text-[11px] text-[var(--color-ink-muted)]">
                    {totalRecoveryBinCount} soft-deleted items available to restore.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('export')}
                  className="p-3 surface-well rounded-[var(--radius-xs)] border border-[var(--color-rule)] flex flex-col items-start gap-1 hover:border-[var(--color-accent)] transition-colors text-left"
                >
                  <div className="flex items-center gap-1.5 font-semibold text-[var(--color-ink)]">
                    <Download className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                    <span>Export Everything</span>
                  </div>
                  <span className="text-[11px] text-[var(--color-ink-muted)]">
                    Download complete JSON, Markdown field ledger, or CSV tables.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('backups')}
                  className="p-3 surface-well rounded-[var(--radius-xs)] border border-[var(--color-rule)] flex flex-col items-start gap-1 hover:border-[var(--color-accent)] transition-colors text-left"
                >
                  <div className="flex items-center gap-1.5 font-semibold text-[var(--color-ink)]">
                    <Camera className="w-3.5 h-3.5 text-[var(--color-emerald)]" />
                    <span>Snapshot Backups</span>
                  </div>
                  <span className="text-[11px] text-[var(--color-ink-muted)]">
                    Create automated and manual offline restore points.
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Recovery Bin Panel */}
        {activeTab === 'recovery' && <RecoveryBinPanel onNotify={notify} />}

        {/* Export Center Panel */}
        {activeTab === 'export' && <DataExportPanel onNotify={notify} />}

        {/* Import Center Panel */}
        {activeTab === 'import' && <DataImportPanel onNotify={notify} />}

        {/* Local Snapshot Backups Panel */}
        {activeTab === 'backups' && <SnapshotsPanel onNotify={notify} />}

        {/* Change History Explorer */}
        {activeTab === 'changelog' && (
          <div className="surface-card rounded-[var(--radius-sm)] border border-[var(--color-rule)] flex flex-col overflow-hidden">
            <div className="p-3 bg-[var(--color-paper-2)] hairline-b flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-[var(--color-accent)]" />
                <span className="text-xs font-semibold text-[var(--color-ink)]">Change history</span>
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
              </div>
            </div>

            {/* Change Log Table */}
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="hairline-b bg-[var(--color-paper-2)] text-[var(--color-ink-muted)] text-xs font-mono">
                    <th className="py-2.5 px-3 w-36">Time (UTC)</th>
                    <th className="py-2.5 px-3 w-28">Record</th>
                    <th className="py-2.5 px-3 w-28">Action</th>
                    <th className="py-2.5 px-3">Changed value</th>
                    <th className="py-2.5 px-3">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-rule)] text-[11px]">
                  {isLoading ? (
                    <tr><td colSpan={5} className="py-6 text-center text-[var(--color-ink-muted)]">Loading change history…</td></tr>
                  ) : filteredChangeLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-[var(--color-ink-muted)]">
                        No changes for this selection.
                      </td>
                    </tr>
                  ) : (
                    filteredChangeLogs.map((entry) => (
                      <tr key={entry.id} className="hover:bg-[var(--color-paper-2)]/60 transition-colors">
                        <td className="py-2.5 px-3 text-[var(--color-ink-muted)] whitespace-nowrap font-mono">
                          {entry.timestamp.replace('T', ' ').slice(0, 19)}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-[var(--color-accent)] font-mono">
                          {entry.entityType}
                        </td>
                        <td className="py-2.5 px-3 font-mono">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            entry.action === 'create'
                              ? 'bg-[var(--color-emerald)]/10 text-[var(--color-emerald)]'
                              : entry.action === 'soft_delete'
                              ? 'bg-[var(--color-rose)]/10 text-[var(--color-rose)]'
                              : 'bg-[var(--color-paper-3)] text-[var(--color-ink)]'
                          }`}>
                            {entry.action.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-[var(--color-ink)] max-w-xs truncate font-mono text-[10px]">
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
                        <td className="py-2.5 px-3 text-[var(--color-ink-muted)] max-w-xs truncate">
                          {entry.reason || 'No reason recorded'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Privacy & Security Panel */}
        {activeTab === 'privacy' && <PrivacySecurityPanel onNotify={notify} />}
      </div>
    </div>
  );
};
