import { expect, test } from '@playwright/test';
import { engine, settle, setup, state } from '../support/rig.mjs';

const focus = (page) => page.evaluate(() => window.__nav.control.focus());

test('movement requires deliberate focus and uses the existing frame loop', async ({ page }) => {
  await setup(page);
  await page.keyboard.press('w'); expect((await state(page)).z).toBe(6);
  await focus(page); await page.keyboard.down('w');
  await expect.poll(async () => (await state(page)).z).toBeLessThan(5.8);
  expect(await page.evaluate(() => window.__frames)).toBe(1);
  await page.keyboard.up('w'); await settle(page);
  const position = await page.evaluate(() => window.__nav.world.camera.position.toArray());
  expect(position[1]).toBe(1.7);
  expect(position[2]).toBeCloseTo((await state(page)).z, 6);
  expect(await page.evaluate(() => document.pointerLockElement)).toBe(null);
});

test('mouse drag rotates only while held and clamps pitch without camera roll', async ({ page }) => {
  await setup(page); await focus(page);
  const start = await state(page);
  const size = page.viewportSize();
  const x = size.width / 2; const y = size.height * 0.45;
  await page.mouse.move(x, y); await page.mouse.down();
  await page.mouse.move(x + 90, y - 40, { steps: 5 }); await page.mouse.up();
  const after = await state(page);
  expect(after.yaw).toBeLessThan(start.yaw); expect(after.pitch).toBeGreaterThan(start.pitch);
  await page.mouse.move(x - 80, y + 40); expect((await state(page)).yaw).toBe(after.yaw);
  expect(await page.evaluate(() => window.__nav.world.camera.rotation.z)).toBe(0);
  expect(await page.evaluate(() => document.pointerLockElement)).toBe(null);
});

test('arrow keys look while WASD direction follows the new heading', async ({ page }) => {
  await setup(page); await focus(page); await page.keyboard.down('ArrowLeft');
  await expect.poll(async () => (await state(page)).yaw).toBeGreaterThan(0.2);
  await page.keyboard.up('ArrowLeft'); await page.keyboard.down('w');
  await expect.poll(async () => (await state(page)).x).toBeLessThan(-0.05);
  await page.keyboard.up('w'); await settle(page);
});

test('blur, repeat keys, and editable UI cannot leave walking stuck', async ({ page }) => {
  await setup(page); await focus(page); await page.keyboard.down('w');
  await expect.poll(async () => (await state(page)).vz).toBeLessThan(-0.1);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  expect((await state(page)).pressedKeys).toBe(0); expect((await state(page)).vz).toBe(0);
  const stopped = await state(page);
  await page.evaluate(() => document.querySelector('#world-canvas').dispatchEvent(new KeyboardEvent('keydown', { key: 'w', code: 'KeyW', repeat: true, bubbles: true })));
  await page.waitForTimeout(150); expect((await state(page)).z).toBe(stopped.z);
  await page.keyboard.up('w');
  await page.evaluate(() => {
    const input = document.createElement('input'); input.id = 'text-test'; document.body.append(input); input.focus();
  });
  await page.keyboard.type('wasd');
  expect(await page.locator('#text-test').inputValue()).toBe('wasd');
  expect((await state(page)).pressedKeys).toBe(0); expect((await state(page)).z).toBe(stopped.z);
});

test('Tab and Escape leave scene focus without trapping page navigation', async ({ page }) => {
  await setup(page); await focus(page); await page.keyboard.down('w');
  await page.keyboard.press('Escape'); await page.keyboard.up('w');
  expect((await state(page)).pressedKeys).toBe(0); expect((await state(page)).vz).toBe(0);
  await expect(page.locator('#world-canvas')).not.toBeFocused();
  await focus(page); await page.keyboard.press('Tab');
  await expect(page.locator('#world-canvas')).not.toBeFocused();
  expect((await state(page)).pressedKeys).toBe(0);
});

test('world bounds stop the player footprint without drifting beyond the floor', async ({ page }) => {
  await setup(page, { bounds: { minX: -1, maxX: 1, minZ: -1, maxZ: 1 }, spawn: { x: 0, z: 0, yaw: 0, pitch: 0 } });
  await focus(page); await page.keyboard.down('w'); await page.keyboard.down('d');
  await expect.poll(async () => (await state(page)).x).toBeCloseTo(0.7, 5);
  await expect.poll(async () => (await state(page)).z).toBeCloseTo(-0.7, 5);
  await page.keyboard.up('w'); await page.keyboard.up('d'); await settle(page);
});

