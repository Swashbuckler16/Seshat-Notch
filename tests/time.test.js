import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Import pure functions from timeMath.ts
import {
  calculateTimeMetrics,
  formatMinutesToHuman,
  formatSecondsToTimer,
} from '../src/utils/timeMath.ts';

test('PRD TM-1 & TM-3: calculateTimeMetrics computes volume, deep work ratio, and kind breakdown', () => {
  const mockSessions = [
    {
      id: 's1',
      entityType: 'task',
      entityId: 't1',
      startTime: '2026-11-01T10:00:00Z',
      durationMinutes: 60,
      kind: 'deep',
      createdAt: '2026-11-01T10:00:00Z',
    },
    {
      id: 's2',
      entityType: 'task',
      entityId: 't2',
      startTime: '2026-11-01T11:30:00Z',
      durationMinutes: 30,
      kind: 'shallow',
      createdAt: '2026-11-01T11:30:00Z',
    },
    {
      id: 's3',
      entityType: 'project',
      entityId: 'p1',
      startTime: '2026-11-01T14:00:00Z',
      durationMinutes: 90,
      kind: 'learning',
      createdAt: '2026-11-01T14:00:00Z',
    },
  ];

  const mockTasks = [
    { id: 't1', projectId: 'p1', title: 'Task 1', estimateMinutes: 60, actualMinutes: 60, priority: 'high', status: 'done', subtasks: [], tags: [], isDeleted: false, createdAt: '', updatedAt: '' },
    { id: 't2', projectId: 'p1', title: 'Task 2', estimateMinutes: 45, actualMinutes: 30, priority: 'medium', status: 'done', subtasks: [], tags: [], isDeleted: false, createdAt: '', updatedAt: '' },
  ];

  const mockProjects = [
    { id: 'p1', areaId: 'a1', title: 'Heimdall SOC Lab', isGoal: false, priority: 'urgent', status: 'active', tags: [], weightType: 'equal', isDeleted: false, createdAt: '', updatedAt: '' },
  ];

  const mockAreas = [
    { id: 'a1', name: 'Career & Engineering', order: 1, isArchived: false, createdAt: '', updatedAt: '' },
  ];

  const metrics = calculateTimeMetrics(mockSessions, mockTasks, mockProjects, mockAreas);

  assert.equal(metrics.totalMinutes, 180, 'Total minutes must be 180');
  assert.equal(metrics.totalHours, 3, 'Total hours must be 3.0');
  assert.equal(metrics.sessionCount, 3, 'Total sessions must be 3');
  assert.equal(metrics.averageSessionMinutes, 60, 'Average session length must be 60m');

  // Deep work ratio: 60 / 180 = 33%
  assert.equal(metrics.deepWorkRatio, 33, 'Deep work ratio must be 33%');

  // Kind breakdown
  const deepKind = metrics.kindBreakdown.find((k) => k.kind === 'deep');
  const shallowKind = metrics.kindBreakdown.find((k) => k.kind === 'shallow');
  const learningKind = metrics.kindBreakdown.find((k) => k.kind === 'learning');

  assert.equal(deepKind?.minutes, 60);
  assert.equal(shallowKind?.minutes, 30);
  assert.equal(learningKind?.minutes, 90);
  assert.equal(learningKind?.percentage, 50);

  // Project breakdown
  assert.equal(metrics.projectBreakdown.length, 1);
  assert.equal(metrics.projectBreakdown[0].projectTitle, 'Heimdall SOC Lab');
  assert.equal(metrics.projectBreakdown[0].areaName, 'Career & Engineering');
  assert.equal(metrics.projectBreakdown[0].minutes, 180);
});

test('PRD 7.2: Estimate accuracy compares planned vs actual task duration', () => {
  const mockTasks = [
    { id: 't1', title: 'Perfect estimate', estimateMinutes: 60, actualMinutes: 60 },
    { id: 't2', title: 'Under estimated', estimateMinutes: 30, actualMinutes: 60 }, // error: 30 / 60 = 0.5 error, 50% acc
  ];

  const metrics = calculateTimeMetrics([], mockTasks, [], []);
  assert.equal(metrics.estimateAccuracy.evaluatedTasksCount, 2);
  assert.equal(metrics.estimateAccuracy.totalEstimatedMinutes, 90);
  assert.equal(metrics.estimateAccuracy.totalActualMinutes, 120);
  assert.equal(metrics.estimateAccuracy.varianceMinutes, 30);
  assert.equal(metrics.estimateAccuracy.overallAccuracyRate, 75, 'Mean of 100% and 50% is 75%');
});

test('Time formatters display clean human-readable and timer strings', () => {
  assert.equal(formatMinutesToHuman(45), '45m');
  assert.equal(formatMinutesToHuman(90), '1h 30m');
  assert.equal(formatMinutesToHuman(120), '2h');

  assert.equal(formatSecondsToTimer(1500), '25:00');
  assert.equal(formatSecondsToTimer(75), '01:15');
  assert.equal(formatSecondsToTimer(5), '00:05');
});

test('PRD TM-1: Domain service exports time tracking and session methods', () => {
  const servicePath = path.resolve(process.cwd(), 'src/services/domainService.ts');
  const content = fs.readFileSync(servicePath, 'utf-8');

  assert.ok(content.includes('logTimeSession'), 'Must export logTimeSession');
  assert.ok(content.includes('updateTimeSession'), 'Must export updateTimeSession');
  assert.ok(content.includes('deleteTimeSession'), 'Must export deleteTimeSession');
});

test('PRD 6.5 UI: Time components exist and comply with Hallmark Floor gates', () => {
  const files = [
    'src/components/time/TimeView.tsx',
    'src/components/time/FocusTimerWidget.tsx',
    'src/components/time/TimeDistributionWidget.tsx',
    'src/components/time/TimeSessionLedger.tsx',
    'src/components/time/ManualTimeModal.tsx',
    'src/components/time/HeaderTimerPill.tsx',
  ];

  for (const f of files) {
    const fullPath = path.resolve(process.cwd(), f);
    assert.ok(fs.existsSync(fullPath), `${f} must exist`);
    const content = fs.readFileSync(fullPath, 'utf-8');
    assert.ok(!content.includes('transition: all'), `${f} must not contain transition: all`);
  }
});

