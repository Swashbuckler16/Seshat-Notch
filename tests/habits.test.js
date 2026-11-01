import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Import pure functions from habitMath.ts
import {
  calculateHabitMetrics,
  isDateExcused,
  isHabitScheduledOnDate,
  buildYearHeatmapMatrix,
} from '../src/utils/habitMath.ts';

test('PRD HB-1 & HB-3: Habit schedule determination and rest days', () => {
  const dailyHabit = {
    id: 'h_daily',
    title: 'Daily Coding',
    metricType: 'boolean',
    scheduleType: 'daily',
    targetValue: 1,
    isAvoidance: false,
    startDate: '2026-10-01',
    isArchived: false,
    isDeleted: false,
  };

  const weekdaysHabit = {
    id: 'h_weekdays',
    title: 'Work Sprint',
    metricType: 'boolean',
    scheduleType: 'weekdays',
    targetValue: 1,
    isAvoidance: false,
    startDate: '2026-10-01',
    isArchived: false,
    isDeleted: false,
  };

  // 2026-10-30 was Friday, 2026-10-31 was Saturday, 2026-11-01 was Sunday
  assert.equal(isHabitScheduledOnDate(dailyHabit, '2026-10-30'), true);
  assert.equal(isHabitScheduledOnDate(dailyHabit, '2026-10-31'), true);

  assert.equal(isHabitScheduledOnDate(weekdaysHabit, '2026-10-30'), true); // Friday
  assert.equal(isHabitScheduledOnDate(weekdaysHabit, '2026-10-31'), false); // Saturday (Rest day)
  assert.equal(isHabitScheduledOnDate(weekdaysHabit, '2026-11-01'), false); // Sunday (Rest day)
});

test('PRD HB-3: Fair streak logic preserves streak through excused rest and vacation pauses', () => {
  const habit = {
    id: 'h1',
    title: 'Morning Run',
    metricType: 'boolean',
    scheduleType: 'daily',
    targetValue: 1,
    isAvoidance: false,
    startDate: '2026-10-25',
    pausedRanges: [
      { startDate: '2026-10-28', endDate: '2026-10-29', reason: 'Flu recovery' },
    ],
    isArchived: false,
    isDeleted: false,
  };

  const logs = [
    { id: 'l1', entityId: 'h1', entityType: 'habit', date: '2026-10-25', value: 1, isDeleted: false },
    { id: 'l2', entityId: 'h1', entityType: 'habit', date: '2026-10-26', value: 1, isDeleted: false },
    { id: 'l3', entityId: 'h1', entityType: 'habit', date: '2026-10-27', value: 1, isDeleted: false },
    // 2026-10-28 and 2026-10-29 are in pausedRanges (excused vacation/sick pause)
    { id: 'l4', entityId: 'h1', entityType: 'habit', date: '2026-10-30', value: 1, isDeleted: false },
    { id: 'l5', entityId: 'h1', entityType: 'habit', date: '2026-10-31', value: 1, isDeleted: false },
    { id: 'l6', entityId: 'h1', entityType: 'habit', date: '2026-11-01', value: 1, isDeleted: false },
  ];

  const metrics = calculateHabitMetrics(habit, logs, '2026-11-01');

  // Streak should NOT be broken by the 2 paused days
  assert.equal(metrics.currentStreak, 6, 'Streak must stay continuous across excused pause');
  assert.equal(metrics.bestStreak, 6, 'Best streak must match active streak');
  assert.equal(metrics.consistency7d, 100, 'Consistency % should exclude declared pauses');
});

test('PRD HB-3: Unexcused missed day resets streak', () => {
  const habit = {
    id: 'h2',
    title: 'Evening Reading',
    metricType: 'boolean',
    scheduleType: 'daily',
    targetValue: 1,
    isAvoidance: false,
    startDate: '2026-10-25',
    isArchived: false,
    isDeleted: false,
  };

  const logs = [
    { id: 'l1', entityId: 'h2', entityType: 'habit', date: '2026-10-25', value: 1, isDeleted: false },
    { id: 'l2', entityId: 'h2', entityType: 'habit', date: '2026-10-26', value: 1, isDeleted: false },
    // 2026-10-27 was missed without excuse!
    { id: 'l3', entityId: 'h2', entityType: 'habit', date: '2026-10-28', value: 1, isDeleted: false },
    { id: 'l4', entityId: 'h2', entityType: 'habit', date: '2026-10-29', value: 1, isDeleted: false },
  ];

  const metrics = calculateHabitMetrics(habit, logs, '2026-10-29');

  // Since 2026-10-27 was missed, current streak is only 2 (Oct 28 and Oct 29)
  assert.equal(metrics.currentStreak, 2, 'Streak resets after unexcused miss');
  assert.equal(metrics.bestStreak, 2, 'Best streak is 2');
});

