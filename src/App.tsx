import React, { Suspense, lazy, useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';

import { BrandLogo } from './components/BrandLogo';
import { ThemeToggle } from './components/ThemeToggle';
import { QuickAddModal } from './components/QuickAddModal';
import { TodayView } from './components/today/TodayView';
import { HeaderTimerPill } from './components/time/HeaderTimerPill';
import { OnboardingView } from './components/onboarding/OnboardingView';
import { Button } from './components/ui/Button';
import { getLocalDateString } from './utils/dateUtils';
import { reminderService } from './services/reminderService';
import { desktopShellService, isTauriDesktop } from './services/desktopShellService';
import { dataOwnershipService } from './services/dataOwnershipService';
import {
  Terminal,
  Sparkles,
  Briefcase,
  Sun,
  Flame,
  BarChart2,
  Settings,
  Bell,
  Lock,
  X,
} from 'lucide-react';

const PlannerView = lazy(() =>
  import('./components/planner/PlannerView').then((m) => ({ default: m.PlannerView }))
);
const HabitsView = lazy(() =>
  import('./components/activities/ActivitiesView').then((m) => ({ default: m.ActivitiesView }))
);
const DashboardView = lazy(() =>
  import('./components/analytics/AnalyticsView').then((m) => ({ default: m.AnalyticsView }))
);
const DataManagementView = lazy(() =>
  import('./components/data/DataManagementView').then((m) => ({ default: m.DataManagementView }))
);
const ReviewsView = lazy(() =>
  import('./components/reviews/ReviewsView').then((m) => ({ default: m.ReviewsView }))
);

export type AppTab = 'today' | 'planner' | 'habits' | 'progress' | 'settings' | 'reviews';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(() => { const tab = new URLSearchParams(location.search).get('screen'); return ['today', 'planner', 'habits', 'progress', 'settings', 'reviews'].includes(tab || '') ? tab as AppTab : 'today'; });
  const [quickAddModalOpen, setQuickAddModalOpen] = useState(false);
  const [activeReminder, setActiveReminder] = useState<{ title: string; body: string } | null>(null);
  const [isAppUnlocked, setIsAppUnlocked] = useState(false);
  const [lockPinInput, setLockPinInput] = useState('');
  const [lockPinError, setLockPinError] = useState<string | null>(null);
  const [onboardingDismissed, setOnboardingDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('seshat_onboarding_completed') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const url = new URL(location.href);
    url.searchParams.set('screen', activeTab);
    if (url.href !== location.href) history.pushState(null, '', url);
  }, [activeTab]);
  useEffect(() => {
    const navigate = () => {
      const tab = new URLSearchParams(location.search).get('screen');
      if (['today', 'planner', 'habits', 'progress', 'settings', 'reviews'].includes(tab || '')) setActiveTab(tab as AppTab);
    };
    window.addEventListener('popstate', navigate);
    return () => window.removeEventListener('popstate', navigate);
  }, []);

  // Live query for App Lock status
  const appLockStatus = useLiveQuery(
    async () => {
      const [lockSetting, pinSetting] = await Promise.all([
        db.settings.get('app_lock_enabled'),
        db.settings.get('app_lock_pin_hash'),
      ]);
      return {
        enabled: lockSetting?.value === 'true' && Boolean(pinSetting?.value),
      };
    },
    []
  );

  // Check if database has any areas or projects
  const hasData = useLiveQuery(
    async () => {
      const areaCount = await db.areas.count();
      const projCount = await db.projects.filter((p) => !p.isDeleted).count();
      return areaCount > 0 || projCount > 0;
    },
    []
  );

  // Listen for custom App Lock events from PrivacySecurityPanel
  useEffect(() => {
    const onUnlock = () => setIsAppUnlocked(true);
    const onLockNow = () => {
      setIsAppUnlocked(false);
      setLockPinInput('');
      setLockPinError(null);
    };
    window.addEventListener('seshat-app-lock-unlocked', onUnlock);
    window.addEventListener('seshat-app-lock-now', onLockNow);
    return () => {
      window.removeEventListener('seshat-app-lock-unlocked', onUnlock);
      window.removeEventListener('seshat-app-lock-now', onLockNow);
    };
  }, []);

  // Active local reminder scheduler check & Tauri desktop shell event wiring
  useEffect(() => {
    // Automatically clean out any legacy pre-added example goals/projects on startup
    // Preserve all existing records, including edited starter activities.

    const checkReminders = () => {
      const due = reminderService.checkDueReminders();
      if (due) {
        setActiveReminder(due);
      }
    };
    checkReminders();
    const interval = window.setInterval(checkReminders, 60_000);

    // Subscribe to Windows Desktop Shell global shortcut (Ctrl+Shift+K) and tray menu events
    const unsubscribeShell = desktopShellService.subscribeToShellEvents({
      onQuickAdd: () => setQuickAddModalOpen(true),
      onTriggerBackup: () => {
        void dataOwnershipService.saveBackupToLocalFile().then((res) => {
          if (res.saved) {
            setActiveReminder({
              title: 'Backup Saved to Disk',
              body: `Saved ${res.path || res.filename}`,
            });
          }
        });
      },
      onNavigateTab: (tab) => {
        if (['today', 'planner', 'habits', 'progress', 'settings', 'reviews'].includes(tab)) {
          setActiveTab(tab as AppTab);
        }
      },
    });

    // If running inside the Tauri Windows Desktop Shell and daily backup is due, write it silently
    if (isTauriDesktop() && dataOwnershipService.isBackupDueToday()) {
      void dataOwnershipService.saveBackupToLocalFile();
    }

    return () => {
      window.clearInterval(interval);
      unsubscribeShell();
    };
  }, []);

  // Global Keyboard Shortcuts (Ctrl+K, single key 'N', and Alt+1..Alt+5 for tabs)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable;

      // Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setQuickAddModalOpen((prev) => !prev);
        return;
      }

      // Alt+1..Alt+6 for switching top-level tabs
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        const tabMap: Record<string, AppTab> = {
          '1': 'today',
          '2': 'habits',
          '3': 'progress',
          '4': 'planner',
          '5': 'settings',
          '6': 'reviews',
        };
        if (tabMap[e.key]) {
          e.preventDefault();
          setActiveTab(tabMap[e.key]);
          return;
        }
      }

      // Single-key 'n' or 'N' opens Quick Add
      if (!isInput && e.key.toLowerCase() === 'n' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setQuickAddModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (appLockStatus === undefined) return <div role="status" className="p-6">Opening your planner…</div>;

  // Show App Lock Gate screen if PIN lock is enabled and session is not yet unlocked
  if (appLockStatus?.enabled && !isAppUnlocked) {
    const handleUnlockSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      const ok = await dataOwnershipService.verifyAppLockPin(lockPinInput.trim());
      if (ok) {
        setIsAppUnlocked(true);
        setLockPinInput('');
        setLockPinError(null);
      } else {
        setLockPinError('That PIN did not match. After five tries, wait one minute.');
      }
    };

    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-lock-heading"
        className="min-h-screen flex items-center justify-center p-4 bg-[var(--color-paper)] text-[var(--color-ink)]"
      >
        <div className="surface-card rounded-[var(--radius-md)] border border-[var(--color-rule)] p-6 sm:p-8 max-w-sm w-full flex flex-col gap-5 shadow-sm">
          <div className="flex items-center gap-3 hairline-b pb-4">
            <div className="w-10 h-10 rounded-[var(--radius-sm)] bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30 flex items-center justify-center text-[var(--color-accent)]">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h1 id="app-lock-heading" className="font-bold text-base text-[var(--color-ink)]">
                Seshat Notch is Locked
              </h1>
              <p className="text-xs text-[var(--color-ink-muted)]">
                Enter your App Lock PIN to open your planner.
              </p>
            </div>
          </div>

          <form onSubmit={handleUnlockSubmit} className="flex flex-col gap-3">
            <label htmlFor="app-lock-pin-input" className="text-xs font-medium text-[var(--color-ink)]">
              App Lock PIN
            </label>
            <input
              id="app-lock-pin-input"
              type="password"
              inputMode="numeric"
              maxLength={8}
              value={lockPinInput}
              onChange={(e) => {
                setLockPinInput(e.target.value.replace(/\D/g, ''));
                if (lockPinError) setLockPinError(null);
              }}
              placeholder="Enter 4–8 digit PIN"
              autoFocus
              className="w-full min-h-11 px-3 py-2 text-sm font-mono tracking-widest rounded-[var(--radius-xs)] border border-[var(--color-rule-strong)] bg-[var(--color-paper)] text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-accent)]"
            />
            {lockPinError && (
              <p role="alert" className="text-xs font-medium text-[var(--color-status-behind)]">
                {lockPinError}
              </p>
            )}
            <Button type="submit" variant="primary" disabled={lockPinInput.length < 4}>
              Unlock Workspace
            </Button>
          </form>

          <p className="text-[11px] text-[var(--color-ink-muted)] leading-relaxed hairline-t pt-3">
            Local privacy screen gate: requires your PIN before displaying workspace views in this browser or desktop window.
          </p>
        </div>
      </div>
    );
  }

  // Show onboarding wizard if completely empty and not yet completed/dismissed
  if (hasData === false && !onboardingDismissed) {
    return (
      <OnboardingView
        onComplete={() => {
          try {
            localStorage.setItem('seshat_onboarding_completed', 'true');
          } catch {
            // ignore storage errors
          }
          setOnboardingDismissed(true);
          setActiveTab('planner');
        }}
      />
    );
  }

  return (
    <div className="app-shell min-h-screen bg-[var(--color-paper)] text-[var(--color-ink)] flex flex-col">
      {/* App Header */}
      <header className="app-header hairline-b bg-[var(--color-paper)] sticky top-0 z-50 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <BrandLogo size={26} />
          <div className="flex flex-col">
            <h1 className="font-semibold text-sm sm:text-base tracking-tight m-0 leading-tight">
              Seshat Notch
            </h1>
            <span className="hidden sm:inline text-xs text-[var(--color-ink-muted)]">
              A little progress, every day.
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Header Timer Pill */}
          <HeaderTimerPill onNavigateToTime={() => setActiveTab('today')} />

          {/* Quick-Add Shortcut Button in Header */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setQuickAddModalOpen(true)}
            className="inline-flex min-h-8"
            title="Press Ctrl+K or N to open Quick Add"
          >
            <Sparkles className="w-3.5 h-3.5 text-[var(--color-accent)]" />
            <span className="text-xs">Add</span>
            <kbd className="ml-1 px-1 py-0.2 text-[11px] bg-[var(--color-paper-3)] border border-[var(--color-rule)] rounded font-mono">
              Ctrl+K
            </kbd>
          </Button>

          {/* Primary navigation stays visible on every screen size. */}
          <nav className="app-primary-nav" aria-label="Main navigation">
            {([
              ['today', 'Today', Sun], ['habits', 'Activities', Flame],
              ['progress', 'Analytics', BarChart2], ['planner', 'Plan', Briefcase],
              ['settings', 'Settings', Settings],
            ] as const).map(([tab, label, Icon], index) => <button type="button" key={tab}
              className="app-nav-item" aria-label={label} title={label + ' (Alt+' + (index + 1) + ')'}
              aria-current={activeTab === tab ? 'page' : undefined} onClick={() => setActiveTab(tab)}>
              <Icon size={19} aria-hidden="true" /><span className="app-nav-label">{label}</span>
            </button>)}
          </nav>

          <ThemeToggle />
        </div>
      </header>

      {/* Main Container */}
      <main className="app-main flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
        {/* Scheduled Reminder Banner */}
        {activeReminder && (
          <div className="surface-card rounded-[var(--radius-sm)] p-3.5 border border-[var(--color-accent)]/50 bg-[var(--color-paper-2)] flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <Bell className="w-4 h-4 text-[var(--color-accent)] shrink-0" />
              <div>
                <strong className="font-semibold text-[var(--color-ink)]">{activeReminder.title}: </strong>
                <span className="text-[var(--color-ink-muted)]">{activeReminder.body}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveReminder(null)}
              className="p-1 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] rounded"
              aria-label="Dismiss reminder"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Tab 1: Today View */}
        {activeTab === 'today' && (
            <section className="app-screen-enter">
            <TodayView
              onOpenQuickAdd={() => setQuickAddModalOpen(true)}
              onNavigateTab={(tab) => setActiveTab(tab as AppTab)}
            />
          </section>
        )}

        {/* Lazy-loaded tabs */}
        <Suspense
          fallback={
            <div role="status" className="surface-card p-6 text-xs text-[var(--color-ink-muted)] font-mono">
              Loading view…
            </div>
          }
        >
          {activeTab === 'planner' && (
            <section className="app-screen-enter">
              <PlannerView />
            </section>
          )}

          {activeTab === 'habits' && (
            <section className="app-screen-enter">
              <HabitsView />
            </section>
          )}

          {activeTab === 'progress' && (
            <section className="app-screen-enter">
              <DashboardView onNavigateTab={(tab) => setActiveTab(tab as AppTab)} />
            </section>
          )}

          {activeTab === 'settings' && (
            <section className="app-screen-enter">
              <DataManagementView />
            </section>
          )}

          {activeTab === 'reviews' && (
            <section className="app-screen-enter">
              <div className="mb-4">
                <button
                  type="button"
                  onClick={() => setActiveTab('today')}
                  className="text-xs text-[var(--color-accent)] hover:underline flex items-center gap-1 font-medium"
                >
                  Back to Today
                </button>
              </div>
              <ReviewsView currentDateStr={getLocalDateString()} />
            </section>
          )}
        </Suspense>

        <aside
          aria-label="Keyboard shortcuts"
          className="app-shortcuts hairline-t pt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--color-ink-muted)]"
        >
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[var(--color-accent)]" />
            <span>Keyboard shortcuts</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 bg-[var(--color-paper-2)] border border-[var(--color-rule)] rounded text-[11px]">
              Ctrl+K
            </kbd>
            <kbd className="px-1.5 py-0.5 bg-[var(--color-paper-2)] border border-[var(--color-rule)] rounded text-[11px]">
              N
            </kbd>
            <kbd className="px-1.5 py-0.5 bg-[var(--color-paper-2)] border border-[var(--color-rule)] rounded text-[11px]">
              Alt+1..6
            </kbd>
            <kbd className="px-1.5 py-0.5 bg-[var(--color-paper-2)] border border-[var(--color-rule)] rounded text-[11px]">
              Esc
            </kbd>
          </div>
        </aside>
      </main>

      {/* Quick Add Command Palette Modal */}
      <QuickAddModal
        isOpen={quickAddModalOpen}
        onClose={() => setQuickAddModalOpen(false)}
      />

      {/* Desktop Footer */}
      <footer className="app-footer hairline-t px-6 py-4 bg-[var(--color-paper)] mt-auto flex flex-wrap items-center justify-between text-xs text-[var(--color-ink-muted)]">
        <div>Seshat Notch. Every day, a notch. Every goal, measured.</div>
        <div>Your plans stay on this device.</div>
      </footer>
    </div>
  );
};

export default App;
