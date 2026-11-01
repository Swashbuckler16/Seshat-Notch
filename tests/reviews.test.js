import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('PRD 6.5 & 6.6: Domain service exports Carry-Over Inbox and Review methods', () => {
  const servicePath = path.resolve(process.cwd(), 'src/services/domainService.ts');
  assert.ok(fs.existsSync(servicePath), 'domainService.ts must exist');

  const content = fs.readFileSync(servicePath, 'utf-8');
  assert.ok(content.includes('rescheduleTask'), 'Must implement rescheduleTask');
  assert.ok(content.includes('splitTask'), 'Must implement splitTask');
  assert.ok(content.includes('dropTask'), 'Must implement dropTask');
  assert.ok(content.includes('deferTaskToBacklog'), 'Must implement deferTaskToBacklog');
  assert.ok(content.includes('batchRescheduleTasks'), 'Must implement batchRescheduleTasks');
  assert.ok(content.includes('createReview'), 'Must implement createReview');
  assert.ok(content.includes('updateReview'), 'Must implement updateReview');
});

test('PRD TR-3: dropTask enforces non-empty explicit reason', () => {
  const servicePath = path.resolve(process.cwd(), 'src/services/domainService.ts');
  const content = fs.readFileSync(servicePath, 'utf-8');

  assert.ok(
    content.includes("!reason || reason.trim().length === 0"),
    'Must check that reason is non-empty when dropping task'
  );
});

test('PRD 6.5: Carry-Over Inbox and Triage Modals exist', () => {
  const inboxPath = path.resolve(process.cwd(), 'src/components/inbox/CarryOverInbox.tsx');
  const dropModalPath = path.resolve(process.cwd(), 'src/components/inbox/DropReasonModal.tsx');
  const splitModalPath = path.resolve(process.cwd(), 'src/components/inbox/SplitTaskModal.tsx');

  assert.ok(fs.existsSync(inboxPath), 'CarryOverInbox.tsx must exist');
  assert.ok(fs.existsSync(dropModalPath), 'DropReasonModal.tsx must exist');
  assert.ok(fs.existsSync(splitModalPath), 'SplitTaskModal.tsx must exist');

  const inboxContent = fs.readFileSync(inboxPath, 'utf-8');
  assert.ok(inboxContent.includes('rescheduleTask'), 'Inbox must support rescheduling');
  assert.ok(inboxContent.includes('deferTask'), 'Inbox must support moving to backlog');
  assert.ok(inboxContent.includes('carriedOverFromDate'), 'Inbox must display carried over provenance');
});

test('PRD 6.6: Periodic Reviews and Reflection Ledger exist', () => {
  const editorPath = path.resolve(process.cwd(), 'src/components/reviews/ReviewEditor.tsx');
  const historyPath = path.resolve(process.cwd(), 'src/components/reviews/ReviewHistory.tsx');
  const viewPath = path.resolve(process.cwd(), 'src/components/reviews/ReviewsView.tsx');

  assert.ok(fs.existsSync(editorPath), 'ReviewEditor.tsx must exist');
  assert.ok(fs.existsSync(historyPath), 'ReviewHistory.tsx must exist');
  assert.ok(fs.existsSync(viewPath), 'ReviewsView.tsx must exist');

  const editorContent = fs.readFileSync(editorPath, 'utf-8');
  assert.ok(editorContent.includes('energyRating'), 'Must capture energy rating');
  assert.ok(editorContent.includes('moodRating'), 'Must capture mood rating');
  assert.ok(editorContent.includes('topThreeTomorrow') || editorContent.includes('topThree'), 'Must capture top priorities');
});

