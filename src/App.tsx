import React, { useEffect, useState } from 'react';
import { BrandLogo } from './components/BrandLogo';
import { ThemeToggle } from './components/ThemeToggle';
import { StorageInspector } from './components/StorageInspector';
import { ComponentShowcase } from './components/ComponentShowcase';
import { QuickAddPlayground } from './components/QuickAddPlayground';
import { QuickAddModal } from './components/QuickAddModal';
import { PlannerView } from './components/planner/PlannerView';
import { TodayView } from './components/today/TodayView';
import { Button } from './components/ui/Button';
import { seedDatabase } from './db/seedData';
import {
  CheckCircle2,
  ArrowRight,
  Layers,
  Terminal,
  Palette,
  Database,
  Sparkles,
  Command,
  Briefcase,
  Sun,
} from 'lucide-react';

interface PhaseInfo {
  number: number;
  title: string;
  scope: string;
  outcome: string;
  status: 'completed' | 'in_progress' | 'queued';
}

const PHASES: PhaseInfo[] = [
  {
    number: 1,
    title: 'Project foundation',
    scope: 'Set up the app, its visual system, and the rules used to keep the interface consistent.',
    outcome: 'A working foundation for the planner',
    status: 'completed',
  },
  {
    number: 2,
    title: 'Local data and change history',
    scope: 'Create the records the planner needs and keep a history of changes.',
    outcome: 'Project data saved on this device',
    status: 'completed',
  },
  {
    number: 3,
    title: 'Interface building blocks',
    scope: 'Create the planner’s buttons, fields, progress marks, and tables.',
    outcome: 'A consistent set of interface controls',
    status: 'completed',
  },
  {
    number: 4,
    title: 'Quick add and keyboard shortcuts',
    scope: 'Add tasks from a short command, with a live preview and a Ctrl+K shortcut.',
    outcome: 'Create a task without leaving the planner',
    status: 'completed',
  },
  {
    number: 5,
    title: 'Areas, projects, and milestones',
    scope: 'Group projects by area, record what success means, and order milestones by dependency.',
    outcome: 'Plan a project from first step to finish',
    status: 'completed',
  },
  {
    number: 6,
    title: 'Planning across time periods',
    scope: 'Set monthly, weekly, and daily targets; carry plans forward or adjust them.',
    outcome: 'Connect longer plans to daily work',
    status: 'completed',
  },
  {
    number: 7,
    title: 'Today view',
    scope: 'See what is due, what you planned, and the time you have logged today.',
    outcome: 'A focused view of today’s work',
    status: 'completed',
  },
  {
    number: 8,
    title: 'Carry-over and reviews',
    scope: 'Review unfinished work and decide whether to reschedule, split, or remove it.',
    outcome: 'Make a clear plan for what comes next',
    status: 'in_progress',
  },
  {
    number: 9,
    title: 'Habits and routines',
    scope: 'Track routines on flexible schedules, with rest days and pauses accounted for.',
    outcome: 'A record that reflects how you actually work',
    status: 'queued',
  },
  {
    number: 10,
    title: 'Time tracking and focus sessions',
    scope: 'Track time with a timer or manual entries, and record focused work and breaks.',
    outcome: 'See where your time went',
    status: 'queued',
  },
  {
    number: 11,
    title: 'Progress calculations',
    scope: 'Calculate progress and pace from your plans, with an explanation for each figure.',
    outcome: 'Understand how each figure is calculated',
    status: 'queued',
  },
  {
    number: 12,
    title: 'Overview and reports',
    scope: 'Bring projects, goals, habits, time, and reviews into one place with clear charts.',
    outcome: 'A useful overview of your planning data',
    status: 'queued',
  },
  {
    number: 13,
    title: 'Import, export, and recovery',
    scope: 'Move your plans between formats, restore removed items, and save backups.',
    outcome: 'Keep control of your planning data',
    status: 'queued',
  },
  {
    number: 14,
    title: 'Windows app packaging',
    scope: 'Prepare a desktop release with a system tray, quick-add shortcut, and local reminders.',
    outcome: 'A planner that runs as a Windows app',
    status: 'queued',
  },
];

