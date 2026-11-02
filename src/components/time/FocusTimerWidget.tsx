import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { useFocusTimer } from '../../hooks/useFocusTimer';
import { formatSecondsToTimer } from '../../utils/timeMath';
import { Button } from '../ui/Button';
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Coffee,
  Brain,
  FileText,
  BookOpen,
  Briefcase,
  CheckSquare,
} from 'lucide-react';

export const FocusTimerWidget: React.FC = () => {
  const {
    state,
    startTimer,
    pauseTimer,
    resetTimer,
    setTargetPreset,
    setConfig,
    finishAndSaveSession,
  } = useFocusTimer();

  // Query active tasks and projects for linking
  const activeTasks = useLiveQuery(
    () => db.tasks.filter((t) => !t.isDeleted && t.status !== 'done' && t.status !== 'dropped').toArray(),
    []
  );

  const activeProjects = useLiveQuery(
    () => db.projects.filter((p) => !p.isDeleted && p.status === 'active').toArray(),
    []
  );

  const displaySeconds =
    state.mode === 'countdown' ? state.secondsRemaining : state.secondsElapsed;

  const totalTargetSecs = state.targetMinutes * 60;
  const progressRatio =
    state.mode === 'countdown'
      ? Math.min(1, state.secondsElapsed / Math.max(1, totalTargetSecs))
      : 0;

  const isRunning = state.status === 'running';
  const isCompleted = state.status === 'completed';

  const handleEntityChange = (val: string) => {
    if (!val) {
      setConfig({ entityType: 'project', entityId: '', entityTitle: 'General Deep Work' });
      return;
    }
    const [type, id] = val.split(':');
    if (type === 'task') {
      const task = activeTasks?.find((t) => t.id === id);
      setConfig({
        entityType: 'task',
        entityId: id,
        entityTitle: task ? task.title : 'Task',
      });
    } else if (type === 'project') {
      const proj = activeProjects?.find((p) => p.id === id);
      setConfig({
        entityType: 'project',
        entityId: id,
        entityTitle: proj ? proj.title : 'Project',
      });
    }
  };

  return (
    <div className="surface-card rounded-[var(--radius-sm)] p-5 flex flex-col gap-5 border border-[var(--color-rule)]">
      {/* Top Bar: Cadence & Preset Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 hairline-b pb-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-[var(--color-ink-muted)] font-medium mr-1">
            Work presets:
          </span>
          <button
            type="button"
            onClick={() => setTargetPreset(25, 'work', 'countdown')}
            className={`min-h-11 sm:min-h-8 px-2.5 py-1 text-xs font-mono rounded-[var(--radius-xs)] border transition-colors ${
              state.targetMinutes === 25 && state.intervalType === 'work' && state.mode === 'countdown'
                ? 'bg-[var(--color-paper-2)] border-[var(--color-ink)] font-semibold text-[var(--color-ink)]'
                : 'border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:border-[var(--color-rule-strong)]'
            }`}
          >
            25m Pomodoro
          </button>
          <button
            type="button"
            onClick={() => setTargetPreset(45, 'work', 'countdown')}
            className={`min-h-11 sm:min-h-8 px-2.5 py-1 text-xs font-mono rounded-[var(--radius-xs)] border transition-colors ${
              state.targetMinutes === 45 && state.intervalType === 'work' && state.mode === 'countdown'
                ? 'bg-[var(--color-paper-2)] border-[var(--color-ink)] font-semibold text-[var(--color-ink)]'
                : 'border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:border-[var(--color-rule-strong)]'
            }`}
          >
            45m Deep work
          </button>
          <button
            type="button"
            onClick={() => setTargetPreset(90, 'work', 'countdown')}
            className={`min-h-11 sm:min-h-8 px-2.5 py-1 text-xs font-mono rounded-[var(--radius-xs)] border transition-colors ${
              state.targetMinutes === 90 && state.intervalType === 'work' && state.mode === 'countdown'
                ? 'bg-[var(--color-paper-2)] border-[var(--color-ink)] font-semibold text-[var(--color-ink)]'
                : 'border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:border-[var(--color-rule-strong)]'
            }`}
          >
            90m Deep block
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[var(--color-ink-muted)] font-medium mr-1">
            Breaks & Other:
          </span>
          <button
            type="button"
            onClick={() => setTargetPreset(5, 'short_break', 'countdown')}
            className={`min-h-11 sm:min-h-8 px-2.5 py-1 text-xs font-mono rounded-[var(--radius-xs)] border transition-colors ${
              state.intervalType === 'short_break'
                ? 'bg-[var(--color-paper-2)] border-[var(--color-ink)] font-semibold text-[var(--color-ink)]'
                : 'border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:border-[var(--color-rule-strong)]'
            }`}
          >
            <Coffee className="w-3 h-3 inline mr-1" />
            5m Rest
          </button>
          <button
            type="button"
            onClick={() => setTargetPreset(0, 'work', 'stopwatch')}
            className={`min-h-11 sm:min-h-8 px-2.5 py-1 text-xs font-mono rounded-[var(--radius-xs)] border transition-colors ${
              state.mode === 'stopwatch'
                ? 'bg-[var(--color-paper-2)] border-[var(--color-ink)] font-semibold text-[var(--color-ink)]'
                : 'border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:border-[var(--color-rule-strong)]'
            }`}
          >
            Stopwatch
          </button>
        </div>
      </div>

      {/* Main Clock Hero */}
      <div className="flex flex-col items-center justify-center py-6 gap-3">
        {/* Interval Badge */}
        <span className="px-2.5 py-0.5 text-xs font-mono rounded-[var(--radius-xs)] bg-[var(--color-paper-2)] border border-[var(--color-rule)] text-[var(--color-ink-muted)]">
          {state.intervalType === 'work'
            ? state.mode === 'stopwatch'
              ? 'Open focus stopwatch'
              : `${state.targetMinutes}m Focus interval`
            : 'Break recovery period'}
        </span>

        {/* Large Tabular Digits */}
        <div className="text-5xl sm:text-6xl font-mono tabular-figure font-bold tracking-tight text-[var(--color-ink)]">
          {formatSecondsToTimer(displaySeconds)}
        </div>

        {/* Linear Measuring Cord Bar */}
        {state.mode === 'countdown' && (
          <div className="w-full max-w-md h-2 rounded-[1px] bg-[var(--color-paper-3)] overflow-hidden border border-[var(--color-rule)]">
            <div
              className="chart-fill-transition h-full bg-[var(--color-accent)]"
              style={{ transform: `scaleX(${Math.max(0, Math.min(100, progressRatio * 100)) / 100})` }}
            />
          </div>
        )}

        {isCompleted && (
          <div className="focus-complete text-xs font-semibold text-[var(--color-status-on-track)] flex items-center gap-1.5 mt-1">
            <CheckCircle2 className="w-4 h-4" />
            <span>Focus interval complete. Finish to save your session.</span>
          </div>
        )}
      </div>

      {/* Session Metadata Controls: Target & Kind */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 surface-well p-3 rounded-[var(--radius-xs)] border border-[var(--color-rule)]">
        {/* Entity Selector (PRD TM-1) */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[var(--color-ink)] flex items-center gap-1.5">
            <Briefcase className="w-3.5 h-3.5 text-[var(--color-accent)]" />
            <span>Link session to task or project</span>
          </label>
          <select
            className="input-field px-2.5 py-1.5 text-xs rounded-[var(--radius-xs)] border border-[var(--color-rule)] bg-[var(--color-paper)] focus:outline-none focus:border-[var(--color-accent)]"
            value={state.entityId ? `${state.entityType}:${state.entityId}` : ''}
            onChange={(e) => handleEntityChange(e.target.value)}
          >
            <option value="">General Deep Work (unlinked)</option>
            <optgroup label="Active Projects">
              {(activeProjects || []).map((p) => (
                <option key={p.id} value={`project:${p.id}`}>
                  Project: {p.title}
                </option>
              ))}
            </optgroup>
            <optgroup label="Tasks">
              {(activeTasks || []).map((t) => (
                <option key={t.id} value={`task:${t.id}`}>
                  Task: {t.title}
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        {/* Kind Selector (PRD TM-3) */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[var(--color-ink)] flex items-center gap-1.5">
            <Brain className="w-3.5 h-3.5 text-[var(--color-accent)]" />
            <span>Session classification</span>
          </label>
          <div className="grid grid-cols-3 gap-1 text-xs">
            <button
              type="button"
              onClick={() => setConfig({ kind: 'deep' })}
              className={`px-2 py-1.5 rounded-[var(--radius-xs)] border text-center transition-colors ${
                state.kind === 'deep'
                  ? 'border-[var(--color-ink)] bg-[var(--color-paper-2)] font-semibold text-[var(--color-ink)]'
                  : 'border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:border-[var(--color-rule-strong)]'
              }`}
              title="Uninterrupted problem solving & building"
            >
              <Brain className="w-3 h-3 inline mr-1 text-[var(--color-accent)]" />
              Deep
            </button>
            <button
              type="button"
              onClick={() => setConfig({ kind: 'shallow' })}
              className={`px-2 py-1.5 rounded-[var(--radius-xs)] border text-center transition-colors ${
                state.kind === 'shallow'
                  ? 'border-[var(--color-ink)] bg-[var(--color-paper-2)] font-semibold text-[var(--color-ink)]'
                  : 'border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:border-[var(--color-rule-strong)]'
              }`}
              title="Admin, coordination, quick fixes"
            >
              <FileText className="w-3 h-3 inline mr-1" />
              Shallow
            </button>
            <button
              type="button"
              onClick={() => setConfig({ kind: 'learning' })}
              className={`px-2 py-1.5 rounded-[var(--radius-xs)] border text-center transition-colors ${
                state.kind === 'learning'
                  ? 'border-[var(--color-ink)] bg-[var(--color-paper-2)] font-semibold text-[var(--color-ink)]'
                  : 'border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:border-[var(--color-rule-strong)]'
              }`}
              title="Reading, course lectures, research"
            >
              <BookOpen className="w-3 h-3 inline mr-1" />
              Learning
            </button>
          </div>
        </div>

        {/* Intention Note */}
        <div className="col-span-1 sm:col-span-2 flex flex-col gap-1">
          <label className="text-xs font-medium text-[var(--color-ink)]">
            Session intention or reflection note (optional)
          </label>
          <input
            type="text"
            className="input-field px-3 py-1.5 text-xs rounded-[var(--radius-xs)] border border-[var(--color-rule)] bg-[var(--color-paper)] focus:outline-none focus:border-[var(--color-accent)]"
            value={state.note}
            onChange={(e) => setConfig({ note: e.target.value })}
            placeholder="e.g. Complete architecture specification without context switching"
          />
        </div>
      </div>

      {/* Main Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 hairline-t">
        <div className="flex items-center gap-2">
          {isRunning ? (
            <Button
              variant="secondary"
              size="md"
              onClick={pauseTimer}
              className="min-h-11 sm:min-h-9"
            >
              <Pause className="w-4 h-4" />
              <span>Pause timer</span>
            </Button>
          ) : (
            <Button
              variant="primary"
              size="md"
              onClick={startTimer}
              className="min-h-11 sm:min-h-9"
            >
              <Play className="w-4 h-4" />
              <span>{state.status === 'paused' ? 'Resume timer' : 'Start focus timer'}</span>
            </Button>
          )}

          <Button
            variant="secondary"
            size="md"
            onClick={resetTimer}
            className="min-h-11 sm:min-h-9 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
            title="Reset timer to beginning"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset</span>
          </Button>
        </div>

        <Button
          variant={isCompleted ? 'primary' : 'secondary'}
          size="md"
          onClick={finishAndSaveSession}
          disabled={state.secondsElapsed < 10}
          className="min-h-11 sm:min-h-9"
          title="Save session to history and update project hours"
        >
          <CheckSquare className="w-4 h-4" />
          <span>Finish & log session</span>
        </Button>
      </div>
    </div>
  );
};

