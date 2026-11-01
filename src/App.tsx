import React, { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import { BrandLogo } from './components/BrandLogo';
import { ThemeToggle } from './components/ThemeToggle';
import { DataManagementView } from './components/data/DataManagementView';
import { QuickAddModal } from './components/QuickAddModal';
import { PlannerView } from './components/planner/PlannerView';
import { TodayView } from './components/today/TodayView';
import { ReviewsView } from './components/reviews/ReviewsView';
import { HabitsView } from './components/habits/HabitsView';
import { HeaderTimerPill } from './components/time/HeaderTimerPill';
import { DashboardView } from './components/dashboard/DashboardView';
import { OnboardingView } from './components/onboarding/OnboardingView';
import { Button } from './components/ui/Button';
import {
  Terminal,
  Sparkles,
  Briefcase,
  Sun,
  Flame,
  BarChart2,
  Settings,
} from 'lucide-react';

export type AppTab = 'today' | 'planner' | 'habits' | 'progress' | 'settings' | 'reviews';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>('today');
  const [quickAddModalOpen, setQuickAddModalOpen] = useState(false);

  // Check if database has any areas or projects
  const hasData = useLiveQuery(
    async () => {
      const areaCount = await db.areas.count();
      const projCount = await db.projects.filter((p) => !p.isDeleted).count();
      return areaCount > 0 || projCount > 0;
    },
    []
  );

  // Global Keyboard Shortcuts (Ctrl+K and single key 'N')
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if focus is in an input or textarea
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

      // Single-key 'n' or 'N' opens Quick Add
      if (!isInput && e.key.toLowerCase() === 'n' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setQuickAddModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Show onboarding wizard if completely empty
  if (hasData === false) {
    return <OnboardingView onComplete={() => setActiveTab('today')} />;
  }

  return (
    <div className="app-shell min-h-screen bg-[var(--color-paper)] text-[var(--color-ink)] flex flex-col pb-20 md:pb-0">
      {/* Friendly app header */}
      <header className="app-header hairline-b bg-[var(--color-paper)] sticky top-0 z-50 px-4 sm:px-6 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <BrandLogo size={26} />
          <div className="flex flex-col">
            <span className="font-semibold text-sm sm:text-base tracking-tight">Seshat Notch</span>
            <span className="hidden sm:inline text-[11px] text-[var(--color-ink-muted)]">
              Every day, a notch. Every goal, measured.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Header Timer Pill */}
          <HeaderTimerPill onNavigateToTime={() => setActiveTab('today')} />

          {/* Quick-Add Shortcut Button in Header */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setQuickAddModalOpen(true)}
            className="hidden sm:inline-flex min-h-11 sm:min-h-8"
            title="Press Ctrl+K or N to open Quick Add"
          >
            <Sparkles className="w-3.5 h-3.5 text-[var(--color-accent)]" />
            <span className="text-xs">Quick Add</span>
            <kbd className="ml-1 px-1 py-0.2 text-[10px] bg-[var(--color-paper-3)] border border-[var(--color-rule)] rounded font-mono">
              Ctrl+K
            </kbd>
          </Button>

          {/* Desktop Top Navigation (5 primary tabs) */}
          <nav className="hidden md:flex items-center bg-[var(--color-paper-2)] p-0.5 border border-[var(--color-rule)] rounded-[var(--radius-xs)] text-xs" aria-label="Main navigation">
            <button
              type="button"
              onClick={() => setActiveTab('today')}
              aria-current={activeTab === 'today' ? 'page' : undefined}
              className={`app-nav-item inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-xs)] font-medium transition-colors ${
                activeTab === 'today' ? 'bg-[var(--color-paper)] text-[var(--color-ink)] shadow-xs font-semibold' : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
              }`}
            >
              <Sun className="w-3.5 h-3.5 text-[var(--color-accent)]" />
              <span>Today</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('planner')}
              aria-current={activeTab === 'planner' ? 'page' : undefined}
              className={`app-nav-item inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-xs)] font-medium transition-colors ${
                activeTab === 'planner' ? 'bg-[var(--color-paper)] text-[var(--color-ink)] shadow-xs font-semibold' : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Plan</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('habits')}
              aria-current={activeTab === 'habits' ? 'page' : undefined}
              className={`app-nav-item inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-xs)] font-medium transition-colors ${
                activeTab === 'habits' ? 'bg-[var(--color-paper)] text-[var(--color-ink)] shadow-xs font-semibold' : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-[var(--color-amber)]" />
              <span>Habits</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('progress')}
              aria-current={activeTab === 'progress' ? 'page' : undefined}
              className={`app-nav-item inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-xs)] font-medium transition-colors ${
                activeTab === 'progress' ? 'bg-[var(--color-paper)] text-[var(--color-ink)] shadow-xs font-semibold' : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Progress</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              aria-current={activeTab === 'settings' ? 'page' : undefined}
              className={`app-nav-item inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-xs)] font-medium transition-colors ${
                activeTab === 'settings' ? 'bg-[var(--color-paper)] text-[var(--color-ink)] shadow-xs font-semibold' : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Settings</span>
            </button>
          </nav>

          <ThemeToggle />
        </div>
      </header>

      {/* Main Container */}
      <main className="app-main flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
        {/* Tab 1: Today View (Morning summary, focus timer, tasks, habits, and Sunday review prompt) */}
        {activeTab === 'today' && (
          <section>
            <TodayView
              onOpenQuickAdd={() => setQuickAddModalOpen(true)}
              onNavigateTab={(tab) => setActiveTab(tab as AppTab)}
            />
          </section>
        )}

        {/* Tab 2: Areas, Projects & Multi-Horizon Plan */}
        {activeTab === 'planner' && (
          <section>
            <PlannerView />
          </section>
        )}

        {/* Tab 3: Habits & Fair Streak Tracking */}
        {activeTab === 'habits' && (
          <section>
            <HabitsView />
          </section>
        )}

        {/* Tab 4: Progress & Executive Dashboard */}
        {activeTab === 'progress' && (
          <section>
            <DashboardView
              onNavigateTab={(tab) => {
                if (tab === 'reviews') {
                  setActiveTab('reviews');
                } else if (['today', 'planner', 'habits', 'progress', 'settings'].includes(tab)) {
                  setActiveTab(tab as AppTab);
                }
              }}
              onOpenProjectDetail={() => setActiveTab('planner')}
            />
          </section>
        )}

        {/* Tab 5: Settings, Export, Import, Backups, Recovery Bin */}
        {activeTab === 'settings' && (
          <section>
            <DataManagementView />
          </section>
        )}

        {/* Contextual Tab: Periodic Review Flow */}
        {activeTab === 'reviews' && (
          <section>
            <div className="mb-4">
              <button
                type="button"
                onClick={() => setActiveTab('today')}
                className="text-xs text-[var(--color-accent)] hover:underline flex items-center gap-1 font-medium"
              >
                ← Back to Today
              </button>
            </div>
            <ReviewsView currentDateStr={new Date().toISOString().split('T')[0]} />
          </section>
        )}

        <aside aria-label="Keyboard shortcuts" className="app-shortcuts hairline-t pt-3 hidden sm:flex items-center justify-between text-xs text-[var(--color-ink-muted)]">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[var(--color-accent)]" />
            <span>Open quick add from anywhere</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 bg-[var(--color-paper-2)] border border-[var(--color-rule)] rounded text-[10px]">Ctrl+K</kbd>
            <kbd className="px-1.5 py-0.5 bg-[var(--color-paper-2)] border border-[var(--color-rule)] rounded text-[10px]">N</kbd>
            <kbd className="px-1.5 py-0.5 bg-[var(--color-paper-2)] border border-[var(--color-rule)] rounded text-[10px]">Esc</kbd>
          </div>
        </aside>
      </main>

      {/* Mobile Fixed Bottom Navigation Bar (48px tap targets) */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[var(--color-paper)] hairline-t px-2 py-1 flex items-center justify-around shadow-lg"
        aria-label="Mobile navigation"
      >
        <button
          type="button"
          onClick={() => setActiveTab('today')}
          aria-current={activeTab === 'today' ? 'page' : undefined}
          className={`flex flex-col items-center justify-center min-h-[48px] min-w-[48px] py-1 px-2 rounded text-[11px] font-medium transition-colors ${
            activeTab === 'today' ? 'text-[var(--color-accent)] font-semibold' : 'text-[var(--color-ink-muted)]'
          }`}
        >
          <Sun className="w-4 h-4" />
          <span>Today</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('planner')}
          aria-current={activeTab === 'planner' ? 'page' : undefined}
          className={`flex flex-col items-center justify-center min-h-[48px] min-w-[48px] py-1 px-2 rounded text-[11px] font-medium transition-colors ${
            activeTab === 'planner' ? 'text-[var(--color-accent)] font-semibold' : 'text-[var(--color-ink-muted)]'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>Plan</span>
        </button>

        <button
          type="button"
          onClick={() => setQuickAddModalOpen(true)}
          className="flex flex-col items-center justify-center min-h-[48px] min-w-[48px] py-1 px-2 text-[var(--color-accent)]"
          aria-label="Quick add task"
        >
          <div className="w-9 h-9 rounded-full bg-[var(--color-accent)] text-[var(--color-accent-ink)] flex items-center justify-center shadow-sm">
            <Sparkles className="w-4 h-4" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('habits')}
          aria-current={activeTab === 'habits' ? 'page' : undefined}
          className={`flex flex-col items-center justify-center min-h-[48px] min-w-[48px] py-1 px-2 rounded text-[11px] font-medium transition-colors ${
            activeTab === 'habits' ? 'text-[var(--color-accent)] font-semibold' : 'text-[var(--color-ink-muted)]'
          }`}
        >
          <Flame className="w-4 h-4" />
          <span>Habits</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('progress')}
          aria-current={activeTab === 'progress' ? 'page' : undefined}
          className={`flex flex-col items-center justify-center min-h-[48px] min-w-[48px] py-1 px-2 rounded text-[11px] font-medium transition-colors ${
            activeTab === 'progress' ? 'text-[var(--color-accent)] font-semibold' : 'text-[var(--color-ink-muted)]'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          <span>Progress</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          aria-current={activeTab === 'settings' ? 'page' : undefined}
          className={`flex flex-col items-center justify-center min-h-[48px] min-w-[48px] py-1 px-2 rounded text-[11px] font-medium transition-colors ${
            activeTab === 'settings' ? 'text-[var(--color-accent)] font-semibold' : 'text-[var(--color-ink-muted)]'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </button>
      </nav>

      {/* Quick Add Command Palette Modal */}
      <QuickAddModal
        isOpen={quickAddModalOpen}
        onClose={() => setQuickAddModalOpen(false)}
      />

      {/* Desktop Footer */}
      <footer className="app-footer hairline-t px-6 py-4 bg-[var(--color-paper)] mt-auto hidden md:flex flex-wrap items-center justify-between text-xs text-[var(--color-ink-muted)]">
        <div>Seshat Notch — Every day, a notch. Every goal, measured.</div>
        <div>All data stays offline on your machine</div>
      </footer>
    </div>
  );
};

export default App;
