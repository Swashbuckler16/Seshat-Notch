import React, { useEffect, useState } from 'react';
import { BrandLogo } from './components/BrandLogo';
import { ThemeToggle } from './components/ThemeToggle';
import { NotchRib, DayNotch } from './components/NotchRib';
import { CordBar } from './components/CordBar';
import { StatusBadge } from './components/StatusBadge';
import { StorageInspector } from './components/StorageInspector';
import { seedDatabase } from './db/seedData';
import { CheckCircle2, Clock, Calendar, ArrowRight, Layers, ShieldCheck, Terminal } from 'lucide-react';

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
    title: 'Architecture, Repository & Hallmark Design Truth',
    scope: 'Vite + React 19 + TypeScript + Tailwind v4, design.md source of truth, OKLCH tokens, base rules, audit gates.',
    outcome: 'v0.1 Foundation, 100% Hallmark compliance',
    status: 'completed',
  },
  {
    number: 2,
    title: 'Domain Model, Typed Storage & Change Log',
    scope: 'Typed entities for all PRD 5.2 models, Dexie/SQLite offline engine, append-only Change Log, Heimdall SOC Lab seed.',
    outcome: 'Reliable local-first persistence with auditability & undo',
    status: 'completed',
  },
  {
    number: 3,
    title: 'Design System Primitives & Seshat Brand Motif',
    scope: 'Notch rib generator, measuring cord progress bars, instant focus inputs, single-primary buttons, hairline ledger tables.',
    outcome: 'Tactile ledger component library',
    status: 'in_progress',
  },
  {
    number: 4,
    title: 'Quick-Add Grammar Engine & Keyboard Palette',
    scope: 'Parser for #project >milestone ~estimate !priority @date +metric:value grammar with live preview & Ctrl+K command palette.',
    outcome: '1-keystroke rapid entry on Windows',
    status: 'queued',
  },
  {
    number: 5,
    title: 'Areas, Projects & Milestone Planner',
    scope: 'Area tree organizer, Project/Goal inspector (why, criteria, dates), Milestones with finish-to-start dependencies.',
    outcome: 'Hierarchical project architecture',
    status: 'queued',
  },
  {
    number: 6,
    title: 'Multi-Horizon Planning & Cascade Engine',
    scope: 'Target authoring at Month/Week/Day horizons, cascade distribution helper, copy-forward period tool, re-plan shift tool.',
    outcome: 'Seamless multi-horizon planning',
    status: 'queued',
  },
  {
    number: 7,
    title: 'Today View & Rapid Execution Strip',
    scope: 'Morning summary (<5s scan), targets & habits due today, planned vs logged time, 1-keystroke logger, day timeline.',
    outcome: 'Instant daily execution cockpit',
    status: 'queued',
  },
  {
    number: 8,
    title: 'Carry-Over Inbox & Periodic Reviews',
    scope: 'Carry-over inbox (reschedule, split, drop with reason), Daily/Weekly/Monthly reviews with mood & energy ratings.',
    outcome: 'Zero silent plan drift',
    status: 'queued',
  },
  {
    number: 9,
    title: 'Habit Tracker & Fair Streak Logic',
    scope: 'Schedules (daily, weekdays, N/wk), fair streak engine (skip/vacation pauses, non-breaking rest days), year heatmap.',
    outcome: 'Trustworthy habit ledger',
    status: 'queued',
  },
  {
    number: 10,
    title: 'Time Tracker & Deep Work Focus Mode',
    scope: 'Stopwatch timer, manual duration logging, focus intervals (work/break), categorization (deep, shallow, learning).',
    outcome: 'Rigorous time attribution',
    status: 'queued',
  },
  {
    number: 11,
    title: 'Pure Metric Engine & Formula Inspector',
    scope: 'Deterministic pure functions: Progress %, Expected %, Schedule ratio, 14-day velocity forecast date range, clickable formula inspector.',
    outcome: 'Traceable math across all numbers',
    status: 'queued',
  },
  {
    number: 12,
    title: 'Comprehensive Multi-Tab Dashboard & SVG Charts',
    scope: 'Overview, Execution, Projects, Goals, Habits, Time, Reviews, Insights tabs with inline custom SVG sparklines and burn-ups.',
    outcome: 'Complete central instrument panel',
    status: 'queued',
  },
  {
    number: 13,
    title: 'Data Ownership, Import/Export & Recovery Bin',
    scope: 'Export to JSON/CSV/Markdown, plan import, soft-delete recovery bin, automatic snapshot backups.',
    outcome: '100% local user ownership',
    status: 'queued',
  },
  {
    number: 14,
    title: 'Windows Desktop Shell & Offline Packaging',
    scope: 'System tray integration, global quick-add shortcut, offline local notifications, build release artifacts.',
    outcome: 'Native Windows desktop packaging',
    status: 'queued',
  },
];

