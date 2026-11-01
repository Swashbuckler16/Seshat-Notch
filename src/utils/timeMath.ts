import type { TimeSession, Task, ProjectGoal, Area, EntityId } from '../types/index.ts';

export interface TimeKindBreakdown {
  kind: 'deep' | 'shallow' | 'learning';
  label: string;
  minutes: number;
  hours: number;
  percentage: number; // 0 to 100
}

export interface ProjectTimeBreakdown {
  projectId: EntityId;
  projectTitle: string;
  areaName?: string;
  minutes: number;
  hours: number;
  percentage: number; // 0 to 100
  deepMinutes: number;
  sessionCount: number;
}

export interface DailyTimeRecord {
  dateStr: string; // YYYY-MM-DD
  dayLabel: string; // Mon, Tue ...
  totalMinutes: number;
  deepMinutes: number;
  shallowMinutes: number;
  learningMinutes: number;
}

export interface TimeMetricsResult {
  totalMinutes: number;
  totalHours: number;
  sessionCount: number;
  averageSessionMinutes: number;
  deepWorkRatio: number; // 0 to 100
  kindBreakdown: TimeKindBreakdown[];
  projectBreakdown: ProjectTimeBreakdown[];
  dailyTrend: DailyTimeRecord[];
  estimateAccuracy: {
    evaluatedTasksCount: number;
    overallAccuracyRate: number; // 0 to 100
    totalEstimatedMinutes: number;
    totalActualMinutes: number;
    varianceMinutes: number;
  };
}

/**
 * Calculates pure, deterministic time tracking metrics across sessions
 * strictly adhering to PRD Section 6.5, 7.2, and 7.3
 */
