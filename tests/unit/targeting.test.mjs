import test from 'node:test';
import assert from 'node:assert/strict';
import { pickTarget, proximityTarget, rayVolumeDistance } from '../../src/world/interactions/targeting.ts';
import { storefrontTargets } from '../../src/world/district/targets.ts';
import { district, districtNavigation } from '../../src/world/district/layout.ts';
import { constrainMotion, movementConfig } from '../../src/world/controls/motion.ts';

const box = (id, x, z, angle = 0) => ({ id, x, z, halfWidth: 2, halfDepth: 0.5, angle, minY: 0, maxY: 4, apron: { x, z: z + 3, yaw: angle } });
const near = (a, b, tolerance = 1e-6) => assert.ok(Math.abs(a - b) <= tolerance, `${a} differs from ${b}`);

test('rays hit the box face at the right distance and miss above or beside it', () => {
  const v = box('a', 0, 0);
  near(rayVolumeDistance([0, 1.7, 10], [0, 0, -1], v), 9.5);
  assert.equal(rayVolumeDistance([0, 5, 10], [0, 0, -1], v), null);
  assert.equal(rayVolumeDistance([3, 1.7, 10], [0, 0, -1], v), null);
  assert.equal(rayVolumeDistance([0, 1.7, 10], [0, 0, 1], v), null);
  const rotated = box('r', 0, 0, Math.PI / 2); // faces +X, 4 m deep along Z
  near(rayVolumeDistance([10, 1.7, 1.5], [-1, 0, 0], rotated), 9.5);
});

test('picking returns the nearest registered target only', () => {
  const targets = [box('far', 0, -10), box('near', 0, -2)];
  assert.equal(pickTarget([0, 1.7, 5], [0, 0, -1], targets).id, 'near');
  assert.equal(pickTarget([0, 1.7, 5], [0, 1, 0], targets), null);
  assert.equal(pickTarget([0, 1.7, 5], [0, 0, -1], targets, 3), null);
});

test('proximity focus needs range, a front view, and a forgiving aim', () => {
  const targets = [box('a', 0, 0)];
  assert.equal(proximityTarget(0, 6, 0, targets)?.id, 'a');
  assert.equal(proximityTarget(1.5, 6, 0.3, targets)?.id, 'a');
  assert.equal(proximityTarget(0, 14, 0, targets), null, 'too far');
  assert.equal(proximityTarget(0, 6, Math.PI, targets), null, 'looking away');
  assert.equal(proximityTarget(0, -6, Math.PI, targets), null, 'behind the storefront');
});

test('every storefront has a target whose apron is walkable and focuses that storefront', () => {
  const targets = storefrontTargets();
  assert.equal(targets.length, district.pavilions.length);
  const config = movementConfig(districtNavigation());
  for (const t of targets) {
    const state = { x: t.apron.x, z: t.apron.z, vx: 0, vz: 0, yaw: 0, pitch: 0 }; constrainMotion(state, config);
    near(state.x, t.apron.x); near(state.z, t.apron.z);
    assert.equal(proximityTarget(t.apron.x, t.apron.z, t.apron.yaw, targets)?.id, t.id, `${t.id} apron`);
    const forward = [-Math.sin(t.apron.yaw), 0, -Math.cos(t.apron.yaw)];
    assert.equal(pickTarget([t.apron.x, 1.7, t.apron.z], forward, targets)?.id, t.id, `${t.id} aim`);
  }
});
