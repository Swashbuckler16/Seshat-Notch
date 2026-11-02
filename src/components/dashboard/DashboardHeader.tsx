import React from 'react';
import { Area, ProjectGoal } from '../../types';
import { StatTile } from '../ui/StatTile';
import { Calendar, Filter, Layers, BarChart2 } from 'lucide-react';

export type DashboardDateRange = 'today' | 'week' | 'month' | 'quarter' | 'year';

interface DashboardHeaderProps {
  dateRange: DashboardDateRange;
  onDateRangeChange: (range: DashboardDateRange) => void;
  selectedAreaId: string;
  onAreaChange: (areaId: string) => void;
  selectedProjectId: string;
  onProjectChange: (projectId: string) => void;
  areas: Area[];
  projects: ProjectGoal[];
  totalProjects: number;
  overallProgressPercent: number;
  totalHoursLogged: number;
  activeHabitStreak: number;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  dateRange,
  onDateRangeChange,
  selectedAreaId,
  onAreaChange,
  selectedProjectId,
  onProjectChange,
  areas,
  projects,
  totalProjects,
  overallProgressPercent,
  totalHoursLogged,
  activeHabitStreak,
}) => {
  const visibleProjects = selectedAreaId === 'all'
    ? projects
    : projects.filter((project) => project.areaId === selectedAreaId);

  return (
    <section className="dashboard-summary flex flex-col gap-5" aria-labelledby="progress-heading">
      {/* Top Bar: Title & Global Filters (PRD 7.1) */}
      <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-5 hairline-b pb-5">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-[var(--color-accent)]" />
          <div className="flex flex-col">
            <h1 id="progress-heading" className="text-2xl sm:text-3xl font-bold text-[var(--color-ink)] tracking-tight">
              Your progress
            </h1>
            <span className="text-xs text-[var(--color-ink-muted)]">
              See your current plans and the time you have logged.
            </span>
          </div>
        </div>

        {/* Global Controls Filter Group */}
        <div className="dashboard-controls flex flex-wrap items-end gap-3 text-xs">
          {/* Date Range Selector */}
          <fieldset className="flex min-w-0 flex-col gap-1.5 border-0 p-0 m-0">
            <legend className="text-xs font-medium text-[var(--color-ink-muted)]">Hours logged</legend>
            <div className="hours-range flex max-w-full items-center gap-1 overflow-x-auto bg-[var(--color-paper-2)] p-1 rounded-[var(--radius-xs)] border border-[var(--color-rule)] text-[11px]">
              <Calendar className="w-3.5 h-3.5 text-[var(--color-ink-muted)] ml-1 shrink-0" aria-hidden="true" />
              <button
                type="button"
                onClick={() => onDateRangeChange('today')}
                aria-pressed={dateRange === 'today'}
                className={`min-h-11 sm:min-h-8 px-2.5 rounded-[var(--radius-xs)] transition-colors ${
                dateRange === 'today'
                  ? 'bg-[var(--color-paper)] text-[var(--color-ink)] font-semibold shadow-xs'
                  : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
              }`}
              >
                Today
              </button>
            <button
              type="button"
              onClick={() => onDateRangeChange('week')}
              aria-pressed={dateRange === 'week'}
              className={`min-h-11 sm:min-h-8 px-2.5 rounded-[var(--radius-xs)] transition-colors ${
                dateRange === 'week'
                  ? 'bg-[var(--color-paper)] text-[var(--color-ink)] font-semibold shadow-xs'
                  : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
              }`}
            >
              Week
            </button>
            <button
              type="button"
              onClick={() => onDateRangeChange('month')}
              aria-pressed={dateRange === 'month'}
              className={`min-h-11 sm:min-h-8 px-2.5 rounded-[var(--radius-xs)] transition-colors ${
                dateRange === 'month'
                  ? 'bg-[var(--color-paper)] text-[var(--color-ink)] font-semibold shadow-xs'
                  : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
              }`}
            >
              Month
            </button>
            <button
              type="button"
              onClick={() => onDateRangeChange('quarter')}
              aria-pressed={dateRange === 'quarter'}
              className={`min-h-11 sm:min-h-8 px-2.5 rounded-[var(--radius-xs)] transition-colors ${
                dateRange === 'quarter'
                  ? 'bg-[var(--color-paper)] text-[var(--color-ink)] font-semibold shadow-xs'
                  : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
              }`}
            >
              Quarter
            </button>
            <button
              type="button"
              onClick={() => onDateRangeChange('year')}
              aria-pressed={dateRange === 'year'}
              className={`min-h-11 sm:min-h-8 px-2.5 rounded-[var(--radius-xs)] transition-colors ${
                dateRange === 'year'
                  ? 'bg-[var(--color-paper)] text-[var(--color-ink)] font-semibold shadow-xs'
                  : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
              }`}
            >
              Year
            </button>
            </div>
          </fieldset>

          {/* Area Filter */}
          <label className="dashboard-filter-label flex min-w-0 flex-col gap-1.5 text-xs font-medium text-[var(--color-ink-muted)]">
            <span className="flex items-center gap-1.5"><Filter className="w-3.5 h-3.5" aria-hidden="true" />Area</span>
            <select
              aria-label="Filter by life area"
              className="input-field min-h-11 sm:min-h-8 max-w-full px-2 py-1 text-xs rounded-[var(--radius-xs)] border border-[var(--color-rule)] bg-[var(--color-paper)] focus:outline-none focus:border-[var(--color-accent)]"
              value={selectedAreaId}
              onChange={(e) => onAreaChange(e.target.value)}
            >
              <option value="all">All life areas</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>

          {/* Project Filter */}
          <label className="dashboard-filter-label flex min-w-0 flex-col gap-1.5 text-xs font-medium text-[var(--color-ink-muted)]">
            <span className="flex items-center gap-1.5"><Layers className="w-3.5 h-3.5" aria-hidden="true" />Project</span>
            <select
              aria-label="Filter by project"
              className="input-field min-h-11 sm:min-h-8 max-w-full px-2 py-1 text-xs rounded-[var(--radius-xs)] border border-[var(--color-rule)] bg-[var(--color-paper)] focus:outline-none focus:border-[var(--color-accent)]"
              value={selectedProjectId}
              onChange={(e) => onProjectChange(e.target.value)}
            >
              <option value="all">All projects</option>
              {visibleProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <p className="-mt-3 text-xs text-[var(--color-ink-muted)]">
        This period filters the hours total. Project progress and habit streaks show your current totals.
      </p>

      {/* Current status and selected-period focus time */}
      <div className="dashboard-stat-grid grid grid-cols-2 lg:grid-cols-4 gap-0">
        <StatTile
          label="Active projects"
          value={totalProjects}
          unit="projects"
          formulaExplanation="Active projects in the selected area and project filters."
          className="dashboard-header-stat"
        />
        <StatTile
          label="Project progress"
          value={`${overallProgressPercent}%`}
          formulaExplanation="Average progress across active projects in the selected filters."
          className="dashboard-header-stat"
        />
        <StatTile
          label="Hours logged"
          value={`${totalHoursLogged}h`}
          formulaExplanation="Focus time logged between the selected period start and today, within the selected filters."
          className="dashboard-header-stat dashboard-hours-stat"
        />
        <StatTile
          label="Longest streak"
          value={activeHabitStreak}
          unit="days"
          formulaExplanation="The longest current streak among active habits."
          className="dashboard-header-stat"
        />
      </div>
    </section>
  );
};

