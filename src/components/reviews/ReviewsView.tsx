import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { CarryOverInbox } from '../inbox/CarryOverInbox';
import { ReviewEditor } from './ReviewEditor';
import { ReviewHistory } from './ReviewHistory';
import { Inbox, HeartHandshake, History } from 'lucide-react';

interface ReviewsViewProps {
  currentDateStr: string;
}

type SubTab = 'inbox' | 'review' | 'history';

export const ReviewsView: React.FC<ReviewsViewProps> = ({ currentDateStr }) => {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('inbox');

  // Query overdue items count for badge
  const overdueTasksCount = useLiveQuery(
    () =>
      db.tasks
        .filter(
          (t) =>
            !t.isDeleted &&
            t.status !== 'done' &&
            t.status !== 'dropped' &&
            ((t.scheduleDate !== undefined && t.scheduleDate < currentDateStr) ||
              (t.dueDate !== undefined && t.dueDate < currentDateStr))
        )
        .count(),
    [currentDateStr]
  );

  const overdueTargetsCount = useLiveQuery(
    () =>
      db.targets
        .filter(
          (t) =>
            !t.isDeleted &&
            t.status !== 'done' &&
            t.status !== 'dropped' &&
            t.horizon === 'day' &&
            t.period < currentDateStr
        )
        .count(),
    [currentDateStr]
  );

  const totalOverdue = (overdueTasksCount || 0) + (overdueTargetsCount || 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Sub-navigation bar */}
      <div className="flex items-center gap-1 bg-[var(--color-paper-2)] p-1 rounded-[var(--radius-xs)] border border-[var(--color-rule)] w-fit text-xs">
        <button
          type="button"
          onClick={() => setActiveSubTab('inbox')}
          className={`min-h-11 sm:min-h-8 px-3 py-1 rounded-[var(--radius-xs)] font-medium inline-flex items-center gap-2 transition-colors ${
            activeSubTab === 'inbox'
              ? 'bg-[var(--color-paper)] text-[var(--color-ink)] shadow-sm font-semibold'
              : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
          }`}
        >
          <Inbox className="w-3.5 h-3.5" />
          <span>Carry-over inbox</span>
          {totalOverdue > 0 && (
            <span className="px-1.5 py-0.2 text-[10px] font-mono rounded bg-[var(--color-status-at-risk-bg)] text-[var(--color-status-at-risk)] border border-[var(--color-status-at-risk)] font-semibold">
              {totalOverdue}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('review')}
          className={`min-h-11 sm:min-h-8 px-3 py-1 rounded-[var(--radius-xs)] font-medium inline-flex items-center gap-1.5 transition-colors ${
            activeSubTab === 'review'
              ? 'bg-[var(--color-paper)] text-[var(--color-ink)] shadow-sm font-semibold'
              : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
          }`}
        >
          <HeartHandshake className="w-3.5 h-3.5" />
          <span>Reflect & review</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('history')}
          className={`min-h-11 sm:min-h-8 px-3 py-1 rounded-[var(--radius-xs)] font-medium inline-flex items-center gap-1.5 transition-colors ${
            activeSubTab === 'history'
              ? 'bg-[var(--color-paper)] text-[var(--color-ink)] shadow-sm font-semibold'
              : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Review history</span>
        </button>
      </div>

      {/* Sub-tab Views */}
      {activeSubTab === 'inbox' && (
        <CarryOverInbox todayStr={currentDateStr} />
      )}

      {activeSubTab === 'review' && (
        <ReviewEditor
          currentDateStr={currentDateStr}
          onReviewSaved={() => setActiveSubTab('history')}
        />
      )}

      {activeSubTab === 'history' && (
        <ReviewHistory />
      )}
    </div>
  );
};