export function calculateTimeMetrics(
  sessions: TimeSession[],
  tasks: Task[] = [],
  projects: ProjectGoal[] = [],
  areas: Area[] = []
): TimeMetricsResult {
  const activeSessions = sessions.filter((s) => s.durationMinutes > 0);
  const totalMinutes = activeSessions.reduce((acc, s) => acc + s.durationMinutes, 0);
  const totalHours = Math.round((totalMinutes / 60) * 10) / 10;
  const sessionCount = activeSessions.length;
  const averageSessionMinutes = sessionCount > 0 ? Math.round(totalMinutes / sessionCount) : 0;

  // 1. Kind breakdown (deep, shallow, learning)
  const kinds: Array<'deep' | 'shallow' | 'learning'> = ['deep', 'shallow', 'learning'];
  const kindLabels: Record<'deep' | 'shallow' | 'learning', string> = {
    deep: 'Deep work (uninterrupted flow)',
    shallow: 'Shallow work (admin & operations)',
    learning: 'Deliberate study & learning',
  };

  const kindBreakdown: TimeKindBreakdown[] = kinds.map((k) => {
    const mins = activeSessions
      .filter((s) => s.kind === k)
      .reduce((acc, s) => acc + s.durationMinutes, 0);
    const pct = totalMinutes > 0 ? Math.round((mins / totalMinutes) * 100) : 0;
    return {
      kind: k,
      label: kindLabels[k],
      minutes: mins,
      hours: Math.round((mins / 60) * 10) / 10,
      percentage: pct,
    };
  });

  const deepMins = kindBreakdown.find((k) => k.kind === 'deep')?.minutes || 0;
  const deepWorkRatio = totalMinutes > 0 ? Math.round((deepMins / totalMinutes) * 100) : 0;

  // 2. Project & Area breakdown
  const projectsMap = new Map<EntityId, ProjectGoal>();
  projects.forEach((p) => projectsMap.set(p.id, p));

  const areasMap = new Map<EntityId, Area>();
  areas.forEach((a) => areasMap.set(a.id, a));

  const tasksMap = new Map<EntityId, Task>();
  tasks.forEach((t) => tasksMap.set(t.id, t));

  // Map each session to its parent project
  const projectMinsMap = new Map<
    EntityId,
    { minutes: number; deepMinutes: number; count: number }
  >();

  for (const s of activeSessions) {
    let resolvedProjectId: EntityId = 'independent';

    if (s.entityType === 'project') {
      resolvedProjectId = s.entityId;
    } else if (s.entityType === 'task') {
      const parentTask = tasksMap.get(s.entityId);
      if (parentTask && parentTask.projectId) {
        resolvedProjectId = parentTask.projectId;
      }
    }

    const curr = projectMinsMap.get(resolvedProjectId) || {
      minutes: 0,
      deepMinutes: 0,
      count: 0,
    };
    curr.minutes += s.durationMinutes;
    if (s.kind === 'deep') curr.deepMinutes += s.durationMinutes;
    curr.count += 1;
    projectMinsMap.set(resolvedProjectId, curr);
  }

  const projectBreakdown: ProjectTimeBreakdown[] = [];
  projectMinsMap.forEach((val, pId) => {
    let title = 'General / Independent Focus';
    let areaName: string | undefined = undefined;

    const proj = projectsMap.get(pId);
    if (proj) {
      title = proj.title;
      if (proj.areaId) {
        const area = areasMap.get(proj.areaId);
        if (area) areaName = area.name;
      }
    }

    const pct = totalMinutes > 0 ? Math.round((val.minutes / totalMinutes) * 100) : 0;

    projectBreakdown.push({
      projectId: pId,
      projectTitle: title,
      areaName,
      minutes: val.minutes,
      hours: Math.round((val.minutes / 60) * 10) / 10,
      percentage: pct,
      deepMinutes: val.deepMinutes,
      sessionCount: val.count,
    });
  });

  projectBreakdown.sort((a, b) => b.minutes - a.minutes);

  // 3. Daily trend (past 7 days)
  const dayNamesShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dailyTrend: DailyTimeRecord[] = [];
  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today.getTime());
    d.setUTCDate(d.getUTCDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayLabel = dayNamesShort[d.getUTCDay()];

    const daySessions = activeSessions.filter((s) => s.startTime.startsWith(dateStr));
    const dayTotal = daySessions.reduce((acc, s) => acc + s.durationMinutes, 0);
    const dayDeep = daySessions
      .filter((s) => s.kind === 'deep')
      .reduce((acc, s) => acc + s.durationMinutes, 0);
    const dayShallow = daySessions
      .filter((s) => s.kind === 'shallow')
      .reduce((acc, s) => acc + s.durationMinutes, 0);
    const dayLearning = daySessions
      .filter((s) => s.kind === 'learning')
      .reduce((acc, s) => acc + s.durationMinutes, 0);

    dailyTrend.push({
      dateStr,
      dayLabel,
      totalMinutes: dayTotal,
      deepMinutes: dayDeep,
      shallowMinutes: dayShallow,
      learningMinutes: dayLearning,
    });
  }

  // 4. Estimate accuracy (PRD 7.2)
  // For tasks that have estimateMinutes > 0 and actualMinutes > 0
  const evaluatedTasks = tasks.filter(
    (t) => (t.estimateMinutes || 0) > 0 && (t.actualMinutes || 0) > 0
  );

  let totalEst = 0;
  let totalAct = 0;
  let sumAccuracy = 0;

  for (const t of evaluatedTasks) {
    const est = t.estimateMinutes!;
    const act = t.actualMinutes!;
    totalEst += est;
    totalAct += act;

    // Accuracy per task: 1 - |act - est| / max(act, est)
    const error = Math.abs(act - est);
    const maxVal = Math.max(act, est);
    const acc = maxVal > 0 ? Math.max(0, 1 - error / maxVal) : 1;
    sumAccuracy += acc;
  }

  const overallAccuracyRate =
    evaluatedTasks.length > 0 ? Math.round((sumAccuracy / evaluatedTasks.length) * 100) : 100;

  return {
    totalMinutes,
    totalHours,
    sessionCount,
    averageSessionMinutes,
    deepWorkRatio,
    kindBreakdown,
    projectBreakdown,
    dailyTrend,
    estimateAccuracy: {
      evaluatedTasksCount: evaluatedTasks.length,
      overallAccuracyRate,
      totalEstimatedMinutes: totalEst,
      totalActualMinutes: totalAct,
      varianceMinutes: totalAct - totalEst,
    },
  };
}

/**
 * Formats duration in minutes to human-calm ledger string (e.g. "1h 45m" or "45m")
 */
export function formatMinutesToHuman(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/**
 * Formats seconds into MM:SS display
 */
export function formatSecondsToTimer(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