const SAMPLE_STUDY_NOTCHES: DayNotch[] = Array.from({ length: 28 }).map((_, i) => {
  const dayNum = i + 1;
  const isCompleted = [1, 2, 3, 4, 5, 8, 9, 10, 11, 12, 15, 16, 17, 18, 19, 22, 23, 24, 25].includes(dayNum);
  const isSkipped = [6, 13, 20, 27].includes(dayNum);
  const isToday = dayNum === 25;
  return {
    dayLabel: `Day ${dayNum}`,
    dateStr: `2026-10-${dayNum.toString().padStart(2, '0')}`,
    isCompleted,
    isSkipped,
    isToday,
  };
});

export const App: React.FC = () => {
  const [selectedPhase, setSelectedPhase] = useState<number>(2);
  const [activeTab, setActiveTab] = useState<'storage' | 'motif' | 'roadmap'>('storage');

  useEffect(() => {
    // Seed initial data once on mount if empty
    seedDatabase(false);
  }, []);

  return (
    <div className="min-h-screen bg-[var(--color-paper)] text-[var(--color-ink)] flex flex-col">
      {/* Top Ledger Chrome */}
      <header className="hairline-b bg-[var(--color-paper)] sticky top-0 z-50 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BrandLogo size={28} />
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-base tracking-tight">Seshat Notch</span>
              <span className="font-mono text-xs px-1.5 py-0.2 bg-[var(--color-paper-2)] border border-[var(--color-rule)] rounded-[var(--radius-xs)] text-[var(--color-accent)] font-semibold">
                Phase 2 Completed
              </span>
            </div>
            <span className="text-xs text-[var(--color-ink-muted)]">
              Every day, a notch. Every goal, measured.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Navigation Pill Switcher */}
          <div className="flex items-center bg-[var(--color-paper-2)] p-0.5 border border-[var(--color-rule)] rounded-[var(--radius-xs)] text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('storage')}
              className={`px-2.5 py-1 rounded-[var(--radius-xs)] font-medium transition-opacity ${
                activeTab === 'storage' ? 'bg-[var(--color-paper)] text-[var(--color-ink)] shadow-sm' : 'text-[var(--color-ink-muted)]'
              }`}
            >
              Storage & Change Log
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('motif')}
              className={`px-2.5 py-1 rounded-[var(--radius-xs)] font-medium transition-opacity ${
                activeTab === 'motif' ? 'bg-[var(--color-paper)] text-[var(--color-ink)] shadow-sm' : 'text-[var(--color-ink-muted)]'
              }`}
            >
              Brand Motif
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('roadmap')}
              className={`px-2.5 py-1 rounded-[var(--radius-xs)] font-medium transition-opacity ${
                activeTab === 'roadmap' ? 'bg-[var(--color-paper)] text-[var(--color-ink)] shadow-sm' : 'text-[var(--color-ink-muted)]'
              }`}
            >
              Roadmap (14 Phases)
            </button>
          </div>

          <ThemeToggle />
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-6 flex flex-col gap-8">
        {/* Hallmark Floor & Verification Banner */}
        <section className="surface-well border border-[var(--color-rule)] rounded-[var(--radius-sm)] p-4 flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2 hairline-b pb-2.5">
            <div className="flex items-center gap-2 text-xs font-mono">
              <ShieldCheck className="w-4 h-4 text-[var(--color-accent)]" />
              <span className="font-semibold text-[var(--color-ink)]">Hallmark v2.0.0 Verification</span>
              <span className="text-[var(--color-ink-muted)]">· Phase 2: Domain Model & Typed Storage</span>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status="on_track" ratio={1.0} />
            </div>
          </div>
          <p className="text-xs text-[var(--color-ink-muted)] leading-relaxed">
            Local-first storage active. All state changes are written through a domain service appending to an
            immutable change log (PRD Section 10.3). Seeded with the full Heimdall SOC Lab project (8 phases, weekly
            and monthly targets, MITRE ATT&CK techniques, habits, and routines).
          </p>
        </section>

        {/* Tab 1: Storage & Change Log Engine */}
        {activeTab === 'storage' && (
          <section>
            <StorageInspector />
          </section>
        )}

        {/* Tab 2: Brand Motif Demonstration */}
        {activeTab === 'motif' && (
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold tracking-tight uppercase text-[var(--color-ink-muted)]">
                Brand Motif Architecture (PRD Section 9.3)
              </h2>
              <span className="text-xs font-mono text-[var(--color-ink-muted)]">Real Heimdall SOC Lab Seed Preview</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* The Notch on a Rib */}
              <div className="surface-card rounded-[var(--radius-sm)] p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[var(--color-accent)]" />
                    <span className="text-xs font-semibold">The Notch on a Rib (Daily Study Streak)</span>
                  </div>
                  <span className="text-[11px] font-mono text-[var(--color-ink-muted)]">4 weeks (7-day ticks)</span>
                </div>
                <p className="text-xs text-[var(--color-ink-muted)]">
                  Completed days are marked as vertical ticks on a rib grouped in sevens. Rest days are fair skips.
                </p>
                <div className="pt-2">
                  <NotchRib notches={SAMPLE_STUDY_NOTCHES} label="October 2026 Study Block" />
                </div>
              </div>

              {/* The Measuring Cord */}
              <div className="surface-card rounded-[var(--radius-sm)] p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[var(--color-accent)]" />
                    <span className="text-xs font-semibold">The Measuring Cord (Techniques Emulated)</span>
                  </div>
                  <StatusBadge status="on_track" ratio={0.92} />
                </div>
                <p className="text-xs text-[var(--color-ink-muted)]">
                  Progress and target-vs-actual bars carry an etched 10% survey scale with visible arithmetic.
                </p>
                <div className="pt-2 flex flex-col gap-3">
                  <CordBar
                    current={11}
                    total={12}
                    expected={10}
                    unit="techniques"
                    label="Phase 6: Attack & Detect Target"
                  />
                  <CordBar
                    current={3}
                    total={3}
                    expected={2}
                    unit="detections"
                    label="Week 44 Target: Document 3 detections"
                  />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Tab 3: 14-Phase Implementation Roadmap */}
        {activeTab === 'roadmap' && (
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[var(--color-accent)]" />
                <h2 className="text-sm font-semibold tracking-tight uppercase text-[var(--color-ink-muted)]">
                  Implementation Roadmap (14 Structured Phases)
                </h2>
              </div>
              <span className="text-xs text-[var(--color-ink-muted)] font-mono">
                Complete one phase at a time · Commit & push per phase
              </span>
            </div>

            <div className="border border-[var(--color-rule)] rounded-[var(--radius-sm)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[var(--color-paper-2)] hairline-b text-[var(--color-ink-muted)] font-medium">
                      <th className="py-2.5 px-3 w-16">Phase</th>
                      <th className="py-2.5 px-3">Title & Deliverables</th>
                      <th className="py-2.5 px-3 hidden md:table-cell">Target Outcome</th>
                      <th className="py-2.5 px-3 w-28 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-rule)]">
                    {PHASES.map((phase) => {
                      const isSelected = selectedPhase === phase.number;
                      return (
                        <tr
                          key={phase.number}
                          onClick={() => setSelectedPhase(phase.number)}
                          className={`cursor-pointer hover:bg-[var(--color-paper-2)] transition-opacity ${
                            isSelected ? 'bg-[var(--color-paper-2)] font-medium' : ''
                          }`}
                        >
                          <td className="py-2.5 px-3 font-mono text-[var(--color-ink-muted)]">
                            #{phase.number.toString().padStart(2, '0')}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-[var(--color-ink)]">{phase.title}</div>
                            <div className="text-[11px] text-[var(--color-ink-muted)] mt-0.5 line-clamp-1">
                              {phase.scope}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 hidden md:table-cell text-[var(--color-ink-muted)] font-mono text-[11px]">
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
                              <span className="text-[var(--color-ink-subtle)] font-mono text-[11px]">
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
                  <span className="text-xs font-mono font-semibold text-[var(--color-accent)]">
                    Phase {selectedPhase.toString().padStart(2, '0')}: {PHASES[selectedPhase - 1].title}
                  </span>
                  <span className="text-xs font-mono text-[var(--color-ink-muted)]">
                    Status: {PHASES[selectedPhase - 1].status.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-[var(--color-ink)] leading-relaxed">
                  {PHASES[selectedPhase - 1].scope}
                </p>
                <div className="text-xs text-[var(--color-ink-muted)] font-mono">
                  Target Outcome: {PHASES[selectedPhase - 1].outcome}
                </div>
              </section>
            )}
          </section>
        )}

        {/* Windows Terminal & Hotkey Readiness */}
        <section className="surface-well border border-[var(--color-rule)] rounded-[var(--radius-sm)] p-3 flex items-center justify-between text-xs text-[var(--color-ink-muted)] font-mono">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[var(--color-accent)]" />
            <span>Windows Ergonomics: Command palette & Quick-add grammar ready for Phase 4</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 bg-[var(--color-paper)] border border-[var(--color-rule)] rounded text-[10px]">Ctrl+K</kbd>
            <kbd className="px-1.5 py-0.5 bg-[var(--color-paper)] border border-[var(--color-rule)] rounded text-[10px]">N</kbd>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="hairline-t px-6 py-4 bg-[var(--color-paper)] mt-auto flex flex-wrap items-center justify-between text-xs text-[var(--color-ink-muted)]">
        <div>Seshat Notch — Every day, a notch. Every goal, measured.</div>
        <div className="font-mono">Local-First · Windows Native Shell · 100% Offline Capable</div>
      </footer>
    </div>
  );
};

export default App;