test('PRD HB-6: Avoidance habits accurately calculate days clean and relapse events', () => {
  const habit = {
    id: 'h_clean',
    title: 'No Late Night Snacking',
    metricType: 'boolean',
    scheduleType: 'daily',
    targetValue: 1,
    isAvoidance: true,
    startDate: '2026-10-01',
    isArchived: false,
    isDeleted: false,
  };

  const logs = [
    // Relapse occurred on 2026-10-20
    { id: 'r1', entityId: 'h_clean', entityType: 'habit', date: '2026-10-20', value: -1, note: 'relapse: stress craving', isDeleted: false },
  ];

  const metrics = calculateHabitMetrics(habit, logs, '2026-11-01');

  // Between 2026-10-20 and 2026-11-01 is 12 days
  assert.equal(metrics.daysClean, 12, 'Days clean should be measured from last relapse to today');
  assert.equal(metrics.totalRelapses, 1, 'Total relapses should equal 1');
  assert.ok(metrics.bestCleanStreak >= 12, 'Best clean streak recorded');
});

test('PRD HB-4: 52-week Year Heatmap matrix generates 52 full weeks', () => {
  const habit = {
    id: 'h_heat',
    title: 'Strength Training',
    metricType: 'boolean',
    scheduleType: 'n_per_week',
    targetFrequency: 3,
    targetValue: 1,
    isAvoidance: false,
    startDate: '2026-01-01',
    isArchived: false,
    isDeleted: false,
  };

  const matrix = buildYearHeatmapMatrix(habit, [], '2026-11-01');
  assert.equal(matrix.length, 52, 'Heatmap must contain 52 weeks');
  assert.equal(matrix[0].length, 7, 'Each week must contain 7 days');
});

test('PRD 6.4: Domain service exports Habit and Fair Streak methods', () => {
  const servicePath = path.resolve(process.cwd(), 'src/services/domainService.ts');
  const content = fs.readFileSync(servicePath, 'utf-8');

  assert.ok(content.includes('createHabit'), 'Must export createHabit');
  assert.ok(content.includes('updateHabit'), 'Must export updateHabit');
  assert.ok(content.includes('archiveHabit'), 'Must export archiveHabit');
  assert.ok(content.includes('deleteHabit'), 'Must export deleteHabit');
  assert.ok(content.includes('logHabitCompletion'), 'Must export logHabitCompletion');
  assert.ok(content.includes('logHabitSkip'), 'Must export logHabitSkip');
  assert.ok(content.includes('logAvoidanceRelapse'), 'Must export logAvoidanceRelapse');
  assert.ok(content.includes('addHabitPauseRange'), 'Must export addHabitPauseRange');
  assert.ok(content.includes('removeHabitPauseRange'), 'Must export removeHabitPauseRange');
});

test('PRD 6.4 UI: Habit components exist and adhere to Hallmark Design System', () => {
  const files = [
    'src/components/habits/HabitsView.tsx',
    'src/components/habits/HabitCard.tsx',
    'src/components/habits/HabitYearHeatmap.tsx',
    'src/components/habits/HabitEditorModal.tsx',
    'src/components/habits/HabitSkipModal.tsx',
    'src/components/habits/HabitPauseModal.tsx',
    'src/components/habits/HabitRelapseModal.tsx',
  ];

  for (const f of files) {
    const fullPath = path.resolve(process.cwd(), f);
    assert.ok(fs.existsSync(fullPath), `${f} must exist`);
    const content = fs.readFileSync(fullPath, 'utf-8');
    // Hallmark rule check: no transition: all
    assert.ok(!content.includes('transition: all'), `${f} must not contain transition: all`);
  }
});
