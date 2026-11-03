import type {
  ProjectGoal,
  MilestonePhase,
  Target,
  Task,
  ProgressLog,
  Blocker,
  ScheduleStatus,
  EntityId,
} from '../types/index.ts';
import { shiftDateString } from './dateUtils.ts';
function getISOWeekString(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export interface FormulaVariable {
  symbol: string;
  name: string;
  value: number | string;
  unit?: string;
  sourceDescription: string;
}

export interface MetricCalculationTrace {
  metricName: string;
  formulaExpression: string;
  resultValue: number | string;
  resultUnit?: string;
  variables: FormulaVariable[];
  steps: string[];
  sourceEntries: {
    id: EntityId;
    title: string;
    type: 'milestone' | 'target' | 'task' | 'log' | 'blocker';
    value: number | string;
    weight?: number;
    contribution: string;
  }[];
}

export interface ProjectProgressResult {
  progressPercent: number; // 0 to 100
  completedValue: number;
  totalPlannedValue: number;
  weightingUsed: 'equal' | 'estimate' | 'manual';
  trace: MetricCalculationTrace;
}

export interface ExpectedProgressResult {
  expectedPercent: number; // 0 to 100
  scheduledItemsCount: number;
  totalItemsCount: number;
  trace: MetricCalculationTrace;
}

export interface ScheduleRatioResult {
  scheduleRatio: number; // e.g. 1.05 or 0.82
  status: ScheduleStatus;
  statusLabel: string;
  glyph: string; // ●, ▲, ■, ⏸
  onTrackThreshold: number; // default 0.90
  atRiskThreshold: number;  // default 0.70
  trace: MetricCalculationTrace;
}

export interface ForecastResult {
  hasSufficientData: boolean;
  message?: string;
  recentVelocityPerDay: number; // progress % per day over window
  velocityWindowDays: number;   // default 14
  progressCompletedInWindow: number;
  daysRemainingExpected?: number;
  forecastDateOptimistic?: string; // YYYY-MM-DD
  forecastDateExpected?: string;   // YYYY-MM-DD
  forecastDatePessimistic?: string; // YYYY-MM-DD
  forecastRangeString: string;
  targetEndDate?: string;
  slippageDays?: number; // positive = late, negative = ahead
  trace: MetricCalculationTrace;
}

export interface BlockerMetricsResult {
  openBlockersCount: number;
  resolvedBlockersCount: number;
  totalBlockedDays: number;
  activeBlockers: {
    id: EntityId;
    description: string;
    daysOpen: number;
    dateRaised: string;
  }[];
  trace: MetricCalculationTrace;
}

export interface CompleteProjectMetrics {
  project: ProjectGoal;
  progress: ProjectProgressResult;
  expectedProgress: ExpectedProgressResult;
  scheduleRatio: ScheduleRatioResult;
  forecast: ForecastResult;
  blockers: BlockerMetricsResult;
}

/**
 * 1. Calculate Project Progress % (PRD TR-2 & 7.3)
 * Progress % = completed target value divided by total planned target value
 * Using the chosen weighting: 'equal', 'estimate', or 'manual'
 */
export function calculateProjectProgress(
  project: ProjectGoal,
  targets: Target[] = [],
  milestones: MilestonePhase[] = [],
  tasks: Task[] = []
): ProjectProgressResult {
  const weighting = project.weightType || 'equal';
  const activeMilestones = milestones.filter((m) => !m.isDeleted && m.projectId === project.id);
  const activeTargets = targets.filter((t) => !t.isDeleted && t.projectId === project.id);
  const activeTargetIds = new Set(activeTargets.map((t) => t.id));
  const activeMilestoneIds = new Set(activeMilestones.map((m) => m.id));
  const activeTasks = tasks.filter(
    (t) =>
      !t.isDeleted &&
      (t.projectId === project.id ||
        (t.targetId && activeTargetIds.has(t.targetId)) ||
        (t.milestoneId && activeMilestoneIds.has(t.milestoneId)))
  );

  const variables: FormulaVariable[] = [];
  const steps: string[] = [];
  const sourceEntries: MetricCalculationTrace['sourceEntries'] = [];

  let totalWeightedTarget = 0;
  let totalWeightedActual = 0;

  // Prefer targets if defined, else fallback to milestones, else tasks
  if (activeTargets.length > 0) {
    activeTargets.forEach((t) => {
      let weight = 1.0;
      if (weighting === 'manual') {
        weight = t.weight > 0 ? t.weight : 1.0;
      } else if (weighting === 'estimate') {
        // Find tasks under this target to sum estimates
        const childTasks = activeTasks.filter((tsk) => tsk.targetId === t.id);
        const estMins = childTasks.reduce((sum, c) => sum + (c.estimateMinutes || 30), 0);
        weight = Math.max(1, estMins);
      } else {
        weight = 1.0; // equal
      }

      const targetVal = t.targetValue > 0 ? t.targetValue : 1;
      const actualVal = Math.min(targetVal, Math.max(0, t.currentValue));

      totalWeightedTarget += targetVal * weight;
      totalWeightedActual += actualVal * weight;

      sourceEntries.push({
        id: t.id,
        title: t.title,
        type: 'target',
        value: `${t.currentValue} / ${t.targetValue} ${t.unit}`,
        weight,
        contribution: `${Math.round((actualVal / targetVal) * 100)}% (wt: ${weight})`,
      });
    });

    steps.push(`Evaluated ${activeTargets.length} targets using ${weighting} weighting.`);
  } else if (activeMilestones.length > 0) {
    activeMilestones.forEach((m) => {
      let weight = 1.0;
      if (weighting === 'manual') {
        weight = m.weight !== undefined ? m.weight : 1.0;
      } else if (weighting === 'estimate') {
        const childTasks = activeTasks.filter((tsk) => tsk.milestoneId === m.id);
        const estMins = childTasks.reduce((sum, c) => sum + (c.estimateMinutes || 30), 0);
        weight = Math.max(1, estMins);
      } else {
        weight = 1.0;
      }

      const isCompleted = m.status === 'done';
      totalWeightedTarget += 1.0 * weight;
      if (isCompleted) totalWeightedActual += 1.0 * weight;

      sourceEntries.push({
        id: m.id,
        title: m.title,
        type: 'milestone',
        value: isCompleted ? 'Completed' : m.status,
        weight,
        contribution: isCompleted ? `100% (wt: ${weight})` : `0% (wt: ${weight})`,
      });
    });

    steps.push(`Evaluated ${activeMilestones.length} milestones using ${weighting} weighting.`);
  } else if (activeTasks.length > 0) {
    activeTasks.forEach((tsk) => {
      const weight = weighting === 'estimate' ? Math.max(1, tsk.estimateMinutes || 30) : 1.0;
      const isCompleted = tsk.status === 'done';
      totalWeightedTarget += 1.0 * weight;
      if (isCompleted) totalWeightedActual += 1.0 * weight;

      sourceEntries.push({
        id: tsk.id,
        title: tsk.title,
        type: 'task',
        value: isCompleted ? 'Done' : tsk.status,
        weight,
        contribution: isCompleted ? '100%' : '0%',
      });
    });

    steps.push(`Evaluated ${activeTasks.length} tasks.`);
  } else {
    steps.push('No targets, milestones, or tasks defined for this project yet.');
  }

  const progressPercent =
    totalWeightedTarget > 0
      ? Math.min(100, Math.round((totalWeightedActual / totalWeightedTarget) * 1000) / 10)
      : 0;

  variables.push({
    symbol: 'W_act',
    name: 'Total Weighted Completed Value',
    value: Math.round(totalWeightedActual * 10) / 10,
    sourceDescription: 'Sum of (actual value × item weight) across all active children',
  });
  variables.push({
    symbol: 'W_tgt',
    name: 'Total Weighted Planned Value',
    value: Math.round(totalWeightedTarget * 10) / 10,
    sourceDescription: 'Sum of (planned value × item weight) across all active children',
  });

  steps.push(`Calculated quotient: (${totalWeightedActual} / ${totalWeightedTarget}) × 100 = ${progressPercent}%.`);

  const trace: MetricCalculationTrace = {
    metricName: 'Progress %',
    formulaExpression: 'Progress % = (∑ [actual_i × weight_i] / ∑ [target_i × weight_i]) × 100',
    resultValue: progressPercent,
    resultUnit: '%',
    variables,
    steps,
    sourceEntries,
  };

  return {
    progressPercent,
    completedValue: Math.round(totalWeightedActual * 10) / 10,
    totalPlannedValue: Math.round(totalWeightedTarget * 10) / 10,
    weightingUsed: weighting,
    trace,
  };
}

/**
 * 2. Calculate Expected Progress % (PRD 7.3)
 * Expected progress % = planned value scheduled up to today divided by total planned value.
 */
export function calculateExpectedProgress(
  project: ProjectGoal,
  targets: Target[] = [],
  milestones: MilestonePhase[] = [],
  todayStr: string
): ExpectedProgressResult {
  const activeTargets = targets.filter((t) => !t.isDeleted && t.projectId === project.id);
  const activeMilestones = milestones.filter((m) => !m.isDeleted && m.projectId === project.id);

  const variables: FormulaVariable[] = [];
  const steps: string[] = [];
  const sourceEntries: MetricCalculationTrace['sourceEntries'] = [];

  let scheduledPlanned = 0;
  let totalPlanned = 0;
  let scheduledCount = 0;

  if (activeTargets.length > 0) {
    activeTargets.forEach((t) => {
      const isPastOrToday = t.period <= todayStr;
      const val = t.targetValue || 1;
      totalPlanned += val;

      if (isPastOrToday) {
        scheduledPlanned += val;
        scheduledCount++;
      }

      sourceEntries.push({
        id: t.id,
        title: t.title,
        type: 'target',
        value: `${val} ${t.unit}`,
        contribution: isPastOrToday ? 'Scheduled by today' : `Scheduled future (${t.period})`,
      });
    });
  } else if (activeMilestones.length > 0) {
    activeMilestones.forEach((m) => {
      const isPastOrToday = !m.endDate || m.endDate <= todayStr;
      totalPlanned += 1;
      if (isPastOrToday) {
        scheduledPlanned += 1;
        scheduledCount++;
      }
      sourceEntries.push({
        id: m.id,
        title: m.title,
        type: 'milestone',
        value: '1 phase',
        contribution: isPastOrToday ? 'Due by today' : `Due future (${m.endDate || 'open'})`,
      });
    });
  } else {
    // If no targets or milestones, compute linear time elapsed against project dates
    if (project.startDate && project.endDate) {
      const start = new Date(`${project.startDate}T00:00:00Z`).getTime();
      const end = new Date(`${project.endDate}T00:00:00Z`).getTime();
      const today = new Date(`${todayStr}T00:00:00Z`).getTime();

      const totalSpan = Math.max(1, end - start);
      const elapsed = Math.max(0, Math.min(totalSpan, today - start));
      const expectedP = Math.round((elapsed / totalSpan) * 100);

      steps.push(`Linear calendar pacing from ${project.startDate} to ${project.endDate}`);
      return {
        expectedPercent: expectedP,
        scheduledItemsCount: 1,
        totalItemsCount: 1,
        trace: {
          metricName: 'Expected Progress %',
          formulaExpression: 'Expected % = (Elapsed Days / Total Planned Project Days) × 100',
          resultValue: expectedP,
          resultUnit: '%',
          variables: [
            { symbol: 'T_elapsed', name: 'Elapsed Days', value: Math.round(elapsed / 86400000), sourceDescription: `${project.startDate} to ${todayStr}` },
            { symbol: 'T_total', name: 'Total Project Span', value: Math.round(totalSpan / 86400000), sourceDescription: `${project.startDate} to ${project.endDate}` },
          ],
          steps,
          sourceEntries: [],
        },
      };
    }
  }

  const expectedPercent =
    totalPlanned > 0
      ? Math.min(100, Math.round((scheduledPlanned / totalPlanned) * 1000) / 10)
      : 0;

  variables.push({
    symbol: 'V_sched',
    name: 'Planned Value Scheduled Up to Today',
    value: scheduledPlanned,
    sourceDescription: `Sum of planned items with period or due date ≤ ${todayStr}`,
  });
  variables.push({
    symbol: 'V_total',
    name: 'Total Planned Project Value',
    value: totalPlanned,
    sourceDescription: 'Sum of all planned item values across the project',
  });

  steps.push(`Found ${scheduledCount} items scheduled on or before ${todayStr}.`);
  steps.push(`Calculated expected pacing quotient: (${scheduledPlanned} / ${totalPlanned}) × 100 = ${expectedPercent}%.`);

  const trace: MetricCalculationTrace = {
    metricName: 'Expected Progress %',
    formulaExpression: 'Expected % = (Planned Value Scheduled ≤ Today / Total Planned Value) × 100',
    resultValue: expectedPercent,
    resultUnit: '%',
    variables,
    steps,
    sourceEntries,
  };

  return {
    expectedPercent,
    scheduledItemsCount: scheduledCount,
    totalItemsCount: activeTargets.length || activeMilestones.length || 0,
    trace,
  };
}

/**
 * 3. Calculate Schedule Ratio & Health Status (PRD 7.3)
 * Schedule ratio = Progress % / Expected progress %
 * Status: On track (>= 0.90), At risk (0.70 to 0.89), Behind (< 0.70)
 * Status is always shown as word and shape, not color alone.
 */
export function calculateScheduleRatio(
  progressPercent: number,
  expectedPercent: number,
  onTrackThreshold = 0.90,
  atRiskThreshold = 0.70
): ScheduleRatioResult {
  const steps: string[] = [];
  const variables: FormulaVariable[] = [
    {
      symbol: 'P_act',
      name: 'Actual Progress %',
      value: progressPercent,
      unit: '%',
      sourceDescription: 'Calculated project completion rate',
    },
    {
      symbol: 'P_exp',
      name: 'Expected Progress %',
      value: expectedPercent,
      unit: '%',
      sourceDescription: 'Calculated expected pacing up to today',
    },
  ];

  let rawRatio = 1.0;
  let ratio = 1.0;
  if (expectedPercent <= 0) {
    rawRatio = 1.0;
    ratio = 1.0;
    steps.push('Expected progress is 0% (project just started or not yet scheduled); baseline ratio is 1.0.');
  } else {
    rawRatio = progressPercent / expectedPercent;
    // Avoid rounding 0.8999 up to 0.90 across a status threshold boundary
    if (
      (rawRatio < onTrackThreshold && Math.round(rawRatio * 100) / 100 >= onTrackThreshold) ||
      (rawRatio < atRiskThreshold && Math.round(rawRatio * 100) / 100 >= atRiskThreshold)
    ) {
      ratio = Math.floor(rawRatio * 100) / 100;
    } else {
      ratio = Math.round(rawRatio * 100) / 100;
    }
    steps.push(`Quotient: ${progressPercent}% / ${expectedPercent}% = ${ratio}.`);
  }

  let status: ScheduleStatus = 'on_track';
  let statusLabel = 'On track';
  let glyph = '●'; // Circle for on track

  if (rawRatio >= onTrackThreshold) {
    status = 'on_track';
    statusLabel = 'On track';
    glyph = '●';
    steps.push(`Ratio ${ratio} ≥ on-track threshold (${onTrackThreshold}) → On track`);
  } else if (rawRatio >= atRiskThreshold) {
    status = 'at_risk';
    statusLabel = 'At risk';
    glyph = '▲'; // Triangle for warning/at-risk
    steps.push(`Ratio ${ratio} is between ${atRiskThreshold} and ${onTrackThreshold} → At risk`);
  } else {
    status = 'behind';
    statusLabel = 'Behind';
    glyph = '■'; // Square for behind
    steps.push(`Ratio ${ratio} < behind threshold (${atRiskThreshold}) → Behind`);
  }

  variables.push({
    symbol: 'R',
    name: 'Schedule Ratio',
    value: ratio,
    sourceDescription: 'Progress % / Expected %',
  });

  const trace: MetricCalculationTrace = {
    metricName: 'Schedule Ratio & Status',
    formulaExpression: 'Schedule Ratio = Progress % / Expected Progress %',
    resultValue: `${ratio} (${statusLabel} ${glyph})`,
    variables,
    steps,
    sourceEntries: [],
  };

  return {
    scheduleRatio: ratio,
    status,
    statusLabel,
    glyph,
    onTrackThreshold,
    atRiskThreshold,
    trace,
  };
}

/**
 * 4. Calculate 14-Day Velocity & Forecast Finish Date Range (PRD 7.3)
 * Forecast finish date = start date + elapsed time / Progress %, using recent velocity (default 14 days)
 * Shows range [optimistic, pessimistic], not a single false-precision date.
 * Honest empty states: returns hasSufficientData: false when velocity is zero.
 */
export function calculateVelocityAndForecast(
  project: ProjectGoal,
  progressLogs: ProgressLog[] = [],
  targets: Target[] = [],
  progressPercent: number,
  todayStr: string,
  windowDays = 14
): ForecastResult {
  const steps: string[] = [];
  const variables: FormulaVariable[] = [];

  // Cutoff date for recent window
  const cutoffStr = shiftDateString(todayStr, -windowDays);

  // Filter progress logs in the last 14 days for this project or its targets
  const targetIds = new Set(targets.filter((t) => t.projectId === project.id).map((t) => t.id));
  const recentLogs = progressLogs.filter(
    (l) =>
      !l.isDeleted &&
      l.entityType === 'target' &&
      l.date >= cutoffStr &&
      l.date <= todayStr &&
      targetIds.has(l.entityId)
  );

  const projectTargets = targets.filter((t) => !t.isDeleted && t.projectId === project.id);
  const totalPlannedVal = projectTargets.reduce((sum, t) => sum + Math.max(0, t.targetValue), 0);

  // Progress accomplished in window
  const windowProgressVal = recentLogs.reduce((sum, l) => sum + (l.value || 0), 0);
  const progressCompletedInWindow = totalPlannedVal > 0
    ? Math.min(100, Math.round((windowProgressVal / totalPlannedVal) * 1000) / 10)
    : 0;

  // Velocity per day (in % per day)
  const recentVelocityPerDay =
    windowDays > 0 ? Math.round((progressCompletedInWindow / windowDays) * 100) / 100 : 0;

  variables.push({
    symbol: 'V_14d',
    name: '14-Day Velocity',
    value: recentVelocityPerDay,
    unit: '%/day',
    sourceDescription: `Completed ${progressCompletedInWindow}% progress across the last ${windowDays} days`,
  });

  const remainingPercent = Math.max(0, 100 - progressPercent);
  variables.push({
    symbol: 'P_rem',
    name: 'Remaining Progress Required',
    value: remainingPercent,
    unit: '%',
    sourceDescription: `100% - Current Progress (${progressPercent}%)`,
  });

  // Check if project is already done
  if (progressPercent >= 100) {
    steps.push('Project progress is 100% completed.');
    return {
      hasSufficientData: true,
      recentVelocityPerDay,
      velocityWindowDays: windowDays,
      progressCompletedInWindow,
      daysRemainingExpected: 0,
      forecastDateOptimistic: todayStr,
      forecastDateExpected: todayStr,
      forecastDatePessimistic: todayStr,
      forecastRangeString: 'Completed',
      targetEndDate: project.endDate,
      slippageDays: 0,
      trace: {
        metricName: 'Forecast Finish Date',
        formulaExpression: 'Project complete (0 days remaining)',
        resultValue: 'Completed',
        variables,
        steps,
        sourceEntries: [],
      },
    };
  }

  // Honest empty state: not enough data / zero velocity
  if (totalPlannedVal <= 0 || recentVelocityPerDay <= 0.05) {
    steps.push('Velocity in the last 14 days is near zero (<0.05%/day).');
    steps.push('PRD 7.3: Honest low-data state displayed rather than invented false precision.');
    return {
      hasSufficientData: false,
      message: 'Not enough velocity logged in the last 14 days to compute a credible finish forecast.',
      recentVelocityPerDay,
      velocityWindowDays: windowDays,
      progressCompletedInWindow,
      forecastRangeString: 'Pace insufficient for forecast',
      targetEndDate: project.endDate,
      trace: {
        metricName: 'Forecast Finish Date',
        formulaExpression: 'Insufficient velocity data (PRD 7.3 Honest Empty State)',
        resultValue: 'Pace insufficient',
        variables,
        steps,
        sourceEntries: [],
      },
    };
  }

  // Calculate expected days remaining
  const daysExpected = Math.round(remainingPercent / recentVelocityPerDay);
  // Credible date range: optimistic (+25% speed) to pessimistic (-25% speed)
  const daysOptimistic = Math.max(1, Math.round(remainingPercent / (recentVelocityPerDay * 1.25)));
  const daysPessimistic = Math.round(remainingPercent / (recentVelocityPerDay * 0.75));

  const forecastDateOptimistic = shiftDateString(todayStr, daysOptimistic);
  const forecastDateExpected = shiftDateString(todayStr, daysExpected);
  const forecastDatePessimistic = shiftDateString(todayStr, daysPessimistic);

  // Slippage against project.endDate
  let slippageDays: number | undefined = undefined;
  if (project.endDate) {
    const targetEnd = new Date(`${project.endDate}T00:00:00Z`);
    const expEnd = new Date(`${forecastDateExpected}T00:00:00Z`);
    slippageDays = Math.round((expEnd.getTime() - targetEnd.getTime()) / 86400000);
  }

  steps.push(`Expected days remaining: ${remainingPercent}% / ${recentVelocityPerDay}% per day = ~${daysExpected} days.`);
  steps.push(`Optimistic: ~${daysOptimistic} days (${forecastDateOptimistic}).`);
  steps.push(`Pessimistic: ~${daysPessimistic} days (${forecastDatePessimistic}).`);

  const forecastRangeString = `${forecastDateOptimistic} to ${forecastDatePessimistic}`;

  const trace: MetricCalculationTrace = {
    metricName: 'Forecast Finish Range',
    formulaExpression: 'Forecast Days Remaining = Remaining % / (14-day velocity per day) ± 25% credible range',
    resultValue: forecastRangeString,
    variables,
    steps,
    sourceEntries: [],
  };

  return {
    hasSufficientData: true,
    recentVelocityPerDay,
    velocityWindowDays: windowDays,
    progressCompletedInWindow,
    daysRemainingExpected: daysExpected,
    forecastDateOptimistic,
    forecastDateExpected,
    forecastDatePessimistic,
    forecastRangeString,
    targetEndDate: project.endDate,
    slippageDays,
    trace,
  };
}

/**
 * 5. Calculate Blocker Impact & Duration (PRD TR-5)
 */
export function calculateBlockerImpact(
  blockers: Blocker[] = [],
  todayStr: string,
  entityId?: EntityId
): BlockerMetricsResult {
  const steps: string[] = [];
  const variables: FormulaVariable[] = [];

  const relevantBlockers = entityId
    ? blockers.filter((b) => b.entityId === entityId)
    : blockers;

  const active = relevantBlockers.filter((b) => !b.dateCleared);
  const resolved = relevantBlockers.filter((b) => !!b.dateCleared);

  const today = new Date(`${todayStr}T00:00:00Z`);

  let totalBlockedDays = 0;
  const activeBlockersList = active.map((b) => {
    const raised = new Date(`${b.dateRaised}T00:00:00Z`);
    const days = Math.max(0, Math.round((today.getTime() - raised.getTime()) / 86400000));
    totalBlockedDays += days;
    return {
      id: b.id,
      description: b.description,
      daysOpen: days,
      dateRaised: b.dateRaised,
    };
  });

  resolved.forEach((b) => {
    const raised = new Date(`${b.dateRaised}T00:00:00Z`);
    const cleared = new Date(`${b.dateCleared!}T00:00:00Z`);
    const days = Math.max(0, Math.round((cleared.getTime() - raised.getTime()) / 86400000));
    totalBlockedDays += days;
  });

  variables.push({
    symbol: 'B_open',
    name: 'Open Blockers Count',
    value: active.length,
    sourceDescription: 'Blockers currently active without dateCleared',
  });
  variables.push({
    symbol: 'B_days',
    name: 'Total Cumulative Blocked Days',
    value: totalBlockedDays,
    unit: 'days',
    sourceDescription: 'Sum of days open across active and historical blockers',
  });

  steps.push(`Found ${active.length} open blockers and ${resolved.length} cleared blockers.`);
  steps.push(`Cumulative blocked time: ${totalBlockedDays} days.`);

  return {
    openBlockersCount: active.length,
    resolvedBlockersCount: resolved.length,
    totalBlockedDays,
    activeBlockers: activeBlockersList,
    trace: {
      metricName: 'Blocker Metrics & Impact',
      formulaExpression: 'Cumulative Blocked Days = ∑ (dateCleared or Today - dateRaised)',
      resultValue: `${active.length} open (${totalBlockedDays} days blocked)`,
      variables,
      steps,
      sourceEntries: relevantBlockers.map((b) => ({
        id: b.id,
        title: b.description,
        type: 'blocker',
        value: b.dateCleared ? `Resolved (${b.dateCleared})` : 'Active blocker',
        contribution: `Raised on ${b.dateRaised}`,
      })),
    },
  };
}

/**
 * 6. Composite evaluator for a project
 */
export function evaluateCompleteProjectMetrics(
  project: ProjectGoal,
  milestones: MilestonePhase[] = [],
  targets: Target[] = [],
  tasks: Task[] = [],
  progressLogs: ProgressLog[] = [],
  blockers: Blocker[] = [],
  todayStr: string
): CompleteProjectMetrics {
  const progress = calculateProjectProgress(project, targets, milestones, tasks);
  const expectedProgress = calculateExpectedProgress(project, targets, milestones, todayStr);
  const scheduleRatio = calculateScheduleRatio(progress.progressPercent, expectedProgress.expectedPercent);
  const forecast = calculateVelocityAndForecast(
    project,
    progressLogs,
    targets,
    progress.progressPercent,
    todayStr
  );
  const blockerMetrics = calculateBlockerImpact(blockers, todayStr, project.id);

  return {
    project,
    progress,
    expectedProgress,
    scheduleRatio,
    forecast,
    blockers: blockerMetrics,
  };
}

export interface HorizonTargetSummary {
  period: string;
  total: number;
  completed: number;
  ratePercent: number;
  targets: Target[];
}

/**
 * Single source of truth calculation for weekly horizon target progress
 */
export function calculateWeeklyTargetSummary(targets: Target[], dateStr: string): HorizonTargetSummary {
  const dateObj = new Date(`${dateStr}T00:00:00`);
  const currentWeekStr = getISOWeekString(dateObj);
  const weekTargets = (targets || []).filter(
    (t) => !t.isDeleted && t.horizon === 'week' && t.period === currentWeekStr
  );
  const completed = weekTargets.filter((t) => t.status === 'done' || t.currentValue >= t.targetValue).length;
  const total = weekTargets.length;
  const ratePercent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    period: currentWeekStr,
    total,
    completed,
    ratePercent,
    targets: weekTargets,
  };
}

/**
 * Single source of truth calculation for monthly horizon target progress
 */
export function calculateMonthlyTargetSummary(targets: Target[], dateStr: string): HorizonTargetSummary {
  const currentMonthStr = dateStr.slice(0, 7);
  const monthTargets = (targets || []).filter(
    (t) => !t.isDeleted && t.horizon === 'month' && t.period === currentMonthStr
  );
  const completed = monthTargets.filter((t) => t.status === 'done' || t.currentValue >= t.targetValue).length;
  const total = monthTargets.length;
  const ratePercent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    period: currentMonthStr,
    total,
    completed,
    ratePercent,
    targets: monthTargets,
  };
}

