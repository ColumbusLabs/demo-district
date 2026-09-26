import { expect, test } from '@playwright/test';
import { engine, settle, setup, state } from '../support/rig.mjs';
import { padCenter, touchscreen } from '../support/touch.mjs';

test.beforeEach(({ hasTouch }) => { test.skip(!hasTouch, 'Touch navigation runs in the touch-emulating project.'); });
const scene = (page) => { const size = page.viewportSize(); return { x: size.width / 2, y: size.height * 0.45 }; };

test('a one-finger drag looks around without focusing the canvas or scrolling the page', async ({ page }) => {
  await setup(page); const touch = await touchscreen(page); const start = await state(page); const { x, y } = scene(page);
  await touch.drag(x, y, 90, -40, { hold: true });
  const during = await state(page);
  expect(during.mode).toBe('dragging'); expect(during.touches).toBe(1);
  expect(during.yaw).toBeLessThan(start.yaw); expect(during.pitch).toBeGreaterThan(start.pitch);
  await touch.end();
  expect((await state(page)).mode).toBe('idle');
  await expect(page.locator('#world-canvas')).not.toBeFocused();
  expect(await page.evaluate(() => [scrollX, scrollY])).toEqual([0, 0]);
  expect(await page.evaluate(() => window.__nav.world.camera.rotation.z)).toBe(0);
});

test('a tap or small wobble does not nudge the camera', async ({ page }) => {
  await setup(page); const touch = await touchscreen(page); const start = await state(page); const { x, y } = scene(page);
  await touch.drag(x, y, 5, -4);
  const after = await state(page);
  expect(after.yaw).toBe(start.yaw); expect(after.pitch).toBe(start.pitch); expect(after.mode).toBe('idle');
});

test('the stick walks analog speed in its direction and coasts to rest after release', async ({ page }) => {
  await setup(page); const touch = await touchscreen(page); const pad = await padCenter(page);
  await touch.drag(pad.x, pad.y, 0, -pad.travel * 0.1, { hold: true });
  await page.waitForTimeout(200);
  expect((await state(page)).stick).toEqual({ right: 0, forward: 0 });
  expect((await state(page)).z).toBe(6);
  await touch.move([{ x: pad.x, y: pad.y - pad.travel * 0.5, id: 1 }]);
  await expect.poll(async () => (await state(page)).vz).toBeLessThan(-0.5);
  await page.waitForTimeout(400);
  const half = -(await state(page)).vz;
  expect(half).toBeLessThan(0.7 * 6.4);
  await touch.move([{ x: pad.x, y: pad.y - pad.travel * 3, id: 1 }]);
  await expect.poll(async () => -(await state(page)).vz).toBeGreaterThan(6.1);
  const walking = await state(page);
  expect(walking.stick.forward).toBeCloseTo(1, 6); expect(Math.abs(walking.x)).toBeLessThan(1e-9); expect(walking.mode).toBe('active');
  await touch.end();
  expect((await state(page)).touches).toBe(0);
  expect((await state(page)).vz).toBeLessThan(0);
  await settle(page);
  await expect.poll(async () => (await state(page)).mode).toBe('idle');
  expect(await page.evaluate(() => window.__nav.world.camera.position.y)).toBe(1.7);
});

test('stick and look fingers work together', async ({ page }) => {
  await setup(page); const touch = await touchscreen(page); const pad = await padCenter(page); const { x, y } = scene(page);
  const start = await state(page);
  await touch.start([{ x: pad.x, y: pad.y, id: 1 }]);
  await touch.move([{ x: pad.x, y: pad.y - pad.travel, id: 1 }]);
  await touch.start([{ x: pad.x, y: pad.y - pad.travel, id: 1 }, { x, y, id: 2 }]);
  for (let i = 1; i <= 6; i++) await touch.move([{ x: pad.x, y: pad.y - pad.travel, id: 1 }, { x: x - i * 15, y, id: 2 }]);
  const both = await state(page);
  expect(both.touches).toBe(2); expect(both.mode).toBe('dragging');
  expect(both.yaw).toBeGreaterThan(start.yaw);
  await expect.poll(async () => (await state(page)).x).toBeLessThan(-0.02);
  await touch.end();
  await settle(page);
});

test('reduced motion walks with the stick then returns to zero scheduled frames', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await setup(page);
  const touch = await touchscreen(page); const pad = await padCenter(page);
  expect((await engine(page)).loopActive).toBe(false);
  await touch.drag(pad.x, pad.y, 0, -pad.travel, { hold: true });
  await expect.poll(async () => (await state(page)).z).toBeLessThan(5.8);
  expect((await engine(page)).loopActive).toBe(true);
  await touch.end(); await settle(page);
  await expect.poll(async () => (await engine(page)).loopActive).toBe(false);
  expect(await page.evaluate(() => window.__frames)).toBe(0);
});

test('blur, hidden tabs, cancellation, and disposal release a held stick', async ({ page }) => {
  await setup(page); const touch = await touchscreen(page); const pad = await padCenter(page);
  const hold = async () => {
    await touch.drag(pad.x, pad.y, 0, -pad.travel, { hold: true });
    await expect.poll(async () => (await state(page)).vz).toBeLessThan(-0.1);
  };
  const released = async () => {
    const s = await state(page);
    expect(s.touches).toBe(0); expect(s.vz).toBe(0); expect(s.stick).toEqual({ right: 0, forward: 0 }); expect(s.mode).toBe('idle');
  };
  await hold(); await page.evaluate(() => window.dispatchEvent(new Event('blur'))); await released();
  const stopped = (await state(page)).z; await page.waitForTimeout(150);
  expect((await state(page)).z).toBe(stopped); await touch.end();

  await hold();
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await released(); expect((await engine(page)).state).toBe('suspended');
  await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
  await touch.end();

  await page.evaluate(() => document.addEventListener('pointerdown', (event) => { window.__pointer = event.pointerId; }, true));
  await hold();
  await page.evaluate(() => document.dispatchEvent(new PointerEvent('pointercancel', { pointerId: window.__pointer, pointerType: 'touch' })));
  await released(); await touch.end();

  await hold();
  await page.evaluate(() => { window.__nav.world.destroy(); window.__nav.control.dispose(); });
  await released(); await touch.end();
  expect(await page.evaluate(() => window.__frames)).toBe(0);
});
