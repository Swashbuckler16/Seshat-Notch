import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { Zap, Heart, CheckCircle2, Calendar } from 'lucide-react';

export const ReviewHistory: React.FC = () => {
  const reviews = useLiveQuery(
    () => db.reviews.reverse().sortBy('createdAt')
  );

  return (
    <div className="surface-card rounded-[var(--radius-sm)] p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between hairline-b pb-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[var(--color-accent)]" />
          <h3 className="font-semibold text-xs tracking-tight text-[var(--color-ink)]">
            Reflection ledger
          </h3>
        </div>
        <span className="font-mono text-xs tabular-figure text-[var(--color-ink-muted)]">
          {reviews?.length ?? 0} recorded review{reviews?.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="flex flex-col divide-y divide-[var(--color-rule)]">
        {(!reviews || reviews.length === 0) ? (
          <div className="py-10 text-center text-xs text-[var(--color-ink-muted)]">
            No reflections recorded yet. Complete your first daily shutdown or weekly review to build your log.
          </div>
        ) : (
          reviews.map((rev) => (
            <div
              key={rev.id}
              className="py-4 flex flex-col gap-2.5 hover:bg-[var(--color-paper-2)]/30 px-2 rounded-[var(--radius-xs)] transition-colors"
            >
              {/* Review Header: Type, Period, Ratings */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-[var(--color-paper-3)] border border-[var(--color-rule)] font-semibold text-[var(--color-ink)] capitalize">
                    {rev.type}
                  </span>
                  <span className="font-semibold text-xs text-[var(--color-ink)]">
                    {rev.period}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs font-mono">
                  {rev.energyRating && (
                    <span className="inline-flex items-center gap-1 text-[var(--color-status-at-risk)]">
                      <Zap className="w-3.5 h-3.5" />
                      <span>{rev.energyRating}/5 energy</span>
                    </span>
                  )}
                  {rev.moodRating && (
                    <span className="inline-flex items-center gap-1 text-[var(--color-status-behind)]">
                      <Heart className="w-3.5 h-3.5" />
                      <span>{rev.moodRating}/5 mood</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Answers & Takeaways */}
              {rev.answers && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                  {rev.answers.wentWell && (
                    <div className="bg-[var(--color-paper-2)]/50 p-2.5 rounded-[var(--radius-xs)] border border-[var(--color-rule)] flex flex-col gap-1">
                      <span className="font-medium text-[var(--color-status-on-track)] flex items-center gap-1 text-[11px]">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Key wins</span>
                      </span>
                      <p className="text-[var(--color-ink)] text-xs leading-relaxed">
                        {rev.answers.wentWell}
                      </p>
                    </div>
                  )}

                  {rev.answers.difficulties && (
                    <div className="bg-[var(--color-paper-2)]/50 p-2.5 rounded-[var(--radius-xs)] border border-[var(--color-rule)] flex flex-col gap-1">
                      <span className="font-medium text-[var(--color-status-at-risk)] text-[11px]">
                        Friction & blockers
                      </span>
                      <p className="text-[var(--color-ink)] text-xs leading-relaxed">
                        {rev.answers.difficulties}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Priorities for Next Period */}
              {rev.topThreeTomorrow && rev.topThreeTomorrow.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 text-xs pt-1">
                  <span className="text-[11px] font-mono text-[var(--color-ink-muted)] mr-1">
                    Priorities:
                  </span>
                  {rev.topThreeTomorrow.map((p, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded bg-[var(--color-paper-3)] border border-[var(--color-rule)] text-[11px] text-[var(--color-ink)]"
                    >
                      {idx + 1}. {p}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

