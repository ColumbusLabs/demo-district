import { expect, test } from '@playwright/test';

const ready = async (page, path = '/') => {
  await page.goto(path);
  await expect(page.locator('#world-canvas')).toHaveAttribute('data-content', 'ready');
  await expect(page.locator('#runtime-status')).toHaveAttribute('data-state', 'ready');
};
const previewOpen = (page) => page.locator('#project-preview').evaluate((dialog) => dialog.open);

test('loading shows brand and progress, then gives way to the scene', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('progressbar', { name: 'Loading the district' })).toBeAttached();
  await expect(page.locator('#world-canvas')).toHaveAttribute('data-content', 'ready');
  await expect(page.locator('#loading')).toBeHidden();
  await expect(page.locator('#loading-bar')).toHaveAttribute('aria-valuenow', '100');
  // Healthy engine status is announced but not shown.
  await expect(page.locator('#world-status')).toHaveAttribute('data-visible', 'false');
});

test('search finds a storefront by category and jumps to its preview', async ({ page }) => {
  await ready(page);
  const search = page.getByRole('combobox', { name: 'Search the district' });
  await search.fill('games');
  await expect(search).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('option', { name: /Paper Comet/ })).toBeVisible();
  await search.fill('no such thing');
  await expect(page.locator('#search-results')).toContainText('No storefronts match yet.');
  await search.fill('tide');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Tidepool Synth' })).toBeVisible();
  await expect(search).toHaveValue('');
  await page.keyboard.press('Escape');
  expect(await previewOpen(page)).toBe(false);
  // After the jump the visitor stands facing that storefront.
  await expect(page.locator('#world-prompt')).toContainText('Tidepool Synth');
});

test('the map toggles by button and M key, marks storefronts, and jumps from them', async ({ page }) => {
  await ready(page);
  const toggle = page.getByRole('button', { name: 'Map' });
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  const map = page.getByRole('complementary', { name: 'District map' });
  await expect(map).toBeVisible();
  await expect(map.locator('.slot')).toHaveCount(8);
  await expect(map.locator('.you')).toHaveAttribute('transform', /translate\(0\.0 10\.0\)/);
  await map.getByRole('button', { name: /Lantern Coast/ }).click();
  await expect(page.getByRole('dialog', { name: 'Lantern Coast' })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.locator('#world-canvas').focus();
  await page.keyboard.press('m');
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await expect(map).toBeHidden();
  // Typing "m" in search must not toggle the map.
  await page.getByRole('combobox', { name: 'Search the district' }).fill('m');
  await expect(map).toBeHidden();
});

test('the menu is a disclosure: Escape closes it and returns focus', async ({ page, hasTouch }) => {
  test.skip(hasTouch, 'Keyboard behaviour.');
  await ready(page);
  const toggle = page.locator('#menu-toggle');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('heading', { name: 'Demo District', level: 2 })).toBeVisible();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Escape');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(toggle).toBeFocused();
  await toggle.click(); await page.mouse.click(700, 500);
  await expect(page.locator('#menu-panel')).toBeHidden();
});

test('reduced motion jumps instantly; the profile control is honest about sign-in', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await ready(page);
  await page.getByRole('combobox', { name: 'Search the district' }).fill('orbit');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Orbit Primer' })).toBeVisible();
  await expect(page.locator('#transition')).not.toHaveAttribute('data-active', '');
  await expect(page.locator('#profile-button')).toHaveAttribute('aria-disabled', 'true');
  await expect(page.locator('#profile-note')).toHaveText('Sign-in arrives in a later release.');
});
