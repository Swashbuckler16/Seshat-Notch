import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { domainService } from '../../services/domainService';
import { ProjectGoal, EntityId, Status, Priority } from '../../types';
import { getLocalDateString } from '../../utils/dateUtils';
import { ProjectHealthCard } from '../metrics/ProjectHealthCard';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import {
  Folder,
  Calendar,
  Flag,
  AlertTriangle,
  CheckCircle,
  Tag,
  Scale,
  Plus,
  X,
  Target as TargetIcon,
} from 'lucide-react';

interface ProjectInspectorProps {
  project: ProjectGoal;
}

export const ProjectInspector: React.FC<ProjectInspectorProps> = ({ project }) => {
  // Drop reason modal state for PRD TR-3
  const [isDropModalOpen, setIsDropModalOpen] = useState(false);
  const [dropReason, setDropReason] = useState('');

  // Blocker modal state for PRD TR-5
  const [isBlockerModalOpen, setIsBlockerModalOpen] = useState(false);
  const [blockerDesc, setBlockerDesc] = useState('');

  // Tag adding state
  const [newTag, setNewTag] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);

  // Live queries for area, blockers, and targets
  const area = useLiveQuery(() => db.areas.get(project.areaId), [project.areaId]);
  const blockers = useLiveQuery(
    () =>
      db.blockers
        .where('entityId')
        .equals(project.id)
        .reverse()
        .sortBy('createdAt'),
    [project.id]
  );
  const targets = useLiveQuery(
    () => db.targets.where('projectId').equals(project.id).filter((t) => !t.isDeleted).toArray(),
    [project.id]
  );

  const openBlockers = (blockers || []).filter((b) => !b.dateCleared);

  const handleStatusSelect = async (status: Status) => {
    if (status === 'dropped') {
      setIsDropModalOpen(true);
      return;
    }
    await domainService.updateProjectStatus(project.id, status);
  };

  const handleConfirmDrop = async () => {
    if (!dropReason.trim()) return;
    await domainService.updateProjectStatus(project.id, 'dropped', dropReason.trim());
    setIsDropModalOpen(false);
    setDropReason('');
  };

  const handlePriorityChange = async (priority: Priority) => {
    await db.projects.update(project.id, { priority, updatedAt: new Date().toISOString() });
  };

  const handleRaiseBlocker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockerDesc.trim()) return;

    await domainService.raiseBlocker({
      entityType: 'project',
      entityId: project.id,
      description: blockerDesc.trim(),
    });

    setBlockerDesc('');
    setIsBlockerModalOpen(false);
  };

  const handleClearBlocker = async (blockerId: EntityId) => {
    await domainService.clearBlocker(blockerId);
  };

  const handleAddTag = async () => {
    if (!newTag.trim()) return;
    const cleanTag = newTag.trim().toLowerCase().replace(/^#/, '');
    if (!project.tags.includes(cleanTag)) {
      const updated = [...project.tags, cleanTag];
      await db.projects.update(project.id, { tags: updated, updatedAt: new Date().toISOString() });
    }
    setNewTag('');
    setIsAddingTag(false);
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    const updated = project.tags.filter((t) => t !== tagToRemove);
    await db.projects.update(project.id, { tags: updated, updatedAt: new Date().toISOString() });
  };

  return (
    <div className="surface-card rounded-[var(--radius-sm)] p-5 flex flex-col gap-5">
      {/* Top Banner: Area, Priority, Status */}
      <div className="flex flex-wrap items-center justify-between gap-3 hairline-b pb-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs px-2 py-0.5 rounded bg-[var(--color-paper-3)] border border-[var(--color-rule)] text-[var(--color-accent)] font-semibold">
            {project.isGoal ? 'Goal' : 'Project'}
          </span>

          {area && (
            <span className="inline-flex items-center gap-1 text-xs text-[var(--color-ink-muted)]">
              <Folder className="w-3.5 h-3.5" />
              <span>{area.name}</span>
            </span>
          )}

          <span className="inline-flex items-center gap-1 text-xs text-[var(--color-ink-muted)]">
            <TargetIcon className="w-3.5 h-3.5 text-[var(--color-accent)]" />
            <span className="tabular-figure">{targets?.length ?? 0}</span>
            <span>Targets</span>
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Priority selector */}
          <div className="flex items-center gap-1 text-xs">
            <Flag className="w-3.5 h-3.5 text-[var(--color-status-at-risk)]" />
            <select
              value={project.priority}
              onChange={(e) => handlePriorityChange(e.target.value as Priority)}
              className="bg-[var(--color-paper)] border border-[var(--color-rule)] rounded-[var(--radius-xs)] px-2 py-1 text-xs text-[var(--color-ink)] capitalize"
            >
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Status selector (enforces PRD TR-3 drop reason) */}
          <select
            value={project.status}
            onChange={(e) => handleStatusSelect(e.target.value as Status)}
            className="bg-[var(--color-paper-2)] border border-[var(--color-rule-strong)] rounded-[var(--radius-xs)] px-2.5 py-1 text-xs font-semibold text-[var(--color-ink)]"
          >
            <option value="not_started">Not Started</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="blocked">Blocked</option>
            <option value="done">Done</option>
            <option value="dropped">Dropped</option>
          </select>
        </div>
      </div>

      {/* Title & Timeline */}
      <div className="flex flex-col gap-1.5">
        <h2 className="text-lg font-bold text-[var(--color-ink)] tracking-tight">
          {project.title}
        </h2>
        <div className="flex items-center gap-3 text-xs text-[var(--color-ink-muted)]">
          <div className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>{project.startDate} → {project.endDate || 'No end date'}</span>
          </div>
          <div className="flex items-center gap-1">
            <Scale className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Progress weighting: {project.weightType}</span>
          </div>
        </div>
      </div>

      {/* Pure Metric Engine Health & Formula Inspector Card (PRD Section 7.3 & TR-2) */}
      <ProjectHealthCard project={project} todayStr={getLocalDateString()} />

      {/* PRD PL-2: "Why" & Success Criteria Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Why this matters */}
        <div className="surface-well border border-[var(--color-rule)] rounded-[var(--radius-xs)] p-3.5 flex flex-col gap-1.5">
          <span className="text-xs text-[var(--color-ink-muted)] font-semibold">
            Why it matters
          </span>
          <p className="text-xs text-[var(--color-ink)] leading-relaxed">
            {project.why || 'Add a reason to keep this work in view.'}
          </p>
        </div>

        {/* Success Criteria */}
        <div className="surface-well border border-[var(--color-rule)] rounded-[var(--radius-xs)] p-3.5 flex flex-col gap-1.5">
          <span className="text-xs text-[var(--color-ink-muted)] font-semibold">
            Finish line
          </span>
          <p className="text-xs text-[var(--color-ink)] leading-relaxed">
            {project.successCriteria || 'Set a clear finish line for this project.'}
          </p>
        </div>
      </div>

      {/* Open Blockers Panel (PRD TR-5: Raise & Clear Blockers) */}
      <div className="surface-well border border-[var(--color-rule)] rounded-[var(--radius-xs)] p-3.5 flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className={`w-4 h-4 ${openBlockers.length > 0 ? 'text-[var(--color-status-behind)]' : 'text-[var(--color-ink-muted)]'}`} />
            <span className="text-xs font-semibold text-[var(--color-ink)]">
              Blockers ({openBlockers.length} active)
            </span>
          </div>
          <Button size="sm" variant="secondary" onClick={() => setIsBlockerModalOpen(true)}>
            <Plus className="w-3 h-3" />
            <span>Raise Blocker</span>
          </Button>
        </div>

        {openBlockers.length === 0 ? (
          <p className="text-xs text-[var(--color-ink-muted)]">
            No blockers recorded.
          </p>
        ) : (
          <div className="flex flex-col gap-2 pt-1">
            {openBlockers.map((b) => (
              <div
                key={b.id}
                className="p-2.5 bg-[var(--color-paper)] border border-[var(--color-status-behind)] rounded-[var(--radius-xs)] flex items-start justify-between gap-3 text-xs"
              >
                <div>
                  <span className="font-semibold text-[var(--color-status-behind)] block">
                    {b.description}
                  </span>
                  <span className="text-[11px] text-[var(--color-ink-muted)]">
                    Raised: {b.dateRaised}
                  </span>
                </div>
                <Button size="sm" variant="secondary" onClick={() => handleClearBlocker(b.id)}>
                  <CheckCircle className="w-3.5 h-3.5 text-[var(--color-status-on-track)]" />
                  <span>Clear</span>
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tags Section */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="text-[var(--color-ink-muted)] text-[11px] flex items-center gap-1 mr-1">
          <Tag className="w-3.5 h-3.5" />
          <span>Tags:</span>
        </span>

        {project.tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--color-paper-2)] border border-[var(--color-rule)] text-[var(--color-ink)] text-[11px]"
          >
            <span>#{tag}</span>
            <button
              type="button"
              onClick={() => handleRemoveTag(tag)}
              className="text-[var(--color-ink-subtle)] hover:text-[var(--color-status-behind)]"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}

        {isAddingTag ? (
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
              placeholder="tag"
              autoFocus
              className="h-8 min-w-28 px-2 text-xs bg-[var(--color-paper)] border border-[var(--color-rule-strong)] rounded text-[var(--color-ink)]"
            />
            <Button size="sm" variant="ghost" onClick={handleAddTag}>Add</Button>
            <button type="button" onClick={() => setIsAddingTag(false)} className="text-xs text-[var(--color-ink-subtle)]">
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsAddingTag(true)}
            className="min-h-11 px-1.5 py-0.5 text-xs text-[var(--color-accent)] hover:underline"
          >
            + add tag
          </button>
        )}
      </div>

      {/* Drop Reason Modal (PRD Requirement TR-3) */}
      <Modal
        isOpen={isDropModalOpen}
        onClose={() => {
          setIsDropModalOpen(false);
        }}
        title="Reason Required: Dropping Effort"
        subtitle="Dropping an item requires an explicit reason which is permanently stored in the audit history."
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setIsDropModalOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleConfirmDrop} disabled={!dropReason.trim()}>
              Confirm Drop with Reason
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="text-xs text-[var(--color-ink)]">
            Explain why <strong>{project.title}</strong> is being dropped:
          </p>
          <Input
            placeholder="e.g. Deprecated in favor of alternative framework / lab setup"
            value={dropReason}
            onChange={(e) => setDropReason(e.target.value)}
            required
            autoFocus
          />
        </div>
      </Modal>

      {/* Raise Blocker Modal (PRD TR-5) */}
      <Modal
        isOpen={isBlockerModalOpen}
        onClose={() => setIsBlockerModalOpen(false)}
        title="Raise New Blocker (TR-5)"
        subtitle={`Raising blocker against ${project.title}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsBlockerModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleRaiseBlocker} disabled={!blockerDesc.trim()}>
              Raise Blocker
            </Button>
          </>
        }
      >
        <form onSubmit={handleRaiseBlocker} className="flex flex-col gap-3">
          <Input
            label="Blocker Description"
            placeholder="e.g. Waiting on hardware delivery / awaiting firewall credentials"
            value={blockerDesc}
            onChange={(e) => setBlockerDesc(e.target.value)}
            required
            autoFocus
          />
        </form>
      </Modal>
    </div>
  );
};
