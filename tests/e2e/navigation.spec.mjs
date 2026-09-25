import { expect, test } from '@playwright/test';

// Keyboard/mouse presentation. Touch-primary devices get the stick layout instead (touch.spec.mjs).
test.beforeEach(({ hasTouch }) => { test.skip(hasTouch, 'Touch-primary layout hides keyboard-only controls.'); });
const openMenu = async (page) => {
  await page.getByRole('button', { name: 'Explore menu' }).click();
  await expect(page.locator('#menu-panel')).toBeVisible();
};

test('menu controls focus the canvas, allow escape, and expose speed/reset without pointer lock', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#runtime-status')).toHaveAttribute('data-state', 'ready');
  await expect(page.locator('#world-canvas')).not.toBeFocused();
  await openMenu(page);
  await page.locator('#enter-navigation').click();
  await expect(page.locator('#world-canvas')).toBeFocused();
  await expect(page.locator('#navigation-status')).toContainText('WASD');
  await page.keyboard.down('w'); await page.waitForTimeout(250); await page.keyboard.up('w');
  await page.keyboard.press('Escape');
  await expect(page.locator('#world-canvas')).not.toBeFocused();
  await openMenu(page);
  await page.getByLabel('Walk speed', { exact: true }).selectOption('5');
  await expect(page.getByLabel('Walk speed', { exact: true })).toHaveValue('5');
  await page.getByRole('button', { name: 'Reset view', exact: true }).click();
  await expect(page.locator('#world-canvas')).toBeFocused();
  await expect(page.locator('#menu-panel')).toBeHidden();
  expect(await page.evaluate(() => document.pointerLockElement)).toBe(null);
});

test('reduced-motion production scene actually changes when walking, not just when focusing', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('#world-canvas')).toHaveAttribute('data-content', 'ready', { timeout: 30_000 });
  // Click open sky: storefronts are interactive and would open their preview.
  await page.locator('#world-canvas').click({ position: { x: Math.floor(page.viewportSize().width / 2), y: 150 } });
  await expect(page.locator('#world-canvas')).toBeFocused();
  const size = page.viewportSize();
  const clip = { x: Math.floor(size.width * 0.25), y: Math.floor(size.height * 0.30), width: Math.floor(size.width * 0.5), height: Math.floor(size.height * 0.22) };
  const before = await page.screenshot({ clip });
  await page.keyboard.down('w'); await page.waitForTimeout(800); await page.keyboard.up('w');
  const after = await page.screenshot({ clip });
  expect(after.equals(before)).toBe(false);
});

test('the HUD fits a short landscape viewport and the page stays keyboard reachable', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 }); await page.goto('/');
  await expect(page.locator('#runtime-status')).toHaveAttribute('data-state', 'ready');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  // Tab order: scene, menu, search, map, profile.
  await page.locator('#world-canvas').focus();
  const order = [];
  for (let i = 0; i < 4; i++) { await page.keyboard.press('Tab'); order.push(await page.evaluate(() => document.activeElement?.id)); }
  expect(order).toEqual(['menu-toggle', 'search-input', 'map-toggle', 'profile-button']);
  await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Shift+Tab');
  await expect(page.locator('#menu-toggle')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#menu-toggle')).toHaveAttribute('aria-expanded', 'true');
  // The disclosure's contents follow its button in tab order.
  await page.keyboard.press('Tab'); await expect(page.locator('#enter-navigation')).toBeFocused();
  await page.keyboard.press('Enter'); await expect(page.locator('#world-canvas')).toBeFocused();
});
