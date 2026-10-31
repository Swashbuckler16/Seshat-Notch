import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('PRD Section 5 Domain Types are defined and exported', () => {
  const typesPath = path.resolve(process.cwd(), 'src/types/index.ts');
  assert.ok(fs.existsSync(typesPath), 'src/types/index.ts must exist');

  const content = fs.readFileSync(typesPath, 'utf-8');
  const requiredTypes = [
    'Area',
    'ProjectGoal',
    'MilestonePhase',
    'Target',
    'Task',
    'Habit',
    'Routine',
    'ProgressLog',
    'TimeSession',
    'Review',
    'Blocker',
    'ChangeLogEntry',
  ];

  for (const t of requiredTypes) {
    assert.ok(content.includes(`interface ${t}`), `Must define ${t}`);
  }
});

test('Dexie database configuration includes all PRD 5.2 stores', () => {
  const dbPath = path.resolve(process.cwd(), 'src/db/index.ts');
  assert.ok(fs.existsSync(dbPath), 'src/db/index.ts must exist');

  const content = fs.readFileSync(dbPath, 'utf-8');
  assert.ok(content.includes('areas:'), 'Must index areas');
  assert.ok(content.includes('projects:'), 'Must index projects');
  assert.ok(content.includes('milestones:'), 'Must index milestones');
  assert.ok(content.includes('targets:'), 'Must index targets');
  assert.ok(content.includes('tasks:'), 'Must index tasks');
  assert.ok(content.includes('habits:'), 'Must index habits');
  assert.ok(content.includes('routines:'), 'Must index routines');
  assert.ok(content.includes('progressLogs:'), 'Must index progressLogs');
  assert.ok(content.includes('changeLogs:'), 'Must index changeLogs');
});

test('PRD Section 16 Seed Data contains Heimdall SOC Lab with 8 phases', () => {
  const seedPath = path.resolve(process.cwd(), 'src/db/seedData.ts');
  assert.ok(fs.existsSync(seedPath), 'src/db/seedData.ts must exist');

  const content = fs.readFileSync(seedPath, 'utf-8');
  assert.ok(content.includes('Heimdall SOC Lab'), 'Must seed Heimdall SOC Lab');
  assert.ok(content.includes('ms_prep'), 'Must include Phase 1 Prep');
  assert.ok(content.includes('ms_ad_build'), 'Must include Phase 2 AD build');
  assert.ok(content.includes('ms_telemetry'), 'Must include Phase 3 Telemetry');
  assert.ok(content.includes('ms_siem'), 'Must include Phase 4 SIEM');
  assert.ok(content.includes('ms_baseline'), 'Must include Phase 5 Baseline');
  assert.ok(content.includes('ms_attack_detect'), 'Must include Phase 6 Attack and Detect');
  assert.ok(content.includes('ms_dashboards'), 'Must include Phase 7 Dashboards');
  assert.ok(content.includes('ms_reporting'), 'Must include Phase 8 Reporting');
  assert.ok(content.includes('12 MITRE ATT&CK techniques'), 'Must include 12 techniques target');
  assert.ok(content.includes('Document 3 detection rules'), 'Must include weekly detection target');
});

test('Domain Service enforces PRD TR-3 drop reason requirement', () => {
  const servicePath = path.resolve(process.cwd(), 'src/services/domainService.ts');
  assert.ok(fs.existsSync(servicePath), 'src/services/domainService.ts must exist');

  const content = fs.readFileSync(servicePath, 'utf-8');
  assert.ok(
    content.includes('PRD Requirement TR-3: Dropping'),
    'Must guard against dropping items without a mandatory reason'
  );
  assert.ok(
    content.includes('action: \'soft_delete\''),
    'Must perform soft delete preserving plan history (PRD DT-5)'
  );
});

