import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { Task, Target, EntityId } from '../../types';
import { domainService } from '../../services/domainService';
import { DropReasonModal } from './DropReasonModal';
import { SplitTaskModal } from './SplitTaskModal';
import { Button } from '../ui/Button';
import {
  Inbox,
  Calendar,
  GitFork,
  Trash2,
  Folder,
  ArrowRight,
  Clock,
  CheckCircle2,
  Archive,
} from 'lucide-react';

interface CarryOverInboxProps {
  todayStr: string;
}

export const CarryOverInbox: React.FC<CarryOverInboxProps> = ({ todayStr }) => {
  const [selectedTaskForDrop, setSelectedTaskForDrop] = useState<Task | null>(null);
  const [selectedTargetForDrop, setSelectedTargetForDrop] = useState<Target | null>(null);
  const [selectedTaskForSplit, setSelectedTaskForSplit] = useState<Task | null>(null);
  const [rescheduleDateMap, setRescheduleDateMap] = useState<Record<string, string>>({});

  // Query projects for attribution labels
  const projects = useLiveQuery(() => db.projects.toArray());
  const projectMap = new Map((projects || []).map((p) => [p.id, p.title]));

  // Query overdue tasks
  const overdueTasks = useLiveQuery(
    () =>
      db.tasks
        .filter(
          (t) =>
            !t.isDeleted &&
            t.status !== 'done' &&
            t.status !== 'dropped' &&
            ((t.scheduleDate !== undefined && t.scheduleDate < todayStr) ||
              (t.dueDate !== undefined && t.dueDate < todayStr))
        )
        .toArray(),
    [todayStr]
  );

  // Query overdue daily targets
  const overdueTargets = useLiveQuery(
    () =>
      db.targets
        .filter(
          (t) =>
            !t.isDeleted &&
            t.status !== 'done' &&
            t.status !== 'dropped' &&
            t.horizon === 'day' &&
            t.period < todayStr
        )
        .toArray(),
    [todayStr]
  );

  const totalOverdue = (overdueTasks?.length || 0) + (overdueTargets?.length || 0);

  const handleRescheduleTask = async (taskId: EntityId, newDate: string) => {
    await domainService.rescheduleTask(taskId, newDate);
  };

  const handleDeferTask = async (taskId: EntityId) => {
    await domainService.deferTaskToBacklog(taskId);
  };

  const handleRescheduleAllToToday = async () => {
    if (!overdueTasks || overdueTasks.length === 0) return;
    await domainService.batchRescheduleTasks(
      overdueTasks.map((t) => t.id),
      todayStr
    );
  };

  const handleConfirmTaskDrop = async (reason: string) => {
    if (!selectedTaskForDrop) return;
    await domainService.dropTask(selectedTaskForDrop.id, reason);
    setSelectedTaskForDrop(null);
  };

  const handleConfirmTargetDrop = async (reason: string) => {
    if (!selectedTargetForDrop) return;
    await domainService.updateTargetProgress(selectedTargetForDrop.id, 0, reason);
    await domainService.updateTarget(selectedTargetForDrop.id, { status: 'dropped' });
    setSelectedTargetForDrop(null);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Inbox Header & Batch Tools */}
      <div className="surface-card rounded-[var(--radius-sm)] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Inbox className="w-4 h-4 text-[var(--color-accent)]" />
            <h3 className="font-semibold text-sm">Carry-over inbox</h3>
            <span className="font-mono text-xs tabular-figure px-1.5 py-0.2 bg-[var(--color-paper-3)] border border-[var(--color-rule)] rounded text-[var(--color-ink)]">
              {totalOverdue} item{totalOverdue === 1 ? '' : 's'}
            </span>
          </div>
          <p className="text-xs text-[var(--color-ink-muted)] mt-1">
            Unfinished work from previous days. Decide whether to reschedule, split, drop with an explicit reason, or move to backlog.
          </p>
        </div>

        {totalOverdue > 0 && (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="primary" onClick={handleRescheduleAllToToday}>
              <Calendar className="w-3.5 h-3.5" />
              <span>Move all to today</span>
            </Button>
          </div>
        )}
      </div>

      {/* Main Inbox List */}
      <div className="flex flex-col gap-3">
        {totalOverdue === 0 ? (
          <div className="surface-card rounded-[var(--radius-sm)] p-12 text-center flex flex-col items-center gap-2.5">
            <CheckCircle2 className="w-8 h-8 text-[var(--color-status-on-track)] opacity-60" />
            <span className="text-sm font-semibold text-[var(--color-ink)]">
              Inbox zero: no plan drift
            </span>
            <span className="text-xs text-[var(--color-ink-muted)] max-w-sm">
              All tasks and targets from previous dates have been completed, rescheduled, or cleanly triaged.
            </span>
          </div>
        ) : (
          <>
            {/* Overdue Tasks */}
            {overdueTasks && overdueTasks.length > 0 && (
              <div className="flex flex-col gap-2.5">
                <span className="text-xs font-semibold text-[var(--color-ink-muted)] uppercase tracking-wider">
                  Overdue tasks ({overdueTasks.length})
                </span>

                <div className="flex flex-col divide-y divide-[var(--color-rule)] border border-[var(--color-rule)] rounded-[var(--radius-sm)] overflow-hidden bg-[var(--color-paper)]">
                  {overdueTasks.map((task) => {
                    const originalDate = task.scheduleDate || task.dueDate || 'past';
                    const targetNewDate = rescheduleDateMap[task.id] || todayStr;

                    return (
                      <div
                        key={task.id}
                        className="p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-[var(--color-paper-2)]/40 transition-colors"
                      >
                        {/* Task metadata */}
                        <div className="flex flex-col gap-1 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-semibold text-[var(--color-ink)] truncate">
                              {task.title}
                            </span>
                            {task.projectId && projectMap.get(task.projectId) && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[var(--color-ink-muted)] bg-[var(--color-paper-2)] px-1.5 py-0.2 rounded border border-[var(--color-rule)]">
                                <Folder className="w-3 h-3 text-[var(--color-accent)]" />
                                <span className="truncate max-w-[130px]">
                                  {projectMap.get(task.projectId)}
                                </span>
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-[var(--color-ink-muted)]">
                            <span className="text-[var(--color-status-behind)] flex items-center gap-1 font-semibold">
                              <Clock className="w-3 h-3" />
                              <span>Due {originalDate}</span>
                            </span>

                            {task.carriedOverFromDate && (
                              <span className="text-[var(--color-status-at-risk)] bg-[var(--color-paper-2)] px-1 py-0.2 rounded border border-[var(--color-rule)]">
                                Carried over from {task.carriedOverFromDate}
                              </span>
                            )}

                            {task.estimateMinutes && (
                              <span>~{task.estimateMinutes}m</span>
                            )}
                          </div>
                        </div>

                        {/* 4 Explicit Triage Actions (PRD 6.5) */}
                        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                          {/* Reschedule Button */}
                          <div className="flex items-center gap-1">
                            <input
                              type="date"
                              value={targetNewDate}
                              onChange={(e) =>
                                setRescheduleDateMap({
                                  ...rescheduleDateMap,
                                  [task.id]: e.target.value,
                                })
                              }
                              className="h-8 px-1.5 text-xs bg-[var(--color-paper-2)] border border-[var(--color-rule)] rounded font-mono text-[var(--color-ink)]"
                            />
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleRescheduleTask(task.id, targetNewDate)}
                              title="Reschedule to chosen date"
                            >
                              <Calendar className="w-3.5 h-3.5" />
                              <span>Move</span>
                            </Button>
                          </div>

                          {/* Split Action */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedTaskForSplit(task)}
                            title="Split into smaller tasks"
                          >
                            <GitFork className="w-3.5 h-3.5 text-[var(--color-accent)]" />
                            <span>Split</span>
                          </Button>

                          {/* Defer Action */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeferTask(task.id)}
                            title="Move to project backlog without scheduled date"
                          >
                            <Archive className="w-3.5 h-3.5 text-[var(--color-ink-muted)]" />
                            <span>Backlog</span>
                          </Button>

                          {/* Drop Action (PRD TR-3) */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedTaskForDrop(task)}
                            title="Drop task with explicit reason"
                            className="text-[var(--color-status-behind)] hover:text-[var(--color-status-behind)]"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Drop</span>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Overdue Targets */}
            {overdueTargets && overdueTargets.length > 0 && (
              <div className="flex flex-col gap-2.5 mt-2">
                <span className="text-xs font-semibold text-[var(--color-ink-muted)] uppercase tracking-wider">
                  Past daily targets ({overdueTargets.length})
                </span>

                <div className="flex flex-col divide-y divide-[var(--color-rule)] border border-[var(--color-rule)] rounded-[var(--radius-sm)] overflow-hidden bg-[var(--color-paper)]">
                  {overdueTargets.map((target) => (
                    <div
                      key={target.id}
                      className="p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-[var(--color-paper-2)]/40 transition-colors"
                    >
                      <div className="flex flex-col gap-1 flex-1 min-w-0">
                        <span className="text-xs font-semibold text-[var(--color-ink)] truncate">
                          {target.title}
                        </span>
                        <div className="flex items-center gap-2 text-[11px] font-mono text-[var(--color-ink-muted)]">
                          <span>
                            Logged: {target.currentValue} / {target.targetValue} {target.unit}
                          </span>
                          <span>·</span>
                          <span className="text-[var(--color-status-behind)]">
                            From {target.period}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            domainService.updateTarget(target.id, {
                              period: todayStr,
                              status: 'active',
                            })
                          }
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                          <span>Move to today</span>
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedTargetForDrop(target)}
                          className="text-[var(--color-status-behind)] hover:text-[var(--color-status-behind)]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Drop</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Drop Reason Modal for Task */}
      <DropReasonModal
        isOpen={selectedTaskForDrop !== null}
        onClose={() => setSelectedTaskForDrop(null)}
        itemTitle={selectedTaskForDrop?.title || ''}
        onConfirmDrop={handleConfirmTaskDrop}
      />

      {/* Drop Reason Modal for Target */}
      <DropReasonModal
        isOpen={selectedTargetForDrop !== null}
        onClose={() => setSelectedTargetForDrop(null)}
        itemTitle={selectedTargetForDrop?.title || ''}
        onConfirmDrop={handleConfirmTargetDrop}
      />

      {/* Split Task Modal */}
      <SplitTaskModal
        isOpen={selectedTaskForSplit !== null}
        onClose={() => setSelectedTaskForSplit(null)}
        task={selectedTaskForSplit}
      />
    </div>
  );
};

