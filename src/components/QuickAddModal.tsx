import React, { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { parseQuickAdd, ParsedQuickAdd } from '../utils/quickAddParser';
import { getLocalDateString } from '../utils/dateUtils';
import { domainService } from '../services/domainService';
import { Button } from './ui/Button';
import { StatusBadge } from './StatusBadge';
import {
  Sparkles,
  Calendar,
  Clock,
  Flag,
  Target as TargetIcon,
  Folder,
  CornerDownLeft,
  CheckCircle2,
  AlertTriangle,
  X,
  HelpCircle,
} from 'lucide-react';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialText?: string;
}

export const QuickAddModal: React.FC<QuickAddModalProps> = ({
  isOpen,
  onClose,
  initialText = '',
}) => {
  const [input, setInput] = useState(initialText);
  const [parsed, setParsed] = useState<ParsedQuickAdd>(() => parseQuickAdd(initialText));
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showCheatSheet, setShowCheatSheet] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Load existing projects & milestones to resolve queries
  const projects = useLiveQuery(() => db.projects.filter((p) => !p.isDeleted).toArray(), []);
  const milestones = useLiveQuery(() => db.milestones.filter((m) => !m.isDeleted).toArray(), []);

  // Update parsed whenever input changes
  useEffect(() => {
    setParsed(parseQuickAdd(input));
    setSaveError(null);
  }, [input]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setInput(initialText || '');
      setSaveSuccess(null);
      setSaveError(null);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, initialText]);

  // Escape key & Tab focus trap listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first || !dialogRef.current.contains(document.activeElement)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last || !dialogRef.current.contains(document.activeElement)) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Derive dynamic example tokens from user's actual projects/milestones or generic defaults
  const sampleProjectToken = projects && projects.length > 0
    ? `#${projects[0].title.trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'project'}`
    : '#project';
  const sampleMilestoneToken = milestones && milestones.length > 0
    ? `>${milestones[0].title.trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'phase1'}`
    : '>phase1';

  // Resolve matching project
  const matchedProject = projects?.find((p) => {
    if (!parsed.projectQuery) return false;
    const q = parsed.projectQuery.toLowerCase();
    return (
      p.id.toLowerCase().includes(q) ||
      p.title.toLowerCase().includes(q) ||
      p.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  // Resolve matching milestone
  const matchedMilestone = milestones?.find((m) => {
    if (!parsed.milestoneQuery) return false;
    const q = parsed.milestoneQuery.toLowerCase();
    return m.id.toLowerCase().includes(q) || m.title.toLowerCase().includes(q);
  });

  // Unknown token warnings
  const unknownWarnings: string[] = [];
  if (parsed.projectQuery && projects && !matchedProject) {
    unknownWarnings.push(`Unknown project "#${parsed.projectQuery}" — task will be saved to Unsorted Inbox.`);
  }
  if (parsed.milestoneQuery && milestones && !matchedMilestone) {
    unknownWarnings.push(`Unknown milestone ">${parsed.milestoneQuery}" — milestone link will be skipped.`);
  }

  const handleAppendToken = (token: string) => {
    setInput((prev) => {
      const trimmed = prev.trim();
      return trimmed ? `${trimmed} ${token}` : token;
    });
    inputRef.current?.focus();
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || !parsed.title.trim() || parsed.title === 'Untitled Item') {
      setSaveError('Please enter a task title before saving.');
      return;
    }
    if (parsed.errors.length > 0) {
      setSaveError(parsed.errors[0]);
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    try {
      // 1. Create measurable target if +unit:value is provided
      let targetId: string | undefined;
      if (parsed.targetMetric) {
        const newTarget = await domainService.createTarget({
          projectId: matchedProject?.id,
          horizon: 'day',
          period: parsed.scheduleDate || getLocalDateString(),
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

      // 2. Create Task
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

      setSaveSuccess(`Added to Ledger: "${parsed.title}"`);
      setTimeout(() => {
        setIsSaving(false);
        onClose();
      }, 700);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save task.');
      setIsSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Quick Add Task"
      className="fixed inset-0 z-[400] flex items-start justify-center pt-20 px-4 bg-[var(--color-scrim)] backdrop-contrast-125"
    >
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      <div
        ref={dialogRef}
        className="relative w-full max-w-2xl bg-[var(--color-paper)] border border-[var(--color-rule-strong)] rounded-[var(--radius-sm)] flex flex-col overflow-hidden z-10 text-[var(--color-ink)]"
      >
        {/* Top Input Bar */}
        <form onSubmit={handleSave} className="flex flex-col">
          <div className="p-4 bg-[var(--color-paper-2)] hairline-b flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-[var(--color-accent)] shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              aria-label="Quick add task input"
              placeholder={`Draft project brief ${sampleProjectToken} ${sampleMilestoneToken} ~45m !high @today +pages:5`}
              className="w-full bg-transparent text-sm font-normal text-[var(--color-ink)] placeholder:text-[var(--color-ink-subtle)] focus:outline-none"
            />
            <button
              type="button"
              onClick={onClose}
              className="p-1 min-w-6 min-h-6 inline-flex items-center justify-center text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] rounded"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Grammar Token Helper Chips */}
          <div className="px-4 py-2 bg-[var(--color-paper)] hairline-b flex flex-wrap items-center gap-1.5 text-xs text-[var(--color-ink-muted)]">
            <span className="text-xs text-[var(--color-ink-subtle)] mr-1 font-medium">Examples:</span>
            <button
              type="button"
              onClick={() => handleAppendToken(sampleProjectToken)}
              className="px-1.5 py-0.5 min-h-6 rounded bg-[var(--color-paper-2)] hover:bg-[var(--color-paper-3)] border border-[var(--color-rule)] text-xs text-[var(--color-accent)]"
            >
              {sampleProjectToken}
            </button>
            <button
              type="button"
              onClick={() => handleAppendToken(sampleMilestoneToken)}
              className="px-1.5 py-0.5 min-h-6 rounded bg-[var(--color-paper-2)] hover:bg-[var(--color-paper-3)] border border-[var(--color-rule)] text-xs text-[var(--color-accent)]"
            >
              {sampleMilestoneToken}
            </button>
            <button
              type="button"
              onClick={() => handleAppendToken('~45m')}
              className="px-1.5 py-0.5 min-h-6 rounded bg-[var(--color-paper-2)] hover:bg-[var(--color-paper-3)] border border-[var(--color-rule)] text-xs text-[var(--color-ink)]"
            >
              ~45m
            </button>
            <button
              type="button"
              onClick={() => handleAppendToken('!high')}
              className="px-1.5 py-0.5 min-h-6 rounded bg-[var(--color-paper-2)] hover:bg-[var(--color-paper-3)] border border-[var(--color-rule)] text-xs text-[var(--color-status-at-risk)]"
            >
              !high
            </button>
            <button
              type="button"
              onClick={() => handleAppendToken('@today')}
              className="px-1.5 py-0.5 min-h-6 rounded bg-[var(--color-paper-2)] hover:bg-[var(--color-paper-3)] border border-[var(--color-rule)] text-xs text-[var(--color-ink)]"
            >
              @today
            </button>
            <button
              type="button"
              onClick={() => handleAppendToken('+pages:5')}
              className="px-1.5 py-0.5 min-h-6 rounded bg-[var(--color-paper-2)] hover:bg-[var(--color-paper-3)] border border-[var(--color-rule)] text-xs text-[var(--color-accent)]"
            >
              +pages:5
            </button>

            <button
              type="button"
              onClick={() => setShowCheatSheet(!showCheatSheet)}
              className="ml-auto min-h-6 inline-flex items-center gap-1 text-xs text-[var(--color-ink-subtle)] hover:text-[var(--color-ink)]"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>How quick add works</span>
            </button>
          </div>

          {/* Grammar Cheat Sheet Modal Dropdown */}
          {showCheatSheet && (
            <div className="p-3 bg-[var(--color-paper-2)] hairline-b text-xs text-[var(--color-ink-muted)] flex flex-col gap-1.5 font-mono">
              <div className="font-bold text-[var(--color-ink)] mb-0.5">Add details with these shortcuts:</div>
              <div><strong className="text-[var(--color-accent)]">#name</strong> Project or goal (e.g. {sampleProjectToken})</div>
              <div><strong className="text-[var(--color-accent)]">&gt;name</strong> Phase, milestone, or week (e.g. {sampleMilestoneToken}, &gt;week3)</div>
              <div><strong className="text-[var(--color-ink)]">~time</strong> Time estimate in minutes or hours (e.g. ~45m, ~1.5h)</div>
              <div><strong className="text-[var(--color-status-at-risk)]">!prio</strong> Priority: !urgent, !high, !med, !low</div>
              <div><strong className="text-[var(--color-ink)]">@date</strong> Date: @today, @tomorrow, @fri, @2026-11-14</div>
              <div><strong className="text-[var(--color-accent)]">+unit:val</strong> Measurable target (e.g. +pages:20, +chapters:2)</div>
            </div>
          )}

          {/* Live Decomposition & Preview Card */}
          <div className="p-4 flex flex-col gap-3">
            <div className="text-xs text-[var(--color-ink-muted)] font-semibold flex items-center justify-between">
              <span>Preview</span>
              <span className="text-xs text-[var(--color-ink-subtle)]">
                {parsed.tokens.length} details found
              </span>
            </div>

            {/* Structured Card Preview */}
            <div className="surface-well border border-[var(--color-rule)] rounded-[var(--radius-xs)] p-3.5 flex flex-col gap-2.5">
              <div className="flex items-start justify-between gap-3">
                <span className="font-semibold text-sm text-[var(--color-ink)] leading-snug">
                  {parsed.title}
                </span>
                <StatusBadge status="on_track" />
              </div>

              {/* Badges strip */}
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                {/* Project */}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--color-paper)] border border-[var(--color-rule)] text-[var(--color-accent)]">
                  <Folder className="w-3 h-3" />
                  <span>
                    {matchedProject ? matchedProject.title : parsed.projectQuery ? `#${parsed.projectQuery} (Unmatched)` : 'Unsorted Inbox'}
                  </span>
                </span>

                {/* Milestone */}
                {parsed.milestoneQuery && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--color-paper)] border border-[var(--color-rule)] text-[var(--color-ink)]">
                    <span>&gt;</span>
                    <span>
                      {matchedMilestone ? matchedMilestone.title : `${parsed.milestoneQuery} (Unmatched)`}
                    </span>
                  </span>
                )}

                {/* Estimate */}
                {parsed.estimateMinutes !== undefined && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--color-paper)] border border-[var(--color-rule)] text-[var(--color-ink)] tabular-figure">
                    <Clock className="w-3 h-3 text-[var(--color-ink-muted)]" />
                    <span>{parsed.estimateMinutes}m</span>
                  </span>
                )}

                {/* Priority */}
                {parsed.priority && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--color-paper)] border border-[var(--color-rule)] text-[var(--color-ink)] capitalize">
                    <Flag className="w-3 h-3 text-[var(--color-status-at-risk)]" />
                    <span>{parsed.priority}</span>
                  </span>
                )}

                {/* Date */}
                {parsed.scheduleDate && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--color-paper)] border border-[var(--color-rule)] text-[var(--color-ink)] tabular-figure">
                    <Calendar className="w-3 h-3 text-[var(--color-ink-muted)]" />
                    <span>{parsed.scheduleDateLabel}</span>
                  </span>
                )}

                {/* Target Metric */}
                {parsed.targetMetric && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--color-paper)] border border-[var(--color-rule)] text-[var(--color-accent)] font-semibold tabular-figure">
                    <TargetIcon className="w-3 h-3" />
                    <span>
                      Target: {parsed.targetMetric.value} {parsed.targetMetric.unit}
                    </span>
                  </span>
                )}
              </div>
            </div>

            {/* Unknown Project / Milestone Warning */}
            {unknownWarnings.length > 0 && (
              <div
                role="status"
                className="p-2.5 bg-[var(--color-status-at-risk-bg)] text-[var(--color-status-at-risk)] rounded-[var(--radius-xs)] border border-[var(--color-status-at-risk)]/30 flex items-start gap-2 text-xs font-mono"
              >
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-0.5">
                  {unknownWarnings.map((w, idx) => (
                    <span key={idx}>{w}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Validation Errors (e.g. @2026-02-30, @frday, blank title) */}
            {(parsed.errors.length > 0 || saveError) && (
              <div
                role="alert"
                className="p-2.5 bg-[var(--color-status-behind-bg)] text-[var(--color-status-behind)] rounded-[var(--radius-xs)] border border-[var(--color-status-behind)]/30 flex items-start gap-2 text-xs font-mono font-medium"
              >
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-0.5">
                  {saveError && <span>{saveError}</span>}
                  {parsed.errors.map((err, idx) => (
                    <span key={idx}>{err}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Notification on save */}
            {saveSuccess && (
              <div className="p-2.5 bg-[var(--color-status-on-track-bg)] text-[var(--color-status-on-track)] rounded-[var(--radius-xs)] border border-[var(--color-rule)] flex items-center gap-2 text-xs font-mono font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{saveSuccess}</span>
              </div>
            )}
          </div>

          {/* Footer Bar */}
          <div className="hairline-t px-4 py-3 bg-[var(--color-paper-2)] flex items-center justify-between text-xs text-[var(--color-ink-muted)]">
            <div className="flex items-center gap-2">
              <kbd className="px-1.5 py-0.5 bg-[var(--color-paper)] border border-[var(--color-rule)] rounded">Esc</kbd>
              <span>to close</span>
              <span>and</span>
              <kbd className="px-1.5 py-0.5 bg-[var(--color-paper)] border border-[var(--color-rule)] rounded">Enter</kbd>
              <span>to save</span>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={onClose} disabled={isSaving}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" isLoading={isSaving} disabled={parsed.errors.length > 0}>
                <CornerDownLeft className="w-3.5 h-3.5" />
                <span>Add to Ledger</span>
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
