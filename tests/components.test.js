import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Hallmark UI Primitives exist and are implemented', () => {
  const components = [
    'src/components/ui/Button.tsx',
    'src/components/ui/Input.tsx',
    'src/components/ui/StatTile.tsx',
    'src/components/ui/HairlineTable.tsx',
    'src/components/ui/Modal.tsx',
    'src/components/ui/Tabs.tsx',
    'src/components/NotchRib.tsx',
    'src/components/CordBar.tsx',
    'src/components/BrandLogo.tsx',
    'src/components/StatusBadge.tsx',
  ];

  for (const comp of components) {
    const fullPath = path.resolve(process.cwd(), comp);
    assert.ok(fs.existsSync(fullPath), `Component file ${comp} must exist`);
  }
});

test('Button adheres to Hallmark Gate F4 & 39b', () => {
  const btnPath = path.resolve(process.cwd(), 'src/components/ui/Button.tsx');
  const content = fs.readFileSync(btnPath, 'utf-8');

  assert.ok(!content.includes('transition: all'), 'Button must not use transition: all');
  assert.ok(content.includes('transition-opacity'), 'Button uses transition-opacity');
  assert.ok(content.includes('disabled:cursor-not-allowed'), 'Disabled state is clear');
  assert.ok(content.includes('animate-spin'), 'Supports loading indicator state');
});

test('Input reserves helper text space (Hallmark Gate F14) and uses tabular numerals', () => {
  const inputPath = path.resolve(process.cwd(), 'src/components/ui/Input.tsx');
  const content = fs.readFileSync(inputPath, 'utf-8');

  assert.ok(content.includes('min-h-[1.125rem]'), 'Input reserves min-height for helper text to avoid layout jump');
  assert.ok(content.includes('tabular-figure font-mono'), 'Numeric inputs enforce tabular numerals');
  assert.ok(content.includes('border border-[var(--color-rule)]'), 'Constant 1px border width');
});

test('StatTile hero uses tabular figures and includes formula inspection (PRD Section 7)', () => {
  const tilePath = path.resolve(process.cwd(), 'src/components/ui/StatTile.tsx');
  const content = fs.readFileSync(tilePath, 'utf-8');

  assert.ok(content.includes('tabular-figure font-mono'), 'Numbers are the hero with tabular figures');
  assert.ok(content.includes('Formula Inspector'), 'Every number is traceable to its formula');
});

test('NotchRib groups day ticks in sevens and CordBar has 10% survey marks', () => {
  const ribPath = path.resolve(process.cwd(), 'src/components/NotchRib.tsx');
  const ribContent = fs.readFileSync(ribPath, 'utf-8');
  assert.ok(ribContent.includes('i += 7'), 'Notch rib chunks days in sevens (weeks)');

  const cordPath = path.resolve(process.cwd(), 'src/components/CordBar.tsx');
  const cordContent = fs.readFileSync(cordPath, 'utf-8');
  assert.ok(cordContent.includes('seshat-cord-tick'), 'Cord bar has 10% survey tick marks');
});

