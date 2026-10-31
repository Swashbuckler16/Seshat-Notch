import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { domainService } from '../../services/domainService';
import { AreaManager } from './AreaManager';
import { ProjectInspector } from './ProjectInspector';
import { MilestoneTimeline } from './MilestoneTimeline';
import { EntityId, Priority } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { StatusBadge } from '../StatusBadge';
import {
  Briefcase,
  Plus,
  Check,
} from 'lucide-react';

export const PlannerView: React.FC = () => {
  const [selectedAreaId, setSelectedAreaId] = useState<EntityId | 'all'>('all');
  const [selectedProjectId, setSelectedProjectId] = useState<EntityId | null>(null);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);

  // New Project Form State
  const [title, setTitle] = useState('');
  const [isGoal, setIsGoal] = useState(false);
  const [areaId, setAreaId] = useState<string>('');
  const [why, setWhy] = useState('');
  const [successCriteria, setSuccessCriteria] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [priority, setPriority] = useState<Priority>('high');
  const [tagsInput, setTagsInput] = useState('');

  // Live queries
  const areas = useLiveQuery(() => db.areas.orderBy('order').toArray(), []);
  const allProjects = useLiveQuery(
    () => db.projects.where('isDeleted').equals(0).reverse().sortBy('createdAt'),
    []
  );

  const filteredProjects = (allProjects || []).filter((p) => {
    if (selectedAreaId === 'all') return true;
    return p.areaId === selectedAreaId;
  });

  // Automatically select first project if none selected
  const activeProject =
    (allProjects || []).find((p) => p.id === selectedProjectId) ||
    filteredProjects[0] ||
    allProjects?.[0];

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !areaId) return;

    const tags = tagsInput
      .split(/[,\s]+/)
      .map((t) => t.replace(/^#/, '').trim().toLowerCase())
      .filter(Boolean);

    const created = await domainService.createProject({
      areaId,
      title: title.trim(),
      isGoal,
      why: why.trim() || undefined,
      successCriteria: successCriteria.trim() || undefined,
      startDate: startDate || new Date().toISOString().split('T')[0],
      endDate: endDate || undefined,
      priority,
      status: 'active',
      tags,
      weightType: 'manual',
    });

    setTitle('');
    setWhy('');
    setSuccessCriteria('');
    setTagsInput('');
    setIsNewProjectModalOpen(false);
    setSelectedProjectId(created.id);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Banner */}
      <div className="surface-card rounded-[var(--radius-sm)] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-[var(--color-accent)]" />
            <h3 className="font-semibold text-sm">Areas, Projects & Milestone Planner</h3>
            <span className="font-mono text-[11px] px-1.5 py-0.2 bg-[var(--color-paper-3)] border border-[var(--color-rule)] rounded text-[var(--color-accent)] font-semibold">
              PRD 6.1: PL-1 · PL-2 · PL-3
            </span>
          </div>
          <p className="text-xs text-[var(--color-ink-muted)] mt-1">
            Organize efforts across Life Areas. Each Project / Goal carries architectural motivation, success criteria, and a finish-to-start milestone dependency chain.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => {
            setAreaId(selectedAreaId !== 'all' ? selectedAreaId : areas?.[0]?.id || '');
            setIsNewProjectModalOpen(true);
          }}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Project / Goal</span>
        </Button>
      </div>

      {/* Main Grid: Left Area Manager + Center Project Inspector & Milestones */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left Column: Area Manager & Projects List */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <AreaManager
            selectedAreaId={selectedAreaId}
            onSelectArea={(id) => setSelectedAreaId(id)}
          />

          {/* Projects in Area */}
          <div className="surface-card rounded-[var(--radius-sm)] p-3.5 flex flex-col gap-2.5">
            <div className="flex items-center justify-between hairline-b pb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-muted)]">
                Projects ({filteredProjects.length})
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              {filteredProjects.length === 0 ? (
                <div className="py-6 text-center text-xs text-[var(--color-ink-muted)]">
                  No projects in this area.
                </div>
              ) : (
                filteredProjects.map((p) => {
                  const isSelected = activeProject?.id === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedProjectId(p.id)}
                      className={`p-2.5 rounded-[var(--radius-xs)] text-left flex flex-col gap-1 border transition-opacity cursor-pointer ${
                        isSelected
                          ? 'bg-[var(--color-paper-3)] border-[var(--color-accent)] shadow-sm'
                          : 'bg-[var(--color-paper)] border-[var(--color-rule)] hover:bg-[var(--color-paper-2)]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-xs text-[var(--color-ink)] truncate">
                          {p.title}
                        </span>
                        <StatusBadge status={p.status === 'blocked' ? 'behind' : p.status === 'done' ? 'on_track' : 'paused'} />
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-mono text-[var(--color-ink-muted)]">
                        <span className="capitalize">{p.priority}</span>
                        <span>{p.isGoal ? 'Goal' : 'Project'}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Center/Right Columns: Project Inspector & Milestone Dependency Timeline */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          {activeProject ? (
            <>
              <ProjectInspector project={activeProject} />
              <MilestoneTimeline
                projectId={activeProject.id}
                projectTitle={activeProject.title}
              />
            </>
          ) : (
            <div className="surface-card rounded-[var(--radius-sm)] p-12 text-center text-xs text-[var(--color-ink-muted)]">
              No project selected. Click "New Project / Goal" above to create your first effort.
            </div>
          )}
        </div>
      </div>

      {/* New Project / Goal Modal (PRD PL-2) */}
      <Modal
        isOpen={isNewProjectModalOpen}
        onClose={() => setIsNewProjectModalOpen(false)}
        title="Create Project or Goal (PL-2)"
        subtitle="Author a new technical project or personal goal with clear success criteria."
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsNewProjectModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateProject}
              disabled={!title.trim() || !areaId}
            >
              <Check className="w-3.5 h-3.5" />
              <span>Create Effort</span>
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateProject} className="flex flex-col gap-3.5">
          <Input
            label="Title"
            placeholder="e.g. Heimdall SOC Lab, CompTIA Security+ Prep"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            autoFocus
          />

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[var(--color-ink)]">Life Area</label>
              <select
                value={areaId}
                onChange={(e) => setAreaId(e.target.value)}
                className="h-9 px-3 text-xs bg-[var(--color-paper)] text-[var(--color-ink)] border border-[var(--color-rule)] rounded-[var(--radius-xs)]"
                required
              >
                <option value="">Select an Area...</option>
                {(areas || []).map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[var(--color-ink)]">Type</label>
              <select
                value={isGoal ? 'goal' : 'project'}
                onChange={(e) => setIsGoal(e.target.value === 'goal')}
                className="h-9 px-3 text-xs bg-[var(--color-paper)] text-[var(--color-ink)] border border-[var(--color-rule)] rounded-[var(--radius-xs)]"
              >
                <option value="project">Technical Project (Milestone Driven)</option>
                <option value="goal">Personal Goal (Target Driven)</option>
              </select>
            </div>
          </div>

          <Input
            label="Why This Effort Matters (Motivation)"
            placeholder="e.g. Master enterprise detection engineering and Windows telemetry"
            value={why}
            onChange={(e) => setWhy(e.target.value)}
          />

          <Input
            label="Success Criteria (Definition of Done)"
            placeholder="e.g. 12 ATT&CK techniques emulated with documented Sigma rules"
            value={successCriteria}
            onChange={(e) => setSuccessCriteria(e.target.value)}
          />

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Input
              label="Target End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[var(--color-ink)]">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="h-9 px-3 text-xs bg-[var(--color-paper)] text-[var(--color-ink)] border border-[var(--color-rule)] rounded-[var(--radius-xs)] capitalize"
              >
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          <Input
            label="Tags (Comma separated)"
            placeholder="e.g. soc, detection, splunk, active-directory"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            helperText="Tags allow grouping and dashboard filtering."
          />
        </form>
      </Modal>
    </div>
  );
};
