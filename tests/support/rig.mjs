import { expect } from '@playwright/test';

// Mounts a bare world plus navigation controller on development modules and exposes them as
// window.__nav for lifecycle assertions. Frame requests are counted in window.__frames.
export async function setup(page, config = {}) {
  await page.addInitScript(() => {
    const request = window.requestAnimationFrame.bind(window);
    const cancel = window.cancelAnimationFrame.bind(window);
    const pending = new Set();
    window.requestAnimationFrame = (callback) => {
      const id = request((time) => { pending.delete(id); callback(time); });
      pending.add(id); return id;
    };
    window.cancelAnimationFrame = (id) => { pending.delete(id); cancel(id); };
    Object.defineProperty(window, '__frames', { get: () => pending.size });
  });
  await page.goto('/?engine-test');
  await expect(page.locator('#runtime-status')).toHaveAttribute('data-state', 'ready');
  await page.evaluate(async (config) => {
    const bootstrap = '/src/app/bootstrap.ts';
    const { mountApplication } = await import(bootstrap);
    mountApplication(document)();
    const old = document.querySelector('#world-canvas');
    const canvas = old.cloneNode(false); old.replaceWith(canvas);
    const worldPath = '/src/world/World.ts';
    const controlPath = '/src/world/controls/NavigationController.ts';
    const { createWorld } = await import(worldPath);
    const { createNavigationController } = await import(controlPath);
    const world = createWorld(canvas);
    const control = createNavigationController(canvas, world.camera, {
      config, movePad: document.querySelector('#move-pad'), invalidate: () => world.invalidate(), canNavigate: () => world.snapshot().state === 'running',
    });
    world.addSystem(control);
    // The unmounted application hid its stick and reset its loading overlay (ready for a
    // remount); this bare rig drives the stick itself and needs the overlay out of the way.
    document.querySelector('#move-pad').hidden = false;
    document.querySelector('#loading').setAttribute('data-done', '');
    window.__nav = { world, control };
    world.start();
  }, config);
}
export const state = (page) => page.evaluate(() => window.__nav.control.snapshot());
export const engine = (page) => page.evaluate(() => window.__nav.world.snapshot());
export const settle = (page) => expect.poll(async () => {
  const s = await state(page); return s.vx === 0 && s.vz === 0;
}).toBe(true);
