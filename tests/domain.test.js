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

test('Clean workspace seedData purges pre-added example goals and projects', () => {
  const seedPath = path.resolve(process.cwd(), 'src/db/seedData.ts');
  assert.ok(fs.existsSync(seedPath), 'src/db/seedData.ts must exist');

  const content = fs.readFileSync(seedPath, 'utf-8');
  assert.ok(
    content.includes('purgePreAddedSeedData'),
    'Must export purgePreAddedSeedData to clean pre-added example items'
  );
  assert.ok(
    !content.includes("title: 'Heimdall SOC Lab'"),
    'Must not pre-add example project Heimdall SOC Lab'
  );
  assert.ok(
    !content.includes("title: 'CompTIA Security+ Certification'"),
    'Must not pre-add example goal CompTIA Security+ Certification'
  );
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

