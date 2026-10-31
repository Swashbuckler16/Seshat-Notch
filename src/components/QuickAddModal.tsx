import React, { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { parseQuickAdd, ParsedQuickAdd } from '../utils/quickAddParser';
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
  const [showCheatSheet, setShowCheatSheet] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load existing projects & milestones to resolve queries
  const projects = useLiveQuery(() => db.projects.where('isDeleted').equals(0).toArray(), []);
  const milestones = useLiveQuery(() => db.milestones.where('isDeleted').equals(0).toArray(), []);

  // Update parsed whenever input changes
  useEffect(() => {
    setParsed(parseQuickAdd(input));
  }, [input]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setInput(initialText || '');
      setSaveSuccess(null);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, initialText]);

  // Escape key listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

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

  const handleAppendToken = (token: string) => {
    setInput((prev) => {
      const trimmed = prev.trim();
      return trimmed ? `${trimmed} ${token}` : token;
    });
    inputRef.current?.focus();
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;

    setIsSaving(true);
    try {
      // 1. Create measurable target if +unit:value is provided
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
      console.error('Quick-add save error:', err);
      setIsSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[400] flex items-start justify-center pt-20 px-4 bg-black/45 backdrop-contrast-125"
    >
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      <div className="relative w-full max-w-2xl bg-[var(--color-paper)] border border-[var(--color-rule-strong)] shadow-2xl rounded-[var(--radius-sm)] flex flex-col overflow-hidden z-10 text-[var(--color-ink)]">
        {/* Top Input Bar */}
        <form onSubmit={handleSave} className="flex flex-col">
          <div className="p-4 bg-[var(--color-paper-2)] hairline-b flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-[var(--color-accent)] shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Write Kerberoasting card #heimdall >baseline ~90m !high @fri +rules:2"
              className="w-full bg-transparent text-sm font-normal text-[var(--color-ink)] placeholder:text-[var(--color-ink-subtle)] focus:outline-none"
            />
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] rounded"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Grammar Token Helper Chips */}
          <div className="px-4 py-2 bg-[var(--color-paper)] hairline-b flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--color-ink-muted)]">
            <span className="font-mono text-[10px] text-[var(--color-ink-subtle)] mr-1">Insert:</span>
            <button
              type="button"
              onClick={() => handleAppendToken('#heimdall')}
              className="px-1.5 py-0.5 rounded bg-[var(--color-paper-2)] hover:bg-[var(--color-paper-3)] border border-[var(--color-rule)] font-mono text-[var(--color-accent)]"
            >
              #heimdall
            </button>
            <button
              type="button"
              onClick={() => handleAppendToken('>baseline')}
              className="px-1.5 py-0.5 rounded bg-[var(--color-paper-2)] hover:bg-[var(--color-paper-3)] border border-[var(--color-rule)] font-mono text-[var(--color-accent)]"
            >
              &gt;baseline
            </button>
            <button
              type="button"
              onClick={() => handleAppendToken('~90m')}
              className="px-1.5 py-0.5 rounded bg-[var(--color-paper-2)] hover:bg-[var(--color-paper-3)] border border-[var(--color-rule)] font-mono text-[var(--color-ink)]"
            >
              ~90m
            </button>
            <button
              type="button"
              onClick={() => handleAppendToken('!high')}
              className="px-1.5 py-0.5 rounded bg-[var(--color-paper-2)] hover:bg-[var(--color-paper-3)] border border-[var(--color-rule)] font-mono text-[var(--color-status-at-risk)]"
            >
              !high
            </button>
            <button
              type="button"
              onClick={() => handleAppendToken('@today')}
              className="px-1.5 py-0.5 rounded bg-[var(--color-paper-2)] hover:bg-[var(--color-paper-3)] border border-[var(--color-rule)] font-mono text-[var(--color-ink)]"
            >
              @today
            </button>
            <button
              type="button"
              onClick={() => handleAppendToken('+rules:2')}
              className="px-1.5 py-0.5 rounded bg-[var(--color-paper-2)] hover:bg-[var(--color-paper-3)] border border-[var(--color-rule)] font-mono text-[var(--color-accent)]"
            >
              +rules:2
            </button>

            <button
              type="button"
              onClick={() => setShowCheatSheet(!showCheatSheet)}
              className="ml-auto inline-flex items-center gap-1 text-[11px] text-[var(--color-ink-subtle)] hover:text-[var(--color-ink)]"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Grammar Help</span>
            </button>
          </div>

          {/* Grammar Cheat Sheet Modal Dropdown */}
          {showCheatSheet && (
            <div className="p-3 bg-[var(--color-paper-2)] hairline-b text-xs text-[var(--color-ink-muted)] flex flex-col gap-1.5 font-mono text-[11px]">
              <div className="font-bold text-[var(--color-ink)] mb-0.5">Quick-Add Grammar Rules (PRD 6.9):</div>
              <div><strong className="text-[var(--color-accent)]">#name</strong> Project, goal, or area (e.g. #heimdall, #secplus)</div>
              <div><strong className="text-[var(--color-accent)]">&gt;name</strong> Phase, milestone, or week (e.g. &gt;baseline, &gt;week3)</div>
              <div><strong className="text-[var(--color-ink)]">~time</strong> Time estimate in minutes or hours (e.g. ~90m, ~1.5h)</div>
              <div><strong className="text-[var(--color-status-at-risk)]">!prio</strong> Priority: !urgent, !high, !med, !low</div>
              <div><strong className="text-[var(--color-ink)]">@date</strong> Date: @today, @tomorrow, @fri, @2026-11-14</div>
              <div><strong className="text-[var(--color-accent)]">+unit:val</strong> Measurable target (e.g. +rules:2, +pages:20)</div>
            </div>
          )}

          {/* Live Decomposition & Preview Card (PRD 6.9: Live preview before saving) */}
          <div className="p-4 flex flex-col gap-3">
            <div className="text-[11px] uppercase tracking-wider text-[var(--color-ink-muted)] font-semibold flex items-center justify-between">
              <span>Live Parse Preview</span>
              <span className="font-mono text-[10px] text-[var(--color-ink-subtle)]">
                {parsed.tokens.length} tokens extracted
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
                    {matchedProject ? matchedProject.title : parsed.projectQuery ? `#${parsed.projectQuery}` : 'Unsorted Inbox'}
                  </span>
                </span>

                {/* Milestone */}
                {parsed.milestoneQuery && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--color-paper)] border border-[var(--color-rule)] text-[var(--color-ink)]">
                    <span>&gt;</span>
                    <span>
                      {matchedMilestone ? matchedMilestone.title : parsed.milestoneQuery}
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
            <div className="flex items-center gap-2 font-mono text-[11px]">
              <kbd className="px-1.5 py-0.5 bg-[var(--color-paper)] border border-[var(--color-rule)] rounded">Esc</kbd>
              <span>to close</span>
              <span className="opacity-50">·</span>
              <kbd className="px-1.5 py-0.5 bg-[var(--color-paper)] border border-[var(--color-rule)] rounded">Enter</kbd>
              <span>to save</span>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={onClose} disabled={isSaving}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" isLoading={isSaving} disabled={!input.trim()}>
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

