import { expect, test } from '@playwright/test';

test('production engine renders the test scene without external requests or development diagnostics', async ({ page }, info) => {
  const errors: string[] = [];
  const externalRequests: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('request', (request) => {
    if (new URL(request.url()).origin !== 'http://127.0.0.1:4173') externalRequests.push(request.url());
  });
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle('Demo District — Engine preview');
  await expect(page.getByRole('heading', { name: 'Demo District', exact: true })).toBeVisible();
  await expect(page.locator('#runtime-status')).toHaveAttribute('data-state', 'ready');
  await expect(page.locator('#runtime-detail')).toContainText('Three.js r186');
  expect(await page.locator('#world-canvas').evaluate((element) => {
    const canvas = element as HTMLCanvasElement;
    const gl = canvas.getContext('webgl2');
    return gl !== null && !gl.isContextLost() && canvas.width > 1 && canvas.height > 1;
  })).toBe(true);
  await expect(page.locator('[data-world-diagnostics]')).toHaveCount(0);
  expect(errors).toEqual([]);
  expect(externalRequests).toEqual([]);
  await page.screenshot({ path: info.outputPath('engine.png'), fullPage: true });
});

test('canvas follows portrait, landscape, and desktop size with a capped backing buffer', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#runtime-status')).toHaveAttribute('data-state', 'ready');
  for (const size of [{ width: 390, height: 844 }, { width: 844, height: 390 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(size);
    await expect.poll(async () => page.locator('#world-canvas').evaluate((element) => {
      const canvas = element as HTMLCanvasElement;
      const box = canvas.getBoundingClientRect();
      const ratio = Math.min(devicePixelRatio, 2, Math.sqrt(3_686_400 / (box.width * box.height)));
      return box.width === innerWidth && box.height === innerHeight &&
        Math.abs(canvas.width - Math.floor(box.width * ratio)) <= 1 &&
        Math.abs(canvas.height - Math.floor(box.height * ratio)) <= 1 &&
        document.documentElement.scrollWidth <= document.documentElement.clientWidth;
    })).toBe(true);
  }
});

test('unavailable WebGL shows useful fallback instead of a blank page', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...args: unknown[]) {
      if (type === 'webgl2' || type === 'webgl' || type === 'experimental-webgl') return null;
      return Reflect.apply(original, this, [type, ...args]);
    } as typeof original;
  });
  await page.goto('/');
  await expect(page.locator('#runtime-status')).toHaveAttribute('data-state', 'unavailable');
  await expect(page.locator('#runtime-detail')).toContainText('graphics acceleration');
  await expect(page.getByRole('heading', { name: 'Demo District', exact: true })).toBeVisible();
});

test('real graphics context loss recovers the production renderer', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#runtime-status')).toHaveAttribute('data-state', 'ready');
  await page.locator('#world-canvas').evaluate((element) => {
    const canvas = element as HTMLCanvasElement;
    const extension = canvas.getContext('webgl2')?.getExtension('WEBGL_lose_context');
    if (!extension) throw new Error('Test browser must support context loss.');
    canvas.addEventListener('webglcontextlost', () => { setTimeout(() => extension.restoreContext(), 500); }, { once: true });
    extension.loseContext();
  });
  await expect(page.locator('#runtime-status')).toHaveAttribute('data-state', 'unavailable');
  await expect(page.locator('#runtime-detail')).toContainText('restore graphics');
  await expect(page.locator('#runtime-status')).toHaveAttribute('data-state', 'ready');
});

test('reduced motion retains a rendered scene without capturing the pointer', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('#runtime-status')).toHaveAttribute('data-state', 'ready');
  expect(await page.evaluate(() => ({ animations: document.getAnimations().length, captured: document.pointerLockElement !== null })))
    .toEqual({ animations: 0, captured: false });
});

test('no-JavaScript visitors receive identity and an explanation', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:4173/');
    await expect(page.getByRole('heading', { name: 'Demo District', exact: true })).toBeVisible();
    await expect(page.locator('noscript p')).toContainText('JavaScript is disabled');
    await expect(page.locator('noscript p')).toBeVisible();
  } finally { await context.close(); }
});

test('back-forward cache page lifecycle pauses and resumes without remounting', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#runtime-status')).toHaveAttribute('data-state', 'ready');
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })));
  await expect(page.locator('#runtime-status')).toHaveAttribute('data-state', 'paused');
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
  await expect(page.locator('#runtime-status')).toHaveAttribute('data-state', 'ready');
  await expect(page.locator('#world-canvas')).toHaveCount(1);
});
