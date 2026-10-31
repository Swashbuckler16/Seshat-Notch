import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { domainService } from '../../services/domainService';
import { Area, EntityId } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Folder, Plus, Archive, ChevronUp, ChevronDown, Check } from 'lucide-react';

interface AreaManagerProps {
  selectedAreaId: EntityId | 'all';
  onSelectArea: (id: EntityId | 'all') => void;
}

export const AreaManager: React.FC<AreaManagerProps> = ({ selectedAreaId, onSelectArea }) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newAreaName, setNewAreaName] = useState('');
  const [newAreaDesc, setNewAreaDesc] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  const areas = useLiveQuery(() => db.areas.orderBy('order').toArray(), []);
  const projects = useLiveQuery(() => db.projects.where('isDeleted').equals(0).toArray(), []);

  const filteredAreas = (areas || []).filter((a) => (showArchived ? true : !a.isArchived));

  const handleCreateArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAreaName.trim()) return;

    await domainService.createArea({
      name: newAreaName.trim(),
      description: newAreaDesc.trim() || undefined,
      order: (areas?.length || 0) + 1,
    });

    setNewAreaName('');
    setNewAreaDesc('');
    setIsAddModalOpen(false);
  };

  const handleMove = async (area: Area, direction: 'up' | 'down') => {
    if (!areas) return;
    const idx = areas.findIndex((a) => a.id === area.id);
    if (idx === -1) return;

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= areas.length) return;

    const reordered = [...areas];
    const temp = reordered[idx];
    reordered[idx] = reordered[swapIdx];
    reordered[swapIdx] = temp;

    await domainService.reorderAreas(reordered.map((a) => a.id));
  };

  const handleToggleArchive = async (area: Area) => {
    await domainService.archiveArea(area.id, !area.isArchived);
  };

  return (
    <div className="surface-card rounded-[var(--radius-sm)] flex flex-col p-3.5 gap-3">
      {/* Header */}
      <div className="flex items-center justify-between hairline-b pb-2.5">
        <div className="flex items-center gap-2">
          <Folder className="w-4 h-4 text-[var(--color-accent)]" />
          <h3 className="font-semibold text-xs tracking-tight uppercase text-[var(--color-ink-muted)]">
            Life Areas (PL-1)
          </h3>
        </div>
        <Button size="sm" variant="ghost" onClick={() => setIsAddModalOpen(true)} title="Add Area">
          <Plus className="w-3.5 h-3.5" />
          <span>New Area</span>
        </Button>
      </div>

      {/* Area Pills List */}
      <div className="flex flex-col gap-1">
        {/* All Areas Option */}
        <button
          type="button"
          onClick={() => onSelectArea('all')}
          className={`px-2.5 py-1.5 rounded-[var(--radius-xs)] text-xs flex items-center justify-between cursor-pointer transition-opacity ${
            selectedAreaId === 'all'
              ? 'bg-[var(--color-accent)] text-[var(--color-accent-ink)] font-semibold'
              : 'hover:bg-[var(--color-paper-2)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
          }`}
        >
          <span>All Life Areas</span>
          <span className="font-mono text-[11px] tabular-figure opacity-80">
            {projects?.length ?? 0}
          </span>
        </button>

        {filteredAreas.map((area, idx) => {
          const isSelected = selectedAreaId === area.id;
          const count = (projects || []).filter((p) => p.areaId === area.id).length;

          return (
            <div
              key={area.id}
              className={`group px-2.5 py-1.5 rounded-[var(--radius-xs)] text-xs flex items-center justify-between cursor-pointer transition-opacity ${
                isSelected
                  ? 'bg-[var(--color-paper-3)] text-[var(--color-ink)] font-semibold border border-[var(--color-rule-strong)]'
                  : 'hover:bg-[var(--color-paper-2)] text-[var(--color-ink)]'
              }`}
            >
              <div
                className="flex items-center gap-2 flex-1 truncate"
                onClick={() => onSelectArea(area.id)}
              >
                <span className="truncate">{area.name}</span>
                {area.isArchived && (
                  <span className="text-[10px] font-mono px-1 rounded bg-[var(--color-paper-3)] text-[var(--color-ink-subtle)]">
                    archived
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <span className="font-mono text-[11px] tabular-figure text-[var(--color-ink-muted)] mr-1">
                  {count}
                </span>

                {/* Reorder Buttons (Hover Only) */}
                <div className="hidden group-hover:flex items-center">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMove(area, 'up');
                    }}
                    className="p-0.5 text-[var(--color-ink-subtle)] hover:text-[var(--color-ink)] disabled:opacity-20"
                    title="Move up"
                  >
                    <ChevronUp className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === filteredAreas.length - 1}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMove(area, 'down');
                    }}
                    className="p-0.5 text-[var(--color-ink-subtle)] hover:text-[var(--color-ink)] disabled:opacity-20"
                    title="Move down"
                  >
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleArchive(area);
                    }}
                    className="p-0.5 text-[var(--color-ink-subtle)] hover:text-[var(--color-ink)] ml-1"
                    title={area.isArchived ? 'Unarchive' : 'Archive'}
                  >
                    <Archive className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Show Archived Toggle */}
      <div className="hairline-t pt-2 flex items-center justify-between text-[11px] text-[var(--color-ink-muted)]">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="rounded border-[var(--color-rule)] text-[var(--color-accent)]"
          />
          <span>Show archived areas</span>
        </label>
      </div>

      {/* Add Area Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Create Life Area (PL-1)"
        subtitle="Group related projects, certifications, habits, and routines."
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateArea} disabled={!newAreaName.trim()}>
              <Check className="w-3.5 h-3.5" />
              <span>Create Area</span>
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateArea} className="flex flex-col gap-3">
          <Input
            label="Area Name"
            placeholder="e.g. Career & Engineering, Health, Learning"
            value={newAreaName}
            onChange={(e) => setNewAreaName(e.target.value)}
            required
            autoFocus
          />
          <Input
            label="Description (Optional)"
            placeholder="Brief scope of efforts contained within this area"
            value={newAreaDesc}
            onChange={(e) => setNewAreaDesc(e.target.value)}
          />
        </form>
      </Modal>
    </div>
  );
};

