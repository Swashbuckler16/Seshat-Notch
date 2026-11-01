import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { ProjectHealthCard } from './ProjectHealthCard';
import { StatTile } from '../ui/StatTile';
import { Calculator } from 'lucide-react';

export const ProjectMetricsView: React.FC = () => {
  const todayStr = new Date().toISOString().split('T')[0];

  const projects = useLiveQuery(
    () => db.projects.filter((p) => !p.isDeleted).toArray(),
    []
  );

  const activeProjects = (projects || []).filter((p) => p.status === 'active');

  return (
    <div className="flex-1 flex flex-col gap-6 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 hairline-b pb-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-[var(--color-accent)]" />
            <h1 className="text-xl font-bold tracking-tight text-[var(--color-ink)]">
              Pure metric engine & formula inspector
            </h1>
          </div>
          <p className="text-xs text-[var(--color-ink-muted)]">
            Traceable project roll-ups, schedule pacing ratios, and 14-day velocity forecasts (PRD Section 7.3).
          </p>
        </div>
      </div>

      {/* Overview Stat Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile
          label="Active projects"
          value={activeProjects.length}
          unit="projects"
          formulaExplanation="Total number of projects currently marked with status: 'active'."
        />
        <StatTile
          label="On-track threshold"
          value="≥ 0.90"
          qualifier="Circle symbol (●)"
          statusVariant="on_track"
          formulaExplanation="Ratio of Progress % to Expected Progress % is 0.90 or greater."
        />
        <StatTile
          label="At-risk threshold"
          value="0.70 – 0.89"
          qualifier="Triangle symbol (▲)"
          statusVariant="at_risk"
          formulaExplanation="Ratio of Progress % to Expected Progress % is between 0.70 and 0.89."
        />
        <StatTile
          label="Behind threshold"
          value="< 0.70"
          qualifier="Square symbol (■)"
          statusVariant="behind"
          formulaExplanation="Ratio of Progress % to Expected Progress % is below 0.70."
        />
      </div>

      {/* Project Health Cards List */}
      <div className="flex flex-col gap-5">
        {activeProjects.length === 0 ? (
          <div className="surface-card rounded-[var(--radius-sm)] p-12 text-center text-xs text-[var(--color-ink-muted)]">
            No active projects available to evaluate.
          </div>
        ) : (
          activeProjects.map((project) => (
            <ProjectHealthCard
              key={project.id}
              project={project}
              todayStr={todayStr}
            />
          ))
        )}
      </div>
    </div>
  );
};
