import { readFile, writeFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

test('a real Vite source update replaces the world and cleans up its previous context', async ({ page }) => {
  const source = new URL('../../src/world/test-scene.ts', import.meta.url);
  const original = await readFile(source, 'utf8');
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
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
  test.setTimeout(90_000);
  await page.goto('/');
  await expect(page.locator('#runtime-status')).toHaveAttribute('data-state', 'ready', { timeout: 20_000 });
  await page.evaluate(() => { window.__ddBeforeHmr = document.querySelector('#world-canvas'); });
  try {
    await writeFile(source, `${original}\n// Slice 2 real hot-module-replacement test.\n`);
    await expect.poll(async () => page.evaluate(() => window.__ddBeforeHmr !== document.querySelector('#world-canvas')), { timeout: 30_000 }).toBe(true);
    await expect(page.locator('#runtime-status')).toHaveAttribute('data-state', 'ready', { timeout: 20_000 });
    await expect(page.locator('#world-canvas')).toHaveCount(1);
    await expect(page.locator('[data-world-diagnostics]')).toHaveCount(1);
    expect(await page.evaluate(() => window.__ddBeforeHmr.getContext('webgl2').isContextLost())).toBe(true);
    expect(await page.evaluate(() => window.__ddPendingFrames)).toBe(1);
    expect(errors).toEqual([]);
  } finally {
    await writeFile(source, original);
    await page.waitForTimeout(300);
  }
});
