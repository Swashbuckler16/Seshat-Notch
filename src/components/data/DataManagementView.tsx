import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { seedDatabase } from '../../db/seedData';
import { RecoveryBinPanel } from './RecoveryBinPanel';
import { DataExportPanel } from './DataExportPanel';
import { DataImportPanel } from './DataImportPanel';
import { SnapshotsPanel } from './SnapshotsPanel';
import { PrivacySecurityPanel } from './PrivacySecurityPanel';
import {
  Trash2,
  Download,
  Upload,
  Camera,
  Shield,
  RotateCcw,
  AlertCircle,
  Settings,
} from 'lucide-react';

export type DataSubTab =
  | 'export'
  | 'import'
  | 'backups'
  | 'recovery'
  | 'privacy';

export const DataManagementView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<DataSubTab>('export');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Recovery bin count (soft-deleted items)
  const deletedTasks = useLiveQuery(() => db.tasks.filter((t) => Boolean(t.isDeleted)).count(), []) || 0;
  const deletedProjects = useLiveQuery(() => db.projects.filter((p) => Boolean(p.isDeleted)).count(), []) || 0;
  const deletedTargets = useLiveQuery(() => db.targets.filter((t) => Boolean(t.isDeleted)).count(), []) || 0;
  const totalRecoveryBinCount = deletedTasks + deletedProjects + deletedTargets;

  const notify = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleSeed = async () => {
    if (!window.confirm('This will load the example workspace plan into your database. Continue?')) return;
    try {
      await seedDatabase(true);
      notify('Example plan successfully loaded.');
    } catch (err: unknown) {
      notify(`Load error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const subTabs: { id: DataSubTab; label: string; icon: React.FC<{ className?: string }>; badge?: number }[] = [
    { id: 'export', label: 'Export Data', icon: Download },
    { id: 'import', label: 'Import & Restore', icon: Upload },
    { id: 'backups', label: 'Snapshots', icon: Camera },
    { id: 'recovery', label: 'Recovery Bin', icon: Trash2, badge: totalRecoveryBinCount },
    { id: 'privacy', label: 'Privacy & Security', icon: Shield },
  ];

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full pb-16">
      {/* 1. Header Strip */}
      <div className="surface-card rounded-[var(--radius-sm)] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-[var(--color-rule)]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[var(--color-paper-3)] border border-[var(--color-rule)] rounded-[var(--radius-xs)]">
            <Settings className="w-5 h-5 text-[var(--color-accent)]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-semibold text-sm text-[var(--color-ink)]">
                Settings & Data Ownership
              </h1>
              <span className="text-[11px] font-mono px-1.5 py-0.2 bg-[var(--color-paper-3)] border border-[var(--color-rule)] rounded text-[var(--color-accent)]">
                Local-First
              </span>
            </div>
            <p className="text-xs text-[var(--color-ink-muted)]">
              Your data belongs completely to you. Kept offline in your browser with multi-format export, restore, and snapshot backups.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSeed}
            className="min-h-11 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[var(--color-paper-3)] hover:bg-[var(--color-paper-2)] border border-[var(--color-rule)] rounded-[var(--radius-xs)] text-[var(--color-ink)] transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[var(--color-accent)]" />
            <span>Load Example Plan</span>
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
              className={`flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius-xs)] text-xs font-medium whitespace-nowrap transition-colors min-h-11 sm:min-h-8 ${
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
        {activeTab === 'export' && (
          <DataExportPanel onNotify={notify} />
        )}

        {activeTab === 'import' && (
          <DataImportPanel onNotify={notify} />
        )}

        {activeTab === 'backups' && (
          <SnapshotsPanel onNotify={notify} />
        )}

        {activeTab === 'recovery' && (
          <RecoveryBinPanel onNotify={notify} />
        )}

        {activeTab === 'privacy' && (
          <PrivacySecurityPanel onNotify={notify} />
        )}
      </div>
    </div>
  );
};
