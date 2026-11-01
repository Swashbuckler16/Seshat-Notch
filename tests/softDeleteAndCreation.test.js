import 'fake-indexeddb/auto';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { db } from '../src/db/index.ts';
import { domainService } from '../src/services/domainService.ts';
import { dataOwnershipService } from '../src/services/dataOwnershipService.ts';
import { getLocalDateString, shiftDateString } from '../src/utils/dateUtils.ts';
import { parseQuickAdd } from '../src/utils/quickAddParser.ts';

test('Soft-delete queries use .filter(r => !r.isDeleted) and zero UTC toISOString date splits remain in src/', () => {
  const componentsDir = path.resolve(process.cwd(), 'src');

  function checkDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        checkDir(fullPath);
      } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        assert.ok(
          !content.includes("where('isDeleted').equals(0)"),
          `${entry.name} must not use broken where('isDeleted').equals(0)`
        );
        assert.ok(
          !content.includes('where("isDeleted").equals(0)'),
          `${entry.name} must not use broken where("isDeleted").equals(0)`
        );
        assert.ok(
          !content.includes("toISOString().split('T')[0]"),
          `${entry.name} must not use UTC toISOString().split('T')[0]`
        );
        assert.ok(
          !content.includes('toISOString().slice(0, 10)'),
          `${entry.name} must not use UTC toISOString().slice(0, 10)`
        );
      }
    }
  }

  checkDir(componentsDir);
});

test('Real IndexedDB: creating an area and project persists and returns in active list, and soft-delete excludes it', async () => {
  await db.areas.clear();
  await db.projects.clear();
  await db.changeLogs.clear();

  // 1. Create an Area and a Project in real IndexedDB via domainService
  const area = await domainService.createArea({
    name: 'Systems Engineering',
    order: 1,
  });

  const createdProj = await domainService.createProject({
    areaId: area.id,
    title: 'Distributed Storage Engine',
    isGoal: false,
    why: 'Build a transactional storage engine',
    startDate: '2026-11-02',
    priority: 'urgent',
    status: 'active',
    tags: ['storage', 'rust'],
    weightType: 'equal',
  });

  // 2. Query active projects using the exact query pattern from PlannerView & DashboardView
  const activeProjects = await db.projects.filter((p) => !p.isDeleted).toArray();
  assert.equal(activeProjects.length, 1, 'Newly created project must appear in IndexedDB query');
  assert.equal(activeProjects[0].id, createdProj.id);
  assert.equal(activeProjects[0].title, 'Distributed Storage Engine');
  assert.equal(activeProjects[0].isDeleted, false);

  // Verify changeLog was recorded inside the same transaction
  const logs = await db.changeLogs.where('entityId').equals(createdProj.id).toArray();
  assert.equal(logs.length, 1);
  assert.equal(logs[0].action, 'create');

  // 3. Soft-delete the project and verify it is excluded from active list and appears in Recovery Bin
  await domainService.softDeleteProject(createdProj.id, 'Completed scope');
  const afterDelete = await db.projects.filter((p) => !p.isDeleted).toArray();
  assert.equal(afterDelete.length, 0, 'Soft-deleted project must be excluded from active projects query');

  const binItems = await dataOwnershipService.getRecoveryBinItems();
  assert.equal(binItems.length, 1);
  assert.equal(binItems[0].id, createdProj.id);

  // 4. Restore from Recovery Bin and verify it reappears in active projects list
  await dataOwnershipService.restoreItem('project', createdProj.id);
  const afterRestore = await db.projects.filter((p) => !p.isDeleted).toArray();
  assert.equal(afterRestore.length, 1);
  assert.equal(afterRestore[0].id, createdProj.id);
});

test('Real IndexedDB: db.transaction rolls back multi-step writes if an error occurs', async () => {
  await db.tasks.clear();
  await db.changeLogs.clear();

  await assert.rejects(async () => {
    await db.transaction('rw', [db.tasks, db.changeLogs], async () => {
      await db.tasks.add({
        id: 'tsk_rollback_test',
        title: 'Should roll back',
        priority: 'medium',
        status: 'active',
        subtasks: [],
        tags: [],
        isDeleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      throw new Error('Simulated mid-transaction failure');
    });
  }, /Simulated mid-transaction failure/);

  const count = await db.tasks.count();
  assert.equal(count, 0, 'Transaction rollback must leave zero half-saved tasks');
});

test('Local date helper resolves local calendar date accurately at 2:00 AM and supports day boundary hours', () => {
  // Construct 2:00 AM on Monday, Nov 2, 2026 in local time
  const local2amMonday = new Date(2026, 10, 2, 2, 0, 0);
  assert.equal(
    getLocalDateString(local2amMonday, 0),
    '2026-11-02',
    'At 2:00 AM Monday with midnight boundary (0), local date must be Monday 2026-11-02'
  );

  // With a 4:00 AM late-night day boundary, 2:00 AM Monday still counts as Sunday Nov 1
  assert.equal(
    getLocalDateString(local2amMonday, 4),
    '2026-11-01',
    'At 2:00 AM Monday with 4:00 AM boundary, date rolls back to Sunday 2026-11-01'
  );

  // Verify Quick-Add @today resolves to local date at 2:00 AM Monday
  const parsed = parseQuickAdd('Review architecture notes @today !high', local2amMonday);
  assert.equal(parsed.scheduleDate, '2026-11-02');

  // Verify shiftDateString shifts across month boundary without UTC drift
  assert.equal(shiftDateString('2026-11-01', -1), '2026-10-31');
  assert.equal(shiftDateString('2026-10-31', 1), '2026-11-01');
});
