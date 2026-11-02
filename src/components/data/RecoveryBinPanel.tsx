import React, { useState, useEffect } from 'react';
import { RecoveryBinItem } from '../../types';
import { dataOwnershipService } from '../../services/dataOwnershipService';
import {
  Trash2,
  RotateCcw,
  CheckCircle2,
  Filter,
} from 'lucide-react';

interface RecoveryBinPanelProps {
  onNotify: (msg: string) => void;
}

export const RecoveryBinPanel: React.FC<RecoveryBinPanelProps> = ({ onNotify }) => {
  const [items, setItems] = useState<RecoveryBinItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const loadItems = async () => {
    try {
      setLoading(true);
      const data = await dataOwnershipService.getRecoveryBinItems();
      setItems(data);
    } catch (err: unknown) {
      onNotify(`Failed to load recovery bin: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const handleRestore = async (item: RecoveryBinItem) => {
    try {
      setActionLoadingId(item.id);
      await dataOwnershipService.restoreItem(item.entityType, item.id);
      onNotify(`Restored ${item.entityType}: "${item.title}"`);
      await loadItems();
    } catch (err: unknown) {
      onNotify(`Restore error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handlePermanentDelete = async (item: RecoveryBinItem) => {
    if (!window.confirm(`Delete “${item.title}” permanently? This cannot be undone.`)) return;

    try {
      setActionLoadingId(item.id);
      await dataOwnershipService.permanentDeleteItem(item.entityType, item.id);
      onNotify(`Permanently deleted "${item.title}"`);
      await loadItems();
    } catch (err: unknown) {
      onNotify(`Delete error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleEmptyBin = async () => {
    if (items.length === 0) return;
    if (!window.confirm(`Delete all ${items.length} recently deleted items permanently? This cannot be undone.`)) return;

    try {
      setLoading(true);
      const count = await dataOwnershipService.emptyRecoveryBin();
      onNotify(`Permanently purged ${count} items from the Recovery Bin.`);
      await loadItems();
    } catch (err: unknown) {
      onNotify(`Empty bin error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter((item) => {
    if (selectedFilter === 'all') return true;
    return item.entityType === selectedFilter;
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Top Controls Bar */}
      <div className="surface-card rounded-[var(--radius-sm)] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-[var(--color-rule)]">
        <div className="flex items-center gap-2.5">
          <Trash2 className="w-4 h-4 text-[var(--color-status-behind)]" />
          <div className="flex flex-col">
            <h3 className="text-xs font-bold text-[var(--color-ink)] ">
              Recently deleted
            </h3>
            <span className="text-[11px] text-[var(--color-ink-muted)]">
              Soft-deleted items are held here safely until restored or permanently erased.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Entity Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <Filter className="w-3.5 h-3.5 text-[var(--color-ink-muted)]" />
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
              className="bg-[var(--color-paper-2)] border border-[var(--color-rule)] rounded-[var(--radius-xs)] px-2 py-1 text-xs text-[var(--color-ink)]"
            >
              <option value="all">All types ({items.length})</option>
              <option value="project">Projects</option>
              <option value="milestone">Milestones</option>
              <option value="target">Targets</option>
              <option value="task">Tasks</option>
              <option value="habit">Habits</option>
              <option value="routine">Routines</option>
            </select>
          </div>

          {items.length > 0 && (
            <button
              type="button"
              onClick={handleEmptyBin}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-[var(--radius-xs)] border border-[var(--color-status-behind)]/30 text-[var(--color-status-behind)] hover:bg-[var(--color-status-behind)]/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete all</span>
            </button>
          )}
        </div>
      </div>

      {/* Recovery Bin Table */}
      <div className="surface-card rounded-[var(--radius-sm)] border border-[var(--color-rule)] overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-xs text-[var(--color-ink-muted)] font-mono">
            Checking recently deleted items…
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-center">
            <CheckCircle2 className="w-8 h-8 text-[var(--color-emerald)] stroke-1" />
            <span className="text-xs font-semibold text-[var(--color-ink)]">
              Nothing has been deleted
            </span>
            <span className="text-[11px] text-[var(--color-ink-muted)] max-w-sm">
              Deleted projects, goals, tasks, and habits stay here so you can restore them.
            </span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="hairline-b bg-[var(--color-paper-2)] text-[11px] font-mono text-[var(--color-ink-muted)]">
                  <th className="py-2.5 px-3">Name</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Deleted</th>
                  <th className="py-2.5 px-3">Why it was deleted</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-rule)] text-[11px]">
                {filteredItems.map((item) => {
                  const isBusy = actionLoadingId === item.id;
                  return (
                    <tr key={item.id} className="hover:bg-[var(--color-paper-2)]/60 transition-colors">
                      {/* Title */}
                      <td className="py-2.5 px-3 font-semibold text-[var(--color-ink)]">
                        {item.title}
                      </td>

                      {/* Type Badge */}
                      <td className="py-2.5 px-3 font-mono">
                        <span className="px-1.5 py-0.5 rounded-[var(--radius-xs)] bg-[var(--color-paper-3)] border border-[var(--color-rule)] text-[10px]  text-[var(--color-ink)]">
                          {item.entityType}
                        </span>
                      </td>

                      {/* Deleted Timestamp */}
                      <td className="py-2.5 px-3 font-mono text-[var(--color-ink-muted)] whitespace-nowrap">
                        {item.deletedAt.replace('T', ' ').slice(0, 16)}
                      </td>

                      {/* Reason */}
                      <td className="py-2.5 px-3 text-[var(--color-ink-muted)] max-w-xs truncate">
                        {item.reason || 'No reason specified'}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleRestore(item)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[var(--radius-xs)] border border-[var(--color-rule)] bg-[var(--color-paper)] hover:bg-[var(--color-paper-3)] text-[var(--color-accent)] font-medium transition-colors disabled:opacity-50"
                            title="Restore this item back to active plans"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Restore</span>
                          </button>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handlePermanentDelete(item)}
                            className="p-1 rounded-[var(--radius-xs)] text-[var(--color-ink-muted)] hover:text-[var(--color-status-behind)] transition-colors disabled:opacity-50"
                          title="Delete permanently"
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
