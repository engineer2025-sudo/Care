import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validManualVital, manualVitalRow, formatManualVital } from '../src/lib/vitalRules.js';

test('blood pressure needs integer bounds and first >= second', () => {
  assert.equal(validManualVital('bp', 120, 80), true);
  assert.equal(validManualVital('bp', 1, 1), true);
  assert.equal(validManualVital('bp', 400, 300), true);
  assert.equal(validManualVital('bp', 0, 80), false);
  assert.equal(validManualVital('bp', 401, 80), false);
  assert.equal(validManualVital('bp', 120, 0), false);
  assert.equal(validManualVital('bp', 120, 301), false);
  assert.equal(validManualVital('bp', 80, 120), false);
  assert.equal(validManualVital('bp', 120.5, 80), false);
  assert.equal(validManualVital('bp', 120, null), false);
});

test('oxygen is a single 1..100 integer percent', () => {
  assert.equal(validManualVital('oxygen', 98, null), true);
  assert.equal(validManualVital('oxygen', 98, undefined), true);
  assert.equal(validManualVital('oxygen', 1, null), true);
  assert.equal(validManualVital('oxygen', 100, null), true);
  assert.equal(validManualVital('oxygen', 0, null), false);
  assert.equal(validManualVital('oxygen', 101, null), false);
  assert.equal(validManualVital('oxygen', 98, 40), false);
  assert.equal(validManualVital('oxygen', 98.5, null), false);
});

test('unknown kinds are rejected', () => {
  assert.equal(validManualVital('heart', 120, 80), false);
  assert.equal(validManualVital('', 120, 80), false);
});

test('manualVitalRow builds a removable record', () => {
  const row = manualVitalRow('bp', 120, 80);
  assert.equal(row.kind, 'bp');
  assert.equal(row.first, 120);
  assert.equal(row.second, 80);
  assert.ok(row.id.length > 0);
  assert.ok(/^\d{4}-\d{2}-\d{2}T/.test(row.at));
  const oxy = manualVitalRow('oxygen', 97);
  assert.equal(oxy.kind, 'oxygen');
  assert.equal(oxy.second, undefined);
});

test('formatManualVital shows the entered value with units only', () => {
  assert.equal(formatManualVital({ kind: 'bp', first: 120, second: 80 }), '120/80 mmHg');
  assert.equal(formatManualVital({ kind: 'oxygen', first: 97 }), '97% SpO₂');
});
