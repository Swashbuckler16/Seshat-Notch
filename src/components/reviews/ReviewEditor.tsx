import React, { useState } from 'react';
import { domainService } from '../../services/domainService';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Sparkles, Check, Heart, Zap } from 'lucide-react';

interface ReviewEditorProps {
  currentDateStr: string;
  onReviewSaved?: () => void;
}

type ReviewType = 'daily' | 'weekly' | 'monthly';

export const ReviewEditor: React.FC<ReviewEditorProps> = ({
  currentDateStr,
  onReviewSaved,
}) => {
  const [type, setType] = useState<ReviewType>('daily');
  const [energyRating, setEnergyRating] = useState<number>(4);
  const [moodRating, setMoodRating] = useState<number>(4);
  const [wentWell, setWentWell] = useState('');
  const [difficulties, setDifficulties] = useState('');
  const [topThree, setTopThree] = useState(['', '', '']);
  const [isSaved, setIsSaved] = useState(false);

  const handleTopThreeChange = (idx: number, val: string) => {
    const updated = [...topThree];
    updated[idx] = val;
    setTopThree(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const answers: Record<string, string> = {
      wentWell: wentWell.trim(),
      difficulties: difficulties.trim(),
    };

    const validTopThree = topThree.filter((t) => t.trim().length > 0);

    await domainService.createReview({
      type,
      period: currentDateStr,
      energyRating,
      moodRating,
      answers,
      topThreeTomorrow: validTopThree.length > 0 ? validTopThree : undefined,
    });

    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      setWentWell('');
      setDifficulties('');
      setTopThree(['', '', '']);
      if (onReviewSaved) onReviewSaved();
    }, 1500);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="surface-card rounded-[var(--radius-sm)] p-5 flex flex-col gap-5"
    >
      {/* Review Type Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 hairline-b pb-3.5">
        <div>
          <h3 className="font-semibold text-sm text-[var(--color-ink)]">
            {type === 'daily'
              ? 'Daily shutdown reflection'
              : type === 'weekly'
              ? 'Weekly cadence review'
              : 'Monthly strategic review'}
          </h3>
          <p className="text-xs text-[var(--color-ink-muted)] mt-0.5">
            Reflect on what was delivered, log mood and energy, and shape tomorrow's focus.
          </p>
        </div>

        <div className="flex items-center gap-1 bg-[var(--color-paper-2)] p-1 rounded-[var(--radius-xs)] border border-[var(--color-rule)]">
          {(['daily', 'weekly', 'monthly'] as ReviewType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`min-h-11 sm:min-h-8 px-3 py-1 text-xs rounded-[var(--radius-xs)] font-medium capitalize transition-colors ${
                type === t
                  ? 'bg-[var(--color-paper)] text-[var(--color-ink)] shadow-sm font-semibold'
                  : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Ratings Section: Energy & Mood */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[var(--color-paper-2)]/40 p-3.5 rounded-[var(--radius-xs)] border border-[var(--color-rule)]">
        {/* Energy Rating */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-medium text-[var(--color-ink)]">
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-[var(--color-status-at-risk)]" />
              <span>Energy level today</span>
            </span>
            <span className="font-mono tabular-figure text-[var(--color-accent)] font-semibold">
              {energyRating} / 5
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setEnergyRating(lvl)}
                className={`flex-1 min-h-11 sm:min-h-9 rounded-[var(--radius-xs)] border font-mono text-xs transition-colors ${
                  energyRating === lvl
                    ? 'bg-[var(--color-accent)] text-[var(--color-accent-ink)] border-[var(--color-accent)] font-semibold'
                    : 'bg-[var(--color-paper)] border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:border-[var(--color-ink-muted)]'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        {/* Mood Rating */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-medium text-[var(--color-ink)]">
            <span className="flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-[var(--color-status-behind)]" />
              <span>Mood & satisfaction</span>
            </span>
            <span className="font-mono tabular-figure text-[var(--color-accent)] font-semibold">
              {moodRating} / 5
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setMoodRating(lvl)}
                className={`flex-1 min-h-11 sm:min-h-9 rounded-[var(--radius-xs)] border font-mono text-xs transition-colors ${
                  moodRating === lvl
                    ? 'bg-[var(--color-accent)] text-[var(--color-accent-ink)] border-[var(--color-accent)] font-semibold'
                    : 'bg-[var(--color-paper)] border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:border-[var(--color-ink-muted)]'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Reflection Prompts */}
      <div className="flex flex-col gap-3">
        <Input
          label={
            type === 'daily'
              ? 'What went well today?'
              : type === 'weekly'
              ? 'What were the key wins this week?'
              : 'What major milestones were completed this month?'
          }
          placeholder="e.g. Completed key milestone and kept focus uninterrupted"
          value={wentWell}
          onChange={(e) => setWentWell(e.target.value)}
        />

        <Input
          label={
            type === 'daily'
              ? 'What felt difficult, delayed, or blocked?'
              : type === 'weekly'
              ? 'What slowed progress or caused friction?'
              : 'What systemic blockers need adjustment?'
          }
          placeholder="e.g. Integration testing took longer than expected"
          value={difficulties}
          onChange={(e) => setDifficulties(e.target.value)}
        />
      </div>

      {/* Top 3 Priorities for Tomorrow / Next Period */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-ink)]">
          <Sparkles className="w-3.5 h-3.5 text-[var(--color-accent)]" />
          <span>
            {type === 'daily'
              ? 'Top 3 priorities for tomorrow'
              : 'Top 3 priorities for next period'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <Input
            placeholder="1. Primary outcome"
            value={topThree[0]}
            onChange={(e) => handleTopThreeChange(0, e.target.value)}
          />
          <Input
            placeholder="2. Secondary outcome"
            value={topThree[1]}
            onChange={(e) => handleTopThreeChange(1, e.target.value)}
          />
          <Input
            placeholder="3. Supporting task"
            value={topThree[2]}
            onChange={(e) => handleTopThreeChange(2, e.target.value)}
          />
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-end gap-3 hairline-t pt-3">
        {isSaved && (
          <span className="text-xs text-[var(--color-status-on-track)] flex items-center gap-1 font-medium">
            <Check className="w-3.5 h-3.5" />
            <span>Review saved to audit history</span>
          </span>
        )}
        <Button variant="primary" type="submit" disabled={isSaved}>
          <Check className="w-3.5 h-3.5" />
          <span>Save reflection</span>
        </Button>
      </div>
    </form>
  );
};