test('reduced motion supports deliberate walking then returns to zero scheduled frames', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await setup(page); await focus(page);
  expect((await engine(page)).loopActive).toBe(false);
  const rotation = await page.evaluate(() => window.__nav.world.scene.getObjectByName('engine-test-object').rotation.y);
  await page.keyboard.down('w');
  await expect.poll(async () => (await state(page)).z).toBeLessThan(5.8);
  await page.keyboard.up('w'); await settle(page);
  await expect.poll(async () => (await engine(page)).loopActive).toBe(false);
  expect(await page.evaluate(() => window.__frames)).toBe(0);
  expect(await page.evaluate(() => window.__nav.world.scene.getObjectByName('engine-test-object').rotation.y)).toBe(rotation);
});

test('stop and hidden-tab suspension clear input and preserve view on resume', async ({ page }) => {
  await setup(page); await focus(page); await page.keyboard.down('w');
  await expect.poll(async () => (await state(page)).z).toBeLessThan(5.8);
  await page.evaluate(() => window.__nav.world.stop());
  const stopped = await state(page); expect(stopped.pressedKeys).toBe(0); expect(stopped.vz).toBe(0);
  await page.evaluate(() => window.__nav.world.start()); await page.waitForTimeout(100);
  expect((await state(page)).z).toBe(stopped.z); await page.keyboard.up('w');
  await page.keyboard.down('d');
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  expect((await state(page)).pressedKeys).toBe(0);
  expect((await engine(page)).state).toBe('suspended');
  await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
  await page.keyboard.up('d'); expect((await state(page)).vx).toBe(0);
});

test('reset, speed changes, and viewport resize do not break the rig', async ({ page }) => {
  await setup(page); await focus(page); await page.keyboard.down('w');
  await expect.poll(async () => (await state(page)).z).toBeLessThan(5.8); await page.keyboard.up('w');
  await page.evaluate(() => { window.__nav.control.resetView(); window.__nav.control.setSpeed(5); });
  expect((await state(page)).z).toBe(6); expect((await state(page)).speed).toBe(5);
  await page.setViewportSize({ width: 844, height: 390 });
  expect((await state(page)).z).toBe(6);
  expect(await page.evaluate(() => window.__nav.world.camera.position.y)).toBe(1.7);
  expect(await page.evaluate(() => {
    try { window.__nav.control.setSpeed(NaN); return false; } catch { return true; }
  })).toBe(true);
});

test('pointer cancellation and world destruction release all navigation input', async ({ page }) => {
  await setup(page); await focus(page);
  await page.locator('#world-canvas').dispatchEvent('pointerdown', { pointerType: 'mouse', pointerId: 55, button: 0, buttons: 1, clientX: 100, clientY: 100 });
  await page.keyboard.down('w');
  await page.locator('#world-canvas').dispatchEvent('pointercancel', { pointerType: 'mouse', pointerId: 55 });
  expect((await state(page)).pressedKeys).toBe(0);
  await page.keyboard.up('w');
  await page.evaluate(() => { window.__nav.world.destroy(); window.__nav.control.dispose(); });
  const old = await state(page); await page.keyboard.press('w');
  expect(await state(page)).toEqual(old); expect(await page.evaluate(() => window.__frames)).toBe(0);
});

test('real context loss clears held input before restoration', async ({ page }) => {
  await setup(page); await focus(page); await page.keyboard.down('w');
  await expect.poll(async () => (await state(page)).vz).toBeLessThan(-0.1);
  await page.locator('#world-canvas').evaluate((canvas) => {
    const extension = canvas.getContext('webgl2').getExtension('WEBGL_lose_context');
    canvas.addEventListener('webglcontextlost', () => setTimeout(() => extension.restoreContext(), 300), { once: true });
    extension.loseContext();
  });
  await expect.poll(async () => (await engine(page)).state).toBe('context-lost');
  const lost = await state(page); expect(lost.pressedKeys).toBe(0);
  await expect.poll(async () => (await engine(page)).state).toBe('running');
  expect((await state(page)).z).toBe(lost.z); await page.keyboard.up('w');
});
