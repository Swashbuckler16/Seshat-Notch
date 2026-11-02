import React, { useState, useEffect } from 'react';
import { BackupSnapshot } from '../../types';
import { dataOwnershipService } from '../../services/dataOwnershipService';
import {
  ShieldCheck,
  Camera,
  RotateCcw,
  Trash2,
  HardDriveDownload,
} from 'lucide-react';

interface SnapshotsPanelProps {
  onNotify: (msg: string) => void;
  onRefresh?: () => void;
}

export const SnapshotsPanel: React.FC<SnapshotsPanelProps> = ({ onNotify, onRefresh }) => {
  const [snapshots, setSnapshots] = useState<BackupSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [savingToFile, setSavingToFile] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [lastFileBackup, setLastFileBackup] = useState<string | null>(() =>
    dataOwnershipService.getLastFileBackupDate()
  );
  const [dailyPromptEnabled, setDailyPromptEnabled] = useState<boolean>(() =>
    dataOwnershipService.isDailyBackupPromptEnabled()
  );

  const handleToggleDailyPrompt = (enabled: boolean) => {
    setDailyPromptEnabled(enabled);
    dataOwnershipService.setDailyBackupPromptEnabled(enabled);
    onNotify(
      enabled
        ? 'Daily backup prompt on Today enabled.'
        : 'Daily backup prompt on Today disabled.'
    );
  };

  const loadSnapshots = async () => {
    try {
      setLoading(true);
      const data = await dataOwnershipService.listSnapshotBackups();
      setSnapshots(data);
    } catch (err: unknown) {
      onNotify(`Failed to list snapshots: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSnapshots();
  }, []);

  const handleSaveBackupFile = async () => {
    try {
      setSavingToFile(true);
      const res = await dataOwnershipService.saveBackupToLocalFile();
      if (res.saved) {
        setLastFileBackup(dataOwnershipService.getLastFileBackupDate());
        onNotify(`Saved local backup file: ${res.filename}`);
      }
    } catch (err: unknown) {
      onNotify(`File backup error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSavingToFile(false);
    }
  };

  const handleCreateSnapshot = async () => {
    try {
      setCreating(true);
      const nowStr = new Date().toLocaleTimeString();
      const snap = await dataOwnershipService.createSnapshotBackup(`Manual snapshot (${nowStr})`, false);
      onNotify(`Created snapshot with ${snap.itemCount} items.`);
      await loadSnapshots();
    } catch (err: unknown) {
      onNotify(`Snapshot error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setCreating(false);
    }
  };

  const handleRestoreSnapshot = async (snap: BackupSnapshot) => {
    if (
      !window.confirm(
        `Replace your current plans with “${snap.name}” from ${snap.timestamp.replace('T', ' ').slice(0, 16)}? A copy of your current plans will be saved first.`
      )
    ) {
      return;
    }

    try {
      setRestoringId(snap.id);
      await dataOwnershipService.restoreSnapshotBackup(snap.id);
        onNotify(`Restored backup: “${snap.name}”`);
      await loadSnapshots();
      onRefresh?.();
    } catch (err: unknown) {
      onNotify(`Restore error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setRestoringId(null);
    }
  };

  const handleDeleteSnapshot = async (snap: BackupSnapshot) => {
    if (!window.confirm(`Delete backup “${snap.name}”?`)) return;

    try {
      await dataOwnershipService.deleteSnapshotBackup(snap.id);
      onNotify(`Deleted snapshot: "${snap.name}"`);
      await loadSnapshots();
    } catch (err: unknown) {
      onNotify(`Delete error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Daily Local Disk File Backup Card */}
      <div className="surface-card rounded-[var(--radius-sm)] p-4 border border-[var(--color-rule)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <HardDriveDownload className="w-4 h-4 text-[var(--color-accent)]" />
          <div className="flex flex-col gap-1">
            <h3 className="text-xs font-bold text-[var(--color-ink)] ">
              Daily Backup to Local File (.json)
            </h3>
            <span className="text-xs text-[var(--color-ink-muted)]">
              Saves all plans, logs, and settings (including day rollover and reminder preferences) to disk.
              {lastFileBackup ? ` Last saved to your computer: ${lastFileBackup}.` : ' No backup file saved to your computer yet.'}
            </span>
            <label className="inline-flex items-center gap-2 text-xs text-[var(--color-ink)] cursor-pointer mt-0.5">
              <input
                type="checkbox"
                checked={dailyPromptEnabled}
                onChange={(e) => handleToggleDailyPrompt(e.target.checked)}
                className="accent-[var(--color-accent)]"
              />
              <span>Show daily &ldquo;Backup due&rdquo; prompt on Today when not yet saved</span>
            </label>
          </div>
        </div>

        <button
          type="button"
          disabled={savingToFile}
          onClick={handleSaveBackupFile}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-xs)] bg-[var(--color-accent)] text-[var(--color-accent-ink)] text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50 min-h-9 whitespace-nowrap"
        >
          <HardDriveDownload className="w-3.5 h-3.5" />
          <span>{savingToFile ? 'Saving…' : 'Save Backup to File…'}</span>
        </button>
      </div>

      {/* Top Banner for In-Browser Snapshots */}
      <div className="surface-card rounded-[var(--radius-sm)] p-4 border border-[var(--color-rule)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-4 h-4 text-[var(--color-accent)]" />
          <div className="flex flex-col">
            <h3 className="text-xs font-bold text-[var(--color-ink)] ">
              Saved backups
            </h3>
            <span className="text-xs text-[var(--color-ink-muted)]">
              Seshat saves backup copies automatically before important changes. You can also save one yourself.
            </span>
          </div>
        </div>

        <button
          type="button"
          disabled={creating}
          onClick={handleCreateSnapshot}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-xs)] border border-[var(--color-rule)] bg-[var(--color-paper-2)] hover:bg-[var(--color-paper-3)] text-[var(--color-ink)] text-xs font-medium transition-colors disabled:opacity-50 min-h-9 whitespace-nowrap"
        >
          <Camera className="w-3.5 h-3.5 text-[var(--color-accent)]" />
          <span>{creating ? 'Saving…' : 'Save a backup now'}</span>
        </button>
      </div>

      {/* Snapshot List */}
      <div className="surface-card rounded-[var(--radius-sm)] border border-[var(--color-rule)] overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-xs text-[var(--color-ink-muted)] font-mono">
            Loading backups…
          </div>
        ) : snapshots.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-center">
            <Camera className="w-8 h-8 text-[var(--color-ink-muted)] stroke-1" />
            <span className="text-xs font-semibold text-[var(--color-ink)]">
              No backups saved yet
            </span>
            <span className="text-xs text-[var(--color-ink-muted)] max-w-sm">
              Save a backup now. Seshat will also save copies before important changes.
            </span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="hairline-b bg-[var(--color-paper-2)] text-xs font-mono text-[var(--color-ink-muted)]">
                  <th className="py-2.5 px-3">Backup name</th>
                  <th className="py-2.5 px-3">Date saved</th>
                  <th className="py-2.5 px-3">Saved by</th>
                  <th className="py-2.5 px-3">Items included</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-rule)] text-xs">
                {snapshots.map((snap) => {
                  const isRestoring = restoringId === snap.id;
                  return (
                    <tr key={snap.id} className="hover:bg-[var(--color-paper-2)]/60 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-[var(--color-ink)]">
                          {snap.name.replace(/^Manual snapshot/, 'Saved backup')}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[var(--color-ink-muted)] whitespace-nowrap">
                        {snap.timestamp.replace('T', ' ').slice(0, 16)}
                      </td>
                      <td className="py-2.5 px-3 font-mono">
                        <span
                          className={`px-1.5 py-0.5 rounded-[var(--radius-xs)] text-[11px]  border ${
                            snap.isAutomated
                            ? 'bg-[var(--color-paper-3)] border-[var(--color-rule)] text-[var(--color-ink-muted)]'
                              : 'bg-[var(--color-accent)]/10 border-[var(--color-accent)]/30 text-[var(--color-accent)]'
                          }`}
                        >
                          {snap.isAutomated ? 'Automatic' : 'You'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono tabular-figure text-[var(--color-ink)]">
                          {snap.itemCount} items
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={isRestoring}
                            onClick={() => handleRestoreSnapshot(snap)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[var(--radius-xs)] border border-[var(--color-rule)] bg-[var(--color-paper)] hover:bg-[var(--color-paper-3)] text-[var(--color-accent)] font-medium transition-colors disabled:opacity-50"
                            title="Replace your current plans with this backup"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>{isRestoring ? 'Restoring…' : 'Restore'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSnapshot(snap)}
                            className="p-1 rounded-[var(--radius-xs)] text-[var(--color-ink-muted)] hover:text-[var(--color-status-behind)] transition-colors"
                            title="Delete this backup"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
