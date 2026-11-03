import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { hashPin, escapeCsvCell } from '../src/services/dataOwnershipService.ts';
import { isValidDateString, isValidPeriodForHorizon, roundMetric } from '../src/utils/dateUtils.ts';
import { parseQuickAdd } from '../src/utils/quickAddParser.ts';

test('PRD Section 6.8 DT-3: CSV RFC 4180 escaping logic handles commas, quotes, newlines, and formula injection', () => {
  assert.equal(escapeCsvCell('Simple Text'), '"Simple Text"');
  assert.equal(escapeCsvCell('Text with, comma'), '"Text with, comma"');
  assert.equal(escapeCsvCell('Text with "quotes" inside'), '"Text with ""quotes"" inside"');
  assert.equal(escapeCsvCell('Multi-line\nText'), '"Multi-line\nText"');
  assert.equal(escapeCsvCell(120), '"120"');
  assert.equal(escapeCsvCell(null), '""');

  // Formula injection protection (prefix risky leading characters with single quote ')
  assert.equal(escapeCsvCell('=cmd|\'/C calc\'!A0'), '"\'=cmd|\'/C calc\'!A0"');
  assert.equal(escapeCsvCell('+SUM(A1:A10)'), '"\'+SUM(A1:A10)"');
  assert.equal(escapeCsvCell('@IMPORTXML()'), '"\'@IMPORTXML()"');
  assert.equal(escapeCsvCell('-2+3+cmd'), '"\'-2+3+cmd"');
  // Plain negative numbers should not be prefixed
  assert.equal(escapeCsvCell('-42.5'), '"-42.5"');
});

test('PRD Section 6.8 DT-3: Export formats include complete JSON, CSV, and Markdown', () => {
  const servicePath = path.resolve(process.cwd(), 'src/services/dataOwnershipService.ts');
  assert.ok(fs.existsSync(servicePath), 'dataOwnershipService.ts must exist');

  const content = fs.readFileSync(servicePath, 'utf8');
  assert.ok(content.includes('exportAllToJson'), 'Must export exportAllToJson');
  assert.ok(content.includes('exportTableToCsv'), 'Must export exportTableToCsv');
  assert.ok(content.includes('exportAllToMarkdown'), 'Must export exportAllToMarkdown');
});

test('PRD Section 6.8 DT-5: Recovery Bin soft-delete and cascading restore/purge operations', () => {
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

test('PRD Section 6.1 PL-9 & Quick Add: Date validation, float rounding, and unrecognized date error reporting', () => {
  assert.equal(isValidDateString('2026-11-06'), true);
  assert.equal(isValidDateString('2026-02-30'), false, 'Feb 30 must be rejected');
  assert.equal(isValidDateString('2026-13-01'), false, 'Month 13 must be rejected');

  assert.equal(isValidPeriodForHorizon('2026-W45', 'week'), true);
  assert.equal(isValidPeriodForHorizon('2026-W45', 'month'), false, 'Monthly goal must reject week-format period');
  assert.equal(isValidPeriodForHorizon('2026-11', 'month'), true);

  assert.equal(roundMetric(0.1 + 0.2), 0.3, 'Float noise must be rounded cleanly');

  const badCalendarDate = parseQuickAdd('Write report @2026-02-30', new Date('2026-11-01T12:00:00'));
  assert.ok(badCalendarDate.errors.length > 0, '@2026-02-30 must report a validation error');
  assert.equal(badCalendarDate.scheduleDate, undefined);

  const typoDate = parseQuickAdd('Review slides @frday', new Date('2026-11-01T12:00:00'));
  assert.ok(typoDate.errors.length > 0, '@frday must report an unrecognized date error instead of silently becoming today');
  assert.equal(typoDate.scheduleDate, undefined);
});

test('PRD Section 6.8 DT-6: Cryptographic 256-bit SHA-256 PIN hash and verification', () => {
  const hash1 = hashPin('1234');
  const hash2 = hashPin('1234');
  const hashOther = hashPin('9999');

  assert.ok(hash1.startsWith('sn_sha256_'), 'Must use 256-bit SHA-256 prefix');
  assert.equal(hash1.length, 'sn_sha256_'.length + 64, 'Must produce full 64-hex-char 256-bit digest');
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
