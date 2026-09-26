import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSummary, destinationHost, exhibitForSlot, showcase } from '../../src/data/showcase.ts';
import { district } from '../../src/world/district/layout.ts';

test('every pavilion has exactly one listing and every listing has a pavilion and exhibit', () => {
  const slots = district.pavilions.map((p) => p.id);
  assert.deepEqual([...showcase.map((p) => p.slot)].sort(), [...slots].sort());
  assert.equal(new Set(showcase.map((p) => p.id)).size, showcase.length);
  for (const slot of slots) assert.ok(exhibitForSlot(slot));
});

test('real listings link out over https with a source post and a public handle; samples link nowhere', () => {
  const real = showcase.filter((p) => !p.sample);
  assert.ok(real.length >= 1);
  for (const p of real) {
    for (const url of [p.projectUrl, p.sourcePostUrl]) {
      assert.ok(url, `${p.id} needs a project URL and source post`);
      assert.equal(new URL(url).protocol, 'https:');
    }
    assert.match(p.creator, /^@\w+$/, 'real creators are credited by public handle');
  }
  for (const p of showcase.filter((q) => q.sample)) {
    assert.equal(p.projectUrl, undefined); assert.equal(p.sourcePostUrl, undefined); assert.equal(p.build, undefined);
  }
});

test('The Plane of Focus is the first real exhibit, at the east gate', () => {
  const p = showcase.find((q) => q.id === 'plane-of-focus');
  assert.equal(p?.slot, 'east-gate');
  assert.equal(p?.sample, false);
  assert.equal(exhibitForSlot('east-gate'), 'Lens');
  assert.equal(destinationHost(p.projectUrl), 'lens.lab.sael.net');
  assert.equal(buildSummary(p.build), '1 h 26 min · one shot · $25.66 API');
});
