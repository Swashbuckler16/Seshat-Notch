import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { DashboardHeader, DashboardDateRange } from './DashboardHeader';
import { DashboardOverviewTab } from './tabs/DashboardOverviewTab';
import { DashboardExecutionTab } from './tabs/DashboardExecutionTab';
import { DashboardProjectsTab } from './tabs/DashboardProjectsTab';
import { DashboardGoalsTab } from './tabs/DashboardGoalsTab';
import { DashboardHabitsTab } from './tabs/DashboardHabitsTab';
import { DashboardTimeTab } from './tabs/DashboardTimeTab';
import { DashboardReviewsTab } from './tabs/DashboardReviewsTab';
import { DashboardInsightsTab } from './tabs/DashboardInsightsTab';
import { calculateProjectProgress } from '../../utils/metricEngine';
import { calculateHabitMetrics } from '../../utils/habitMath';
import { formatLocalDate, getLocalDateString, parseLocalDate } from '../../utils/dateUtils';
import {
  LayoutDashboard,
  Activity,
  Briefcase,
  Compass,
  Flame,
  Clock,
  BookOpen,
  Lightbulb,
} from 'lucide-react';

export type DashboardSubTab =
  | 'overview'
  | 'execution'
  | 'projects'
  | 'goals'
  | 'habits'
  | 'time'
  | 'reviews'
  | 'insights';

