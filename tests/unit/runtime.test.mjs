import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FrameClock, measureViewport, ResourceScope } from '../../src/world/runtime.ts';

test('DPR is capped and both backing buffer dimensions fit the pixel budget', () => {
  const phone = measureViewport(390, 844, 3);
  assert.equal(phone.pixelRatio, 2);
  assert.equal(phone.bufferWidth, 780);
  assert.equal(phone.bufferHeight, 1688);
  const large = measureViewport(5120, 2880, 3);
  assert.ok(large.bufferWidth * large.bufferHeight <= 3_686_400);
  assert.ok(large.pixelRatio < 1);
});
test('zero, hidden, and invalid viewports do not allocate a framebuffer', () => {
  for (const [w, h] of [[0, 500], [100, 0], [-1, 100], [NaN, 10], [10, Infinity], [0.4, 400]]) {
    assert.equal(measureViewport(w, h, 2), null);
  }
});
test('DPR sanitization, fractional CSS sizes, and hardware limits are respected', () => {
  assert.equal(measureViewport(390.9, 844.7, NaN).pixelRatio, 1);
  assert.equal(measureViewport(390.9, 844.7, -1).width, 390);
  assert.equal(measureViewport(1000, 500, 0.75).pixelRatio, 0.75);
  const limited = measureViewport(2000, 1000, 2, 1024);
  assert.ok(limited.bufferWidth <= 1024 && limited.bufferHeight <= 1024);
});
test('clock starts at zero, clamps long frames, and never emits a negative delta', () => {
  const clock = new FrameClock();
  assert.equal(clock.tick(1000).delta, 0);
  assert.equal(clock.tick(1016).delta, 0.016);
  assert.equal(clock.tick(6016).delta, 0.05);
  assert.equal(clock.tick(6000).delta, 0);
  assert.equal(clock.tick(NaN).delta, 0);
});
test('clock excludes hidden-tab time while retaining elapsed animation time', () => {
  const clock = new FrameClock();
  clock.tick(0);
  clock.tick(20);
  clock.reset();
  assert.deepEqual(clock.tick(900_000), { delta: 0, elapsed: 0.02 });
  assert.equal(clock.tick(900_016).delta, 0.016);
});
test('resource scope disposes shared resources exactly once and is idempotent', () => {
  const scope = new ResourceScope();
  let disposed = 0;
  const material = { dispose: () => { disposed++; } };
  assert.equal(scope.track(material), material);
  scope.track(material);
  scope.dispose();
  scope.dispose();
  assert.equal(disposed, 1);
  assert.throws(() => scope.track(material), /disposed scope/);
});
test('one resource cleanup failure does not prevent remaining cleanup', () => {
  const scope = new ResourceScope();
  let disposed = 0;
  scope.track({ dispose() { throw new Error('fixture failure'); } });
  scope.track({ dispose() { disposed++; } });
  assert.throws(() => scope.dispose(), AggregateError);
  assert.equal(disposed, 1);
  scope.dispose();
});
test('a smaller content pixel budget lowers resolution without distorting the aspect', () => {
  const low = measureViewport(1440, 900, 2, 8192, 420_000);
  assert.ok(low.bufferWidth * low.bufferHeight <= 420_000);
  assert.ok(Math.abs(low.bufferWidth / low.bufferHeight - 1440 / 900) < 0.01);
  assert.deepEqual(measureViewport(1440, 900, 2, 8192, NaN), measureViewport(1440, 900, 2, 8192));
});
