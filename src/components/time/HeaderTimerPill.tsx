import React from 'react';
import { useFocusTimer } from '../../hooks/useFocusTimer';
import { formatSecondsToTimer } from '../../utils/timeMath';
import { Play, Pause, Check, Clock } from 'lucide-react';

interface HeaderTimerPillProps {
  onNavigateToTime?: () => void;
}

export const HeaderTimerPill: React.FC<HeaderTimerPillProps> = ({ onNavigateToTime }) => {
  const { state, startTimer, pauseTimer, finishAndSaveSession } = useFocusTimer();

  if (state.status === 'idle') return null;

  const displaySeconds =
    state.mode === 'countdown' ? state.secondsRemaining : state.secondsElapsed;

  const isCompleted = state.status === 'completed';
  const isRunning = state.status === 'running';

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-[var(--radius-xs)] bg-[var(--color-paper-2)] border border-[var(--color-rule-strong)] shadow-sm text-xs animate-in fade-in duration-200">
      <button
        type="button"
        onClick={onNavigateToTime}
        className="flex items-center gap-1.5 hover:text-[var(--color-accent)] transition-colors focus:outline-none"
        title="Click to view full focus session"
      >
        <Clock className={`w-3.5 h-3.5 ${isRunning ? 'text-[var(--color-accent)] animate-pulse' : 'text-[var(--color-ink-muted)]'}`} />
        <span className="font-mono tabular-figure font-semibold text-[var(--color-ink)]">
          {formatSecondsToTimer(displaySeconds)}
        </span>
        <span className="hidden sm:inline text-[11px] text-[var(--color-ink-muted)] max-w-[120px] truncate">
          {state.entityTitle}
        </span>
      </button>

      <div className="flex items-center gap-0.5 ml-1 pl-1.5 hairline-l">
        {isRunning ? (
          <button
            type="button"
            onClick={pauseTimer}
            className="p-1 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] rounded"
            title="Pause timer"
            aria-label="Pause timer"
          >
            <Pause className="w-3 h-3" />
          </button>
        ) : (
          <button
            type="button"
            onClick={startTimer}
            className="p-1 text-[var(--color-accent)] hover:text-[var(--color-ink)] rounded"
            title="Resume timer"
            aria-label="Resume timer"
          >
            <Play className="w-3 h-3" />
          </button>
        )}

        <button
          type="button"
          onClick={finishAndSaveSession}
          className={`p-1 rounded transition-colors ${
            isCompleted
              ? 'bg-[var(--color-accent)] text-white'
              : 'text-[var(--color-ink-muted)] hover:text-[var(--color-status-on-track)]'
          }`}
          title="Finish & log session"
          aria-label="Finish and log session"
        >
          <Check className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

