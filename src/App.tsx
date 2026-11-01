import React, { useEffect, useState } from 'react';
import { BrandLogo } from './components/BrandLogo';
import { ThemeToggle } from './components/ThemeToggle';
import { DataManagementView } from './components/data/DataManagementView';
import { ComponentShowcase } from './components/ComponentShowcase';
import { QuickAddPlayground } from './components/QuickAddPlayground';
import { QuickAddModal } from './components/QuickAddModal';
import { PlannerView } from './components/planner/PlannerView';
import { TodayView } from './components/today/TodayView';
import { ReviewsView } from './components/reviews/ReviewsView';
import { HabitsView } from './components/habits/HabitsView';
import { TimeView } from './components/time/TimeView';
import { HeaderTimerPill } from './components/time/HeaderTimerPill';
import { DashboardView } from './components/dashboard/DashboardView';
import { Button } from './components/ui/Button';
import { seedDatabase } from './db/seedData';
import {
  Terminal,
  Sparkles,
  Briefcase,
  Sun,
  Inbox,
  Flame,
  Clock,
  BarChart2,
  Settings2,
} from 'lucide-react';

export const App: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'today' | 'dashboard' | 'planner' | 'habits' | 'time' | 'reviews' | 'quickadd' | 'components' | 'storage' >('today');
  const [quickAddModalOpen, setQuickAddModalOpen] = useState(false);

  useEffect(() => {
    seedDatabase(false);
  }, []);

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

  return (
    <div className="app-shell min-h-screen bg-[var(--color-paper)] text-[var(--color-ink)] flex flex-col">
      {/* Friendly app header */}
      <header className="app-header hairline-b bg-[var(--color-paper)] sticky top-0 z-50 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BrandLogo size={28} />
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-base tracking-tight">Seshat Notch</span>
            </div>
            <span className="text-xs text-[var(--color-ink-muted)]">
              A little progress, every day.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Active Floating Header Timer Pill */}
          <HeaderTimerPill onNavigateToTime={() => setActiveTab('time')} />

          {/* Quick-Add Shortcut Button in Header */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setQuickAddModalOpen(true)}
            className="hidden sm:inline-flex"
            title="Press Ctrl+K or N to open Quick Add"
          >
            <Sparkles className="w-3.5 h-3.5 text-[var(--color-accent)]" />
            <span>Quick Add</span>
            <kbd className="ml-1 px-1 py-0.2 text-[11px] bg-[var(--color-paper-3)] border border-[var(--color-rule)] rounded font-mono">
              Ctrl+K
            </kbd>
          </Button>

          {/* Navigation Pill Switcher */}
          <nav className="app-primary-nav flex items-center bg-[var(--color-paper-2)] p-0.5 border border-[var(--color-rule)] rounded-[var(--radius-xs)] text-xs" aria-label="Main navigation">
            <button
              type="button"
              onClick={() => setActiveTab('today')}
              aria-current={activeTab === 'today' ? 'page' : undefined}
              className={`app-nav-item active:translate-y-px inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-xs)] font-medium transition-opacity ${
                activeTab === 'today' ? 'bg-[var(--color-paper)] text-[var(--color-ink)] shadow-sm' : 'text-[var(--color-ink-muted)]'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>Today</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              aria-current={activeTab === 'dashboard' ? 'page' : undefined}
              className={`app-nav-item active:translate-y-px inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-xs)] font-medium transition-opacity ${
                activeTab === 'dashboard' ? 'bg-[var(--color-paper)] text-[var(--color-ink)] shadow-sm' : 'text-[var(--color-ink-muted)]'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Progress</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('planner')}
              aria-current={activeTab === 'planner' ? 'page' : undefined}
              className={`app-nav-item active:translate-y-px inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-xs)] font-medium transition-opacity ${
                activeTab === 'planner' ? 'bg-[var(--color-paper)] text-[var(--color-ink)] shadow-sm' : 'text-[var(--color-ink-muted)]'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Plan</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('habits')}
              aria-current={activeTab === 'habits' ? 'page' : undefined}
              className={`app-nav-item active:translate-y-px inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-xs)] font-medium transition-opacity ${
                activeTab === 'habits' ? 'bg-[var(--color-paper)] text-[var(--color-ink)] shadow-sm' : 'text-[var(--color-ink-muted)]'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Habits</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('time')}
              aria-current={activeTab === 'time' ? 'page' : undefined}
              className={`app-nav-item active:translate-y-px inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-xs)] font-medium transition-opacity ${
                activeTab === 'time' ? 'bg-[var(--color-paper)] text-[var(--color-ink)] shadow-sm' : 'text-[var(--color-ink-muted)]'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Focus</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('reviews')}
              aria-current={activeTab === 'reviews' ? 'page' : undefined}
              className={`app-nav-item active:translate-y-px inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-xs)] font-medium transition-opacity ${
                activeTab === 'reviews' ? 'bg-[var(--color-paper)] text-[var(--color-ink)] shadow-sm' : 'text-[var(--color-ink-muted)]'
              }`}
            >
              <Inbox className="w-3.5 h-3.5" />
              <span>Reviews</span>
            </button>
          </nav>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveTab('storage')}
            className="app-data-link"
            aria-label="Open data and backup settings"
          >
            <Settings2 className="w-4 h-4" />
            <span>Data</span>
          </Button>

          <ThemeToggle />
        </div>
      </header>

      {/* Main Container */}
      <main className="app-main flex-1 max-w-6xl w-full mx-auto px-6 py-6 flex flex-col gap-8">
        {/* Tab 0: Today View */}
        {activeTab === 'today' && (
          <section>
            <TodayView onOpenQuickAdd={() => setQuickAddModalOpen(true)} />
          </section>
        )}

        {/* Tab 0.5: Executive Dashboard & Analytics */}
        {activeTab === 'dashboard' && (
          <section>
            <DashboardView
              onNavigateTab={(tab) => {
                if (['today', 'planner', 'habits', 'time', 'reviews', 'quickadd', 'components', 'storage'].includes(tab)) {
                  setActiveTab(tab as any);
                }
              }}
              onOpenProjectDetail={() => setActiveTab('planner')}
            />
          </section>
        )}

        {/* Tab 1: Areas, Projects & Milestone Planner */}
        {activeTab === 'planner' && (
          <section>
            <PlannerView />
          </section>
        )}

        {/* Tab 2: Habits & Fair Streak Ledger */}
        {activeTab === 'habits' && (
          <section>
            <HabitsView />
          </section>
        )}

        {/* Tab 3: Time Tracking & Focus Mode */}
        {activeTab === 'time' && (
          <section>
            <TimeView />
          </section>
        )}

        {/* Tab 4: Carry-Over Inbox & Periodic Reviews */}
        {activeTab === 'reviews' && (
          <section>
            <ReviewsView currentDateStr={new Date().toISOString().split('T')[0]} />
          </section>
        )}

        {/* Tab 2: Quick-Add Grammar Engine & Playground */}
        {activeTab === 'quickadd' && (
          <section>
            <QuickAddPlayground onOpenQuickAddModal={() => setQuickAddModalOpen(true)} />
          </section>
        )}

        {/* Tab 2: Component Library & Brand Motif Primitives */}
        {activeTab === 'components' && (
          <section>
            <ComponentShowcase />
          </section>
        )}

        {/* Tab 3: Data Ownership, Export & Recovery */}
        {activeTab === 'storage' && (
          <section>
            <DataManagementView />
          </section>
        )}

        <aside aria-label="Keyboard shortcuts" className="app-shortcuts hairline-t pt-3 flex items-center justify-between text-xs text-[var(--color-ink-muted)]">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[var(--color-accent)]" />
            <span>Open quick add</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 bg-[var(--color-paper)] border border-[var(--color-rule)] rounded text-[10px]">Ctrl+K</kbd>
            <kbd className="px-1.5 py-0.5 bg-[var(--color-paper)] border border-[var(--color-rule)] rounded text-[10px]">N</kbd>
            <kbd className="px-1.5 py-0.5 bg-[var(--color-paper)] border border-[var(--color-rule)] rounded text-[10px]">Esc</kbd>
          </div>
        </aside>
      </main>

      {/* Quick Add Command Palette Modal */}
      <QuickAddModal
        isOpen={quickAddModalOpen}
        onClose={() => setQuickAddModalOpen(false)}
      />

      {/* Footer */}
      <footer className="app-footer hairline-t px-6 py-4 bg-[var(--color-paper)] mt-auto flex flex-wrap items-center justify-between text-xs text-[var(--color-ink-muted)]">
        <div>Seshat Notch. Small steps, your pace.</div>
        <div>Your plans stay on this device</div>
      </footer>
    </div>
  );
};

export default App;
