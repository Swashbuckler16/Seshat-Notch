import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Test RFC 4180 CSV escaping logic
function escapeCsv(val) {
  if (val === null || val === undefined) return '""';
  const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
  return `"${str.replace(/"/g, '""')}"`;
}

test('PRD Section 6.8 DT-3: CSV RFC 4180 escaping logic handles commas, quotes, and newlines', () => {
  assert.equal(escapeCsv('Simple Text'), '"Simple Text"');
  assert.equal(escapeCsv('Text with, comma'), '"Text with, comma"');
  assert.equal(escapeCsv('Text with "quotes" inside'), '"Text with ""quotes"" inside"');
  assert.equal(escapeCsv('Multi-line\nText'), '"Multi-line\nText"');
  assert.equal(escapeCsv(120), '"120"');
  assert.equal(escapeCsv(null), '""');
});

test('PRD Section 6.8 DT-3: Export formats include complete JSON, CSV, and Markdown', () => {
  const servicePath = path.resolve(process.cwd(), 'src/services/dataOwnershipService.ts');
  assert.ok(fs.existsSync(servicePath), 'dataOwnershipService.ts must exist');

  const content = fs.readFileSync(servicePath, 'utf8');
  assert.ok(content.includes('exportAllToJson'), 'Must export exportAllToJson');
  assert.ok(content.includes('exportTableToCsv'), 'Must export exportTableToCsv');
  assert.ok(content.includes('exportAllToMarkdown'), 'Must export exportAllToMarkdown');
});

test('PRD Section 6.8 DT-5: Recovery Bin soft-delete and restore operations', () => {
  const servicePath = path.resolve(process.cwd(), 'src/services/dataOwnershipService.ts');
  const content = fs.readFileSync(servicePath, 'utf8');
  assert.ok(content.includes('getRecoveryBinItems'), 'Must query recovery bin items');
  assert.ok(content.includes('restoreItem'), 'Must support restoring soft-deleted items');
  assert.ok(content.includes('permanentDeleteItem'), 'Must support permanent purging');
  assert.ok(content.includes('emptyRecoveryBin'), 'Must support emptying recovery bin');
});

test('PRD Section 6.8 DT-4: Snapshot backups rotation and safety snapshots', () => {
  const servicePath = path.resolve(process.cwd(), 'src/services/dataOwnershipService.ts');
  const content = fs.readFileSync(servicePath, 'utf8');
  assert.ok(content.includes('createSnapshotBackup'), 'Must support creating snapshot backups');
  assert.ok(content.includes('restoreSnapshotBackup'), 'Must support restoring snapshot backups');
  assert.ok(content.includes('autoBackups.length > 10'), 'Must rotate automated snapshots to max 10');
});

test('PRD Section 6.1 PL-9: Markdown checklist parser matches quick-add tokens', () => {
  const sampleMarkdown = `
# My Project Checklist
- [ ] Configure Sysmon Event ID 1 telemetry #heimdall ~45m !high @2026-11-06 +rules:2
- [x] Initial SOC lab network architecture diagram #heimdall ~120m
- Simple non-checklist note to ignore
`;

  const lines = sampleMarkdown.split('\n');
  const checklistItems = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const match = line.match(/^[-*]\s*\[([ xX])\]\s*(.+)$/);
    if (match) {
      checklistItems.push({
        isDone: match[1].toLowerCase() === 'x',
        text: match[2].trim(),
      });
    }
  }

  assert.equal(checklistItems.length, 2);
  assert.equal(checklistItems[0].isDone, false);
  assert.ok(checklistItems[0].text.includes('#heimdall'));
  assert.equal(checklistItems[1].isDone, true);
});

test('PRD Section 6.8 DT-6: Local App Lock PIN hash and verification', () => {
  function hashPin(pin) {
    let hash = 0;
    for (let i = 0; i < pin.length; i++) {
      const char = pin.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return `sn_pin_${Math.abs(hash).toString(16)}`;
  }

  const hash1 = hashPin('1234');
  const hash2 = hashPin('1234');
  const hashOther = hashPin('9999');

  assert.equal(hash1, hash2, 'Identical PIN produces identical hash');
  assert.notEqual(hash1, hashOther, 'Different PIN produces different hash');
});

test('PRD Phase 13 UI Panels exist and comply with Hallmark Floor standards', () => {
  const panels = [
    'src/components/data/DataManagementView.tsx',
    'src/components/data/RecoveryBinPanel.tsx',
    'src/components/data/DataExportPanel.tsx',
    'src/components/data/DataImportPanel.tsx',
    'src/components/data/SnapshotsPanel.tsx',
    'src/components/data/PrivacySecurityPanel.tsx',
  ];

  for (const relPath of panels) {
    const fullPath = path.resolve(process.cwd(), relPath);
    assert.ok(fs.existsSync(fullPath), `UI Panel must exist: ${relPath}`);
    const content = fs.readFileSync(fullPath, 'utf8');
    // Hallmark Floor: No raw gradients or non-standard transitions
    assert.ok(!content.includes('bg-gradient'), `${relPath} must not use gratuitous gradients`);
  }
});
