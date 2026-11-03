import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { ActivityToday } from '../activities/ActivityToday';
import { ExecutionStrip } from './ExecutionStrip';
import { TodayTasks } from './TodayTasks';
import { TodayTargets } from './TodayTargets';
import { getISOWeekString } from '../../utils/periodUtils';
import { getLocalDateString } from '../../utils/dateUtils';
import { dataOwnershipService } from '../../services/dataOwnershipService';
import { Inbox, ArrowRight, HardDriveDownload, X } from 'lucide-react';

interface TodayViewProps {
  onOpenQuickAdd: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const TodayView: React.FC<TodayViewProps> = ({ onOpenQuickAdd, onNavigateTab }) => {
  // Default to today's local date YYYY-MM-DD
  const [dateStr, setDateStr] = useState<string>(() => {
    return getLocalDateString();
  });
  const [backupDue, setBackupDue] = useState<boolean>(() =>
    dataOwnershipService.isBackupDueToday()
  );
  const [savingBackup, setSavingBackup] = useState<boolean>(false);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);
  const lastBackupDate = dataOwnershipService.getLastFileBackupDate();

  const handleSaveDailyBackup = async () => {
    try {
      setSavingBackup(true);
      const res = await dataOwnershipService.saveBackupToLocalFile();
      if (res.saved) {
        setBackupDue(false);
        setBackupMessage(`Saved backup to ${res.path || res.filename}`);
      }
    } finally {
      setSavingBackup(false);
    }
  };

  const handleSnoozeBackup = () => {
    dataOwnershipService.snoozeBackupPromptForToday();
    setBackupDue(false);
  };

  // Query tasks for dateStr (scheduled on or due on this date)
  const tasks = useLiveQuery(
    () =>
      db.tasks
        .filter(
          (t) =>
            !t.isDeleted &&
            (t.scheduleDate === dateStr || t.dueDate === dateStr)
        )
        .toArray(),
    [dateStr]
  );

  const currentWeekStr = getISOWeekString(new Date(`${dateStr}T00:00:00`));

  // Query daily targets for dateStr and weekly targets for current week (consistent calculation)
  const targets = useLiveQuery(
    () =>
      db.targets
        .filter(
          (t) =>
            !t.isDeleted &&
            ((t.horizon === 'day' && t.period === dateStr) ||
              (t.horizon === 'week' && t.period === currentWeekStr))
        )
        .toArray(),
    [dateStr, currentWeekStr]
  );

  return (
    <div className="flex flex-col gap-6">
      <ActivityToday date={dateStr} onDateChange={setDateStr} />

      {/* Daily Backup Due Banner */}
      {backupDue && (
        <div
          role="region"
          aria-label="Backup due prompt"
          className="surface-card rounded-[var(--radius-sm)] p-3.5 border border-[var(--color-rule)] bg-[var(--color-paper-2)] flex flex-wrap items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30 flex items-center justify-center text-[var(--color-accent)] shrink-0">
              <HardDriveDownload className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-xs text-[var(--color-ink)]">
                Save a copy of your plans
              </h3>
              <p className="text-xs text-[var(--color-ink-muted)]">
                Keep a backup file of your plans, activity, and settings on your computer.
                {lastBackupDate ? ` Last saved: ${lastBackupDate}.` : ' No disk backup saved yet.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={savingBackup}
              onClick={handleSaveDailyBackup}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[var(--color-accent)] text-[var(--color-accent-ink)] rounded-[var(--radius-xs)] hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <HardDriveDownload className="w-3.5 h-3.5" />
              <span>{savingBackup ? 'Saving…' : 'Save backup file'}</span>
            </button>
            <button
              type="button"
              onClick={handleSnoozeBackup}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] border border-[var(--color-rule)] bg-[var(--color-paper)] rounded-[var(--radius-xs)]"
              title="Remind me tomorrow"
            >
              <span>Later</span>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {backupMessage && (
        <div className="surface-card rounded-[var(--radius-sm)] px-3.5 py-2.5 border border-[var(--color-emerald)]/40 bg-[var(--color-paper-2)] flex items-center justify-between text-xs text-[var(--color-ink)]">
          <span>{backupMessage}</span>
          <button
            type="button"
            onClick={() => setBackupMessage(null)}
            className="text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
            aria-label="Dismiss backup confirmation"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Sunday Weekly Review & Triage Prompt */}
      {onNavigateTab && (
        <div className="surface-card rounded-[var(--radius-sm)] p-4 border border-[var(--color-accent)]/50 bg-[var(--color-paper-2)] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30 flex items-center justify-center text-[var(--color-accent)]">
              <Inbox className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-xs text-[var(--color-ink)]">
                Review this week
              </h3>
              <p className="text-xs text-[var(--color-ink-muted)]">
                Look back at what got done and choose what to carry into next week.
              </p>
            </div>
          </div>
          {onNavigateTab && (
            <button
              type="button"
              onClick={() => onNavigateTab('reviews')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[var(--color-accent)] text-[var(--color-accent-ink)] rounded-[var(--radius-xs)] hover:opacity-90 transition-opacity"
            >
              <span>Review the week</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Recent focus sessions and quick task actions */}
      <ExecutionStrip tasks={tasks || []} dateStr={dateStr} />

      {/* 3. Main Operational Grid: Tasks & Targets (Left) | Habits (Right) */}
      <div className="grid grid-cols-1 gap-6 items-start">
        {/* Left Column: Tasks and Targets */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TodayTasks
            tasks={tasks || []}
            dateStr={dateStr}
            onOpenQuickAdd={onOpenQuickAdd}
          />
          <TodayTargets targets={targets || []} dateStr={dateStr} />
        </div>

      </div>
    </div>
  );
};

