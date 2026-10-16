import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CARE_BASICS, searchHealthReferences } from '../src/lib/healthReferences.js';

test('care basics are the shared cross-platform reference set', () => {
  assert.equal(CARE_BASICS.length, 5);
  for (const entry of CARE_BASICS) {
    assert.ok(entry.title.length > 0);
    assert.ok(entry.excerpt.length > 40);
    assert.ok(entry.publisher.length > 0);
    assert.ok(entry.url.startsWith('https://'));
  }
});

test('search matches title and excerpt terms', () => {
  assert.equal(searchHealthReferences('medication').length, 2);
  assert.equal(searchHealthReferences('trip hazards')[0].title, 'Make the home easier to move through');
  assert.equal(searchHealthReferences('emergency')[0].title, 'Urgent symptoms need human help');
  assert.equal(searchHealthReferences('autistic')[0].title, 'Make support sensory-aware and respectful');
});

test('empty or tiny queries return nothing', () => {
  assert.deepEqual(searchHealthReferences(''), []);
  assert.deepEqual(searchHealthReferences('   '), []);
  assert.deepEqual(searchHealthReferences('a'), []);
  assert.deepEqual(searchHealthReferences('zzz-no-match'), []);
});
