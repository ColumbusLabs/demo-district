import test from 'node:test';
import assert from 'node:assert/strict';
import { districtEntries, searchDistrict } from '../../src/ui/search.ts';

const entries = districtEntries();

test('search matches buildings by category and demos by title, creator, and model', () => {
  assert.equal(searchDistrict(entries, 'GAMES')[0]?.title, 'Games');
  assert.equal(searchDistrict(entries, 'GAMES')[0]?.projectId, undefined, 'a building result');
  assert.equal(searchDistrict(entries, 'focus')[0]?.projectId, 'plane-of-focus');
  assert.equal(searchDistrict(entries, 'opus 5.5')[0]?.title, 'The Plane of Focus');
  assert.equal(searchDistrict(entries, '@ryansael')[0]?.slot, 'east-gate');
  assert.equal(searchDistrict(entries, 'building').length, 6, 'limited to six results');
});
test('every word must match, blank queries return nothing, and title prefixes rank first', () => {
  assert.deepEqual(searchDistrict(entries, 'music comet'), []);
  assert.deepEqual(searchDistrict(entries, '   '), []);
  // "Learning" (the building) starts with "l"; the demo inside it only mentions it in its meta.
  assert.equal(searchDistrict(entries, 'learning')[0]?.title, 'Learning');
  assert.equal(searchDistrict(entries, 'learning')[1]?.title, 'The Plane of Focus');
});
test('every building and demo is reachable by its own title', () => {
  for (const entry of entries) {
    const hit = searchDistrict(entries, entry.title)[0];
    assert.equal(hit?.slot, entry.slot); assert.equal(hit?.projectId, entry.projectId);
  }
});
