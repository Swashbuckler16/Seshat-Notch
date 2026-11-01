import React, { useState, useEffect } from 'react';
import { BackupSnapshot } from '../../types';
import { dataOwnershipService } from '../../services/dataOwnershipService';
import {
  ShieldCheck,
  Camera,
  RotateCcw,
  Trash2,
} from 'lucide-react';

interface SnapshotsPanelProps {
  onNotify: (msg: string) => void;
  onRefresh?: () => void;
}

export const SnapshotsPanel: React.FC<SnapshotsPanelProps> = ({ onNotify, onRefresh }) => {
  const [snapshots, setSnapshots] = useState<BackupSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

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
        `Restore snapshot "${snap.name}" from ${snap.timestamp.replace('T', ' ').slice(0, 16)}? Current data will be replaced (a pre-restore snapshot is automatically saved).`
      )
    ) {
      return;
    }

    try {
      setRestoringId(snap.id);
      await dataOwnershipService.restoreSnapshotBackup(snap.id);
      onNotify(`Restored snapshot: "${snap.name}"`);
      await loadSnapshots();
      onRefresh?.();
    } catch (err: unknown) {
      onNotify(`Restore error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setRestoringId(null);
    }
  };

  const handleDeleteSnapshot = async (snap: BackupSnapshot) => {
    if (!window.confirm(`Delete snapshot "${snap.name}"?`)) return;

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
      {/* Top Banner */}
      <div className="surface-card rounded-[var(--radius-sm)] p-4 border border-[var(--color-rule)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-4 h-4 text-[var(--color-accent)]" />
          <div className="flex flex-col">
            <h3 className="text-xs font-bold text-[var(--color-ink)] uppercase tracking-wider">
              Local Snapshot Backups
            </h3>
            <span className="text-[11px] text-[var(--color-ink-muted)]">
              Automated and manual snapshots stored securely in offline IndexedDB storage.
            </span>
          </div>
        </div>

        <button
          type="button"
          disabled={creating}
          onClick={handleCreateSnapshot}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-xs)] bg-[var(--color-accent)] text-[var(--color-accent-ink)] text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50 min-h-11"
        >
          <Camera className="w-3.5 h-3.5" />
          <span>{creating ? 'Saving…' : 'Take Manual Snapshot'}</span>
        </button>
      </div>

      {/* Snapshot List */}
      <div className="surface-card rounded-[var(--radius-sm)] border border-[var(--color-rule)] overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-xs text-[var(--color-ink-muted)] font-mono">
            Loading snapshots…
          </div>
        ) : snapshots.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-center">
            <Camera className="w-8 h-8 text-[var(--color-ink-muted)] stroke-1" />
            <span className="text-xs font-semibold text-[var(--color-ink)]">
              No snapshots saved yet
            </span>
            <span className="text-[11px] text-[var(--color-ink-muted)] max-w-sm">
              Take a manual snapshot or import data to create your first automatic safety restore point.
            </span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="hairline-b bg-[var(--color-paper-2)] text-[11px] font-mono text-[var(--color-ink-muted)]">
                  <th className="py-2.5 px-3">Snapshot Name</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Entity Count</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-rule)] text-[11px]">
                {snapshots.map((snap) => {
                  const isRestoring = restoringId === snap.id;
                  return (
                    <tr key={snap.id} className="hover:bg-[var(--color-paper-2)]/60 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-[var(--color-ink)]">
                        {snap.name}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[var(--color-ink-muted)] whitespace-nowrap">
                        {snap.timestamp.replace('T', ' ').slice(0, 16)}
                      </td>
                      <td className="py-2.5 px-3 font-mono">
                        <span
                          className={`px-1.5 py-0.5 rounded-[var(--radius-xs)] text-[10px] uppercase border ${
                            snap.isAutomated
                              ? 'bg-[var(--color-paper-3)] border-[var(--color-rule)] text-[var(--color-ink-muted)]'
                              : 'bg-[var(--color-accent)]/10 border-[var(--color-accent)]/30 text-[var(--color-accent)]'
                          }`}
                        >
                          {snap.isAutomated ? 'Auto-safety' : 'Manual'}
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
                            title="Restore database to this snapshot"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>{isRestoring ? 'Restoring…' : 'Restore'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSnapshot(snap)}
                            className="p-1 rounded-[var(--radius-xs)] text-[var(--color-ink-muted)] hover:text-[var(--color-rose)] transition-colors"
                            title="Delete this snapshot"
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
