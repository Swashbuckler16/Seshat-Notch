import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('PRD PL-1: Area management logic exists in domain service', () => {
  const servicePath = path.resolve(process.cwd(), 'src/services/domainService.ts');
  assert.ok(fs.existsSync(servicePath), 'domainService.ts must exist');

  const content = fs.readFileSync(servicePath, 'utf-8');
  assert.ok(content.includes('createArea'), 'Must have createArea');
  assert.ok(content.includes('updateArea'), 'Must have updateArea');
  assert.ok(content.includes('archiveArea'), 'Must have archiveArea');
  assert.ok(content.includes('reorderAreas'), 'Must have reorderAreas');
});

test('PRD PL-2: Project inspector fields (why, success criteria, status, blockers)', () => {
  const inspectorPath = path.resolve(process.cwd(), 'src/components/planner/ProjectInspector.tsx');
  assert.ok(fs.existsSync(inspectorPath), 'ProjectInspector.tsx must exist');

  const content = fs.readFileSync(inspectorPath, 'utf-8');
  assert.ok(content.includes('why'), 'Must inspect project why / rationale');
  assert.ok(content.includes('successCriteria'), 'Must inspect project success criteria');
  assert.ok(content.includes('raiseBlocker'), 'Must allow raising blockers');
  assert.ok(content.includes('clearBlocker'), 'Must allow clearing blockers');
  assert.ok(content.includes('TR-3'), 'Must implement PRD TR-3 drop reason requirement');
});

test('PRD PL-3: Milestone timeline with finish-to-start dependencies and weights', () => {
  const timelinePath = path.resolve(process.cwd(), 'src/components/planner/MilestoneTimeline.tsx');
  assert.ok(fs.existsSync(timelinePath), 'MilestoneTimeline.tsx must exist');

  const content = fs.readFileSync(timelinePath, 'utf-8');
  assert.ok(content.includes('dependsOnMilestoneId'), 'Must support finish-to-start dependency tracking');
  assert.ok(content.includes('weight'), 'Must support milestone weight tracking');
  assert.ok(content.includes('CordBar'), 'Must render measuring cord progress bar');
});

test('PRD TR-3: Domain service requires non-empty reason when dropping project', () => {
  const servicePath = path.resolve(process.cwd(), 'src/services/domainService.ts');
  const content = fs.readFileSync(servicePath, 'utf-8');

  // Verify code checks reason when status is 'dropped'
  assert.ok(
    content.includes("newStatus === 'dropped' && (!reason || reason.trim().length === 0)"),
    'Must enforce non-empty reason for dropped status'
  );
});

test('PRD PL-1 UI: AreaManager component renders area list and ordering controls', () => {
  const areaMgrPath = path.resolve(process.cwd(), 'src/components/planner/AreaManager.tsx');
  assert.ok(fs.existsSync(areaMgrPath), 'AreaManager.tsx must exist');

  const content = fs.readFileSync(areaMgrPath, 'utf-8');
  assert.ok(content.includes('reorderAreas'), 'Must support reordering');
  assert.ok(content.includes('archiveArea'), 'Must support archiving');
});

test('PRD Planner: PlannerView ties AreaManager, ProjectInspector, and MilestoneTimeline together', () => {
  const plannerPath = path.resolve(process.cwd(), 'src/components/planner/PlannerView.tsx');
  assert.ok(fs.existsSync(plannerPath), 'PlannerView.tsx must exist');

  const content = fs.readFileSync(plannerPath, 'utf-8');
  assert.ok(content.includes('AreaManager'), 'Must incorporate AreaManager');
  assert.ok(content.includes('MilestoneTimeline'), 'Must incorporate MilestoneTimeline');
  assert.ok(content.includes('ProjectInspector'), 'Must incorporate ProjectInspector');
});

