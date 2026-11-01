import React, { useState, useEffect } from 'react';
import { Task } from '../../types';
import { domainService } from '../../services/domainService';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Plus, Trash2, Check } from 'lucide-react';

interface SplitTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
}

interface SplitItem {
  id: string;
  title: string;
  estimateMinutes: number;
}

export const SplitTaskModal: React.FC<SplitTaskModalProps> = ({
  isOpen,
  onClose,
  task,
}) => {
  const [splits, setSplits] = useState<SplitItem[]>([]);

  useEffect(() => {
    if (!task) return;
    const halfEst = Math.max(15, Math.round((task.estimateMinutes || 60) / 2));
    setSplits([
      { id: '1', title: `${task.title} (Part 1)`, estimateMinutes: halfEst },
      { id: '2', title: `${task.title} (Part 2)`, estimateMinutes: halfEst },
    ]);
  }, [task]);

  if (!task) return null;

  const handleAddSplit = () => {
    setSplits((prev) => [
      ...prev,
      {
        id: String(prev.length + 1),
        title: `${task.title} (Part ${prev.length + 1})`,
        estimateMinutes: 30,
      },
    ]);
  };

  const handleRemoveSplit = (idx: number) => {
    if (splits.length <= 2) return;
    setSplits((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleChange = (idx: number, field: 'title' | 'estimateMinutes', val: string | number) => {
    setSplits((prev) => {
      const next = [...prev];
      if (field === 'title') {
        next[idx].title = String(val);
      } else {
        next[idx].estimateMinutes = Number(val);
      }
      return next;
    });
  };

  const handleConfirmSplit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (splits.length < 2) return;

    await domainService.splitTask(
      task.id,
      splits.map((s) => ({
        title: s.title,
        estimateMinutes: s.estimateMinutes,
      }))
    );

    onClose();
  };

  const totalMinutes = splits.reduce((acc, s) => acc + (s.estimateMinutes || 0), 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Split task into smaller pieces"
      subtitle={`Break down "${task.title}" so it can be accomplished across manageable sessions.`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirmSplit}
            disabled={splits.some((s) => !s.title.trim())}
          >
            <Check className="w-3.5 h-3.5" />
            <span>Split into {splits.length} tasks</span>
          </Button>
        </>
      }
    >
      <form onSubmit={handleConfirmSplit} className="flex flex-col gap-3.5">
        <div className="flex items-center justify-between text-xs font-mono text-[var(--color-ink-muted)] hairline-b pb-2">
          <span>Sub-tasks ({splits.length})</span>
          <span>
            Total: <strong className="text-[var(--color-ink)] tabular-figure">{totalMinutes}m</strong>
          </span>
        </div>

        <div className="flex flex-col gap-2.5 max-h-[300px] overflow-y-auto">
          {splits.map((split, idx) => (
            <div
              key={split.id}
              className="flex items-center gap-2 bg-[var(--color-paper-2)]/60 p-2 rounded-[var(--radius-xs)] border border-[var(--color-rule)]"
            >
              <span className="font-mono text-xs text-[var(--color-ink-muted)] w-5 text-center">
                #{idx + 1}
              </span>
              <div className="flex-1">
                <Input
                  placeholder="Task title"
                  value={split.title}
                  onChange={(e) => handleChange(idx, 'title', e.target.value)}
                  required
                />
              </div>
              <div className="w-24">
                <Input
                  type="number"
                  min="5"
                  step="5"
                  value={split.estimateMinutes}
                  onChange={(e) => handleChange(idx, 'estimateMinutes', e.target.value)}
                  helperText="mins"
                  required
                />
              </div>
              {splits.length > 2 && (
                <button
                  type="button"
                  onClick={() => handleRemoveSplit(idx)}
                  className="text-[var(--color-ink-subtle)] hover:text-[var(--color-status-behind)] p-1.5 focus-visible:outline-2"
                  title="Remove part"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>

        <Button size="sm" variant="secondary" onClick={handleAddSplit}>
          <Plus className="w-3.5 h-3.5" />
          <span>Add another piece</span>
        </Button>
      </form>
    </Modal>
  );
};
