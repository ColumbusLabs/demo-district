import { expect, test } from '@playwright/test';
import { touchscreen } from '../support/touch.mjs';

// Development server with the full district, starting ~8 m from the west promenade storefront
// (the Music building) and facing it, with sky visible above.
const apron = '/?spawn=-6,-19,1.21';
const open = (page) => page.locator('#project-preview').evaluate((dialog) => dialog.open);
async function arrive(page) {
  await page.goto(apron);
  await expect(page.locator('#world-canvas')).toHaveAttribute('data-content', 'ready', { timeout: 30_000 });
  await expect(page.locator('#runtime-status')).toHaveAttribute('data-state', 'ready');
}
const center = (page) => { const s = page.viewportSize(); return { x: s.width / 2, y: s.height * 0.5 }; };

test('keyboard: facing a storefront offers Enter, opens an accessible preview, and Escape returns', async ({ page, hasTouch }) => {
  test.skip(hasTouch, 'Keyboard prompt is the pointer layout.');
  await arrive(page);
  await expect(page.locator('#world-prompt')).toContainText('Click to view Music');
  await page.locator('#world-canvas').focus();
  await expect(page.locator('#world-prompt')).toContainText('Enter or click to view Music');
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Music' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('No demos in Music yet');
  await expect(page.locator('#preview-close')).toBeFocused();
  await expect(page.locator('#preview-launch')).toBeHidden();
  expect(await page.locator('#preview-launch').getAttribute('href')).toBe(null);
  await expect(page.locator('#world-prompt')).toBeHidden();
  // The scene does not take input while the preview is open.
  await page.keyboard.down('w'); await page.waitForTimeout(200); await page.keyboard.up('w');
  await expect(page.locator('#world-canvas')).toHaveAttribute('data-navigation', 'idle');
  await page.keyboard.press('Escape');
  expect(await open(page)).toBe(false);
  await expect(page.locator('#world-canvas')).toBeFocused();
  await expect(page.locator('#world-prompt')).toContainText('Music');
});

test('pointer: hover marks the storefront, click opens it, drags and sky clicks do not', async ({ page }) => {
  test.skip(test.info().project.use.hasTouch, 'Hover is the pointer layout; desktop covers it.');
  await arrive(page);
  const { x, y } = center(page);
  await page.mouse.move(x, y);
  await expect(page.locator('#world-canvas')).toHaveAttribute('data-hover', 'target');
  await page.mouse.move(x, 8);
  await expect(page.locator('#world-canvas')).toHaveAttribute('data-hover', '');
  await page.mouse.click(x, 8);
  expect(await open(page)).toBe(false);
  await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + 80, y, { steps: 4 }); await page.mouse.up();
  expect(await open(page)).toBe(false);
  await page.mouse.move(x - 80, y); await page.mouse.click(x - 80, y);
  await expect(page.getByRole('dialog', { name: 'Music' })).toBeVisible();
  // A click on the backdrop outside the card closes it without navigating anywhere.
  const url = page.url();
  await page.mouse.click(8, 8);
  expect(await open(page)).toBe(false);
  expect(page.url()).toBe(url);
});

test('touch: a tap opens the storefront and a look drag does not', async ({ page, hasTouch }) => {
  test.skip(!hasTouch, 'Runs in the touch-emulating project.');
  await arrive(page);
  await expect(page.locator('#world-prompt')).toContainText('Tap to view Music');
  const touch = await touchscreen(page); const { x, y } = center(page);
  await touch.drag(x, y, 0, 0, { steps: 1 });
  await expect(page.getByRole('dialog', { name: 'Music' })).toBeVisible();
  await page.locator('#preview-close').tap();
  expect(await open(page)).toBe(false);
  // A look drag that starts on the storefront turns the view instead of opening it.
  await touch.drag(x, y, 60, 0);
  await page.waitForTimeout(300);
  expect(await open(page)).toBe(false);
});
