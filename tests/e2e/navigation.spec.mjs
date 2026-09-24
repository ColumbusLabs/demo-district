import { expect, test } from '@playwright/test';

test('production controls focus the canvas, allow escape, and expose speed/reset without pointer lock', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#runtime-status')).toHaveAttribute('data-state', 'ready');
  await expect(page.locator('#world-canvas')).not.toBeFocused();
  await page.getByRole('button', { name: 'Explore', exact: true }).click();
  await expect(page.locator('#world-canvas')).toBeFocused();
  await expect(page.locator('#navigation-status')).toContainText('WASD');
  await page.keyboard.down('w'); await page.waitForTimeout(250); await page.keyboard.up('w');
  await page.keyboard.press('Escape');
  await expect(page.locator('#world-canvas')).not.toBeFocused();
  await page.getByLabel('Walk speed', { exact: true }).selectOption('5');
  await expect(page.getByLabel('Walk speed', { exact: true })).toHaveValue('5');
  await page.getByRole('button', { name: 'Reset view', exact: true }).click();
  await expect(page.locator('#world-canvas')).toBeFocused();
  expect(await page.evaluate(() => document.pointerLockElement)).toBe(null);
});

test('reduced-motion production scene actually changes when walking, not just when focusing', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('#runtime-status')).toHaveAttribute('data-state', 'ready');
  await page.getByRole('button', { name: 'Explore', exact: true }).click();
  const size = page.viewportSize();
  const clip = { x: Math.floor(size.width * 0.25), y: Math.floor(size.height * 0.30), width: Math.floor(size.width * 0.5), height: Math.floor(size.height * 0.22) };
  const before = await page.screenshot({ clip });
  await page.keyboard.down('w'); await page.waitForTimeout(800); await page.keyboard.up('w');
  const after = await page.screenshot({ clip });
  expect(after.equals(before)).toBe(false);
});

test('navigation UI fits a short landscape viewport and remains keyboard reachable', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 }); await page.goto('/');
  await expect(page.locator('#runtime-status')).toHaveAttribute('data-state', 'ready');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.locator('#enter-navigation').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#world-canvas')).toBeFocused();
  await page.keyboard.press('Tab'); await expect(page.locator('#enter-navigation')).toBeFocused();
});
