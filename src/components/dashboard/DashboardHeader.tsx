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
  return (
    <div className="flex flex-col gap-4 surface-card rounded-[var(--radius-sm)] p-4 border border-[var(--color-rule)]">
      {/* Top Bar: Title & Global Filters (PRD 7.1) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 hairline-b pb-3.5">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-[var(--color-accent)]" />
          <div className="flex flex-col">
            <h1 className="text-base font-bold text-[var(--color-ink)] tracking-tight">
              Executive dashboard & analytics
            </h1>
            <span className="text-xs text-[var(--color-ink-muted)]">
              Multi-horizon synthesis with traceable formulas and custom SVG graphics (PRD Section 7).
            </span>
          </div>
        </div>

        {/* Global Controls Filter Group */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Date Range Selector */}
          <div className="flex items-center gap-1 bg-[var(--color-paper-2)] p-1 rounded-[var(--radius-xs)] border border-[var(--color-rule)] font-mono text-[11px]">
            <Calendar className="w-3.5 h-3.5 text-[var(--color-ink-muted)] ml-1" />
            <button
              type="button"
              onClick={() => onDateRangeChange('today')}
              className={`px-2 py-0.5 rounded-[var(--radius-xs)] transition-colors ${
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
              className={`px-2 py-0.5 rounded-[var(--radius-xs)] transition-colors ${
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
              className={`px-2 py-0.5 rounded-[var(--radius-xs)] transition-colors ${
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
              className={`px-2 py-0.5 rounded-[var(--radius-xs)] transition-colors ${
                dateRange === 'quarter'
                  ? 'bg-[var(--color-paper)] text-[var(--color-ink)] font-semibold shadow-xs'
                  : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
              }`}
            >
              90d
            </button>
            <button
              type="button"
              onClick={() => onDateRangeChange('year')}
              className={`px-2 py-0.5 rounded-[var(--radius-xs)] transition-colors ${
                dateRange === 'year'
                  ? 'bg-[var(--color-paper)] text-[var(--color-ink)] font-semibold shadow-xs'
                  : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
              }`}
            >
              Year
            </button>
          </div>

          {/* Area Filter */}
          <div className="flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-[var(--color-ink-muted)]" />
            <select
              className="input-field px-2 py-1 text-xs rounded-[var(--radius-xs)] border border-[var(--color-rule)] bg-[var(--color-paper)] focus:outline-none focus:border-[var(--color-accent)]"
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
          </div>

          {/* Project Filter */}
          <div className="flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-[var(--color-ink-muted)]" />
            <select
              className="input-field px-2 py-1 text-xs rounded-[var(--radius-xs)] border border-[var(--color-rule)] bg-[var(--color-paper)] focus:outline-none focus:border-[var(--color-accent)]"
              value={selectedProjectId}
              onChange={(e) => onProjectChange(e.target.value)}
            >
              <option value="all">All projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 4 Global KPI StatTiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile
          label="Active projects"
          value={totalProjects}
          unit="projects"
          formulaExplanation="Count of currently active projects under chosen filter."
        />
        <StatTile
          label="Aggregate progress"
          value={`${overallProgressPercent}%`}
          formulaExplanation="Mean progress rate weighted across active projects."
        />
        <StatTile
          label="Hours logged"
          value={`${totalHoursLogged}h`}
          formulaExplanation="Cumulative focus hours logged across the selected period."
        />
        <StatTile
          label="Top active streak"
          value={activeHabitStreak}
          unit="intervals"
          formulaExplanation="Longest current fair habit streak preserved without unexcused miss."
        />
      </div>
    </div>
  );
};

