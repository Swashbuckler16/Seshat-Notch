import React, { useState } from 'react';
import { Review, Blocker } from '../../../types';
import { SvgMoodEnergyTrend, MoodEnergyDataPoint } from '../charts/SvgMoodEnergyTrend';
import {
  BookOpen,
  Zap,
  Smile,
  Search,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

interface DashboardReviewsTabProps {
  reviews: Review[];
  blockers: Blocker[];
  todayStr: string;
}

export const DashboardReviewsTab: React.FC<DashboardReviewsTabProps> = ({
  reviews,
  blockers,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);

  // Sort reviews chronologically descending
  const sortedReviews = [...reviews].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  // Compute energy & mood trend data (chronological ascending for graph)
  const trendData: MoodEnergyDataPoint[] = [...reviews]
    .filter((r) => r.energyRating !== undefined || r.moodRating !== undefined)
    .sort((a, b) => a.period.localeCompare(b.period))
    .slice(-12)
    .map((r) => ({
      period: r.period,
      energy: r.energyRating,
      mood: r.moodRating,
    }));
  const energyRatings = reviews
    .map((review) => review.energyRating)
    .filter((rating): rating is number => rating !== undefined);
  const meanEnergy = energyRatings.length > 0
    ? (energyRatings.reduce((total, rating) => total + rating, 0) / energyRatings.length).toFixed(1)
    : null;

  // Streaks & Cadence
  const weeklyReviews = reviews.filter((r) => r.type === 'weekly');
  const monthlyReviews = reviews.filter((r) => r.type === 'monthly');

  // Filtered reviews based on search query
  const filteredReviews = sortedReviews.filter((r) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const periodMatch = r.period.toLowerCase().includes(query);
    const answerMatch = Object.values(r.answers).some((ans) =>
      ans.toLowerCase().includes(query)
    );
    return periodMatch || answerMatch;
  });

  // Active / unresolved blockers
  const activeBlockers = blockers.filter((b) => !b.dateCleared);

  return (
    <div className="flex flex-col gap-5">
      {/* 1. Review Cadence KPI Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="surface-card rounded-[var(--radius-sm)] p-3 border border-[var(--color-rule)] flex flex-col gap-1">
          <span className="text-[11px] font-mono text-[var(--color-ink-muted)]">Weekly Reviews</span>
          <div className="flex items-baseline gap-1">
            <span className="font-mono tabular-figure text-lg font-bold text-[var(--color-ink)]">
              {weeklyReviews.length}
            </span>
            <span className="text-xs text-[var(--color-ink-muted)]">completed</span>
          </div>
          <span className="text-[10px] text-[var(--color-ink-muted)]">Sunday cadence</span>
        </div>

        <div className="surface-card rounded-[var(--radius-sm)] p-3 border border-[var(--color-rule)] flex flex-col gap-1">
          <span className="text-[11px] font-mono text-[var(--color-ink-muted)]">Monthly Reviews</span>
          <div className="flex items-baseline gap-1">
            <span className="font-mono tabular-figure text-lg font-bold text-[var(--color-ink)]">
              {monthlyReviews.length}
            </span>
            <span className="text-xs text-[var(--color-ink-muted)]">completed</span>
          </div>
          <span className="text-[10px] text-[var(--color-ink-muted)]">End of month synthesis</span>
        </div>

        <div className="surface-card rounded-[var(--radius-sm)] p-3 border border-[var(--color-rule)] flex flex-col gap-1">
          <span className="text-[11px] font-mono text-[var(--color-ink-muted)]">Mean Energy Level</span>
          <div className="flex items-baseline gap-1">
            <span className="font-mono tabular-figure text-lg font-bold text-[var(--color-accent)]">
              {meanEnergy ?? '—'}
            </span>
            <span className="text-xs text-[var(--color-ink-muted)]">{meanEnergy ? `/ 5.0 · ${energyRatings.length} ratings` : 'No ratings yet'}</span>
          </div>
          <span className="text-[10px] text-[var(--color-ink-muted)]">Self-reported vital energy</span>
        </div>

        <div className="surface-card rounded-[var(--radius-sm)] p-3 border border-[var(--color-rule)] flex flex-col gap-1">
          <span className="text-[11px] font-mono text-[var(--color-ink-muted)]">Open Blockers</span>
          <div className="flex items-baseline gap-1">
            <span
              className={`font-mono tabular-figure text-lg font-bold ${
                activeBlockers.length > 0 ? 'text-[var(--color-rose)]' : 'text-[var(--color-ink)]'
              }`}
            >
              {activeBlockers.length}
            </span>
            <span className="text-xs text-[var(--color-ink-muted)]">active</span>
          </div>
          <span className="text-[10px] text-[var(--color-ink-muted)]">Friction items to unblock</span>
        </div>
      </div>

      {/* 2. Mood & Energy Trend SVG */}
      <div className="surface-card rounded-[var(--radius-sm)] p-4 flex flex-col gap-3 border border-[var(--color-rule)]">
        <div className="flex items-center justify-between hairline-b pb-2">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[var(--color-accent)]" />
            <h3 className="text-xs font-bold text-[var(--color-ink)] uppercase tracking-wider">
              Energy & Mood Dual-Line Trend (PRD 7.3)
            </h3>
          </div>
          <span className="text-[11px] font-mono text-[var(--color-ink-muted)]">
            Last {trendData.length} reviews
          </span>
        </div>

        <div className="p-2 surface-well rounded-[var(--radius-xs)] border border-[var(--color-rule)]">
          <SvgMoodEnergyTrend data={trendData} height={130} />
        </div>
      </div>

      {/* 3. Searchable Reflections Ledger */}
      <div className="surface-card rounded-[var(--radius-sm)] p-4 flex flex-col gap-3.5 border border-[var(--color-rule)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 hairline-b pb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[var(--color-accent)]" />
            <h3 className="text-xs font-bold text-[var(--color-ink)] uppercase tracking-wider">
              Periodic Review Reflections & Highlights
            </h3>
          </div>

          {/* Search Field */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 surface-well rounded-[var(--radius-xs)] border border-[var(--color-rule)] w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-[var(--color-ink-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search past reflections..."
              className="bg-transparent text-xs text-[var(--color-ink)] placeholder-[var(--color-ink-muted)] focus:outline-none w-full"
            />
          </div>
        </div>

        {filteredReviews.length === 0 ? (
          <div className="py-8 text-center text-xs text-[var(--color-ink-muted)]">
            {searchQuery ? 'No reviews match your search query.' : 'No reviews recorded yet.'}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredReviews.map((review) => {
              const isExpanded = selectedReviewId === review.id;
              return (
                <div
                  key={review.id}
                  className="surface-well rounded-[var(--radius-xs)] border border-[var(--color-rule)] p-3 flex flex-col gap-2 transition-colors"
                >
                  {/* Review Header */}
                  <div
                    onClick={() => setSelectedReviewId(isExpanded ? null : review.id)}
                    className="flex items-center justify-between cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="p-0.5 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <span className="font-semibold text-xs text-[var(--color-ink)]">
                        {review.period}
                      </span>
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded-[1px] bg-[var(--color-paper-3)] text-[var(--color-ink-muted)]">
                        {review.type}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 font-mono text-[11px] tabular-figure">
                      {review.energyRating && (
                        <span className="flex items-center gap-1 text-[var(--color-accent)]">
                          <Zap className="w-3 h-3" />
                          <span>{review.energyRating}/5</span>
                        </span>
                      )}
                      {review.moodRating && (
                        <span className="flex items-center gap-1 text-[var(--color-ink)]">
                          <Smile className="w-3 h-3 text-[var(--color-emerald)]" />
                          <span>{review.moodRating}/5</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Top Three Tomorrow if present */}
                  {review.topThreeTomorrow && review.topThreeTomorrow.length > 0 && (
                    <div className="pl-6 text-[11px] flex flex-wrap gap-1.5 items-center">
                      <span className="font-mono text-[10px] uppercase text-[var(--color-ink-muted)]">
                        Focus Priorities:
                      </span>
                      {review.topThreeTomorrow.map((p, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-[var(--radius-xs)] bg-[var(--color-paper)] border border-[var(--color-rule)] text-[var(--color-ink)] text-[10px]"
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Expanded Q&A Content */}
                  {isExpanded && (
                    <div className="pl-6 pt-2 border-t border-[var(--color-rule)] flex flex-col gap-2.5">
                      {Object.entries(review.answers).map(([key, value]) => (
                        <div key={key} className="flex flex-col gap-0.5 text-xs">
                          <span className="font-medium text-[var(--color-ink-muted)] text-[11px] capitalize">
                            {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                          </span>
                          <p className="text-[var(--color-ink)] leading-relaxed whitespace-pre-wrap">
                            {value}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
