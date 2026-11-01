import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Import pure functions from metricEngine.ts
import {
  calculateProjectProgress,
  calculateExpectedProgress,
  calculateScheduleRatio,
  calculateVelocityAndForecast,
  calculateBlockerImpact,
  evaluateCompleteProjectMetrics,
} from '../src/utils/metricEngine.ts';

test('PRD TR-2 & 7.3: calculateProjectProgress computes progress with equal, manual, and estimate weighting', () => {
  const project = {
    id: 'p1',
    title: 'Heimdall SOC Lab',
    weightType: 'equal',
    status: 'active',
  };

  const targets = [
    { id: 't1', projectId: 'p1', title: 'Target 1', targetValue: 10, currentValue: 10, unit: 'rules', weight: 1.0, isDeleted: false },
    { id: 't2', projectId: 'p1', title: 'Target 2', targetValue: 10, currentValue: 5, unit: 'rules', weight: 1.0, isDeleted: false },
  ];

  // 1. Equal weighting
  const resEqual = calculateProjectProgress(project, targets, [], []);
  // (10 + 5) / (10 + 10) = 15/20 = 75%
  assert.equal(resEqual.progressPercent, 75);
  assert.equal(resEqual.trace.metricName, 'Progress %');
  assert.equal(resEqual.trace.sourceEntries.length, 2);

  // 2. Manual weighting: weight t2 at 3.0 vs t1 at 1.0
  const targetsManual = [
    { id: 't1', projectId: 'p1', title: 'Target 1', targetValue: 10, currentValue: 10, unit: 'rules', weight: 1.0, isDeleted: false },
    { id: 't2', projectId: 'p1', title: 'Target 2', targetValue: 10, currentValue: 5, unit: 'rules', weight: 3.0, isDeleted: false },
  ];
  const projectManual = { ...project, weightType: 'manual' };
  const resManual = calculateProjectProgress(projectManual, targetsManual, [], []);
  // t1: 10*1 = 10 act, 10*1 = 10 tgt
  // t2: 5*3 = 15 act, 10*3 = 30 tgt
  // total = 25 / 40 = 62.5%
  assert.equal(resManual.progressPercent, 62.5);

  // 3. By estimate weighting
  const tasks = [
    { id: 'tsk1', projectId: 'p1', targetId: 't1', estimateMinutes: 30, isDeleted: false },
    { id: 'tsk2', projectId: 'p1', targetId: 't2', estimateMinutes: 90, isDeleted: false },
  ];
  const projectEstimate = { ...project, weightType: 'estimate' };
  const resEstimate = calculateProjectProgress(projectEstimate, targets, [], tasks);
  // t1: 10*30 = 300 act, 10*30 = 300 tgt
  // t2: 5*90 = 450 act, 10*90 = 900 tgt
  // total = 750 / 1200 = 62.5%
  assert.equal(resEstimate.progressPercent, 62.5);
});

test('PRD 7.3: calculateExpectedProgress computes pacing scheduled up to today', () => {
  const project = { id: 'p2', title: 'Security+ Exam', weightType: 'equal' };
  const targets = [
    { id: 't1', projectId: 'p2', title: 'Chapter 1', period: '2026-10-25', targetValue: 1, currentValue: 1, unit: 'ch', isDeleted: false },
    { id: 't2', projectId: 'p2', title: 'Chapter 2', period: '2026-10-30', targetValue: 1, currentValue: 1, unit: 'ch', isDeleted: false },
    { id: 't3', projectId: 'p2', title: 'Chapter 3', period: '2026-11-10', targetValue: 1, currentValue: 0, unit: 'ch', isDeleted: false },
  ];

  // Evaluating at 2026-11-01: t1 and t2 were scheduled by today (2 out of 3 = 66.7%)
  const expected = calculateExpectedProgress(project, targets, [], '2026-11-01');
  assert.equal(expected.expectedPercent, 66.7);
  assert.equal(expected.scheduledItemsCount, 2);
  assert.equal(expected.totalItemsCount, 3);
});

