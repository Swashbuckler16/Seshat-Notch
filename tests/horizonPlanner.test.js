import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  getCurrentPeriod,
  getISOWeekString,
  formatPeriodLabel,
  getAdjacentPeriod,
  getSubPeriods,
} from '../src/utils/periodUtils.ts';

test('PRD 6.2: Period formatting and ISO week calculation', () => {
  const fixedDate = new Date('2026-10-31T12:00:00Z');
  const monthPeriod = getCurrentPeriod('month', fixedDate);
  const weekPeriod = getCurrentPeriod('week', fixedDate);
  const dayPeriod = getCurrentPeriod('day', fixedDate);

  assert.equal(monthPeriod, '2026-10', 'Month should format as YYYY-MM');
  assert.equal(weekPeriod, '2026-W44', 'Week should format as YYYY-Www');
  assert.equal(dayPeriod, '2026-10-31', 'Day should format as YYYY-MM-DD');

  const monthLabel = formatPeriodLabel('2026-10', 'month');
  assert.equal(monthLabel, 'October 2026', 'Month label must be human readable');

  const weekLabel = formatPeriodLabel('2026-W44', 'week');
  assert.ok(weekLabel.includes('Week 44, 2026'), 'Week label must include week number and year');
});

test('PRD 6.3: Period navigation helper jumps adjacent periods accurately', () => {
  // Month navigation
  assert.equal(getAdjacentPeriod('2026-10', 'month', 'next'), '2026-11');
  assert.equal(getAdjacentPeriod('2026-12', 'month', 'next'), '2027-01');
  assert.equal(getAdjacentPeriod('2026-01', 'month', 'prev'), '2025-12');

  // Day navigation
  assert.equal(getAdjacentPeriod('2026-10-31', 'day', 'next'), '2026-11-01');
  assert.equal(getAdjacentPeriod('2026-11-01', 'day', 'prev'), '2026-10-31');
});

test('PRD 6.2: Cascade sub-period splitting (Month -> Weeks, Week -> Days)', () => {
  const weeks = getSubPeriods('2026-10', 'month');
  assert.ok(weeks.length >= 4 && weeks.length <= 6, 'October should have 4-5 weeks');
  assert.ok(weeks.some((w) => w.period === '2026-W44'), 'October must contain week 44');

  const days = getSubPeriods('2026-W44', 'week');
  assert.equal(days.length, 7, 'A week must split into exactly 7 days');
  assert.equal(days[0].label.includes('Monday'), true, 'Week should start on Monday');
  assert.equal(days[6].label.includes('Sunday'), true, 'Week should end on Sunday');
});

test('PRD 6.2 & 6.3: Domain service exports multi-horizon cascade and planning tools', () => {
  const servicePath = path.resolve(process.cwd(), 'src/services/domainService.ts');
  assert.ok(fs.existsSync(servicePath), 'domainService.ts must exist');

  const content = fs.readFileSync(servicePath, 'utf-8');
  assert.ok(content.includes('cascadeTarget'), 'Must implement cascadeTarget');
  assert.ok(content.includes('copyForwardPeriod'), 'Must implement copyForwardPeriod');
  assert.ok(content.includes('shiftPlanPeriod'), 'Must implement shiftPlanPeriod');
  assert.ok(content.includes('updateTarget'), 'Must implement updateTarget');
  assert.ok(content.includes('softDeleteTarget'), 'Must implement softDeleteTarget');
});

test('PRD 6.2 UI: Multi-Horizon components exist and follow Hallmark design system', () => {
  const horizonPlannerPath = path.resolve(process.cwd(), 'src/components/planner/HorizonPlanner.tsx');
  const targetCardPath = path.resolve(process.cwd(), 'src/components/planner/TargetCard.tsx');
  const cascadeModalPath = path.resolve(process.cwd(), 'src/components/planner/CascadeModal.tsx');
  const copyModalPath = path.resolve(process.cwd(), 'src/components/planner/CopyForwardModal.tsx');
  const shiftModalPath = path.resolve(process.cwd(), 'src/components/planner/ShiftPlanModal.tsx');

  assert.ok(fs.existsSync(horizonPlannerPath), 'HorizonPlanner.tsx must exist');
  assert.ok(fs.existsSync(targetCardPath), 'TargetCard.tsx must exist');
  assert.ok(fs.existsSync(cascadeModalPath), 'CascadeModal.tsx must exist');
  assert.ok(fs.existsSync(copyModalPath), 'CopyForwardModal.tsx must exist');
  assert.ok(fs.existsSync(shiftModalPath), 'ShiftPlanModal.tsx must exist');
});

