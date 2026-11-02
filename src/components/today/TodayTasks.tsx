import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { Task, Priority } from '../../types';
import { domainService } from '../../services/domainService';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import {
  ListTodo,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Folder,
  Clock,
  ChevronDown,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface TodayTasksProps {
  tasks: Task[];
  dateStr: string;
  onOpenQuickAdd: () => void;
}

export const TodayTasks: React.FC<TodayTasksProps> = ({
  tasks,
  dateStr,
  onOpenQuickAdd,
}) => {
  const [newTitle, setNewTitle] = useState('');
  const [newEstimate, setNewEstimate] = useState<number>(30);
  const [newPriority, setNewPriority] = useState<Priority>('medium');
  const [isAddingInline, setIsAddingInline] = useState(false);
  const [expandedTaskIds, setExpandedTaskIds] = useState<string[]>([]);
  const [recentlyCompletedTaskIds, setRecentlyCompletedTaskIds] = useState<Set<string>>(() => new Set());

  // Query projects for labels
  const projects = useLiveQuery(() => db.projects.toArray());
  const projectMap = new Map((projects || []).map((p) => [p.id, p.title]));

  const handleToggleTask = async (taskId: string) => {
    await domainService.toggleTaskStatus(taskId);
    const task = tasks.find((item) => item.id === taskId);
    if (task && task.status !== 'done') {
      setRecentlyCompletedTaskIds((current) => new Set(current).add(taskId));
      window.setTimeout(() => {
        setRecentlyCompletedTaskIds((current) => {
          const next = new Set(current);
          next.delete(taskId);
          return next;
        });
      }, 400);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (confirm('Delete this task?')) {
      await domainService.softDeleteTask(taskId, 'Removed from today view');
    }
  };

  const handleToggleSubtask = async (task: Task, subtaskId: string) => {
    const updatedSubtasks = task.subtasks.map((st) =>
      st.id === subtaskId ? { ...st, isCompleted: !st.isCompleted } : st
    );
    await domainService.updateTask(task.id, { subtasks: updatedSubtasks });
  };

  const handleToggleExpand = (taskId: string) => {
    setExpandedTaskIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  };

  const handleCreateInlineTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    await domainService.createTask({
      title: newTitle.trim(),
      scheduleDate: dateStr,
      dueDate: dateStr,
      estimateMinutes: Number(newEstimate) || 30,
      priority: newPriority,
      status: 'active',
      subtasks: [],
      tags: [],
    });

    setNewTitle('');
    setIsAddingInline(false);
  };

  return (
    <div className="surface-card rounded-[var(--radius-sm)] p-4 flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 hairline-b pb-2.5">
        <div className="flex items-center gap-2">
          <ListTodo className="w-4 h-4 text-[var(--color-accent)]" />
          <h3 className="font-semibold text-sm text-[var(--color-ink)]">
            Tasks for today
          </h3>
          <span className="font-mono text-xs tabular-figure text-[var(--color-ink-muted)]">
            ({tasks.filter((t) => t.status === 'done').length}/{tasks.length})
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={onOpenQuickAdd}>
            <Sparkles className="w-3.5 h-3.5 text-[var(--color-accent)]" />
            <span>Add anywhere</span>
          </Button>

          <Button
            size="sm"
            variant="primary"
            onClick={() => setIsAddingInline(!isAddingInline)}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isAddingInline ? 'Close' : 'Add task'}</span>
          </Button>
        </div>
      </div>

      {/* Inline Add Task Form */}
      {isAddingInline && (
        <form
          onSubmit={handleCreateInlineTask}
          className="surface-well p-3 rounded-[var(--radius-xs)] border border-[var(--color-rule)] flex flex-col gap-2.5"
        >
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Input
                placeholder="What needs to get done?"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                autoFocus
                required
              />
            </div>
            <div className="w-24">
              <Input
                type="number"
                min="5"
                step="5"
                value={newEstimate}
                onChange={(e) => setNewEstimate(parseInt(e.target.value, 10) || 15)}
                helperText="mins"
              />
            </div>
            <select
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value as Priority)}
              className="h-9 px-2 text-xs bg-[var(--color-paper)] border border-[var(--color-rule)] rounded text-[var(--color-ink)] capitalize font-mono"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
            <Button size="sm" variant="primary" onClick={handleCreateInlineTask}>
              Save
            </Button>
          </div>
        </form>
      )}

      {/* Task List */}
      <div className="flex flex-col divide-y divide-[var(--color-rule)]">
        {tasks.length === 0 ? (
          <div className="py-8 text-center text-xs text-[var(--color-ink-muted)]">
                Nothing planned for today yet. Add a task here or press <kbd className="px-1 py-0.5 rounded bg-[var(--color-paper-2)] border border-[var(--color-rule)] font-mono text-[10px]">Ctrl+K</kbd> to add one from anywhere.
          </div>
        ) : (
          tasks.map((task) => {
            const isDone = task.status === 'done';
            const isExpanded = expandedTaskIds.includes(task.id);
            const hasSubtasks = task.subtasks && task.subtasks.length > 0;
            const subtasksCompleted = hasSubtasks
              ? task.subtasks.filter((st) => st.isCompleted).length
              : 0;

            const priorityBadgeColors: Record<Priority, string> = {
              urgent: 'text-[var(--color-status-behind)] bg-[var(--color-status-behind-bg)] border-[var(--color-status-behind)]',
              high: 'text-[var(--color-status-at-risk)] bg-[var(--color-status-at-risk-bg)] border-[var(--color-status-at-risk)]',
              medium: 'text-[var(--color-ink-muted)] bg-[var(--color-paper-3)] border-[var(--color-rule)]',
              low: 'text-[var(--color-ink-subtle)] bg-[var(--color-paper-2)] border-[var(--color-rule)]',
            };

            return (
              <div
                key={task.id}
                className={`task-row py-3 flex flex-col gap-2 hover:bg-[var(--color-paper-2)]/40 px-2 rounded-[var(--radius-xs)] transition-colors ${recentlyCompletedTaskIds.has(task.id) && isDone ? 'task-row--just-completed' : ''}`}
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Checkbox & Title */}
                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => handleToggleTask(task.id)}
                      className={`task-completion-button text-[var(--color-ink-muted)] hover:text-[var(--color-accent)] ${recentlyCompletedTaskIds.has(task.id) && isDone ? 'task-completion-button--celebrate' : ''}`}
                      title={isDone ? 'Mark as not done' : 'Mark complete'}
                      aria-label={isDone ? `Mark “${task.title}” as not done` : `Mark “${task.title}” complete`}
                      aria-pressed={isDone}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-[var(--color-status-on-track)]" />
                      ) : (
                        <Circle className="w-4 h-4" />
                      )}
                    </button>

                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-xs font-semibold ${
                            isDone ? 'line-through opacity-70 text-[var(--color-ink-muted)]' : 'text-[var(--color-ink)]'
                          }`}
                        >
                          {task.title}
                        </span>

                        {task.projectId && projectMap.get(task.projectId) && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[var(--color-ink-muted)] bg-[var(--color-paper-2)] px-1.5 py-0.2 rounded border border-[var(--color-rule)]">
                            <Folder className="w-3 h-3 text-[var(--color-accent)]" />
                            <span className="truncate max-w-[140px]">
                              {projectMap.get(task.projectId)}
                            </span>
                          </span>
                        )}
                      </div>

                      {/* Meta stats row */}
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-[var(--color-ink-muted)] mt-1">
                        <span
                          className={`px-1.5 py-0.2 rounded border text-[10px]  font-semibold ${priorityBadgeColors[task.priority]}`}
                        >
                          {task.priority}
                        </span>

                        {task.estimateMinutes && (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[var(--color-ink-subtle)]" />
                            <span className="tabular-figure">
                              {task.actualMinutes ? `${task.actualMinutes}m / ` : ''}~{task.estimateMinutes}m
                            </span>
                          </span>
                        )}

                        {hasSubtasks && (
                          <button
                            type="button"
                            onClick={() => handleToggleExpand(task.id)}
                            className="inline-flex items-center gap-1 text-[var(--color-accent)] hover:underline focus-visible:outline-2"
                          >
                            <span>
                              {subtasksCompleted}/{task.subtasks.length} steps
                            </span>
                            {isExpanded ? (
                              <ChevronDown className="w-3 h-3" />
                            ) : (
                              <ChevronRight className="w-3 h-3" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleDeleteTask(task.id)}
                      className="text-[var(--color-ink-subtle)] hover:text-[var(--color-status-behind)] p-1 rounded focus-visible:outline-2"
                      title="Delete task"
                      aria-label="Delete task"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Subtask Checklist Drawer */}
                {hasSubtasks && isExpanded && (
                  <div className="ml-6 pl-2 hairline-l flex flex-col gap-1.5 pt-1">
                    {task.subtasks.map((st) => (
                      <label
                        key={st.id}
                        className="flex items-center gap-2 text-xs cursor-pointer text-[var(--color-ink)]"
                      >
                        <input
                          type="checkbox"
                          checked={st.isCompleted}
                          onChange={() => handleToggleSubtask(task, st.id)}
                          className="accent-[var(--color-accent)] w-3.5 h-3.5 rounded"
                        />
                        <span className={st.isCompleted ? 'line-through opacity-70' : ''}>
                          {st.title}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

