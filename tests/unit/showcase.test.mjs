import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSummary, buildings, categories, demoCount, destinationHost, projects, projectsInBuilding } from '../../src/data/showcase.ts';
import { district } from '../../src/world/district/layout.ts';
import { exhibitKind } from '../../src/world/district/exhibits.ts';

test('every pavilion is one category building, each category once', () => {
  assert.deepEqual(buildings.map((b) => b.slot).sort(), district.pavilions.map((p) => p.id).sort());
  assert.deepEqual(buildings.map((b) => b.category).sort(), [...categories].sort());
});

test('storefront windows follow the building category, not the demos inside', () => {
  for (const b of buildings) assert.equal(exhibitKind(b.slot), categories.indexOf(b.category));
});

test('demos sit in a real building, link out over https, and credit a public handle', () => {
  assert.equal(new Set(projects.map((p) => p.id)).size, projects.length);
  for (const p of projects) {
    assert.ok(buildings.some((b) => b.slot === p.slot), `${p.id} is in a building`);
    assert.equal(new URL(p.projectUrl).protocol, 'https:');
    assert.match(p.creator, /^@\w+$/);
  }
});

test('The Plane of Focus is in the Learning building at the east gate', () => {
  const p = projects.find((q) => q.id === 'plane-of-focus');
  assert.equal(buildings.find((b) => b.slot === p.slot)?.category, 'Learning');
  assert.deepEqual(projectsInBuilding('east-gate').map((q) => q.id), ['plane-of-focus']);
  assert.equal(demoCount('east-gate'), '1 demo');
  assert.equal(demoCount('west-promenade'), 'Coming soon');
  assert.equal(destinationHost(p.projectUrl), 'lens.lab.sael.net');
  assert.equal(buildSummary(p.build), '1 h 26 min · one shot · $25.66 API');
});
