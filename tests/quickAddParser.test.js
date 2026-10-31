import test from 'node:test';
import assert from 'node:assert/strict';
import { parseQuickAdd, parseEstimateToken, parsePriorityToken, parseMetricToken, resolveDateToken } from '../src/utils/quickAddParser.ts';

test('PRD Section 6.9 Official Grammar Example parses accurately', () => {
  const refDate = new Date('2026-10-31T09:00:00.000Z'); // Saturday
  const input = 'Write Kerberoasting detection card #heimdall >week3 ~90m !high @fri +rules:2';

  const parsed = parseQuickAdd(input, refDate);

  assert.equal(parsed.title, 'Write Kerberoasting detection card');
  assert.equal(parsed.projectQuery, 'heimdall');
  assert.equal(parsed.milestoneQuery, 'week3');
  assert.equal(parsed.estimateMinutes, 90);
  assert.equal(parsed.priority, 'high');
  assert.equal(parsed.targetMetric?.unit, 'rules');
  assert.equal(parsed.targetMetric?.value, 2);
  assert.ok(parsed.scheduleDate?.startsWith('2026-11-'), 'Resolves to upcoming Friday in November');
});

test('Time estimate parser handles minutes, fractional hours, and raw hours', () => {
  assert.equal(parseEstimateToken('~90m'), 90);
  assert.equal(parseEstimateToken('~45min'), 45);
  assert.equal(parseEstimateToken('~1.5h'), 90);
  assert.equal(parseEstimateToken('~2h'), 120);
  assert.equal(parseEstimateToken('~60'), 60);
});

test('Priority token parser maps !urgent, !high, !med, !low', () => {
  assert.equal(parsePriorityToken('!urgent'), 'urgent');
  assert.equal(parsePriorityToken('!high'), 'high');
  assert.equal(parsePriorityToken('!med'), 'medium');
  assert.equal(parsePriorityToken('!medium'), 'medium');
  assert.equal(parsePriorityToken('!low'), 'low');
});

test('Date token resolver maps @today, @tomorrow, and exact ISO dates', () => {
  const ref = new Date('2026-10-31T09:00:00.000Z');

  const today = resolveDateToken('today', ref);
  assert.equal(today.dateStr, '2026-10-31');

  const tomorrow = resolveDateToken('tomorrow', ref);
  assert.equal(tomorrow.dateStr, '2026-11-01');

  const exact = resolveDateToken('2026-11-14', ref);
  assert.equal(exact.dateStr, '2026-11-14');
});

test('Target metric parser handles +unit:value, +value:unit, and +count', () => {
  assert.deepEqual(parseMetricToken('+rules:2'), { unit: 'rules', value: 2 });
  assert.deepEqual(parseMetricToken('+50:pages'), { unit: 'pages', value: 50 });
  assert.deepEqual(parseMetricToken('+5'), { unit: 'count', value: 5 });
});

test('Parser gracefully falls back on freeform text without tokens', () => {
  const parsed = parseQuickAdd('Pick up dry cleaning');
  assert.equal(parsed.title, 'Pick up dry cleaning');
  assert.equal(parsed.priority, 'medium');
  assert.equal(parsed.projectQuery, undefined);
  assert.equal(parsed.tokens.length, 0);
});

