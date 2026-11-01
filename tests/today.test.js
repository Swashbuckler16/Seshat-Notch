import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('PRD 6.4: Today View domain service methods are defined and exported', () => {
  const servicePath = path.resolve(process.cwd(), 'src/services/domainService.ts');
  assert.ok(fs.existsSync(servicePath), 'domainService.ts must exist');

  const content = fs.readFileSync(servicePath, 'utf-8');
  assert.ok(content.includes('toggleTaskStatus'), 'Must implement toggleTaskStatus');
  assert.ok(content.includes('updateTask'), 'Must implement updateTask');
  assert.ok(content.includes('softDeleteTask'), 'Must implement softDeleteTask');
  assert.ok(content.includes('logTimeSession'), 'Must implement logTimeSession');
  assert.ok(content.includes('toggleHabitForDate'), 'Must implement toggleHabitForDate');
});

test('PRD 6.4: Today View UI components exist and follow Hallmark design system', () => {
  const todayViewPath = path.resolve(process.cwd(), 'src/components/today/TodayView.tsx');
  const morningSummaryPath = path.resolve(process.cwd(), 'src/components/today/MorningSummary.tsx');
  const executionStripPath = path.resolve(process.cwd(), 'src/components/today/ExecutionStrip.tsx');
  const todayTasksPath = path.resolve(process.cwd(), 'src/components/today/TodayTasks.tsx');
  const todayTargetsPath = path.resolve(process.cwd(), 'src/components/today/TodayTargets.tsx');
  const todayHabitsPath = path.resolve(process.cwd(), 'src/components/today/TodayHabits.tsx');

  assert.ok(fs.existsSync(todayViewPath), 'TodayView.tsx must exist');
  assert.ok(fs.existsSync(morningSummaryPath), 'MorningSummary.tsx must exist');
  assert.ok(fs.existsSync(executionStripPath), 'ExecutionStrip.tsx must exist');
  assert.ok(fs.existsSync(todayTasksPath), 'TodayTasks.tsx must exist');
  assert.ok(fs.existsSync(todayTargetsPath), 'TodayTargets.tsx must exist');
  assert.ok(fs.existsSync(todayHabitsPath), 'TodayHabits.tsx must exist');
});

test('PRD 6.4: MorningSummary incorporates measuring cord and glancable daily stats', () => {
  const morningSummaryPath = path.resolve(process.cwd(), 'src/components/today/MorningSummary.tsx');
  const content = fs.readFileSync(morningSummaryPath, 'utf-8');

  assert.ok(content.includes('CordBar'), 'Must include CordBar for visual fulfillment');
  assert.ok(content.includes('targetsDone'), 'Must inspect targets done');
  assert.ok(content.includes('tasksDone'), 'Must inspect tasks done');
  assert.ok(content.includes('habitsDone'), 'Must inspect habits done');
  assert.ok(content.includes('minutesLogged'), 'Must inspect minutes logged');
});

test('PRD 6.4: TodayHabits incorporates 7-day NotchRib and date toggling', () => {
  const todayHabitsPath = path.resolve(process.cwd(), 'src/components/today/TodayHabits.tsx');
  const content = fs.readFileSync(todayHabitsPath, 'utf-8');

  assert.ok(content.includes('NotchRib'), 'Must include NotchRib for habit tracking');
  assert.ok(content.includes('toggleHabitForDate'), 'Must allow toggling habit completion');
});

test('PRD 6.4 & TK-3: ExecutionStrip provides rapid 1-click focus session presets', () => {
  const executionStripPath = path.resolve(process.cwd(), 'src/components/today/ExecutionStrip.tsx');
  const content = fs.readFileSync(executionStripPath, 'utf-8');

  assert.ok(content.includes('logTimeSession'), 'Must implement logTimeSession');
  assert.ok(content.includes('+15m') || content.includes('+25m'), 'Must offer rapid session presets');
  assert.ok(content.includes('Pomodoro') || content.includes('Deep work'), 'Must label sessions clearly');
});

