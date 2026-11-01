import { useState, useEffect, useCallback } from 'react';
import { playFocusChime } from '../utils/audioChime';
import { domainService } from '../services/domainService';

export interface TimerState {
  mode: 'countdown' | 'stopwatch';
  status: 'idle' | 'running' | 'paused' | 'completed';
  targetMinutes: number;
  secondsRemaining: number;
  secondsElapsed: number;
  intervalType: 'work' | 'short_break' | 'long_break';
  kind: 'deep' | 'shallow' | 'learning';
  entityType: 'task' | 'target' | 'project';
  entityId: string;
  entityTitle: string;
  note: string;
  startedAtTimestamp?: number; // epoch ms
}

const STORAGE_KEY = 'seshat_notch_active_timer';

const DEFAULT_STATE: TimerState = {
  mode: 'countdown',
  status: 'idle',
  targetMinutes: 25,
  secondsRemaining: 25 * 60,
  secondsElapsed: 0,
  intervalType: 'work',
  kind: 'deep',
  entityType: 'project',
  entityId: '',
  entityTitle: 'General Deep Work',
  note: '',
};

// Global shared state for sync across header pill and timer views
let globalState: TimerState = (() => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // If was running, recalculate elapsed from wall clock
      if (parsed.status === 'running' && parsed.startedAtTimestamp) {
        const now = Date.now();
        const diffSeconds = Math.max(0, Math.floor((now - parsed.startedAtTimestamp) / 1000));
        if (parsed.mode === 'countdown') {
          const rem = Math.max(0, parsed.targetMinutes * 60 - diffSeconds);
          parsed.secondsRemaining = rem;
          parsed.secondsElapsed = diffSeconds;
          if (rem === 0) parsed.status = 'completed';
        } else {
          parsed.secondsElapsed = diffSeconds;
        }
      }
      return { ...DEFAULT_STATE, ...parsed };
    }
  } catch {
    // fallback
  }
  return DEFAULT_STATE;
})();

const listeners = new Set<(state: TimerState) => void>();

function notifyListeners() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(globalState));
  } catch {
    // ignore storage quota error
  }
  listeners.forEach((fn) => fn({ ...globalState }));
}

// Global 1-second interval ticker
let ticker: NodeJS.Timeout | null = null;

function startTicker() {
  if (ticker) return;
  ticker = setInterval(() => {
    if (globalState.status !== 'running') return;

    if (globalState.mode === 'countdown') {
      if (globalState.secondsRemaining > 1) {
        globalState.secondsRemaining -= 1;
        globalState.secondsElapsed += 1;
        updateDocumentTitle(globalState.secondsRemaining);
      } else {
        globalState.secondsRemaining = 0;
        globalState.secondsElapsed = globalState.targetMinutes * 60;
        globalState.status = 'completed';
        playFocusChime();
        resetDocumentTitle();
      }
    } else {
      // Stopwatch mode
      globalState.secondsElapsed += 1;
      updateDocumentTitle(globalState.secondsElapsed);
    }

    notifyListeners();
  }, 1000);
}

function stopTicker() {
  if (ticker) {
    clearInterval(ticker);
    ticker = null;
  }
}

function updateDocumentTitle(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  const timeStr = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  document.title = `(${timeStr}) Seshat Notch`;
}

function resetDocumentTitle() {
  document.title = 'Seshat Notch';
}

if (globalState.status === 'running') {
  startTicker();
}

export function useFocusTimer() {
  const [state, setState] = useState<TimerState>(globalState);

  useEffect(() => {
    const handler = (newState: TimerState) => setState(newState);
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, []);

  const setTargetPreset = useCallback(
    (mins: number, intervalType: 'work' | 'short_break' | 'long_break' = 'work', mode: 'countdown' | 'stopwatch' = 'countdown') => {
      globalState = {
        ...globalState,
        mode,
        status: 'idle',
        targetMinutes: mins,
        secondsRemaining: mins * 60,
        secondsElapsed: 0,
        intervalType,
        startedAtTimestamp: undefined,
      };
      stopTicker();
      resetDocumentTitle();
      notifyListeners();
    },
    []
  );

  const startTimer = useCallback(() => {
    if (globalState.status === 'running') return;

    const now = Date.now();
    // Offset startedAtTimestamp by already elapsed time
    const adjustedStart = now - (globalState.secondsElapsed * 1000);

    globalState = {
      ...globalState,
      status: 'running',
      startedAtTimestamp: adjustedStart,
    };
    startTicker();
    notifyListeners();
  }, []);

  const pauseTimer = useCallback(() => {
    if (globalState.status !== 'running') return;
    globalState = {
      ...globalState,
      status: 'paused',
    };
    stopTicker();
    resetDocumentTitle();
    notifyListeners();
  }, []);

  const resetTimer = useCallback(() => {
    globalState = {
      ...globalState,
      status: 'idle',
      secondsRemaining: globalState.targetMinutes * 60,
      secondsElapsed: 0,
      startedAtTimestamp: undefined,
    };
    stopTicker();
    resetDocumentTitle();
    notifyListeners();
  }, []);

  const setConfig = useCallback((updates: Partial<Pick<TimerState, 'kind' | 'entityType' | 'entityId' | 'entityTitle' | 'note'>>) => {
    globalState = {
      ...globalState,
      ...updates,
    };
    notifyListeners();
  }, []);

  const finishAndSaveSession = useCallback(async () => {
    const elapsedMinutes = Math.max(1, Math.round(globalState.secondsElapsed / 60));

    // Only log if work interval (breaks are not logged as work time)
    if (globalState.intervalType === 'work') {
      await domainService.logTimeSession({
        entityType: globalState.entityType,
        entityId: globalState.entityId || 'general_focus',
        durationMinutes: elapsedMinutes,
        kind: globalState.kind,
        note: globalState.note.trim() || undefined,
      });
    }

    // Reset back to idle
    globalState = {
      ...globalState,
      status: 'idle',
      secondsRemaining: globalState.targetMinutes * 60,
      secondsElapsed: 0,
      startedAtTimestamp: undefined,
      note: '',
    };
    stopTicker();
    resetDocumentTitle();
    notifyListeners();
  }, []);

  return {
    state,
    startTimer,
    pauseTimer,
    resetTimer,
    setTargetPreset,
    setConfig,
    finishAndSaveSession,
  };
}

