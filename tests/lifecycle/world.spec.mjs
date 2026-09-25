import { expect, test } from '@playwright/test';

// Test-only instrumentation; the application never exports globals or debug controls.
async function instrument(page) {
  await page.addInitScript(() => {
    const request = window.requestAnimationFrame.bind(window);
    const cancel = window.cancelAnimationFrame.bind(window);
    const pending = new Set();
    window.requestAnimationFrame = (callback) => {
      const id = request((time) => { pending.delete(id); callback(time); });
      pending.add(id);
      return id;
    };
    window.cancelAnimationFrame = (id) => { pending.delete(id); cancel(id); };
    Object.defineProperty(window, '__ddPendingFrames', { get: () => pending.size });
  });
}
async function setup(page) {
  await instrument(page);
  await page.goto('/?engine-test');
  await expect(page.locator('#runtime-status')).toHaveAttribute('data-state', 'ready');
  await page.evaluate(async () => {
    const bootstrapPath = '/src/app/bootstrap.ts';
    const { mountApplication } = await import(bootstrapPath);
    mountApplication(document)();
    const canvas = document.createElement('canvas');
    canvas.id = 'world-canvas';
    document.querySelector('#world-canvas').replaceWith(canvas);
    const worldPath = '/src/world/World.ts';
    const { createWorld } = await import(worldPath);
    window.__ddWorld = createWorld(canvas);
  });
}
const snapshot = (page) => page.evaluate(() => window.__ddWorld.snapshot());

test('init, repeated start/stop, and single-loop ownership', async ({ page }) => {
  await setup(page);
  expect((await snapshot(page)).state).toBe('stopped');
  expect((await snapshot(page)).frames).toBe(0);
  await page.evaluate(() => { window.__ddWorld.start(); window.__ddWorld.start(); });
  await expect.poll(async () => (await snapshot(page)).frames).toBeGreaterThan(3);
  expect((await snapshot(page)).drawCalls).toBe(2);
  expect((await snapshot(page)).triangles).toBe(14);
  expect(await page.evaluate(() => window.__ddPendingFrames)).toBe(1);
  await page.evaluate(() => { window.__ddWorld.stop(); window.__ddWorld.stop(); });
  const stopped = await snapshot(page);
  await page.waitForTimeout(200);
  expect((await snapshot(page)).frames).toBe(stopped.frames);
  expect(await page.evaluate(() => window.__ddPendingFrames)).toBe(0);
  await page.evaluate(() => window.__ddWorld.start());
  await expect.poll(async () => (await snapshot(page)).frames).toBeGreaterThan(stopped.frames);
  expect((await snapshot(page)).lastDeltaSeconds).toBeLessThanOrEqual(0.05);
});

