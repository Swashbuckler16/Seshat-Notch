import type { Habit, ProgressLog } from '../types/index.ts';

export interface HabitStreakResult {
  currentStreak: number;
  bestStreak: number;
  consistency7d: number;  // 0 to 100
  consistency30d: number; // 0 to 100
  consistency90d: number; // 0 to 100
  totalCompletions: number;
  totalScheduled: number;
  totalExcused: number;
  daysClean?: number; // for avoidance habits
  bestCleanStreak?: number; // for avoidance habits
  totalRelapses?: number; // for avoidance habits
  weekdayRates: {
    dayIndex: number; // 0 = Mon, 6 = Sun
    dayLabel: string;
    rate: number; // 0 to 100
    completions: number;
    scheduled: number;
  }[];
}

export interface HabitDayCell {
  dateStr: string;
  dayOfWeek: number; // 0 = Sun, 1 = Mon ...
  isScheduled: boolean;
  isCompleted: boolean;
  isExcused: boolean;
  isRelapse: boolean;
  isToday: boolean;
  value: number;
  note?: string;
  intensity: 0 | 1 | 2 | 3; // 0 = empty/rest, 1 = partial, 2 = met target, 3 = exceeded
}

/**
 * Checks if a date string falls inside any paused vacation/sick ranges
 */
export function isDateInPauseRange(habit: Habit, dateStr: string): boolean {
  if (!habit.pausedRanges || habit.pausedRanges.length === 0) return false;
  return habit.pausedRanges.some(
    (range) => dateStr >= range.startDate && dateStr <= range.endDate
  );
}

/**
 * Checks if a date is explicitly excused (custom skip date or pause)
 */
export function isDateExcused(habit: Habit, dateStr: string, logs: ProgressLog[]): boolean {
  if (isDateInPauseRange(habit, dateStr)) return true;
  if (habit.customSkipDates && habit.customSkipDates.includes(dateStr)) return true;

  // Also check if any log for this habit and date marks an excused skip
  return logs.some(
    (l) =>
      l.entityId === habit.id &&
      l.date === dateStr &&
      !l.isDeleted &&
      (l.note?.startsWith('excused_skip') || l.note?.startsWith('skip'))
  );
}

/**
 * Checks whether a habit is scheduled on a given date
 */
