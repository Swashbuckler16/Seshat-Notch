import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { parseQuickAdd, ParsedQuickAdd } from '../utils/quickAddParser';
import { domainService } from '../services/domainService';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { StatusBadge } from './StatusBadge';
import {
  Sparkles,
  Command,
  CornerDownLeft,
  CheckCircle2,
  ListTodo,
  Calendar,
  Clock,
  Folder,
} from 'lucide-react';

interface QuickAddPlaygroundProps {
  onOpenQuickAddModal: () => void;
}

const PRESET_EXAMPLES = [
  {
    label: 'Detection task',
    text: 'Write Kerberoasting detection card #heimdall >baseline ~90m !high @fri +rules:2',
  },
  {
    label: 'Study task',
    text: 'Review Chapter 4 Cryptography & PKI architectures #secplus ~75m !med @today',
  },
  {
    label: 'Lab exercise',
    text: 'Simulate LSASS memory dumping using procdump #heimdall >attack_detect ~60m !urgent @tomorrow',
  },
  {
    label: 'Daily target',
    text: 'Complete Network Security practice quiz #secplus ~45m !high @fri +questions:50',
  },
];

export const QuickAddPlayground: React.FC<QuickAddPlaygroundProps> = ({ onOpenQuickAddModal }) => {
  const [inputText, setInputText] = useState(PRESET_EXAMPLES[0].text);
  const [parsed, setParsed] = useState<ParsedQuickAdd>(() => parseQuickAdd(PRESET_EXAMPLES[0].text));
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Live queries
  const recentTasks = useLiveQuery(
    () => db.tasks.where('isDeleted').equals(0).reverse().sortBy('createdAt'),
    []
  );
  const projects = useLiveQuery(() => db.projects.where('isDeleted').equals(0).toArray(), []);
  const milestones = useLiveQuery(() => db.milestones.where('isDeleted').equals(0).toArray(), []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputText(val);
    setParsed(parseQuickAdd(val));
  };

  const handleSelectPreset = (text: string) => {
    setInputText(text);
    setParsed(parseQuickAdd(text));
  };

  // Match project & milestone
  const matchedProject = projects?.find((p) => {
    if (!parsed.projectQuery) return false;
    const q = parsed.projectQuery.toLowerCase();
    return (
      p.id.toLowerCase().includes(q) ||
      p.title.toLowerCase().includes(q) ||
      p.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  const matchedMilestone = milestones?.find((m) => {
    if (!parsed.milestoneQuery) return false;
    const q = parsed.milestoneQuery.toLowerCase();
    return m.id.toLowerCase().includes(q) || m.title.toLowerCase().includes(q);
  });

  const handleExecuteSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;
    setSaveError(null);

    try {
      let targetId: string | undefined;
      if (parsed.targetMetric) {
        const newTarget = await domainService.createTarget({
          projectId: matchedProject?.id,
          horizon: 'day',
          period: parsed.scheduleDate || new Date().toISOString().split('T')[0],
          title: parsed.title,
          metricType: 'numeric',
          targetValue: parsed.targetMetric.value,
          currentValue: 0,
          unit: parsed.targetMetric.unit,
          weight: 1.0,
          status: 'not_started',
        });
        targetId = newTarget.id;
      }

      await domainService.createTask({
        projectId: matchedProject?.id,
        milestoneId: matchedMilestone?.id,
        targetId,
        title: parsed.title,
        scheduleDate: parsed.scheduleDate,
        dueDate: parsed.scheduleDate,
        estimateMinutes: parsed.estimateMinutes,
        priority: parsed.priority || 'medium',
        status: 'not_started',
        subtasks: [],
        tags: parsed.tags,
      });

      setSaveSuccess(`Added: "${parsed.title}"`);
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (err) {
      console.error(err);
      setSaveError('The task could not be saved. Check your local data and try again.');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header Banner */}
      <div className="surface-card rounded-[var(--radius-sm)] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Command className="w-4 h-4 text-[var(--color-accent)]" />
            <h3 className="font-semibold text-sm">Quick add</h3>
          </div>
          <p className="text-xs text-[var(--color-ink-muted)] mt-1">
            Write a task in one line. Add a project, date, estimate, or target when you need one.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="primary" onClick={onOpenQuickAddModal}>
            <Sparkles className="w-3.5 h-3.5" />
            <span>Open quick add</span>
            <kbd className="ml-1.5 px-1 py-0.2 text-[11px] bg-[var(--color-paper-3)] border border-[var(--color-rule)] rounded font-mono">Ctrl+K</kbd>
          </Button>
        </div>
      </div>

      {/* Preset Example Picker */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-[var(--color-ink-muted)] text-xs">Examples:</span>
        {PRESET_EXAMPLES.map((ex, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleSelectPreset(ex.text)}
            className={`px-2.5 py-1 rounded-[var(--radius-xs)] border border-[var(--color-rule)] text-[11px] transition-opacity ${
              inputText === ex.text
                ? 'bg-[var(--color-accent)] text-[var(--color-accent-ink)] font-semibold'
                : 'bg-[var(--color-paper-2)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
            }`}
          >
            {ex.label}
          </button>
        ))}
      </div>

      {/* Interactive Input Form */}
      <form onSubmit={handleExecuteSave} className="surface-card rounded-[var(--radius-sm)] p-4 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[var(--color-ink)] flex items-center justify-between">
            <span>Task details</span>
            <span className="font-mono text-[11px] text-[var(--color-ink-muted)]">
              Tokens: #project &gt;milestone ~estimate !priority @date +target:value
            </span>
          </label>
          <div className="flex items-center gap-2">
            <Input
              value={inputText}
              onChange={handleInputChange}
              placeholder="e.g. Write detection rule #heimdall ~45m !high @today"
              className="font-mono text-xs"
            />
            <Button variant="primary" type="submit" className="shrink-0 mb-[1.125rem]">
              <CornerDownLeft className="w-3.5 h-3.5" />
              <span>Save</span>
            </Button>
          </div>
        </div>

        {saveSuccess && (
          <div className="p-2.5 bg-[var(--color-status-on-track-bg)] text-[var(--color-status-on-track)] rounded-[var(--radius-xs)] border border-[var(--color-rule)] flex items-center gap-2 text-xs font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{saveSuccess}</span>
          </div>
        )}
        {saveError && (
          <p role="alert" className="p-2.5 text-xs text-[var(--color-status-behind)] bg-[var(--color-status-behind-bg)] border border-[var(--color-rule)] rounded-[var(--radius-xs)]">
            {saveError}
          </p>
        )}

        {/* Live Parse Decomposition Inspector (PRD 6.9 Live preview before saving) */}
        <div className="surface-well border border-[var(--color-rule)] rounded-[var(--radius-xs)] p-3.5 flex flex-col gap-3">
          <div className="flex items-center justify-between hairline-b pb-2">
            <span className="font-semibold text-xs text-[var(--color-ink)]">
              Preview
            </span>
            <span className="text-[11px] text-[var(--color-ink-muted)]">
              {parsed.tokens.length} details found
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-xs">
            {/* Title */}
            <div className="p-2 bg-[var(--color-paper)] border border-[var(--color-rule)] rounded-[var(--radius-xs)] col-span-2">
            <span className="text-[10px] text-[var(--color-ink-subtle)] block">Task</span>
              <span className="font-medium text-[var(--color-ink)] truncate block">{parsed.title}</span>
            </div>

            {/* Project */}
            <div className="p-2 bg-[var(--color-paper)] border border-[var(--color-rule)] rounded-[var(--radius-xs)]">
            <span className="text-[10px] text-[var(--color-ink-subtle)] block">Project</span>
              <span className="font-medium text-[var(--color-accent)] truncate block">
              {matchedProject ? matchedProject.title : parsed.projectQuery ? `#${parsed.projectQuery}` : 'No project'}
              </span>
            </div>

            {/* Milestone */}
            <div className="p-2 bg-[var(--color-paper)] border border-[var(--color-rule)] rounded-[var(--radius-xs)]">
            <span className="text-[10px] text-[var(--color-ink-subtle)] block">Milestone</span>
              <span className="font-medium text-[var(--color-ink)] truncate block">
                {matchedMilestone ? matchedMilestone.title : parsed.milestoneQuery ? `>${parsed.milestoneQuery}` : 'None'}
              </span>
            </div>

            {/* Estimate */}
            <div className="p-2 bg-[var(--color-paper)] border border-[var(--color-rule)] rounded-[var(--radius-xs)]">
            <span className="text-[10px] text-[var(--color-ink-subtle)] block">Estimate</span>
              <span className="font-medium text-[var(--color-ink)] tabular-figure block">
                {parsed.estimateMinutes ? `${parsed.estimateMinutes}m` : 'None'}
              </span>
            </div>

            {/* Priority */}
            <div className="p-2 bg-[var(--color-paper)] border border-[var(--color-rule)] rounded-[var(--radius-xs)]">
            <span className="text-[10px] text-[var(--color-ink-subtle)] block">Priority</span>
              <span className="font-medium text-[var(--color-status-at-risk)] capitalize block">
                {parsed.priority || 'Medium'}
              </span>
            </div>

            {/* Date */}
            <div className="p-2 bg-[var(--color-paper)] border border-[var(--color-rule)] rounded-[var(--radius-xs)]">
            <span className="text-[10px] text-[var(--color-ink-subtle)] block">Date</span>
              <span className="font-medium text-[var(--color-ink)] tabular-figure truncate block">
                {parsed.scheduleDateLabel}
              </span>
            </div>

            {/* Target Metric */}
            <div className="p-2 bg-[var(--color-paper)] border border-[var(--color-rule)] rounded-[var(--radius-xs)]">
            <span className="text-[10px] text-[var(--color-ink-subtle)] block">Target</span>
              <span className="font-medium text-[var(--color-accent)] tabular-figure block">
                {parsed.targetMetric ? `${parsed.targetMetric.value} ${parsed.targetMetric.unit}` : 'None'}
              </span>
            </div>
          </div>
        </div>
      </form>

      {/* Live Recent Tasks Ledger */}
      <div className="surface-card rounded-[var(--radius-sm)] overflow-hidden">
        <div className="p-3 bg-[var(--color-paper-2)] hairline-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListTodo className="w-4 h-4 text-[var(--color-accent)]" />
            <h4 className="font-semibold text-xs">Recent tasks</h4>
          </div>
          <span className="text-[11px] text-[var(--color-ink-muted)]">
            {recentTasks === undefined ? 'Loading…' : `${recentTasks.length} tasks`}
          </span>
        </div>

        <div className="divide-y divide-[var(--color-rule)]">
          {recentTasks === undefined ? (
            <div role="status" className="p-5 text-xs text-[var(--color-ink-muted)]">Loading tasks…</div>
          ) : recentTasks.length === 0 ? (
            <div className="p-6 text-center text-xs text-[var(--color-ink-muted)]">
              No tasks yet. Add one using the field above.
            </div>
          ) : (
            recentTasks.slice(0, 6).map((task) => (
              <div
                key={task.id}
                className="p-3 flex items-center justify-between gap-4 hover:bg-[var(--color-paper-2)] transition-opacity"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      task.status === 'done' ? 'bg-[var(--color-status-on-track)]' : 'bg-[var(--color-rule-strong)]'
                    }`}
                  />
                  <div>
                    <span className="text-xs font-medium text-[var(--color-ink)] block">
                      {task.title}
                    </span>
                    <div className="flex items-center gap-2 text-[11px] text-[var(--color-ink-muted)] mt-0.5">
                      {task.projectId && (
                        <span className="inline-flex items-center gap-1 text-[var(--color-accent)]">
                          <Folder className="w-3 h-3" />
                          <span>{projects?.find((project) => project.id === task.projectId)?.title || 'Project unavailable'}</span>
                        </span>
                      )}
                      {task.scheduleDate && (
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{task.scheduleDate}</span>
                        </span>
                      )}
                      {task.estimateMinutes && (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{task.estimateMinutes}m</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-[var(--color-paper-3)] border border-[var(--color-rule)] text-[var(--color-ink-muted)] capitalize">
                    {task.priority}
                  </span>
                  <StatusBadge status={task.status === 'done' ? 'on_track' : 'paused'} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