export const App: React.FC = () => {
  const [selectedPhase, setSelectedPhase] = useState<number>(7);
  const [activeTab, setActiveTab] = useState<'today' | 'planner' | 'quickadd' | 'components' | 'storage' | 'roadmap'>('today');
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
      {/* Top Ledger Chrome */}
      <header className="app-header hairline-b bg-[var(--color-paper)] sticky top-0 z-50 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BrandLogo size={28} />
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-base tracking-tight">Seshat Notch</span>
            </div>
            <span className="text-xs text-[var(--color-ink-muted)]">
              Every day, a notch. Every goal, measured.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
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
              onClick={() => setActiveTab('planner')}
              aria-current={activeTab === 'planner' ? 'page' : undefined}
              className={`app-nav-item active:translate-y-px inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-xs)] font-medium transition-opacity ${
                activeTab === 'planner' ? 'bg-[var(--color-paper)] text-[var(--color-ink)] shadow-sm' : 'text-[var(--color-ink-muted)]'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Projects</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('quickadd')}
              aria-current={activeTab === 'quickadd' ? 'page' : undefined}
              className={`app-nav-item active:translate-y-px inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-xs)] font-medium transition-opacity ${
                activeTab === 'quickadd' ? 'bg-[var(--color-paper)] text-[var(--color-ink)] shadow-sm' : 'text-[var(--color-ink-muted)]'
              }`}
            >
              <Command className="w-3.5 h-3.5" />
              <span>Quick add</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('components')}
              aria-current={activeTab === 'components' ? 'page' : undefined}
              className={`app-nav-item active:translate-y-px inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-xs)] font-medium transition-opacity ${
                activeTab === 'components' ? 'bg-[var(--color-paper)] text-[var(--color-ink)] shadow-sm' : 'text-[var(--color-ink-muted)]'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Components</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('storage')}
              aria-current={activeTab === 'storage' ? 'page' : undefined}
              className={`app-nav-item active:translate-y-px inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-xs)] font-medium transition-opacity ${
                activeTab === 'storage' ? 'bg-[var(--color-paper)] text-[var(--color-ink)] shadow-sm' : 'text-[var(--color-ink-muted)]'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Data</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('roadmap')}
              aria-current={activeTab === 'roadmap' ? 'page' : undefined}
              className={`app-nav-item active:translate-y-px inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-xs)] font-medium transition-opacity ${
                activeTab === 'roadmap' ? 'bg-[var(--color-paper)] text-[var(--color-ink)] shadow-sm' : 'text-[var(--color-ink-muted)]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Roadmap</span>
            </button>
          </nav>

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

        {/* Tab 1: Areas, Projects & Milestone Planner */}
        {activeTab === 'planner' && (
          <section>
            <PlannerView />
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

        {/* Tab 3: Storage & Change Log Engine */}
        {activeTab === 'storage' && (
          <section>
            <StorageInspector />
          </section>
        )}

        {/* Tab 4: 14-Phase Implementation Roadmap */}
        {activeTab === 'roadmap' && (
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[var(--color-accent)]" />
                  <h2 className="text-sm font-semibold tracking-tight text-[var(--color-ink-muted)]">
                  Development plan
                </h2>
              </div>
              <span className="text-xs text-[var(--color-ink-muted)]">
                Current phase: multi-period planning
              </span>
            </div>

            <div className="border border-[var(--color-rule)] rounded-[var(--radius-sm)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[var(--color-paper-2)] hairline-b text-[var(--color-ink-muted)] font-medium">
                      <th className="py-2.5 px-3 w-16">Phase</th>
                      <th className="py-2.5 px-3">What is included</th>
                      <th className="py-2.5 px-3 hidden md:table-cell">Result</th>
                      <th className="py-2.5 px-3 w-28 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-rule)]">
                    {PHASES.map((phase) => {
                      const isSelected = selectedPhase === phase.number;
                      return (
                        <tr
                          key={phase.number}
                          className={`hover:bg-[var(--color-paper-2)] transition-opacity ${
                            isSelected ? 'bg-[var(--color-paper-2)] font-medium' : ''
                          }`}
                        >
                          <td className="py-2.5 px-3 font-mono text-[var(--color-ink-muted)]">
                            #{phase.number.toString().padStart(2, '0')}
                          </td>
                          <td className="py-2.5 px-3">
                            <button
                              type="button"
                              aria-pressed={isSelected}
                              onClick={() => setSelectedPhase(phase.number)}
                              className="font-semibold text-left text-[var(--color-ink)] hover:text-[var(--color-accent)] focus-visible:outline-2 focus-visible:outline-[var(--color-focus)]"
                            >{phase.title}</button>
                            <div className="text-[11px] text-[var(--color-ink-muted)] mt-0.5 line-clamp-1">
                              {phase.scope}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 hidden md:table-cell text-[var(--color-ink-muted)] text-xs">
                            {phase.outcome}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {phase.status === 'completed' && (
                              <span className="inline-flex items-center gap-1 text-[var(--color-status-on-track)] font-medium">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Done</span>
                              </span>
                            )}
                            {phase.status === 'in_progress' && (
                              <span className="inline-flex items-center gap-1 text-[var(--color-status-at-risk)] font-medium">
                                <ArrowRight className="w-3.5 h-3.5" />
                                <span>Active</span>
                              </span>
                            )}
                            {phase.status === 'queued' && (
                              <span className="text-[var(--color-ink-subtle)] text-[11px]">
                                Queued
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {selectedPhase && (
              <section className="surface-card rounded-[var(--radius-sm)] p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between hairline-b pb-2">
                  <span className="text-xs font-semibold text-[var(--color-accent)]">
                    Phase {selectedPhase.toString().padStart(2, '0')}: {PHASES[selectedPhase - 1].title}
                  </span>
                  <span className="text-xs text-[var(--color-ink-muted)]">
                    {PHASES[selectedPhase - 1].status === 'in_progress' ? 'In progress' : PHASES[selectedPhase - 1].status === 'completed' ? 'Complete' : 'Planned'}
                  </span>
                </div>
                <p className="text-xs text-[var(--color-ink)] leading-relaxed">
                  {PHASES[selectedPhase - 1].scope}
                </p>
                <div className="text-xs text-[var(--color-ink-muted)]">
                  Result: {PHASES[selectedPhase - 1].outcome}
                </div>
              </section>
            )}
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
<div>Seshat Notch: Every day, a notch. Every goal, measured.</div>
        <div>Plans stay on this device</div>
      </footer>
    </div>
  );
};

export default App;
