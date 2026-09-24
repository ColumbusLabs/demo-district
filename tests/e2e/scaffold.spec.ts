import { expect, test } from '@playwright/test';

test('production page initializes the actual Three.js WebGL canvas without remote requests', async ({ page }, info) => {
  const errors: string[] = [];
  const externalRequests: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('request', (request) => {
    if (new URL(request.url()).origin !== 'http://127.0.0.1:4173') externalRequests.push(request.url());
  });
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle('Demo District — Foundation preview');
  await expect(page.getByRole('heading', { name: 'Demo District', exact: true })).toBeVisible();
  await expect(page.locator('#runtime-status')).toHaveAttribute('data-state', 'ready');
  await expect(page.locator('#runtime-detail')).toContainText('Three.js r186');
  expect(await page.locator('#world-canvas').evaluate((element) => {
    const gl = (element as HTMLCanvasElement).getContext('webgl2');
    return gl !== null && !gl.isContextLost();
  })).toBe(true);
  expect(errors).toEqual([]);
  expect(externalRequests).toEqual([]);
  await page.screenshot({ path: info.outputPath('foundation.png'), fullPage: true });
});

test('canvas fills the viewport and the shell has no horizontal overflow after resize', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#runtime-status')).toHaveAttribute('data-state', 'ready');
  for (const size of [{ width: 390, height: 844 }, { width: 844, height: 390 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(size);
    const metrics = await page.locator('#world-canvas').evaluate((canvas) => {
      const bounds = canvas.getBoundingClientRect();
      return { width: bounds.width, height: bounds.height, viewportWidth: innerWidth, viewportHeight: innerHeight,
        pageWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth };
    });
    expect(metrics.width).toBe(metrics.viewportWidth);
    expect(metrics.height).toBe(metrics.viewportHeight);
    expect(metrics.pageWidth).toBeLessThanOrEqual(metrics.clientWidth);
  }
});

test('unavailable WebGL shows useful fallback instead of a blank page', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type: string, ...args: unknown[]) {
      if (type === 'webgl2' || type === 'webgl' || type === 'experimental-webgl') return null;
      return Reflect.apply(original, this, [type, ...args]);
    } as typeof original;
  });
  await page.goto('/');
  await expect(page.locator('#runtime-status')).toHaveAttribute('data-state', 'unavailable');
  await expect(page.locator('#runtime-detail')).toContainText('graphics acceleration');
  await expect(page.getByRole('heading', { name: 'Demo District', exact: true })).toBeVisible();
});

test('graphics context loss changes status without trapping the page', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#runtime-status')).toHaveAttribute('data-state', 'ready');
  await page.locator('#world-canvas').evaluate((canvas) => {
    canvas.dispatchEvent(new Event('webglcontextlost'));
  });
  await expect(page.locator('#runtime-status')).toHaveAttribute('data-state', 'unavailable');
  await expect(page.locator('#runtime-detail')).toContainText('Reload this preview');
});

test('reduced motion does not start animations or capture the pointer', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('#runtime-status')).toHaveAttribute('data-state', 'ready');
  expect(await page.evaluate(() => ({ animations: document.getAnimations().length, captured: document.pointerLockElement !== null })))
    .toEqual({ animations: 0, captured: false });
});

test('no-JavaScript visitors still receive the project identity and an explanation', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:4173/');
    await expect(page.getByRole('heading', { name: 'Demo District', exact: true })).toBeVisible();
    await expect(page.locator('noscript')).toContainText('JavaScript is disabled');
  } finally { await context.close(); }
});