interface DashboardViewProps {
  onNavigateTab?: (tab: string) => void;
  onOpenProjectDetail?: (projectId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigateTab,
  onOpenProjectDetail,
}) => {
  const [dateRange, setDateRange] = useState<DashboardDateRange>('week');
  const [selectedAreaId, setSelectedAreaId] = useState<string>('all');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [activeSubTab, setActiveSubTab] = useState<DashboardSubTab>('overview');

  // Derive today local date string YYYY-MM-DD
  const todayStr = useMemo(() => getLocalDateString(), []);

  const hoursRangeStart = useMemo(() => {
    const start = parseLocalDate(todayStr);
    if (dateRange === 'week') {
      start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    } else if (dateRange === 'month') {
      start.setDate(1);
    } else if (dateRange === 'quarter') {
      start.setMonth(Math.floor(start.getMonth() / 3) * 3, 1);
    } else if (dateRange === 'year') {
      start.setMonth(0, 1);
    }
    return formatLocalDate(start);
  }, [dateRange, todayStr]);

  // Live queries from Dexie database
  const areas = useLiveQuery(() => db.areas.filter((a) => !a.isArchived).sortBy('order'), []) || [];
  const projects = useLiveQuery(() => db.projects.filter((p) => !p.isDeleted).toArray(), []) || [];
  const milestones = useLiveQuery(() => db.milestones.filter((m) => !m.isDeleted).sortBy('order'), []) || [];
  const targets = useLiveQuery(() => db.targets.filter((t) => !t.isDeleted).toArray(), []) || [];
  const tasks = useLiveQuery(() => db.tasks.filter((t) => !t.isDeleted).toArray(), []) || [];
  const habits = useLiveQuery(() => db.habits.filter((h) => !h.isDeleted).toArray(), []) || [];
  const progressLogs = useLiveQuery(() => db.progressLogs.filter((l) => !l.isDeleted).toArray(), []) || [];
  const timeSessions = useLiveQuery(() => db.timeSessions.toArray(), []) || [];
  const reviews = useLiveQuery(() => db.reviews.toArray(), []) || [];
  const blockers = useLiveQuery(() => db.blockers.toArray(), []) || [];
  const changeLogs = useLiveQuery(() => db.changeLogs.reverse().sortBy('timestamp'), []) || [];

  // Filtered dataset according to global header selection
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (selectedAreaId !== 'all' && p.areaId !== selectedAreaId) return false;
      if (selectedProjectId !== 'all' && p.id !== selectedProjectId) return false;
      return true;
    });
  }, [projects, selectedAreaId, selectedProjectId]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (selectedProjectId !== 'all' && t.projectId !== selectedProjectId) return false;
      if (selectedAreaId !== 'all') {
        const p = projects.find((proj) => proj.id === t.projectId);
        if (p && p.areaId !== selectedAreaId) return false;
      }
      return true;
    });
  }, [tasks, projects, selectedAreaId, selectedProjectId]);

  const filteredTargets = useMemo(() => {
    return targets.filter((t) => {
      if (selectedProjectId !== 'all' && t.projectId !== selectedProjectId) return false;
      if (selectedAreaId !== 'all') {
        const p = projects.find((proj) => proj.id === t.projectId);
        if (p && p.areaId !== selectedAreaId) return false;
      }
      return true;
    });
  }, [targets, projects, selectedAreaId, selectedProjectId]);

  // Global KPI calculations for DashboardHeader
  const totalProjects = filteredProjects.length;

  const overallProgressPercent = useMemo(() => {
    if (filteredProjects.length === 0) return 0;
    const progressSums = filteredProjects.map((p) => {
      const prog = calculateProjectProgress(p, filteredTargets, milestones, filteredTasks);
      return prog.progressPercent;
    });
    const avg = progressSums.reduce((acc, v) => acc + v, 0) / filteredProjects.length;
    return Math.round(avg);
  }, [filteredProjects, filteredTargets, milestones, filteredTasks]);

  const totalHoursLogged = useMemo(() => {
    const taskById = new Map(tasks.map((task) => [task.id, task]));
    const projectById = new Map(projects.map((project) => [project.id, project]));
    const totalMinutes = timeSessions.reduce((total, session) => {
      const sessionDate = getLocalDateString(new Date(session.startTime));
      if (sessionDate < hoursRangeStart || sessionDate > todayStr) return total;

      const projectId = session.entityType === 'project'
        ? session.entityId
        : session.entityType === 'task'
          ? taskById.get(session.entityId)?.projectId
          : undefined;
      const project = projectId ? projectById.get(projectId) : undefined;

      if (selectedProjectId !== 'all' && projectId !== selectedProjectId) return total;
      if (selectedAreaId !== 'all' && project?.areaId !== selectedAreaId) return total;
      return total + (session.durationMinutes || 0);
    }, 0);
    return Math.round((totalMinutes / 60) * 10) / 10;
  }, [timeSessions, tasks, projects, hoursRangeStart, todayStr, selectedAreaId, selectedProjectId]);

  const activeHabitStreak = useMemo(() => {
    const activeHabits = habits.filter((h) => !h.isDeleted && !h.isArchived);
    if (activeHabits.length === 0) return 0;
    const streaks = activeHabits.map((h) => {
      const stats = calculateHabitMetrics(h, progressLogs, todayStr);
      return h.isAvoidance ? stats.daysClean || 0 : stats.currentStreak;
    });
    return Math.max(0, ...streaks);
  }, [habits, progressLogs, todayStr]);

  const subTabs: { id: DashboardSubTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'projects', label: 'Projects', icon: Briefcase },
    { id: 'goals', label: 'Goals', icon: Compass },
    { id: 'habits', label: 'Habits', icon: Flame },
    { id: 'time', label: 'Focus time', icon: Clock },
    { id: 'execution', label: 'Activity', icon: Activity },
    { id: 'reviews', label: 'Reviews', icon: BookOpen },
    { id: 'insights', label: 'Patterns', icon: Lightbulb },
  ];

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full pb-16">
      {/* 1. Global Header Bar (PRD 7.1) */}
      <DashboardHeader
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        selectedAreaId={selectedAreaId}
        onAreaChange={(areaId) => {
          setSelectedAreaId(areaId);
          setSelectedProjectId('all');
        }}
        selectedProjectId={selectedProjectId}
        onProjectChange={setSelectedProjectId}
        areas={areas}
        projects={projects}
        totalProjects={totalProjects}
        overallProgressPercent={overallProgressPercent}
        totalHoursLogged={totalHoursLogged}
        activeHabitStreak={activeHabitStreak}
      />

      {/* 2. Sub-Tab Navigation Bar */}
      <div className="dashboard-tabs flex flex-nowrap items-center gap-1 overflow-x-auto select-none" role="tablist" aria-label="Progress views">
        {subTabs.map((tab, index) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id)}
              id={`progress-tab-${tab.id}`}
              role="tab"
              aria-selected={isActive}
              aria-controls="progress-tab-panel"
              tabIndex={isActive ? 0 : -1}
              onKeyDown={(event) => {
                let nextIndex = index;
                if (event.key === 'ArrowRight') nextIndex = (index + 1) % subTabs.length;
                else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + subTabs.length) % subTabs.length;
                else if (event.key === 'Home') nextIndex = 0;
                else if (event.key === 'End') nextIndex = subTabs.length - 1;
                else return;
                event.preventDefault();
                const nextTab = subTabs[nextIndex];
                setActiveSubTab(nextTab.id);
                document.getElementById(`progress-tab-${nextTab.id}`)?.focus();
              }}
              className={`dashboard-tab flex shrink-0 items-center gap-2 px-3 py-1.5 rounded-[var(--radius-xs)] text-xs font-medium whitespace-nowrap transition-colors min-h-11 sm:min-h-9 ${
                isActive
                  ? 'bg-[var(--color-paper-3)] text-[var(--color-ink)] font-semibold shadow-xs'
                  : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper-2)]'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[var(--color-accent)]' : ''}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Sub-Tab Content */}
      <div key={activeSubTab} id="progress-tab-panel" className="dashboard-tab-panel dashboard-panel-enter flex flex-col" role="tabpanel" aria-labelledby={`progress-tab-${activeSubTab}`} tabIndex={0}>
        {activeSubTab === 'overview' && (
          <DashboardOverviewTab
            todayStr={todayStr}
            projects={filteredProjects}
            targets={filteredTargets}
            tasks={filteredTasks}
            habits={habits}
            milestones={milestones}
            timeSessions={timeSessions}
            progressLogs={progressLogs}
            onNavigateTab={onNavigateTab}
          />
        )}

        {activeSubTab === 'execution' && (
          <DashboardExecutionTab
            todayStr={todayStr}
            targets={filteredTargets}
            tasks={filteredTasks}
            timeSessions={timeSessions}
            changeLogs={changeLogs}
          />
        )}

        {activeSubTab === 'projects' && (
          <DashboardProjectsTab
            todayStr={todayStr}
            projects={filteredProjects}
            areas={areas}
            milestones={milestones}
            targets={filteredTargets}
            tasks={filteredTasks}
            progressLogs={progressLogs}
            blockers={blockers}
            timeSessions={timeSessions}
            onOpenProjectDetail={onOpenProjectDetail}
          />
        )}

        {activeSubTab === 'goals' && (
          <DashboardGoalsTab
            todayStr={todayStr}
            areas={areas}
            projects={filteredProjects}
            milestones={milestones}
            targets={filteredTargets}
            habits={habits}
            progressLogs={progressLogs}
          />
        )}

        {activeSubTab === 'habits' && (
          <DashboardHabitsTab
            todayStr={todayStr}
            habits={habits}
            progressLogs={progressLogs}
            onOpenHabitsView={() => onNavigateTab?.('habits')}
          />
        )}

        {activeSubTab === 'time' && (
          <DashboardTimeTab
            timeSessions={timeSessions}
            tasks={filteredTasks}
            projects={filteredProjects}
            areas={areas}
            todayStr={todayStr}
          />
        )}

        {activeSubTab === 'reviews' && (
          <DashboardReviewsTab
            reviews={reviews}
            blockers={blockers}
            todayStr={todayStr}
          />
        )}

        {activeSubTab === 'insights' && (
          <DashboardInsightsTab
            todayStr={todayStr}
            projects={filteredProjects}
            tasks={filteredTasks}
            habits={habits}
            timeSessions={timeSessions}
            blockers={blockers}
            progressLogs={progressLogs}
          />
        )}
      </div>
    </div>
  );
};
