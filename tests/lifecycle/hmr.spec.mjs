import { readFile, writeFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

test('a real Vite source update replaces the world and cleans up its previous context', async ({ page }) => {
  const source = new URL('../../src/world/test-scene.ts', import.meta.url);
  const original = await readFile(source, 'utf8');
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('#runtime-status')).toHaveAttribute('data-state', 'ready');
  await page.evaluate(() => { window.__ddBeforeHmr = document.querySelector('#world-canvas'); });
  try {
    await writeFile(source, `${original}\n// Slice 2 real hot-module-replacement test.\n`);
    await expect.poll(async () => page.evaluate(() => window.__ddBeforeHmr !== document.querySelector('#world-canvas'))).toBe(true);
    await expect(page.locator('#runtime-status')).toHaveAttribute('data-state', 'ready');
    await expect(page.locator('#world-canvas')).toHaveCount(1);
    await expect(page.locator('[data-world-diagnostics]')).toHaveCount(1);
    expect(await page.evaluate(() => window.__ddBeforeHmr.getContext('webgl2').isContextLost())).toBe(true);
    expect(errors).toEqual([]);
  } finally {
    await writeFile(source, original);
    await page.waitForTimeout(300);
  }
});
