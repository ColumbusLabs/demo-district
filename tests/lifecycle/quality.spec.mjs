import { expect, test } from '@playwright/test';

const tier = (page) => page.locator('#world-canvas').getAttribute('data-quality');
// These tests exercise switching logic, not rendering fidelity: a small viewport and the
// medium tier keep software-rendered CI runs to seconds rather than minutes.
test.use({ viewport: { width: 480, height: 320 } });

test('automatic mode steps down on slow frames and keeps the visitor in place', async ({ page }) => {
  test.setTimeout(180_000);
  // Development-only start tier: automatic mode begins at medium on a software renderer.
  await page.goto('/?auto-start=medium&spawn=-6,-19,1.21');
  await expect(page.locator('#world-canvas')).toHaveAttribute('data-content', 'ready', { timeout: 60_000 });
  expect(await tier(page)).toBe('medium');
  await expect(page.locator('#world-canvas')).toHaveAttribute('data-quality', 'low', { timeout: 90_000 });
  await expect(page.locator('#world-notice')).toHaveText('Graphics adjusted for smoother movement.', { timeout: 30_000 });
  await expect(page.locator('#world-prompt')).toContainText('Music');
  await expect(page.locator('#quality-select')).toHaveValue('auto');
});

test('a graphics choice applies live, persists across reloads, and is never overridden', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto('/?spawn=-6,-19,1.21');
  await expect(page.locator('#world-canvas')).toHaveAttribute('data-content', 'ready', { timeout: 60_000 });
  await page.locator('#menu-toggle').click();
  const before = page.url();
  await page.locator('#quality-select').selectOption('medium');
  await expect(page.locator('#world-canvas')).toHaveAttribute('data-quality', 'medium');
  expect(page.url()).toBe(before);
  await expect(page.locator('#world-prompt')).toContainText('Music');
  expect(await page.evaluate(() => localStorage.getItem('demo-district.graphics'))).toBe('medium');
  // Slow software frames must not demote an explicit choice.
  await page.waitForTimeout(9000);
  expect(await tier(page)).toBe('medium');
  await page.reload();
  await expect(page.locator('#world-canvas')).toHaveAttribute('data-content', 'ready', { timeout: 60_000 });
  await expect(page.locator('#quality-select')).toHaveValue('medium');
  expect(await tier(page)).toBe('medium');
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
