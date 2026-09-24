import { expect, test } from '@playwright/test';
import { padCenter, touchscreen } from '../support/touch.mjs';

const ready = async (page) => {
  await page.goto('/');
  await expect(page.locator('#runtime-status')).toHaveAttribute('data-state', 'ready');
};

test('keyboard/mouse devices keep keyboard hints and never show the stick', async ({ page, hasTouch }) => {
  test.skip(hasTouch, 'Pointer-primary presentation.');
  await ready(page);
  await expect(page.locator('html')).toHaveAttribute('data-input', 'pointer');
  await expect(page.locator('#move-pad')).toBeHidden();
  await expect(page.locator('#navigation-hint')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Explore', exact: true })).toBeVisible();
});

test.describe('touch-primary devices', () => {
  test.beforeEach(({ hasTouch }) => { test.skip(!hasTouch, 'Runs in the touch-emulating project.'); });

  test('show the stick, hide keyboard-only hints, and leave most of the scene uncovered', async ({ page }) => {
    for (const size of [{ width: 390, height: 844 }, { width: 844, height: 390 }, { width: 320, height: 568 }]) {
      await page.setViewportSize(size); await ready(page);
      await expect(page.locator('html')).toHaveAttribute('data-input', 'touch');
      await expect(page.locator('#move-pad')).toBeVisible();
      await expect(page.locator('#navigation-hint')).toBeHidden();
      await expect(page.getByRole('button', { name: 'Explore', exact: true })).toBeHidden();
      await expect(page.getByRole('button', { name: 'Reset view', exact: true })).toBeVisible();
      await expect(page.getByLabel('Walk speed', { exact: true })).toBeVisible();
      await expect(page.locator('#navigation-status')).toHaveText('Drag the scene to look · Use the stick to walk.');
      const layout = await page.evaluate(() => {
        const area = (selector) => { const r = document.querySelector(selector).getBoundingClientRect(); return r.width * r.height; };
        const root = document.documentElement;
        return { covered: (area('#move-pad') + area('.shell__footer')) / (innerWidth * innerHeight),
          overflow: root.scrollHeight > root.clientHeight || root.scrollWidth > root.clientWidth };
      });
      expect(layout.overflow, `${size.width}x${size.height} overflows`).toBe(false);
      expect(layout.covered, `${size.width}x${size.height} controls cover too much`).toBeLessThan(0.3);
      for (const control of await page.locator('#move-pad, #reset-view, #walk-speed').all()) {
        const box = await control.boundingBox(); expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test('hide the stick while graphics are unavailable or interrupted', async ({ page }) => {
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...args) {
        return type.includes('webgl') ? null : Reflect.apply(original, this, [type, ...args]);
      };
    });
    await page.goto('/');
    await expect(page.locator('#runtime-status')).toHaveAttribute('data-state', 'unavailable');
    await expect(page.locator('#move-pad')).toBeHidden();
    await expect(page.locator('#runtime-detail')).toBeVisible();
  });

  test('hide the stick during graphics context loss and restore it afterward', async ({ page }) => {
    await ready(page);
    await page.locator('#world-canvas').evaluate((canvas) => {
      const extension = canvas.getContext('webgl2').getExtension('WEBGL_lose_context');
      canvas.addEventListener('webglcontextlost', () => setTimeout(() => extension.restoreContext(), 300), { once: true });
      extension.loseContext();
    });
    await expect(page.locator('#move-pad')).toBeHidden();
    await expect(page.locator('#move-pad')).toBeVisible();
  });

  test('the stick walks the production scene without scrolling or moving focus', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' }); await ready(page);
    const touch = await touchscreen(page); const pad = await padCenter(page);
    const size = page.viewportSize();
    const clip = { x: Math.floor(size.width * 0.2), y: Math.floor(size.height * 0.4), width: Math.floor(size.width * 0.6), height: Math.floor(size.height * 0.25) };
    const before = await page.screenshot({ clip });
    await touch.drag(pad.x, pad.y, 0, -pad.travel, { hold: true });
    await expect(page.locator('#move-pad')).toHaveAttribute('data-active', '');
    await expect(page.locator('#navigation-status')).toHaveText('Walking · Release the stick to slow down.');
    expect(Number(await page.locator('#move-pad').evaluate((el) => el.style.getPropertyValue('--stick-y')))).toBeCloseTo(-1, 2);
    await page.waitForTimeout(800);
    await touch.end();
    await expect(page.locator('#move-pad')).not.toHaveAttribute('data-active', '');
    await expect(page.locator('#navigation-status')).toHaveText('Drag the scene to look · Use the stick to walk.');
    expect((await page.screenshot({ clip })).equals(before)).toBe(false);
    expect(await page.evaluate(() => [scrollX, scrollY, document.activeElement === document.body])).toEqual([0, 0, true]);
  });

  test('a one-finger drag looks around; Reset view returns without stealing focus', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' }); await ready(page);
    const touch = await touchscreen(page); const size = page.viewportSize();
    const clip = { x: 0, y: Math.floor(size.height * 0.35), width: size.width, height: Math.floor(size.height * 0.3) };
    const before = await page.screenshot({ clip });
    await touch.drag(size.width * 0.5, size.height * 0.5, 120, 0);
    const turned = await page.screenshot({ clip });
    expect(turned.equals(before)).toBe(false);
    expect(await page.evaluate(() => [scrollX, scrollY])).toEqual([0, 0]);
    await page.getByRole('button', { name: 'Reset view', exact: true }).tap();
    await expect(page.locator('#world-canvas')).not.toBeFocused();
    await expect.poll(async () => (await page.screenshot({ clip })).equals(before)).toBe(true);
  });
});
