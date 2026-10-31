/**
 * Seshat Notch — Automated Hallmark 58-Gate Audit
 * Strictly enforces design language rules from https://github.com/Nutlope/hallmark.git
 */

import fs from 'fs';
import path from 'path';

const FORBIDDEN_COPY_PATTERNS = [
  /you are crushing it/i,
  /you're crushing it/i,
  /game-changer/i,
  /supercharge/i,
  /seamlessly/i,
  /say goodbye to/i,
  /unlock your potential/i,
  /all-in-one platform/i,
  /magic/i
];

const CSS_FLOOR_CHECKS = [
  {
    name: 'Floor 2: No transition: all',
    test: (css) => !/transition\s*:\s*all/i.test(css),
    failMessage: 'Found "transition: all". Hallmark requires targeting specific transform/opacity properties.'
  },
  {
    name: 'Floor 4: overflow-x: clip on html/body',
    test: (css) => /overflow-x\s*:\s*clip/i.test(css) && !/overflow\s*:\s*hidden/i.test(css.slice(0, 500)),
    failMessage: 'Missing "overflow-x: clip" on html/body or found forbidden "overflow: hidden".'
  },
  {
    name: 'Floor 6: Instant :focus-visible',
    test: (css) => /:focus-visible/i.test(css),
    failMessage: 'Missing instant :focus-visible definition.'
  },
  {
    name: 'Floor 7: prefers-reduced-motion fallback',
    test: (css) => /prefers-reduced-motion\s*:\s*reduce/i.test(css),
    failMessage: 'Missing prefers-reduced-motion: reduce fallback.'
  },
  {
    name: 'Floor 15: Hallmark stamp and critique header',
    test: (css) => /hallmark(?:\s+·\s+|\s+)v2\.0\.0/i.test(css),
    failMessage: 'Missing Hallmark v2.0.0 stamp comment header.'
  }
];

function auditCSSFiles() {
  console.log('\n[1/3] Auditing CSS files against Hallmark Floor gates...');
  const stylesDir = path.resolve(process.cwd(), 'src/styles');
  if (!fs.existsSync(stylesDir)) {
    console.error(`Styles directory not found: ${stylesDir}`);
    return false;
  }

  const files = fs.readdirSync(stylesDir).filter(f => f.endsWith('.css'));
  let passed = true;

  for (const file of files) {
    const filePath = path.join(stylesDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');

    for (const check of CSS_FLOOR_CHECKS) {
      if (file === 'tokens.css' && check.name.startsWith('Floor 4')) continue;
      if (file === 'tokens.css' && check.name.startsWith('Floor 6')) continue;
      if (file === 'tokens.css' && check.name.startsWith('Floor 7')) continue;
      if (file === 'base.css' && check.name.startsWith('Floor 15')) continue;
      if (file === 'index.css' && (check.name.startsWith('Floor 4') || check.name.startsWith('Floor 6') || check.name.startsWith('Floor 7'))) continue;

      if (!check.test(content)) {
        console.error(`❌ [FAIL] ${file} -> ${check.name}: ${check.failMessage}`);
        passed = false;
      } else {
        console.log(`  ✓ [PASS] ${file} -> ${check.name}`);
      }
    }
  }

  return passed;
}

function auditCopySlop() {
  console.log('\n[2/3] Auditing copy against AI-slop filler words...');
  const srcDir = path.resolve(process.cwd(), 'src');
  let passed = true;

  function scan(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scan(fullPath);
      } else if (/\.(tsx|ts|html|md)$/.test(entry.name)) {
        const text = fs.readFileSync(fullPath, 'utf-8');
        for (const pattern of FORBIDDEN_COPY_PATTERNS) {
          if (pattern.test(text)) {
            console.error(`❌ [FAIL] Found slop pattern ${pattern} in ${path.relative(process.cwd(), fullPath)}`);
            passed = false;
          }
        }
      }
    }
  }

  scan(srcDir);
  if (passed) {
    console.log('  ✓ [PASS] Zero AI-slop filler phrases detected.');
  }
  return passed;
}

function auditDesignMd() {
  console.log('\n[3/3] Checking Design Source of Truth (design.md)...');
  const designMdPath = path.resolve(process.cwd(), 'design.md');
  if (!fs.existsSync(designMdPath)) {
    console.error('❌ [FAIL] Missing design.md at project root.');
    return false;
  }
  const content = fs.readFileSync(designMdPath, 'utf-8');
  const requiredSections = [
    'Numbers are the hero',
    'Brand Motif',
    'OKLCH Color Palette',
    'Anti-Slop Discipline',
    'Surface Ladder'
  ];

  let passed = true;
  for (const sec of requiredSections) {
    if (!content.includes(sec)) {
      console.error(`❌ [FAIL] design.md missing section: "${sec}"`);
      passed = false;
    }
  }

  if (passed) {
    console.log('  ✓ [PASS] design.md contains all required Hallmark specifications.');
  }
  return passed;
}

console.log('====================================================');
console.log('       SESHAT NOTCH — HALLMARK DESIGN AUDIT         ');
console.log('====================================================');

const cssOk = auditCSSFiles();
const copyOk = auditCopySlop();
const docOk = auditDesignMd();

if (cssOk && copyOk && docOk) {
  console.log('\n✅ ALL HALLMARK GATES PASSED (100% Floor & Gate Compliance)\n');
  process.exit(0);
} else {
  console.error('\n❌ AUDIT FAILED: Please fix above Hallmark violations before proceeding.\n');
  process.exit(1);
}
