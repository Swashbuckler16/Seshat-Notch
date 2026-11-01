import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { domainService } from '../../services/domainService';
import { AreaManager } from './AreaManager';
import { ProjectInspector } from './ProjectInspector';
import { MilestoneTimeline } from './MilestoneTimeline';
import { HorizonPlanner } from './HorizonPlanner';
import { ProjectMetricsView } from '../metrics/ProjectMetricsView';
import { EntityId, Priority } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { StatusBadge } from '../StatusBadge';
import {
  Briefcase,
  Plus,
  Check,
  Calendar,
  Calculator,
} from 'lucide-react';

export const PlannerView: React.FC = () => {
  const [plannerMode, setPlannerMode] = useState<'projects' | 'horizons' | 'health'>('projects');
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
    filteredProjects.find((project) => project.id === selectedProjectId) ||
    filteredProjects[0];

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
      {/* Top Banner & Mode Switcher */}
      <div className="surface-card rounded-[var(--radius-sm)] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            {plannerMode === 'projects' ? (
              <Briefcase className="w-4 h-4 text-[var(--color-accent)]" />
            ) : (
              <Calendar className="w-4 h-4 text-[var(--color-accent)]" />
            )}
            <h3 className="font-semibold text-sm">
              {plannerMode === 'projects' ? 'Your projects' : 'Planning horizons & targets'}
            </h3>
          </div>
          <p className="text-xs text-[var(--color-ink-muted)] mt-1">
            {plannerMode === 'projects'
              ? 'Group work by area, keep its purpose in view, and map the milestones ahead.'
              : 'Set monthly, weekly, and daily targets; distribute them across periods or adjust timelines.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Sub-mode switcher */}
          <div className="flex items-center gap-1 bg-[var(--color-paper-2)] p-1 rounded-[var(--radius-xs)] border border-[var(--color-rule)]">
            <button
              type="button"
              onClick={() => setPlannerMode('projects')}
              className={`min-h-11 sm:min-h-8 px-3 py-1 text-xs rounded-[var(--radius-xs)] font-medium inline-flex items-center gap-1.5 transition-colors ${
                plannerMode === 'projects'
                  ? 'bg-[var(--color-paper)] text-[var(--color-ink)] shadow-sm font-semibold'
                  : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Projects</span>
            </button>
            <button
              type="button"
              onClick={() => setPlannerMode('horizons')}
              className={`min-h-11 sm:min-h-8 px-3 py-1 text-xs rounded-[var(--radius-xs)] font-medium inline-flex items-center gap-1.5 transition-colors ${
                plannerMode === 'horizons'
                  ? 'bg-[var(--color-paper)] text-[var(--color-ink)] shadow-sm font-semibold'
                  : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Time horizons</span>
            </button>
            <button
              type="button"
              onClick={() => setPlannerMode('health')}
              className={`min-h-11 sm:min-h-8 px-3 py-1 text-xs rounded-[var(--radius-xs)] font-medium inline-flex items-center gap-1.5 transition-colors ${
                plannerMode === 'health'
                  ? 'bg-[var(--color-paper)] text-[var(--color-ink)] shadow-sm font-semibold'
                  : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Health & metrics</span>
            </button>
          </div>

          {plannerMode === 'projects' && (
            <Button
              variant="primary"
              onClick={() => {
                setAreaId(selectedAreaId !== 'all' ? selectedAreaId : areas?.[0]?.id || '');
                setIsNewProjectModalOpen(true);
              }}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New project</span>
            </Button>
          )}
        </div>
      </div>

      {plannerMode === 'health' ? (
        <ProjectMetricsView />
      ) : plannerMode === 'horizons' ? (
        <HorizonPlanner />
      ) : (
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
              <span className="text-xs font-semibold text-[var(--color-ink-muted)]">
                Projects <span className="font-normal tabular-figure">{filteredProjects.length}</span>
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              {allProjects === undefined || areas === undefined ? (
                <p role="status" className="py-5 text-xs text-[var(--color-ink-muted)]">Loading projects…</p>
              ) : filteredProjects.length === 0 ? (
                <div className="py-5 flex flex-col items-start gap-2 text-xs text-[var(--color-ink-muted)]">
                  <p>No projects here yet.</p>
                  {areas.length > 0 ? <button type="button" className="min-h-11 text-[var(--color-accent)] underline underline-offset-2 focus-visible:outline-2" onClick={() => {
                    setAreaId(selectedAreaId !== 'all' ? selectedAreaId : areas?.[0]?.id || '');
                    setIsNewProjectModalOpen(true);
                  }}>Create a project</button> : <p>Create an area first using “New Area”.</p>}
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
          {allProjects === undefined || areas === undefined ? (
            <div role="status" className="surface-well p-6 text-sm text-[var(--color-ink-muted)]">Loading your workspace…</div>
          ) : activeProject ? (
            <>
              <ProjectInspector project={activeProject} />
              <MilestoneTimeline
                projectId={activeProject.id}
                projectTitle={activeProject.title}
              />
              <div className="surface-card rounded-[var(--radius-sm)] p-4 flex flex-col gap-3">
                <div className="flex items-center gap-2 hairline-b pb-2.5">
                  <Calendar className="w-4 h-4 text-[var(--color-accent)]" />
                  <h3 className="font-semibold text-xs text-[var(--color-ink-muted)]">
                    Goals and targets for this project
                  </h3>
                </div>
                <HorizonPlanner selectedProjectId={activeProject.id} />
              </div>
            </>
          ) : (
            <div className="surface-card rounded-[var(--radius-sm)] p-8 text-center text-sm text-[var(--color-ink-muted)]">
              <p>No project selected.</p>
              {areas.length > 0 ? <button type="button" className="mt-2 min-h-11 text-[var(--color-accent)] underline underline-offset-2 focus-visible:outline-2" onClick={() => {
                setAreaId(selectedAreaId !== 'all' ? selectedAreaId : areas?.[0]?.id || '');
                setIsNewProjectModalOpen(true);
              }}>Create a project</button> : <p className="mt-2">Create an area first using “New Area”.</p>}
            </div>
          )}
        </div>
      </div>
      )}

      {/* New Project / Goal Modal (PRD PL-2) */}
      <Modal
        isOpen={isNewProjectModalOpen}
        onClose={() => setIsNewProjectModalOpen(false)}
        title="New project"
        subtitle="Give it a name, choose an area, and set a finish line."
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
              <span>Create project</span>
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
              <label className="text-xs font-medium text-[var(--color-ink)]">Area</label>
              <select
                value={areaId}
                onChange={(e) => setAreaId(e.target.value)}
                className="h-9 px-3 text-xs bg-[var(--color-paper)] text-[var(--color-ink)] border border-[var(--color-rule)] rounded-[var(--radius-xs)]"
                required
              >
                <option value="">Choose an area</option>
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
                <option value="project">Project</option>
                <option value="goal">Goal</option>
              </select>
            </div>
          </div>

          <Input
            label="Why it matters"
            placeholder="What makes this worth doing?"
            value={why}
            onChange={(e) => setWhy(e.target.value)}
          />

          <Input
            label="Finish line"
            placeholder="Describe the result you want."
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
              label="End date"
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
            label="Tags"
            placeholder="e.g. soc, detection, splunk, active-directory"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            helperText="Separate tags with commas or spaces."
          />
        </form>
      </Modal>
    </div>
  );
};
