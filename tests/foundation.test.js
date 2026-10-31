import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Hallmark Design Source of Truth exists and is complete', () => {
  const designPath = path.resolve(process.cwd(), 'design.md');
  assert.ok(fs.existsSync(designPath), 'design.md must exist at project root');

  const content = fs.readFileSync(designPath, 'utf-8');
  assert.ok(content.includes('Numbers are the hero'), 'Must define numbers are hero');
  assert.ok(content.includes('The Notch and the Cord'), 'Must define brand motif');
  assert.ok(content.includes('Anti-Slop Discipline'), 'Must enforce anti-slop rules');
  assert.ok(content.includes('OKLCH Color Palette'), 'Must define OKLCH palette');
});

test('Tokens CSS has Hallmark stamp and OKLCH color definitions', () => {
  const tokensPath = path.resolve(process.cwd(), 'src/styles/tokens.css');
  assert.ok(fs.existsSync(tokensPath), 'tokens.css must exist');

  const content = fs.readFileSync(tokensPath, 'utf-8');
  assert.ok(content.includes('hallmark v2.0.0'), 'Must contain hallmark v2.0.0 stamp');
  assert.ok(content.includes('--color-paper: oklch('), 'Must define paper in oklch');
  assert.ok(content.includes('--color-accent: oklch('), 'Must define accent in oklch');
  assert.ok(content.includes('[data-mode="dark"]'), 'Must include dark mode re-derivation');
});

test('Base CSS enforces non-negotiable Hallmark Floor rules', () => {
  const basePath = path.resolve(process.cwd(), 'src/styles/base.css');
  assert.ok(fs.existsSync(basePath), 'base.css must exist');

  const content = fs.readFileSync(basePath, 'utf-8');
  assert.ok(content.includes('overflow-x: clip'), 'Floor 4: overflow-x: clip required');
  assert.ok(!content.includes('transition: all'), 'Floor 2: transition: all is banned');
  assert.ok(content.includes(':focus-visible'), 'Floor 6: :focus-visible required');
  assert.ok(content.includes('prefers-reduced-motion: reduce'), 'Floor 7: reduced-motion required');
  assert.ok(content.includes('tabular-nums'), 'Tabular numerals required for numbers');
});