test('resize updates the backing buffer and projection aspect together', async ({ page }) => {
  await setup(page);
  await page.evaluate(() => window.__ddWorld.start());
  for (const size of [{ width: 320, height: 780 }, { width: 844, height: 390 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(size);
    await expect.poll(async () => (await snapshot(page)).viewport.width).toBe(size.width);
    const value = await snapshot(page);
    expect(value.cameraAspect).toBeCloseTo(size.width / size.height, 6);
    expect(value.viewport.bufferWidth * value.viewport.bufferHeight).toBeLessThanOrEqual(3_686_400);
    expect(value.viewport.pixelRatio).toBeLessThanOrEqual(2);
  }
});

test('visibility signals and hidden canvas pause all frame work until resumed', async ({ page }) => {
  await setup(page);
  await page.evaluate(() => window.__ddWorld.start());
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  const hidden = await snapshot(page);
  expect(hidden.state).toBe('suspended');
  await page.setViewportSize({ width: 700, height: 500 });
  await page.waitForTimeout(200);
  expect((await snapshot(page)).frames).toBe(hidden.frames);
  expect(await page.evaluate(() => window.__ddPendingFrames)).toBe(0);
  await page.evaluate(() => {
    delete document.hidden;
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(async () => (await snapshot(page)).frames).toBeGreaterThan(hidden.frames);
  await page.locator('#world-root').evaluate((root) => { root.style.display = 'none'; });
  await expect.poll(async () => (await snapshot(page)).state).toBe('suspended');
  expect(await page.evaluate(() => window.__ddPendingFrames)).toBe(0);
  await page.locator('#world-root').evaluate((root) => { root.style.display = ''; });
  await expect.poll(async () => (await snapshot(page)).state).toBe('running');
});

test('reduced motion switches to demand-only rendering and responds to resize', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await setup(page);
  await page.evaluate(() => window.__ddWorld.start());
  const initial = await snapshot(page);
  expect(initial.frames).toBeGreaterThan(0);
  expect(initial.loopActive).toBe(false);
  await page.waitForTimeout(200);
  expect((await snapshot(page)).frames).toBe(initial.frames);
  expect(await page.evaluate(() => window.__ddPendingFrames)).toBe(0);
  await page.locator('#world-root').evaluate((root) => { root.style.display = 'none'; });
  await expect.poll(async () => (await snapshot(page)).state).toBe('suspended');
  await page.locator('#world-root').evaluate((root) => { root.style.display = ''; });
  await expect.poll(async () => (await snapshot(page)).frames).toBeGreaterThan(initial.frames);
  expect((await snapshot(page)).loopActive).toBe(false);
  await page.setViewportSize({ width: 750, height: 500 });
  await expect.poll(async () => (await snapshot(page)).frames).toBeGreaterThan(initial.frames);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect.poll(async () => (await snapshot(page)).loopActive).toBe(true);
});

test('duplicate owners are rejected without interrupting the original renderer', async ({ page }) => {
  await setup(page);
  await page.evaluate(() => window.__ddWorld.start());
  const rejected = await page.evaluate(async () => {
    const path = '/src/world/World.ts';
    const { createWorld } = await import(path);
    try { createWorld(document.querySelector('#world-canvas')); return false; }
    catch (error) { return error.message.includes('already has a world'); }
  });
  expect(rejected).toBe(true);
  expect((await snapshot(page)).state).toBe('running');
  expect(await page.evaluate(() => window.__ddPendingFrames)).toBe(1);
});

test('destroy drains owned GPU resources and all subscriptions exactly once', async ({ page }) => {
  await setup(page);
  await page.evaluate(() => {
    const world = window.__ddWorld;
    world.start();
    window.__ddDisposals = { geometries: 0, materials: 0 };
    world.scene.traverse((object) => {
      if (object.geometry) object.geometry.addEventListener('dispose', () => { window.__ddDisposals.geometries++; });
      if (object.material) {
        world.own(object.material);
        object.material.addEventListener('dispose', () => { window.__ddDisposals.materials++; });
      }
    });
    world.destroy();
    world.destroy();
    world.start();
    world.resize();
    world.stop();
  });
  expect((await snapshot(page)).state).toBe('destroyed');
  expect(await page.evaluate(() => window.__ddDisposals)).toEqual({ geometries: 2, materials: 2 });
  expect(await page.evaluate(() => window.__ddWorld.scene.children.length)).toBe(0);
  expect((await snapshot(page)).geometries).toBe(0);
  const terminal = await snapshot(page);
  await page.setViewportSize({ width: 650, height: 500 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await page.waitForTimeout(200);
  expect((await snapshot(page)).frames).toBe(terminal.frames);
  expect(await page.evaluate(() => window.__ddPendingFrames)).toBe(0);
  await expect.poll(async () => page.locator('#world-canvas').evaluate((canvas) => canvas.getContext('webgl2').isContextLost())).toBe(true);
});

test('DPR-only changes update resolution even while rendering on demand', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await setup(page);
  await page.evaluate(() => window.__ddWorld.start());
  await page.evaluate(() => {
    Object.defineProperty(window, 'devicePixelRatio', { configurable: true, get: () => 1.25 });
    window.dispatchEvent(new Event('resize'));
  });
  await expect.poll(async () => (await snapshot(page)).viewport.pixelRatio).toBe(1.25);
  expect((await snapshot(page)).loopActive).toBe(false);
});

test('repeated application re-entry retains one canvas, one HUD, and one loop', async ({ page }) => {
  await instrument(page);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  // The full district under software rendering: fewer cycles, each given time to build.
  test.setTimeout(120_000);
  await page.goto('/');
  for (let i = 0; i < 5; i++) {
    await page.evaluate(async () => {
      const path = '/src/app/bootstrap.ts';
      const { mountApplication } = await import(path);
      window.__ddOldCanvas = document.querySelector('#world-canvas');
      window.__ddUnmount = mountApplication(document);
    });
    await expect(page.locator('#runtime-status')).toHaveAttribute('data-state', 'ready', { timeout: 20_000 });
    await expect(page.locator('#world-canvas')).toHaveCount(1);
    await expect(page.locator('[data-world-diagnostics]')).toHaveCount(1);
    expect(await page.evaluate(() => window.__ddPendingFrames)).toBe(1);
    await expect.poll(async () => page.evaluate(() => window.__ddOldCanvas.getContext('webgl2').isContextLost())).toBe(true);
  }
  await page.evaluate(() => { window.__ddUnmount(); window.__ddUnmount(); });
  expect(await page.evaluate(() => window.__ddPendingFrames)).toBe(0);
  await expect(page.locator('[data-world-diagnostics]')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('content that opts out of decorative motion renders on demand and never idles a loop', async ({ page }) => {
  await instrument(page);
  await page.goto('/?engine-test');
  await expect(page.locator('#runtime-status')).toHaveAttribute('data-state', 'ready');
  const result = await page.evaluate(async () => {
    const load = (path) => import(path);
    (await load('/src/app/bootstrap.ts')).mountApplication(document)();
    const old = document.querySelector('#world-canvas'); const canvas = old.cloneNode(false); old.replaceWith(canvas);
    const { createWorld } = await load('/src/world/World.ts');
    const { createTestScene } = await load('/src/world/test-scene.ts');
    let updates = 0;
    const world = createWorld(canvas, { content: (context) => ({ ...createTestScene(context), update: () => { updates++; }, animated: false }) });
    world.start();
    await new Promise((resolve) => setTimeout(resolve, 300));
    const idle = { loop: world.snapshot().loopActive, frames: world.snapshot().frames, pending: window.__ddPendingFrames };
    world.invalidate();
    const after = world.snapshot().frames;
    world.destroy();
    return { idle, after, updates };
  });
  expect(result.idle.loop).toBe(false);
  expect(result.idle.pending).toBe(0);
  expect(result.after).toBe(result.idle.frames + 1);
  expect(result.updates).toBe(0);
});
