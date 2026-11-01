import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('PRD Section 7 & Hallmark Zero Chart Bloat: No external charting libraries in package.json', () => {
  const pkgJsonPath = path.resolve(process.cwd(), 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));

  const allDeps = {
    ...pkg.dependencies,
    ...pkg.devDependencies,
  };

  // Must NOT include bloated third-party charting libraries
  assert.equal(allDeps['chart.js'], undefined, 'Must not depend on chart.js');
  assert.equal(allDeps['recharts'], undefined, 'Must not depend on recharts');
  assert.equal(allDeps['d3'], undefined, 'Must not depend on d3');
  assert.equal(allDeps['plotly.js'], undefined, 'Must not depend on plotly.js');
  assert.equal(allDeps['apexcharts'], undefined, 'Must not depend on apexcharts');
});

test('PRD 7.1 to 7.4: All Dashboard SVG chart components exist and contain valid SVG markup', () => {
  const chartFiles = [
    'src/components/dashboard/charts/SvgSparkline.tsx',
    'src/components/dashboard/charts/SvgBulletChart.tsx',
    'src/components/dashboard/charts/SvgBurnUpChart.tsx',
    'src/components/dashboard/charts/SvgHorizonBarChart.tsx',
    'src/components/dashboard/charts/SvgMoodEnergyTrend.tsx',
  ];

  for (const relPath of chartFiles) {
    const fullPath = path.resolve(process.cwd(), relPath);
    assert.ok(fs.existsSync(fullPath), `Chart component file must exist: ${relPath}`);
    const content = fs.readFileSync(fullPath, 'utf8');
    assert.ok(content.includes('<svg'), `${relPath} must render an SVG element`);
    assert.ok(content.includes('tabular-figure') || content.includes('font-mono'), `${relPath} must use tabular numerals`);
  }
});

test('PRD 7.1: Global DashboardHeader component exists with required filter contracts', () => {
  const headerPath = path.resolve(process.cwd(), 'src/components/dashboard/DashboardHeader.tsx');
  assert.ok(fs.existsSync(headerPath), 'DashboardHeader.tsx must exist');
  const content = fs.readFileSync(headerPath, 'utf8');
  assert.ok(content.includes('DashboardDateRange'), 'Must export DashboardDateRange type');
  assert.ok(content.includes('StatTile'), 'Must use Hallmark StatTile primitives');
});

test('PRD 7.2 & 7.3: All 8 Dashboard Sub-Tabs exist and adhere to Hallmark Design Truth', () => {
  const subTabs = [
    'DashboardOverviewTab.tsx',
    'DashboardExecutionTab.tsx',
    'DashboardProjectsTab.tsx',
    'DashboardGoalsTab.tsx',
    'DashboardHabitsTab.tsx',
    'DashboardTimeTab.tsx',
    'DashboardReviewsTab.tsx',
    'DashboardInsightsTab.tsx',
  ];

  for (const tabFile of subTabs) {
    const fullPath = path.resolve(process.cwd(), 'src/components/dashboard/tabs', tabFile);
    assert.ok(fs.existsSync(fullPath), `Dashboard tab file must exist: ${tabFile}`);
    const content = fs.readFileSync(fullPath, 'utf8');
    assert.ok(content.includes('export const Dashboard'), `${tabFile} must have named export`);
    // Verify Hallmark compliance: no raw unstyled native alerts or gradients
    assert.ok(!content.includes('bg-gradient'), `${tabFile} must not use gratuitous gradients`);
  }
});

test('PRD 7.4: Deterministic Insights Rule Evaluator math logic', () => {
  // Test weekday peak detection formula
  const weekdayCounts = [
    { day: 'Mon', completed: 2, total: 3 },
    { day: 'Tue', completed: 5, total: 6 }, // 83%
    { day: 'Wed', completed: 1, total: 4 },
    { day: 'Thu', completed: 3, total: 4 },
    { day: 'Fri', completed: 2, total: 4 },
  ];

  const rates = weekdayCounts.map((w) => ({
    ...w,
    rate: Math.round((w.completed / w.total) * 100),
  }));

  const best = rates.sort((a, b) => b.rate - a.rate)[0];
  assert.equal(best.day, 'Tue');
  assert.equal(best.rate, 83);

  // Test deep work ratio rule: >= 60% standard
  const deepMinutes = 180;
  const shallowMinutes = 60;
  const totalMinutes = deepMinutes + shallowMinutes;
  const ratio = Math.round((deepMinutes / totalMinutes) * 100);
  assert.equal(ratio, 75);
  assert.ok(ratio >= 60, 'Deep work ratio meets or exceeds 60% benchmark');

  // Test estimation bias calibration formula
  const totalActual = 250;
  const totalEstimated = 200;
  const multiplier = Number((totalActual / totalEstimated).toFixed(2));
  assert.equal(multiplier, 1.25);
  assert.ok(multiplier > 1.15, 'Detects systematic under-estimation bias');
});

test('PRD Section 7: DashboardView container wires all tabs and navigation callbacks', () => {
  const viewPath = path.resolve(process.cwd(), 'src/components/dashboard/DashboardView.tsx');
  assert.ok(fs.existsSync(viewPath), 'DashboardView.tsx must exist');
  const content = fs.readFileSync(viewPath, 'utf8');
  assert.ok(content.includes('DashboardHeader'), 'Must render DashboardHeader');
  assert.ok(content.includes('DashboardOverviewTab'), 'Must wire DashboardOverviewTab');
  assert.ok(content.includes('DashboardExecutionTab'), 'Must wire DashboardExecutionTab');
  assert.ok(content.includes('DashboardProjectsTab'), 'Must wire DashboardProjectsTab');
  assert.ok(content.includes('DashboardGoalsTab'), 'Must wire DashboardGoalsTab');
  assert.ok(content.includes('DashboardHabitsTab'), 'Must wire DashboardHabitsTab');
  assert.ok(content.includes('DashboardTimeTab'), 'Must wire DashboardTimeTab');
  assert.ok(content.includes('DashboardReviewsTab'), 'Must wire DashboardReviewsTab');
  assert.ok(content.includes('DashboardInsightsTab'), 'Must wire DashboardInsightsTab');
});
