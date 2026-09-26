import test from 'node:test';
import assert from 'node:assert/strict';
import { createGovernor } from '../../src/world/performance/governor.ts';

const options = { slowFrameMs: 26, sustainMs: 4000, warmupMs: 2000 };
const run = (governor, interval, fromMs, toMs) => {
  let fired = null;
  for (let t = fromMs; t <= toMs; t += interval) if (governor.sample(interval, t) && fired === null) fired = t;
  return fired;
};

test('smooth frames never step down', () => {
  const g = createGovernor(options); g.reset(0);
  assert.equal(run(g, 16.7, 0, 60_000), null);
});
test('sustained slow frames step down once after warmup plus the sustain window', () => {
  const g = createGovernor(options); g.reset(0);
  const fired = run(g, 40, 0, 20_000);
  assert.ok(fired >= 6000 && fired < 6600, `fired at ${fired}`);
});
test('brief hitches and pauses do not trigger a change', () => {
  const g = createGovernor(options); g.reset(0);
  assert.equal(run(g, 16.7, 0, 5000), null);
  assert.equal(run(g, 45, 5000, 7000), null, 'two slow seconds');
  assert.equal(run(g, 16.7, 7000, 20_000), null);
  assert.equal(g.sample(4000, 21_000), false, 'a long pause is not a slow frame');
});
test('very slow devices (a frame every 400 ms) still step down', () => {
  const g = createGovernor(options); g.reset(0);
  assert.ok(run(g, 400, 0, 20_000) !== null);
});
test('after stepping down the next decision needs a fresh warmup and window', () => {
  const g = createGovernor(options); g.reset(0);
  const first = run(g, 40, 0, 20_000);
  const second = run(g, 40, first + 40, 40_000);
  assert.ok(second - first >= 6000, `second step after ${second - first} ms`);
  assert.equal(g.sample(NaN, 50_000), false);
});
