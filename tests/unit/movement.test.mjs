import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceMotion, hasMomentum, initialMotion, movementConfig, resetMotion, rotateView, stickInput } from '../../src/world/controls/motion.ts';
const idle = { forward: 0, right: 0, yaw: 0, pitch: 0 };
const forward = { ...idle, forward: 1 };
const near = (a, b, tolerance = 1e-6) => assert.ok(Math.abs(a - b) <= tolerance, `${a} differs from ${b}`);
function travel(input, fps = 60, seconds = 2, config = movementConfig()) {
  const state = initialMotion(config);
  for (let i = 0; i < fps * seconds; i++) advanceMotion(state, input, 1 / fps, config);
  return state;
}
test('defaults are human-scale, bounded, and separately copied', () => {
  const a = movementConfig(); const b = movementConfig();
  assert.equal(a.eyeHeight, 1.7); assert.equal(a.speed, 3.2);
  a.bounds.minX = 0; assert.equal(b.bounds.minX, -35);
});
test('configuration rejects unusable speed, dimensions, and nonfinite values', () => {
  for (const value of [0, -1, NaN, Infinity, 8.1]) assert.throws(() => movementConfig({ speed: value }));
  assert.throws(() => movementConfig({ eyeHeight: -1 }));
  assert.throws(() => movementConfig({ maxPitch: Math.PI / 2 }));
  assert.throws(() => movementConfig({ bounds: { minX: 0, maxX: 0.2, minZ: 0, maxZ: 10 } }));
  assert.throws(() => movementConfig({ spawn: { x: NaN, z: 0, yaw: 0, pitch: 0 } }));
});
test('forward at yaw zero travels toward negative Z', () => {
  const result = travel(forward);
  near(result.x, 0); assert.ok(result.z < 1); assert.ok(result.vz < -3);
});
test('acceleration is gradual and deceleration converges to an exact rest', () => {
  const config = movementConfig(); const state = initialMotion(config);
  advanceMotion(state, forward, 1 / 60, config);
  assert.ok(-state.vz > 0 && -state.vz < config.speed);
  for (let i = 0; i < 120; i++) advanceMotion(state, forward, 1 / 60, config);
  const oldZ = state.z;
  advanceMotion(state, idle, 1 / 60, config);
  assert.ok(state.z < oldZ); assert.ok(hasMomentum(state));
  for (let i = 0; i < 120; i++) advanceMotion(state, idle, 1 / 60, config);
  assert.equal(hasMomentum(state), false);
});
test('constant-input travel is consistent at 30, 60, and 144 FPS', () => {
  const baseline = travel(forward, 60);
  for (const fps of [30, 144]) near(travel(forward, fps).z, baseline.z);
});
test('diagonal walking is not faster than straight walking', () => {
  const a = travel(forward); const b = travel({ ...forward, right: 1 });
  near(Math.hypot(b.x, b.z - 6), Math.abs(a.z - 6));
});
test('yaw rotates walking direction while pitch never causes flying', () => {
  const config = movementConfig({ spawn: { x: 0, z: 6, yaw: Math.PI / 2, pitch: 1 } });
  const state = travel(forward, 60, 1, config);
  assert.ok(state.x < -2); near(state.z, 6);
  const pitched = travel(forward, 60, 1, movementConfig({ spawn: { x: 0, z: 6, yaw: 0, pitch: 1.4 } }));
  near(pitched.z, travel(forward, 60, 1).z);
});
test('pitch is clamped, yaw wraps, and malformed pointer deltas are ignored', () => {
  const config = movementConfig(); const state = initialMotion(config);
  rotateView(state, 1000, 1000, config);
  assert.ok(Math.abs(state.yaw) <= Math.PI); near(state.pitch, config.maxPitch);
  rotateView(state, 0, -2000, config); near(state.pitch, -config.maxPitch);
  const before = { ...state }; rotateView(state, NaN, Infinity, config); assert.deepEqual(state, before);
});
test('keyboard looking is proportional to elapsed simulation time', () => {
  const a = travel({ ...idle, yaw: 1, pitch: 1 }, 60, 0.5);
  const b = travel({ ...idle, yaw: 1, pitch: 1 }, 30, 0.5);
  near(a.yaw, b.yaw); near(a.pitch, b.pitch);
});
test('bounds clamp the full player footprint and stop outward momentum', () => {
  const config = movementConfig({ bounds: { minX: -1, maxX: 1, minZ: -1, maxZ: 1 }, spawn: { x: 0, z: 0, yaw: 0, pitch: 0 } });
  const state = travel({ ...forward, right: 1 }, 60, 10, config);
  near(state.x, 0.7); near(state.z, -0.7); near(state.vx, 0); near(state.vz, 0);
});
test('boundary contact does not prevent tangential movement', () => {
  const config = movementConfig({ bounds: { minX: -1, maxX: 1, minZ: -30, maxZ: 30 }, spawn: { x: 0.7, z: 0, yaw: 0, pitch: 0 } });
  const state = travel({ ...forward, right: 1 }, 60, 1, config);
  near(state.x, 0.7); assert.ok(state.z < -1);
});
test('oversized time steps are bounded and invalid time cannot corrupt state', () => {
  const config = movementConfig(); const state = initialMotion(config); const before = { ...state };
  for (const dt of [NaN, Infinity, -10, 0]) advanceMotion(state, forward, dt, config);
  assert.deepEqual(state, before);
  advanceMotion(state, forward, 1000, config); assert.ok(6 - state.z <= config.speed * 0.05);
});
test('suspend clears velocity without changing the view', () => {
  const state = travel(forward); const before = { ...state };
  resetMotion(state); assert.equal(hasMomentum(state), false);
  near(state.x, before.x); near(state.z, before.z); near(state.yaw, before.yaw);
});
test('spawn is constrained and configured speed controls distance', () => {
  const config = movementConfig({ spawn: { x: 1000, z: -1000, yaw: 0, pitch: 1000 } });
  const spawn = initialMotion(config); near(spawn.x, 34.7); near(spawn.z, -34.7);
  const slow = travel(forward, 60, 1, movementConfig({ speed: 2 }));
  const fast = travel(forward, 60, 1, movementConfig({ speed: 4 }));
  near(6 - fast.z, (6 - slow.z) * 2);
});
test('touch look sensitivity is configurable and validated like other settings', () => {
  assert.equal(movementConfig().touchSensitivity, 0.006);
  for (const value of [0, -1, NaN]) assert.throws(() => movementConfig({ touchSensitivity: value }));
});
test('stick dead zone ignores small thumb drift, then ramps from zero', () => {
  assert.deepEqual(stickInput(0, 0, 30), { x: 0, y: 0, right: 0, forward: 0 });
  const drift = stickInput(3, -3, 30);
  assert.equal(drift.right, 0); assert.equal(drift.forward, 0); assert.ok(drift.x > 0);
  const edge = stickInput(0, -30 * 0.16, 30);
  assert.ok(edge.forward > 0 && edge.forward < 0.02);
  const half = stickInput(0, -15, 30);
  near(half.forward, (0.5 - 0.15) / 0.85); assert.equal(half.right, 0);
});
test('stick maps screen axes to walking axes and clamps to the unit disc', () => {
  const up = stickInput(0, -300, 30); near(up.forward, 1); near(up.y, -1); assert.equal(up.right, 0);
  const right = stickInput(300, 0, 30); near(right.right, 1); assert.equal(right.forward, 0);
  const diagonal = stickInput(300, 300, 30);
  near(Math.hypot(diagonal.x, diagonal.y), 1); near(Math.hypot(diagonal.right, diagonal.forward), 1);
  assert.ok(diagonal.right > 0 && diagonal.forward < 0);
});
test('malformed stick samples produce no movement', () => {
  for (const [dx, dy, travel] of [[NaN, 0, 30], [0, Infinity, 30], [10, 10, 0], [10, 10, -5], [10, 10, NaN]]) {
    assert.deepEqual(stickInput(dx, dy, travel), { x: 0, y: 0, right: 0, forward: 0 });
  }
});
test('analog stick input walks proportionally slower than full input', () => {
  const half = stickInput(0, -15, 30);
  const slow = travel({ ...idle, forward: half.forward }, 60, 2);
  const full = travel(forward, 60, 2);
  near((6 - slow.z) / (6 - full.z), half.forward, 0.02);
});