export function isHabitScheduledOnDate(habit: Habit, dateStr: string): boolean {
  // Before start date, not scheduled
  if (habit.startDate && dateStr < habit.startDate) return false;

  const d = new Date(`${dateStr}T00:00:00Z`);
  const dayOfWeek = d.getUTCDay(); // 0 = Sunday, 1 = Monday ... 6 = Saturday

  switch (habit.scheduleType) {
    case 'daily':
      return true;

    case 'weekdays':
      // Monday (1) through Friday (5)
      return dayOfWeek >= 1 && dayOfWeek <= 5;

    case 'n_per_week':
      // If specific days are assigned
      if (habit.scheduleDaysOfWeek && habit.scheduleDaysOfWeek.length > 0) {
        return habit.scheduleDaysOfWeek.includes(dayOfWeek);
      }
      // Otherwise flexible across the week
      return true;

    case 'every_n_days': {
      const interval = habit.intervalDays || 2;
      const start = new Date(`${habit.startDate || dateStr}T00:00:00Z`);
      const diffDays = Math.round((d.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays % interval === 0;
    }

    default:
      return true;
  }
}

/**
 * Checks if a progress log marks an avoidance relapse
 */
export function isRelapseLog(log: ProgressLog): boolean {
  return !log.isDeleted && (log.value < 0 || log.note?.startsWith('relapse:') === true);
}

/**
 * Helper to generate an array of ISO date strings (YYYY-MM-DD) between start and end
 */
export function getDateRangeArray(startDateStr: string, endDateStr: string): string[] {
  const dates: string[] = [];
  const curr = new Date(`${startDateStr}T00:00:00Z`);
  const end = new Date(`${endDateStr}T00:00:00Z`);

  while (curr <= end) {
    dates.push(curr.toISOString().split('T')[0]);
    curr.setUTCDate(curr.getUTCDate() + 1);
  }
  return dates;
}

/**
 * Computes Fair Streak, Consistency Percentages, and Patterns for a Habit
 * Adheres strictly to PRD Section 6.4, 7.3, HB-1, HB-3, HB-4, HB-6
 */
export function calculateHabitMetrics(
  habit: Habit,
  allLogs: ProgressLog[],
  todayStr: string
): HabitStreakResult {
  const habitLogs = allLogs.filter((l) => l.entityId === habit.id && !l.isDeleted);

  // Map logs by date
  const logsByDate = new Map<string, ProgressLog[]>();
  for (const log of habitLogs) {
    const list = logsByDate.get(log.date) || [];
    list.push(log);
    logsByDate.set(log.date, list);
  }

  // --- Avoidance Habit Special Path (HB-6) ---
  if (habit.isAvoidance) {
    return calculateAvoidanceMetrics(habit, habitLogs, todayStr);
  }

  // Determine chronological range from startDate to todayStr
  const effectiveStart = habit.startDate && habit.startDate < todayStr ? habit.startDate : todayStr;
  const allDates = getDateRangeArray(effectiveStart, todayStr);

  // Evaluate each day state
  interface DayRecord {
    date: string;
    isScheduled: boolean;
    isCompleted: boolean;
    isExcused: boolean;
  }

  const dayRecords: DayRecord[] = allDates.map((dateStr) => {
    const isExcused = isDateExcused(habit, dateStr, habitLogs);
    const isScheduled = isHabitScheduledOnDate(habit, dateStr);

    const dayLogs = logsByDate.get(dateStr) || [];
    // Sum completion values
    const totalVal = dayLogs
      .filter((l) => !isRelapseLog(l) && !l.note?.startsWith('excused_skip'))
      .reduce((acc, curr) => acc + (curr.value || 0), 0);

    const isCompleted = totalVal >= (habit.targetValue || 1);

    return {
      date: dateStr,
      isScheduled,
      isCompleted,
      isExcused,
    };
  });

  // Calculate total completions and stats
  let totalCompletions = 0;
  let totalScheduled = 0;
  let totalExcused = 0;

  for (const dr of dayRecords) {
    if (dr.isCompleted) totalCompletions++;
    if (dr.isExcused) totalExcused++;
    if (dr.isScheduled && !dr.isExcused) totalScheduled++;
  }

  // --- Fair Streak Calculation (HB-3) ---
  // If habit is n_per_week, we evaluate week-by-week
  let currentStreak = 0;
  let bestStreak = 0;

  if (habit.scheduleType === 'n_per_week') {
    // Group into ISO calendar weeks
    const weeksMap = new Map<string, { completions: number; excusedCount: number; target: number }>();
    const targetFreq = habit.targetFrequency || 3;

    for (const dr of dayRecords) {
      const d = new Date(`${dr.date}T00:00:00Z`);
      // ISO week format: YYYY-Wxx
      const year = d.getUTCFullYear();
      const firstDayOfYear = new Date(Date.UTC(year, 0, 1));
      const pastDays = (d.getTime() - firstDayOfYear.getTime()) / 86400000;
      const weekNum = Math.ceil((pastDays + firstDayOfYear.getUTCDay() + 1) / 7);
      const weekKey = `${year}-W${String(weekNum).padStart(2, '0')}`;

      const curr = weeksMap.get(weekKey) || { completions: 0, excusedCount: 0, target: targetFreq };
      if (dr.isCompleted) curr.completions++;
      if (dr.isExcused) curr.excusedCount++;
      weeksMap.set(weekKey, curr);
    }

    const sortedWeeks = Array.from(weeksMap.keys()).sort();
    let rolling = 0;
    for (let i = 0; i < sortedWeeks.length; i++) {
      const wKey = sortedWeeks[i];
      const wData = weeksMap.get(wKey)!;
      const isCurrentWeek = i === sortedWeeks.length - 1;

      // In current week: if target met -> count it! If not met yet, week is still active, so don't break
      if (wData.completions >= wData.target) {
        rolling++;
      } else if (wData.excusedCount >= 4) {
        // Mostly excused week -> maintain streak
      } else if (!isCurrentWeek) {
        rolling = 0;
      }
      if (rolling > bestStreak) bestStreak = rolling;
    }
    currentStreak = rolling;
  } else {
    // Day-by-day streak evaluation with fair rest & excused pauses
    // Compute best streak by forward scan
    let rolling = 0;
    for (const dr of dayRecords) {
      if (dr.isCompleted) {
        rolling++;
      } else if (dr.isExcused || !dr.isScheduled) {
        // Rest day or excused pause: preserves current streak without breaking
      } else {
        // Scheduled, unexcused miss
        if (dr.date !== todayStr) {
          // If missed in the past, streak resets
          rolling = 0;
        }
      }
      if (rolling > bestStreak) bestStreak = rolling;
    }

    // Compute current streak by backward scan from today
    let current = 0;
    const rev = [...dayRecords].reverse();

    for (let i = 0; i < rev.length; i++) {
      const dr = rev[i];
      const isToday = dr.date === todayStr;

      if (dr.isCompleted) {
        current++;
      } else if (dr.isExcused || !dr.isScheduled) {
        // Rest day or excused: streak is frozen / continues backwards
        continue;
      } else {
        // Scheduled day not completed
        if (isToday) {
          // Today is still ongoing; grace period: do not break streak yet, continue scanning yesterday
          continue;
        } else {
          // Unexcused missed day in the past -> streak broke here
          break;
        }
      }
    }
    currentStreak = current;
  }

  // --- Consistency % over 7, 30, and 90 days (PRD 7.3) ---
  // Consistency % = completions / scheduled occurrences (excluding declared skip and pause days)
  const calcConsistency = (windowDays: number): number => {
    const cutoffDate = new Date(`${todayStr}T00:00:00Z`);
    cutoffDate.setUTCDate(cutoffDate.getUTCDate() - (windowDays - 1));
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    const windowRecords = dayRecords.filter((dr) => dr.date >= cutoffStr && dr.date <= todayStr);
    let sched = 0;
    let comp = 0;

    for (const dr of windowRecords) {
      if (dr.isScheduled && !dr.isExcused) {
        sched++;
        if (dr.isCompleted) comp++;
      } else if (dr.isCompleted) {
        // Completed on non-scheduled day (bonus credit)
        comp++;
      }
    }

    if (sched === 0) return comp > 0 ? 100 : 100;
    const rate = Math.round((comp / sched) * 100);
    return Math.min(rate, 100);
  };

  const consistency7d = calcConsistency(7);
  const consistency30d = calcConsistency(30);
  const consistency90d = calcConsistency(90);

  // --- Weekday Completion Patterns (Mon..Sun) ---
  const weekdayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weekdayStats = weekdayNames.map((dayLabel, idx) => ({
    dayIndex: idx,
    dayLabel,
    scheduled: 0,
    completions: 0,
    rate: 0,
  }));

  for (const dr of dayRecords) {
    const d = new Date(`${dr.date}T00:00:00Z`);
    // Convert 0=Sun..6=Sat to 0=Mon..6=Sun
    const jsDay = d.getUTCDay();
    const monIdx = jsDay === 0 ? 6 : jsDay - 1;

    if (dr.isScheduled && !dr.isExcused) {
      weekdayStats[monIdx].scheduled++;
      if (dr.isCompleted) weekdayStats[monIdx].completions++;
    } else if (dr.isCompleted) {
      weekdayStats[monIdx].completions++;
    }
  }

  for (const st of weekdayStats) {
    st.rate = st.scheduled > 0 ? Math.round((st.completions / st.scheduled) * 100) : 0;
  }

  return {
    currentStreak,
    bestStreak: Math.max(bestStreak, currentStreak),
    consistency7d,
    consistency30d,
    consistency90d,
    totalCompletions,
    totalScheduled,
    totalExcused,
    weekdayRates: weekdayStats,
  };
}

/**
 * Avoidance Habits: Things to stop with relapse tracking and days-clean count (HB-6)
 */
function calculateAvoidanceMetrics(
  habit: Habit,
  habitLogs: ProgressLog[],
  todayStr: string
): HabitStreakResult {
  const relapses = habitLogs
    .filter(isRelapseLog)
    .sort((a, b) => a.date.localeCompare(b.date));

  const totalRelapses = relapses.length;
  const startDate = habit.startDate || todayStr;

  let daysClean = 0;
  let bestCleanStreak = 0;

  if (totalRelapses === 0) {
    // Clean from startDate up to today
    const start = new Date(`${startDate}T00:00:00Z`);
    const today = new Date(`${todayStr}T00:00:00Z`);
    const diff = Math.max(0, Math.round((today.getTime() - start.getTime()) / 86400000));
    daysClean = diff;
    bestCleanStreak = diff;
  } else {
    // Days clean from last relapse to today
    const lastRelapseDate = relapses[relapses.length - 1].date;
    const lastD = new Date(`${lastRelapseDate}T00:00:00Z`);
    const today = new Date(`${todayStr}T00:00:00Z`);
    daysClean = Math.max(0, Math.round((today.getTime() - lastD.getTime()) / 86400000));

    // Calculate maximum clean span across history
    let prevDate = startDate;
    for (const r of relapses) {
      const pD = new Date(`${prevDate}T00:00:00Z`);
      const rD = new Date(`${r.date}T00:00:00Z`);
      const span = Math.max(0, Math.round((rD.getTime() - pD.getTime()) / 86400000));
      if (span > bestCleanStreak) bestCleanStreak = span;
      prevDate = r.date;
    }
    if (daysClean > bestCleanStreak) bestCleanStreak = daysClean;
  }

  // Avoidance consistency: % of days without relapse over 7, 30, 90 days
  const calcCleanRate = (windowDays: number): number => {
    const cutoff = new Date(`${todayStr}T00:00:00Z`);
    cutoff.setUTCDate(cutoff.getUTCDate() - (windowDays - 1));
    const cutoffStr = cutoff.toISOString().split('T')[0];

    const windowRelapses = relapses.filter((r) => r.date >= cutoffStr && r.date <= todayStr).length;
    const cleanDays = Math.max(0, windowDays - windowRelapses);
    return Math.round((cleanDays / windowDays) * 100);
  };

  return {
    currentStreak: daysClean,
    bestStreak: bestCleanStreak,
    consistency7d: calcCleanRate(7),
    consistency30d: calcCleanRate(30),
    consistency90d: calcCleanRate(90),
    totalCompletions: 0,
    totalScheduled: 0,
    totalExcused: 0,
    daysClean,
    bestCleanStreak,
    totalRelapses,
    weekdayRates: [],
  };
}

/**
 * Builds 52-week x 7-day calendar matrix for year heatmap
 */
export function buildYearHeatmapMatrix(
  habit: Habit,
  logs: ProgressLog[],
  todayStr: string
): HabitDayCell[][] {
  const habitLogs = logs.filter((l) => l.entityId === habit.id && !l.isDeleted);
  const logsByDate = new Map<string, ProgressLog[]>();
  for (const l of habitLogs) {
    const list = logsByDate.get(l.date) || [];
    list.push(l);
    logsByDate.set(l.date, list);
  }

  // 52 weeks = 364 days. Let's build exactly 52 full weeks ending on the end of current week
  const today = new Date(`${todayStr}T00:00:00Z`);
  const dayOfWeek = today.getUTCDay(); // 0 = Sun, 1 = Mon ...
  // Calculate Sunday of current week
  const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  const endSunday = new Date(today.getTime());
  endSunday.setUTCDate(endSunday.getUTCDate() + daysUntilSunday);

  // 52 weeks back from Monday of that week
  const startDate = new Date(endSunday.getTime());
  startDate.setUTCDate(startDate.getUTCDate() - (52 * 7 - 1)); // 364 days

  const weeks: HabitDayCell[][] = [];
  const curr = new Date(startDate.getTime());

  for (let w = 0; w < 52; w++) {
    const weekCells: HabitDayCell[] = [];
    for (let d = 0; d < 7; d++) {
      const dateStr = curr.toISOString().split('T')[0];
      const dOfWeek = curr.getUTCDay();
      const isToday = dateStr === todayStr;
      const isFuture = dateStr > todayStr;

      const isScheduled = isHabitScheduledOnDate(habit, dateStr);
      const isExcused = isDateExcused(habit, dateStr, habitLogs);
      const dayLogs = logsByDate.get(dateStr) || [];

      const hasRelapse = dayLogs.some(isRelapseLog);
      const totalVal = dayLogs
        .filter((l) => !isRelapseLog(l) && !l.note?.startsWith('excused_skip'))
        .reduce((acc, c) => acc + (c.value || 0), 0);

      const targetVal = habit.targetValue || 1;
      const isCompleted = !hasRelapse && totalVal >= targetVal;

      let intensity: 0 | 1 | 2 | 3 = 0;
      if (isCompleted) {
        if (totalVal > targetVal) intensity = 3;
        else intensity = 2;
      } else if (totalVal > 0) {
        intensity = 1;
      }

      const note = dayLogs.find((l) => l.note)?.note;

      weekCells.push({
        dateStr,
        dayOfWeek: dOfWeek,
        isScheduled,
        isCompleted,
        isExcused,
        isRelapse: hasRelapse,
        isToday,
        value: totalVal,
        note,
        intensity: isFuture ? 0 : intensity,
      });

      curr.setUTCDate(curr.getUTCDate() + 1);
    }
    weeks.push(weekCells);
  }

  return weeks;
}
