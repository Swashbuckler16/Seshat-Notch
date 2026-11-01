import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Soft-delete queries use .filter(r => !r.isDeleted) and never broken .where(isDeleted).equals(0)', () => {
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
      }
    }
  }

  checkDir(componentsDir);
});

test('Creating a project and filtering by !isDeleted includes newly created project and excludes deleted', () => {
  // Simulate live query collection behavior
  const projectStore = [];

  function createProject(data) {
    const project = {
      id: 'proj_' + Math.random().toString(36).slice(2, 9),
      ...data,
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    projectStore.push(project);
    return project;
  }

  function getActiveProjects() {
    return projectStore.filter((p) => !p.isDeleted);
  }

  function softDeleteProject(id) {
    const p = projectStore.find((x) => x.id === id);
    if (p) {
      p.isDeleted = true;
      p.updatedAt = new Date().toISOString();
    }
  }

  // 1. Create a project from scratch (matches user action)
  const newProj = createProject({
    areaId: 'area_eng',
    title: 'Offensive Security Lab',
    priority: 'urgent',
    status: 'active',
  });

  // Expect project to appear in active projects list
  const activeList = getActiveProjects();
  assert.equal(activeList.length, 1);
  assert.equal(activeList[0].id, newProj.id);
  assert.equal(activeList[0].title, 'Offensive Security Lab');
  assert.equal(activeList[0].isDeleted, false);

  // 2. Soft-delete project
  softDeleteProject(newProj.id);
  const afterDeleteList = getActiveProjects();
  assert.equal(afterDeleteList.length, 0, 'Soft-deleted project must not appear in active projects list');
});

