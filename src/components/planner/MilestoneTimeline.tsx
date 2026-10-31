import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { domainService } from '../../services/domainService';
import { MilestonePhase, EntityId, Status } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { CordBar } from '../CordBar';
import {
  GitCommit,
  Plus,
  ArrowRight,
  Trash2,
  CheckCircle2,
  Calendar,
} from 'lucide-react';

interface MilestoneTimelineProps {
  projectId: EntityId;
  projectTitle: string;
}

export const MilestoneTimeline: React.FC<MilestoneTimelineProps> = ({ projectId, projectTitle }) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [weight, setWeight] = useState(10);
  const [dependsOn, setDependsOn] = useState<string>('');

  const milestones = useLiveQuery(
    () =>
      db.milestones
        .where('projectId')
        .equals(projectId)
        .filter((m) => !m.isDeleted)
        .sortBy('order'),
    [projectId]
  );

  const totalWeight = (milestones || []).reduce((sum, m) => sum + (m.weight || 0), 0);
  const completedWeight = (milestones || [])
    .filter((m) => m.status === 'done')
    .reduce((sum, m) => sum + (m.weight || 0), 0);

  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    await domainService.createMilestone({
      projectId,
      title: title.trim(),
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      status: 'not_started',
      dependsOnMilestoneId: dependsOn || undefined,
      weight: Number(weight) || 10,
      order: (milestones?.length || 0) + 1,
    });

    setTitle('');
    setStartDate('');
    setEndDate('');
    setWeight(10);
    setDependsOn('');
    setIsAddModalOpen(false);
  };

  const handleStatusChange = async (milestone: MilestonePhase, newStatus: Status) => {
    await domainService.updateMilestone(milestone.id, { status: newStatus });
  };

  const handleDelete = async (id: EntityId) => {
    if (confirm('Delete this milestone phase?')) {
      await domainService.softDeleteMilestone(id, 'Removed by user from milestone timeline');
    }
  };

  return (
    <div className="surface-card rounded-[var(--radius-sm)] flex flex-col p-4 gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 hairline-b pb-3">
        <div className="flex items-center gap-2">
          <GitCommit className="w-4 h-4 text-[var(--color-accent)]" />
          <div>
            <h3 className="font-semibold text-xs tracking-tight uppercase text-[var(--color-ink-muted)]">
              Phases & Finish-to-Start Dependencies (PL-3)
            </h3>
            <span className="text-xs text-[var(--color-ink)] font-medium">
              {projectTitle}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <span className="text-[var(--color-ink-muted)]">Total Weight:</span>
            <span
              className={`font-semibold tabular-figure ${
                totalWeight === 100
                  ? 'text-[var(--color-status-on-track)]'
                  : 'text-[var(--color-status-at-risk)]'
              }`}
            >
              {totalWeight}%
            </span>
            <span className="text-[10px] text-[var(--color-ink-subtle)]">
              ({milestones?.length ?? 0} phases)
            </span>
          </div>

          <Button size="sm" variant="secondary" onClick={() => setIsAddModalOpen(true)}>
            <Plus className="w-3.5 h-3.5" />
            <span>Add Phase</span>
          </Button>
        </div>
      </div>

      {/* Progress Cord */}
      {milestones && milestones.length > 0 && (
        <div className="bg-[var(--color-paper-2)]/60 p-3 rounded-[var(--radius-xs)] border border-[var(--color-rule)]">
          <CordBar
            current={completedWeight}
            total={totalWeight || 100}
            unit="%"
            label="Cumulative Milestone Weight Delivered"
          />
        </div>
      )}

      {/* Timeline Chain */}
      <div className="flex flex-col divide-y divide-[var(--color-rule)]">
        {(!milestones || milestones.length === 0) ? (
          <div className="py-8 text-center text-xs text-[var(--color-ink-muted)]">
            No milestones or phases defined for this effort. Click "Add Phase" to build your timeline.
          </div>
        ) : (
          milestones.map((ms, idx) => {
            const predecessor = milestones.find((m) => m.id === ms.dependsOnMilestoneId);
            const isCompleted = ms.status === 'done';

            return (
              <div
                key={ms.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[var(--color-paper-2)]/50 transition-opacity px-2 rounded-[var(--radius-xs)]"
              >
                {/* Left: Step Number, Title, Dependency */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-[var(--color-paper-3)] border border-[var(--color-rule)] text-[var(--color-ink-muted)] shrink-0 mt-0.5">
                    P{idx + 1}
                  </span>

                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold truncate ${isCompleted ? 'line-through opacity-70' : ''}`}>
                        {ms.title}
                      </span>
                    </div>

                    {/* Predecessor link */}
                    {predecessor && (
                      <div className="flex items-center gap-1 text-[11px] font-mono text-[var(--color-accent)] mt-0.5">
                        <ArrowRight className="w-3 h-3 shrink-0" />
                        <span className="truncate">Depends on: {predecessor.title}</span>
                      </div>
                    )}

                    {/* Timeline dates */}
                    {(ms.startDate || ms.endDate) && (
                      <div className="flex items-center gap-1 text-[11px] font-mono text-[var(--color-ink-muted)] mt-0.5">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {ms.startDate || 'TBD'} → {ms.endDate || 'TBD'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Weight, Status selector, Delete */}
                <div className="flex items-center gap-3 shrink-0 justify-end">
                  <span className="font-mono text-xs tabular-figure text-[var(--color-ink-muted)] px-1.5 py-0.5 bg-[var(--color-paper-2)] rounded border border-[var(--color-rule)]">
                    Weight: {ms.weight}%
                  </span>

                  {/* Status Toggle Button */}
                  <select
                    value={ms.status}
                    onChange={(e) => handleStatusChange(ms, e.target.value as Status)}
                    className="bg-[var(--color-paper)] border border-[var(--color-rule)] rounded-[var(--radius-xs)] px-2 py-1 text-xs font-medium text-[var(--color-ink)]"
                  >
                    <option value="not_started">Not Started</option>
                    <option value="active">Active</option>
                    <option value="done">Done</option>
                    <option value="blocked">Blocked</option>
                    <option value="paused">Paused</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => handleDelete(ms.id)}
                    className="p-1 text-[var(--color-ink-subtle)] hover:text-[var(--color-status-behind)]"
                    title="Delete phase"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Milestone Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Milestone / Phase (PL-3)"
        subtitle={`Adding to ${projectTitle}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateMilestone} disabled={!title.trim()}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Save Phase</span>
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateMilestone} className="flex flex-col gap-3">
          <Input
            label="Phase / Milestone Title"
            placeholder="e.g. Phase 6: Attack Emulation & Detection Engineering"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            autoFocus
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Start Date (Optional)"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Input
              label="End Date (Optional)"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Phase Weight (%)"
              type="number"
              unit="%"
              value={weight}
              onChange={(e) => setWeight(Number(e.target.value))}
              helperText="Relative contribution to overall progress"
              required
            />

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[var(--color-ink)]">
                Finish-to-Start Dependency
              </label>
              <select
                value={dependsOn}
                onChange={(e) => setDependsOn(e.target.value)}
                className="w-full h-9 px-3 text-xs bg-[var(--color-paper)] text-[var(--color-ink)] border border-[var(--color-rule)] rounded-[var(--radius-xs)]"
              >
                <option value="">None (Independent Phase)</option>
                {(milestones || []).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};
