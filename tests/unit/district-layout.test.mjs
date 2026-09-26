import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceMotion, constrainMotion, initialMotion, movementConfig } from '../../src/world/controls/motion.ts';
import { district, districtNavigation } from '../../src/world/district/layout.ts';

const config = movementConfig(districtNavigation());
const step = 0.5;
const key = (i, j) => `${i},${j}`;
// A cell is walkable when the player's footprint placed there is not pushed by any blocker or bound.
const free = (x, z) => {
  const state = { x, z, vx: 0, vz: 0, yaw: 0, pitch: 0 };
  constrainMotion(state, config);
  return Math.abs(state.x - x) < 1e-9 && Math.abs(state.z - z) < 1e-9;
};
const { minX, maxX, minZ, maxZ } = district.bounds;
const cell = (x, z) => [Math.round((x - minX) / step), Math.round((z - minZ) / step)];
function reachable() {
  const spawn = initialMotion(config);
  const [si, sj] = cell(spawn.x, spawn.z);
  const seen = new Set([key(si, sj)]); const queue = [[si, sj]];
  while (queue.length) {
    const [i, j] = queue.pop();
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ni = i + di; const nj = j + dj; const id = key(ni, nj);
      const x = minX + ni * step; const z = minZ + nj * step;
      if (seen.has(id) || x < minX || x > maxX || z < minZ || z > maxZ || !free(x, z)) continue;
      seen.add(id); queue.push([ni, nj]);
    }
  }
  return seen;
}
const seen = reachable();
const canReach = (x, z) => { const [i, j] = cell(x, z); return seen.has(key(i, j)); };

test('spawn is free, faces the landmark, and the boulevard to the plaza is unobstructed', () => {
  const spawn = initialMotion(config);
  assert.equal(spawn.x, district.spawn.x); assert.equal(spawn.z, district.spawn.z);
  assert.equal(district.landmark.x, 0); assert.ok(district.landmark.z < spawn.z);
  for (let z = spawn.z; z > district.plaza.z + district.plaza.radius; z -= 0.25) {
    for (const x of [-3.5, 0, 3.5]) assert.ok(free(x, z), `boulevard blocked at ${x}, ${z}`);
  }
});

test('every storefront and the whole plaza ring are reachable on foot', () => {
  assert.ok(district.pavilions.length >= 6);
  for (const p of district.pavilions) {
    const reach = p.depth / 2 + 1.8; // the storefront apron
    const x = p.x + Math.sin(p.facing) * reach; const z = p.z + Math.cos(p.facing) * reach;
    assert.ok(canReach(x, z), `${p.id} storefront at ${x.toFixed(1)}, ${z.toFixed(1)} is unreachable`);
  }
  const ring = district.fountain.radius + 4.5; // outside the landmark footings
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
    const x = district.fountain.x + Math.cos(a) * ring; const z = district.fountain.z + Math.sin(a) * ring;
    assert.ok(canReach(x, z), `plaza point ${x.toFixed(1)}, ${z.toFixed(1)} is unreachable`);
  }
});

test('water is never walkable', () => {
  for (const c of district.channels) {
    for (let z = c.minZ + 0.5; z < c.maxZ; z += 2) assert.equal(free((c.minX + c.maxX) / 2, z), false);
  }
  assert.equal(free(district.fountain.x, district.fountain.z), false);
  assert.equal(free(0, district.waterfrontZ - 1), false);
});


test('fast walking at the frame-time limit cannot enter the fountain', () => {
  const fast = movementConfig({ ...districtNavigation(), speed: 10 });
  const state = initialMotion(fast);
  for (let i = 0; i < 250; i++) {
    advanceMotion(state, { forward: 1, right: 0, yaw: 0, pitch: 0 }, 0.05, fast);
    assert.ok(Math.hypot(state.x - district.fountain.x, state.z - district.fountain.z) >= district.fountain.radius + 0.4 + fast.radius - 1e-8);
  }
  assert.ok(state.z < -30, 'visitor reaches the pool rather than staying at spawn');
});
