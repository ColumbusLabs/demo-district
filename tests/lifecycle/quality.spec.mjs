import { expect, test } from '@playwright/test';

const tier = (page) => page.locator('#world-canvas').getAttribute('data-quality');

test('automatic mode steps down on slow frames and keeps the visitor in place', async ({ page }) => {
  test.setTimeout(120_000);
  // Development-only start tier: automatic mode begins at high on a software renderer.
  await page.goto('/?auto-start=high&spawn=-6,-19,1.21');
  await expect(page.locator('#world-canvas')).toHaveAttribute('data-content', 'ready', { timeout: 30_000 });
  expect(await tier(page)).toBe('high');
  await expect(page.locator('#world-canvas')).toHaveAttribute('data-quality', 'medium', { timeout: 60_000 });
  await expect(page.locator('#world-notice')).toHaveText('Graphics adjusted for smoother movement.', { timeout: 30_000 });
  await expect(page.locator('#world-prompt')).toContainText('Tidepool Synth');
  await expect(page.locator('#quality-select')).toHaveValue('auto');
});

test('a graphics choice applies live, persists across reloads, and is never overridden', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/?spawn=-6,-19,1.21');
  await expect(page.locator('#world-canvas')).toHaveAttribute('data-content', 'ready', { timeout: 30_000 });
  await page.locator('#menu-toggle').click();
  const before = page.url();
  await page.locator('#quality-select').selectOption('high');
  await expect(page.locator('#world-canvas')).toHaveAttribute('data-quality', 'high');
  expect(page.url()).toBe(before);
  await expect(page.locator('#world-prompt')).toContainText('Tidepool Synth');
  expect(await page.evaluate(() => localStorage.getItem('demo-district.graphics'))).toBe('high');
  // Slow software frames must not demote an explicit choice.
  await page.waitForTimeout(9000);
  expect(await tier(page)).toBe('high');
  await page.reload();
  await expect(page.locator('#world-canvas')).toHaveAttribute('data-content', 'ready', { timeout: 30_000 });
  await expect(page.locator('#quality-select')).toHaveValue('high');
  expect(await tier(page)).toBe('high');
  await page.locator('#menu-toggle').click();
  await page.locator('#quality-select').selectOption('auto');
  await expect(page.locator('#world-canvas')).toHaveAttribute('data-quality', 'low');
});

test('blocked storage falls back to automatic without breaking the page', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('blocked', 'SecurityError'); } });
  });
  await page.goto('/');
  await expect(page.locator('#runtime-status')).toHaveAttribute('data-state', 'ready');
  await expect(page.locator('#quality-select')).toHaveValue('auto');
});
