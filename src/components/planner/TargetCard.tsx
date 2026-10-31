import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { domainService } from '../../services/domainService';
import { Target, Status, ScheduleStatus } from '../../types';
import { Button } from '../ui/Button';
import { StatusBadge } from '../StatusBadge';
import { CordBar } from '../CordBar';
import {
  ChevronRight,
  ChevronDown,
  Plus,
  GitFork,
  Trash2,
  Folder,
} from 'lucide-react';

function mapStatusToSchedule(status: Status, ratio: number = 0): ScheduleStatus {
  if (status === 'done') return 'on_track';
  if (status === 'paused' || status === 'dropped') return 'paused';
  if (status === 'blocked') return 'behind';
  if (ratio >= 0.75) return 'on_track';
  if (ratio >= 0.35) return 'at_risk';
  return 'behind';
}

interface TargetCardProps {
  target: Target;
  onOpenCascade?: (target: Target) => void;
}

export const TargetCard: React.FC<TargetCardProps> = ({ target, onOpenCascade }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLogging, setIsLogging] = useState(false);
  const [logValue, setLogValue] = useState<number>(1);

  // Live query for linked project
  const project = useLiveQuery(
    () => (target.projectId ? db.projects.get(target.projectId) : undefined),
    [target.projectId]
  );

  // Live query for cascaded child targets
  const children = useLiveQuery(
    () =>
      db.targets
        .where('parentTargetId')
        .equals(target.id)
        .filter((t) => !t.isDeleted)
        .toArray(),
    [target.id]
  );

  const handleQuickLog = async () => {
    if (logValue <= 0) return;
    await domainService.updateTargetProgress(target.id, Number(logValue));
    setIsLogging(false);
    setLogValue(1);
  };

  const handleDelete = async () => {
    if (confirm(`Remove target "${target.title}"?`)) {
      await domainService.softDeleteTarget(target.id, 'Removed by user');
    }
  };

  const handleStatusChange = async (newStatus: Status) => {
    await domainService.updateTarget(target.id, { status: newStatus });
  };

  const hasChildren = (children && children.length > 0);
  const ratio = target.targetValue > 0 ? target.currentValue / target.targetValue : 0;

  return (
    <div className="surface-card rounded-[var(--radius-sm)] p-4 flex flex-col gap-3">
      {/* Header Row: Title, Project tag, Status Badge */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-2.5 flex-1 min-w-0">
          {hasChildren && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="mt-0.5 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] p-0.5 rounded focus-visible:outline-2"
              title={isExpanded ? 'Collapse sub-targets' : 'Expand sub-targets'}
              aria-label={isExpanded ? 'Collapse sub-targets' : 'Expand sub-targets'}
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          )}

          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-xs text-[var(--color-ink)]">
                {target.title}
              </span>
              {project && (
                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[var(--color-ink-muted)] bg-[var(--color-paper-2)] px-1.5 py-0.2 rounded border border-[var(--color-rule)]">
                  <Folder className="w-3 h-3 text-[var(--color-accent)]" />
                  <span className="truncate max-w-[150px]">{project.title}</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-[11px] text-[var(--color-ink-muted)] mt-0.5 font-mono">
              <span className="capitalize">{target.horizon}</span>
              <span>·</span>
              <span className="tabular-figure">{target.period}</span>
              {hasChildren && (
                <>
                  <span>·</span>
                  <span className="text-[var(--color-accent)]">
                    {children.length} sub-target{children.length === 1 ? '' : 's'}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right side: Status Badge & Status Selector */}
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={mapStatusToSchedule(target.status, ratio)} ratio={ratio} />
          <select
            value={target.status}
            onChange={(e) => handleStatusChange(e.target.value as Status)}
            className="text-[11px] h-7 px-1.5 bg-[var(--color-paper)] border border-[var(--color-rule)] rounded text-[var(--color-ink)] font-mono"
            aria-label="Target status"
          >
            <option value="not_started">Not started</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="blocked">Blocked</option>
            <option value="done">Done</option>
            <option value="dropped">Dropped</option>
          </select>
        </div>
      </div>

      {/* Progress Cord Bar */}
      <CordBar
        current={target.currentValue}
        total={target.targetValue}
        unit={target.unit ? ` ${target.unit}` : ''}
        label="Target Progress"
      />

      {/* Action Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 hairline-t pt-2.5 text-xs">
        <div className="flex items-center gap-2">
          {isLogging ? (
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="0.1"
                step="any"
                value={logValue}
                onChange={(e) => setLogValue(parseFloat(e.target.value) || 0)}
                className="w-16 h-7 px-1.5 text-xs font-mono bg-[var(--color-paper)] border border-[var(--color-rule-strong)] rounded text-[var(--color-ink)]"
                autoFocus
              />
              <span className="text-[11px] font-mono text-[var(--color-ink-muted)]">
                {target.unit}
              </span>
              <Button size="sm" variant="primary" onClick={handleQuickLog}>
                Log
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setIsLogging(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="secondary" onClick={() => setIsLogging(true)}>
              <Plus className="w-3.5 h-3.5" />
              <span>Log progress</span>
            </Button>
          )}

          {/* Cascade Action for Month or Week targets */}
          {(target.horizon === 'month' || target.horizon === 'week') && onOpenCascade && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onOpenCascade(target)}
              title={target.horizon === 'month' ? 'Split into weekly targets' : 'Split into daily targets'}
            >
              <GitFork className="w-3.5 h-3.5 text-[var(--color-accent)]" />
              <span>
                {target.horizon === 'month' ? 'Split into weeks' : 'Split into days'}
              </span>
            </Button>
          )}
        </div>

        <button
          type="button"
          onClick={handleDelete}
          className="text-[var(--color-ink-subtle)] hover:text-[var(--color-status-behind)] p-1 rounded focus-visible:outline-2"
          title="Delete target"
          aria-label="Delete target"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Cascaded Sub-Targets Drawer */}
      {hasChildren && isExpanded && (
        <div className="bg-[var(--color-paper-2)]/60 rounded-[var(--radius-xs)] border border-[var(--color-rule)] p-3 flex flex-col gap-2 mt-1">
          <div className="text-[11px] font-medium text-[var(--color-ink-muted)] uppercase tracking-wider">
            Sub-targets ({children.length})
          </div>
          <div className="flex flex-col divide-y divide-[var(--color-rule)]">
            {children.map((child) => (
              <div key={child.id} className="py-2 flex items-center justify-between gap-3 text-xs">
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="font-medium text-[var(--color-ink)] truncate">
                    {child.title}
                  </span>
                  <span className="text-[10px] font-mono text-[var(--color-ink-muted)]">
                    {child.period}
                  </span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[11px] tabular-figure shrink-0">
                  <span>
                    {child.currentValue} / {child.targetValue} {child.unit}
                  </span>
                  <StatusBadge
                    status={mapStatusToSchedule(
                      child.status,
                      child.targetValue > 0 ? child.currentValue / child.targetValue : 0
                    )}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
