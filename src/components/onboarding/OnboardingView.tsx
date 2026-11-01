import React, { useState } from 'react';
import { domainService } from '../../services/domainService';
import { seedDatabase } from '../../db/seedData';
import { getLocalDateString } from '../../utils/dateUtils';
import {
  Compass,
  Briefcase,
  Sparkles,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  FolderPlus,
} from 'lucide-react';

interface OnboardingViewProps {
  onComplete: () => void;
}

export const OnboardingView: React.FC<OnboardingViewProps> = ({ onComplete }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);

  // Form State
  const [areaName, setAreaName] = useState('Deep Work & Projects');
  const [projectTitle, setProjectTitle] = useState('');
  const [projectWhy, setProjectWhy] = useState('');
  const [habitTitle, setHabitTitle] = useState('60m Deep Work');
  const [habitFrequency, setHabitFrequency] = useState<'daily' | 'weekdays'>('weekdays');

  const handleFinishCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!areaName.trim() || !projectTitle.trim() || !habitTitle.trim()) return;

    setLoading(true);
    try {
      // 1. Create Area
      const area = await domainService.createArea({
        name: areaName.trim(),
        order: 1,
      });

      // 2. Create Project
      const todayStr = getLocalDateString();
      const project = await domainService.createProject({
        areaId: area.id,
        title: projectTitle.trim(),
        why: projectWhy.trim() || undefined,
        status: 'active',
        priority: 'high',
        isGoal: false,
        startDate: todayStr,
        tags: [],
        weightType: 'equal',
      });

      // 3. Create Habit
      await domainService.createHabit({
        title: habitTitle.trim(),
        scheduleType: habitFrequency,
        isAvoidance: false,
        linkedGoalId: project.id,
        startDate: todayStr,
        metricType: 'boolean',
        targetValue: 1,
      });

      onComplete();
    } catch (err) {
      console.error('Failed to complete onboarding setup', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSample = async () => {
    setLoading(true);
    try {
      await seedDatabase(true);
      onComplete();
    } catch (err) {
      console.error('Failed to load example plan', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--color-paper)]">
      <div className="surface-card rounded-[var(--radius-md)] border border-[var(--color-rule)] p-6 sm:p-8 max-w-xl w-full flex flex-col gap-6 shadow-sm">
        {/* Brand / Header */}
        <div className="flex items-center gap-3 hairline-b pb-4">
          <div className="w-10 h-10 rounded-[var(--radius-sm)] bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/30 flex items-center justify-center text-[var(--color-accent)]">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-base text-[var(--color-ink)]">
              Welcome to Seshat Notch
            </h1>
            <p className="text-xs text-[var(--color-ink-muted)]">
              Every day, a notch. Every goal, measured.
            </p>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-between gap-2 text-xs">
          <div className={`flex items-center gap-1.5 font-medium ${step >= 1 ? 'text-[var(--color-accent)]' : 'text-[var(--color-ink-muted)]'}`}>
            <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-[11px] font-mono">1</span>
            <span>Life Area</span>
          </div>
          <div className="h-px flex-1 bg-[var(--color-rule)]" />
          <div className={`flex items-center gap-1.5 font-medium ${step >= 2 ? 'text-[var(--color-accent)]' : 'text-[var(--color-ink-muted)]'}`}>
            <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-[11px] font-mono">2</span>
            <span>First Project</span>
          </div>
          <div className="h-px flex-1 bg-[var(--color-rule)]" />
          <div className={`flex items-center gap-1.5 font-medium ${step >= 3 ? 'text-[var(--color-accent)]' : 'text-[var(--color-ink-muted)]'}`}>
            <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-[11px] font-mono">3</span>
            <span>Daily Habit</span>
          </div>
        </div>

        {/* Step 1: Life Area */}
        {step === 1 && (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-sm font-semibold text-[var(--color-ink)] flex items-center gap-1.5">
                <FolderPlus className="w-4 h-4 text-[var(--color-accent)]" />
                <span>Define your first Life Area</span>
              </h2>
              <p className="text-xs text-[var(--color-ink-muted)] mt-1">
                Life Areas organize your projects and domains of responsibility (e.g., Engineering, Health, Writing).
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="area-name" className="text-xs font-medium text-[var(--color-ink)]">
                Area Name
              </label>
              <input
                id="area-name"
                type="text"
                value={areaName}
                onChange={(e) => setAreaName(e.target.value)}
                placeholder="e.g. Work & Engineering"
                className="w-full min-h-11 px-3 py-2 text-xs rounded-[var(--radius-xs)] border border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-accent)]"
                autoFocus
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => areaName.trim() && setStep(2)}
                disabled={!areaName.trim()}
                className="min-h-11 px-4 py-2 text-xs font-medium bg-[var(--color-accent)] text-[var(--color-accent-ink)] rounded-[var(--radius-xs)] hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: First Project */}
        {step === 2 && (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-sm font-semibold text-[var(--color-ink)] flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-[var(--color-accent)]" />
                <span>Create your first Project or Goal</span>
              </h2>
              <p className="text-xs text-[var(--color-ink-muted)] mt-1">
                A project holds milestones, tasks, and measurable targets.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="project-title" className="text-xs font-medium text-[var(--color-ink)]">
                  Project Title
                </label>
                <input
                  id="project-title"
                  type="text"
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  placeholder="e.g. Security Certification Lab or Launch MVP"
                  className="w-full min-h-11 px-3 py-2 text-xs rounded-[var(--radius-xs)] border border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-accent)]"
                  autoFocus
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="project-why" className="text-xs font-medium text-[var(--color-ink)]">
                  Why does this matter? (Optional)
                </label>
                <input
                  id="project-why"
                  type="text"
                  value={projectWhy}
                  onChange={(e) => setProjectWhy(e.target.value)}
                  placeholder="e.g. Master defensive engineering and secure promotion"
                  className="w-full min-h-11 px-3 py-2 text-xs rounded-[var(--radius-xs)] border border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-accent)]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="min-h-11 px-3 py-2 text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => projectTitle.trim() && setStep(3)}
                disabled={!projectTitle.trim()}
                className="min-h-11 px-4 py-2 text-xs font-medium bg-[var(--color-accent)] text-[var(--color-accent-ink)] rounded-[var(--radius-xs)] hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Daily Habit */}
        {step === 3 && (
          <form onSubmit={handleFinishCustom} className="flex flex-col gap-4">
            <div>
              <h2 className="text-sm font-semibold text-[var(--color-ink)] flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[var(--color-accent)]" />
                <span>Add your key Habit</span>
              </h2>
              <p className="text-xs text-[var(--color-ink-muted)] mt-1">
                Habits support your long-term projects with fair streak tracking that respects rest days.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="habit-title" className="text-xs font-medium text-[var(--color-ink)]">
                  Habit Title
                </label>
                <input
                  id="habit-title"
                  type="text"
                  value={habitTitle}
                  onChange={(e) => setHabitTitle(e.target.value)}
                  placeholder="e.g. 60m Deep Work Session"
                  className="w-full min-h-11 px-3 py-2 text-xs rounded-[var(--radius-xs)] border border-[var(--color-rule)] bg-[var(--color-paper)] text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-accent)]"
                  autoFocus
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-[var(--color-ink)]">Schedule</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setHabitFrequency('weekdays')}
                    className={`min-h-11 p-2 text-xs rounded border text-left flex flex-col justify-center ${
                      habitFrequency === 'weekdays'
                        ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5 font-semibold text-[var(--color-ink)]'
                        : 'border-[var(--color-rule)] text-[var(--color-ink-muted)]'
                    }`}
                  >
                    <span>Weekdays (Mon–Fri)</span>
                    <span className="text-[11px] text-[var(--color-ink-muted)] font-normal">Weekends excused</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setHabitFrequency('daily')}
                    className={`min-h-11 p-2 text-xs rounded border text-left flex flex-col justify-center ${
                      habitFrequency === 'daily'
                        ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5 font-semibold text-[var(--color-ink)]'
                        : 'border-[var(--color-rule)] text-[var(--color-ink-muted)]'
                    }`}
                  >
                    <span>Every day (7 days)</span>
                    <span className="text-[11px] text-[var(--color-ink-muted)] font-normal">Daily discipline</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="min-h-11 px-3 py-2 text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading || !habitTitle.trim()}
                className="min-h-11 px-4 py-2 text-xs font-medium bg-[var(--color-accent)] text-[var(--color-accent-ink)] rounded-[var(--radius-xs)] hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{loading ? 'Setting up…' : 'Start Using Seshat Notch'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Alternative: Load Example Plan */}
        <div className="hairline-t pt-4 flex flex-col items-center gap-2 text-center">
          <span className="text-xs text-[var(--color-ink-muted)]">Prefer to explore with real sample data?</span>
          <button
            type="button"
            onClick={handleLoadSample}
            disabled={loading}
            className="min-h-11 px-4 py-1.5 text-xs font-medium text-[var(--color-accent)] hover:bg-[var(--color-paper-2)] border border-[var(--color-rule)] rounded-[var(--radius-xs)] inline-flex items-center gap-2 transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            <span>Load example plan</span>
          </button>
        </div>
      </div>
    </div>
  );
};
