import { expect, test } from '@playwright/test';

test('the district streams only local world assets, all successfully, with no errors', async ({ page }) => {
  const errors = []; const assets = []; const external = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', (response) => {
    const url = new URL(response.url());
    if (url.origin !== 'http://127.0.0.1:4173') external.push(response.url());
    else if (url.pathname.includes('/world/')) assets.push({ path: url.pathname, status: response.status() });
  });
  await page.goto('/');
  await expect(page.locator('#world-canvas')).toHaveAttribute('data-content', 'ready', { timeout: 30_000 });
  expect(external).toEqual([]);
  expect(assets.filter((a) => a.status !== 200)).toEqual([]);
  // 4 PBR sets x 3 maps, the lighting HDR, the sky backdrop, and the Blender tree and landmark models.
  expect(new Set(assets.map((a) => a.path)).size).toBe(16);
  for (const model of ['trees', 'landmark']) expect(assets.some((a) => a.path.endsWith(`/world/models/${model}.glb`))).toBe(true);
  expect(errors).toEqual([]);
});

