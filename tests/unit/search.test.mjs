import test from 'node:test';
import assert from 'node:assert/strict';
import { searchProjects } from '../../src/ui/search.ts';
import { showcase } from '../../src/data/showcase.ts';

test('search matches title, category, creator, and model, case-insensitively', () => {
  assert.equal(searchProjects(showcase, 'tidepool')[0]?.title, 'Tidepool Synth');
  assert.equal(searchProjects(showcase, 'GAMES')[0]?.category, 'Games');
  assert.equal(searchProjects(showcase, 'sample creator').length, 6, 'limited to six results');
  assert.ok(searchProjects(showcase, 'model').length > 0);
});
test('every word must match, blank queries return nothing, and title prefixes rank first', () => {
  assert.deepEqual(searchProjects(showcase, 'music comet'), []);
  assert.deepEqual(searchProjects(showcase, '   '), []);
  const ranked = searchProjects(showcase, 'o', 8).map((p) => p.title);
  assert.equal(ranked[0], 'Orbit Primer');
});
test('every sample listing is reachable by its own title', () => {
  for (const project of showcase) assert.equal(searchProjects(showcase, project.title)[0]?.id, project.id);
});