test('PRD 7.3: calculateScheduleRatio classifies status by word and shape', () => {
  // Ratio >= 0.90 -> On track (●)
  const onTrack = calculateScheduleRatio(80, 80);
  assert.equal(onTrack.scheduleRatio, 1.0);
  assert.equal(onTrack.status, 'on_track');
  assert.equal(onTrack.statusLabel, 'On track');
  assert.equal(onTrack.glyph, '●');

  // Ratio between 0.70 and 0.89 -> At risk (▲)
  const atRisk = calculateScheduleRatio(60, 80); // 60/80 = 0.75
  assert.equal(atRisk.scheduleRatio, 0.75);
  assert.equal(atRisk.status, 'at_risk');
  assert.equal(atRisk.statusLabel, 'At risk');
  assert.equal(atRisk.glyph, '▲');

  // Ratio < 0.70 -> Behind (■)
  const behind = calculateScheduleRatio(40, 80); // 40/80 = 0.50
  assert.equal(behind.scheduleRatio, 0.5);
  assert.equal(behind.status, 'behind');
  assert.equal(behind.statusLabel, 'Behind');
  assert.equal(behind.glyph, '■');
});

test('PRD 7.3: calculateVelocityAndForecast gives credible range and honest empty state', () => {
  const project = {
    id: 'p3',
    title: 'Lab',
    startDate: '2026-10-01',
    endDate: '2026-12-01',
  };

  const targets = [
    { id: 't1', projectId: 'p3', targetValue: 100, isDeleted: false },
  ];

  // Case 1: Zero recent progress logs -> Honest empty state
  const emptyRes = calculateVelocityAndForecast(project, [], targets, 20, '2026-11-01', 14);
  assert.equal(emptyRes.hasSufficientData, false);
  assert.equal(emptyRes.forecastRangeString, 'Pace insufficient for forecast');
  assert.ok(emptyRes.message?.includes('Not enough velocity'));

  // Case 2: Active recent velocity (e.g. 14 units in 14 days = 1%/day)
  const recentLogs = [
    { id: 'l1', entityType: 'target', entityId: 't1', date: '2026-10-25', value: 7, isDeleted: false },
    { id: 'l2', entityType: 'target', entityId: 't1', date: '2026-10-30', value: 7, isDeleted: false },
  ];
  // 14 units out of 100 total = 14% across 14 days = 1% per day
  // Current progress = 50%, remaining = 50%
  // Expected days remaining = 50 / 1 = 50 days
  const activeRes = calculateVelocityAndForecast(project, recentLogs, targets, 50, '2026-11-01', 14);
  assert.equal(activeRes.hasSufficientData, true);
  assert.equal(activeRes.recentVelocityPerDay, 1);
  assert.equal(activeRes.daysRemainingExpected, 50);
  assert.ok(activeRes.forecastDateOptimistic);
  assert.ok(activeRes.forecastDatePessimistic);
  assert.ok(activeRes.forecastRangeString.includes('to'));
});

test('PRD TR-5: calculateBlockerImpact computes duration and days blocked', () => {
  const blockers = [
    { id: 'b1', entityId: 'p4', description: 'License delay', dateRaised: '2026-10-25' }, // 7 days open as of 2026-11-01
    { id: 'b2', entityId: 'p4', description: 'Hardware broken', dateRaised: '2026-10-10', dateCleared: '2026-10-15' }, // 5 days
  ];

  const res = calculateBlockerImpact(blockers, '2026-11-01', 'p4');
  assert.equal(res.openBlockersCount, 1);
  assert.equal(res.resolvedBlockersCount, 1);
  assert.equal(res.totalBlockedDays, 12, '7 days open + 5 days historical = 12 total blocked days');
});

test('PRD 7.1 & 7.3 UI: Formula Inspector and Metric components comply with Hallmark standards', () => {
  const files = [
    'src/utils/metricEngine.ts',
    'src/components/metrics/FormulaInspectorModal.tsx',
    'src/components/metrics/ProjectHealthCard.tsx',
    'src/components/metrics/ProjectMetricsView.tsx',
  ];

  for (const f of files) {
    const fullPath = path.resolve(process.cwd(), f);
    assert.ok(fs.existsSync(fullPath), `${f} must exist`);
    const content = fs.readFileSync(fullPath, 'utf-8');
    assert.ok(!content.includes('transition: all'), `${f} must not contain transition: all`);
  }
});
