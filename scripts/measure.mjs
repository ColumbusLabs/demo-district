// Performance baseline for the district (slice 18). Run against the dev server on a real GPU:
//   npm run dev   (separate terminal)
//   node scripts/measure.mjs [--angle=metal|swiftshader] [--frames=60]
// Each view renders synchronously and a 1-pixel readback forces the GPU to finish, so the
// times are true per-frame cost (not vsync-capped rates). Numbers are machine-specific.
import { chromium } from '@playwright/test';

const arg = (name, fallback) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? fallback;
const angle = arg('angle', process.platform === 'darwin' ? 'metal' : 'default');
const frames = Number(arg('frames', 60));
const base = arg('url', 'http://127.0.0.1:5173');
const views = { warmup: [0, 10, 0, 0.035], spawn: [0, 10, 0, 0.035], plaza: [0, -22, 0, 0.12], promenade: [-12, -30, -0.3, 0.02], storefront: [-8.5, -20, 1.45, 0.02] };
const sizes = Object.fromEntries(Object.entries({ desktop: [1440, 900, 1], laptop2x: [1440, 900, 2], phone: [390, 844, 3] }).filter(([name]) => (arg('sizes', 'desktop,laptop2x,phone')).split(',').includes(name)));

const browser = await chromium.launch({ args: [`--use-angle=${angle}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const rows = [];
for (const [sizeName, [width, height, dpr]] of Object.entries(sizes)) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: dpr });
  await page.goto(`${base}/?engine-test`);
  await page.waitForSelector('#runtime-status[data-state="ready"]');
  for (const tier of arg('tiers', 'high,medium,low').split(',')) {
    const result = await page.evaluate(async ({ tier, views, frames }) => {
      const load = (p) => import(p);
      (await load('/src/app/bootstrap.ts')).mountApplication(document)();
      window.__measureWorld?.destroy();
      document.querySelector('#loading')?.setAttribute('data-done', '');
      const old = document.querySelector('#world-canvas'); const canvas = old.cloneNode(false); old.replaceWith(canvas);
      const { createWorld } = await load('/src/world/World.ts');
      const { createDistrict } = await load('/src/world/district/index.ts');
      const t0 = performance.now();
      let ready; const done = new Promise((r) => { ready = r; });
      const world = createWorld(canvas, { content: (context) => createDistrict(context, { quality: tier }), onContentReady: () => ready() });
      window.__measureWorld = world;
      world.start(); await done;
      const readyMs = performance.now() - t0;
      const gl = canvas.getContext('webgl2'); const px = new Uint8Array(4);
      const out = { readyMs, views: {} };
      for (const [name, [x, z, yaw, pitch]] of Object.entries(views)) {
        world.camera.position.set(x, 1.7, z); world.camera.rotation.set(pitch, yaw, 0, 'YXZ');
        const times = [];
        for (let i = 0; i < frames + 5; i++) {
          const s = performance.now(); world.invalidate(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
          if (i >= 5) times.push(performance.now() - s);
        }
        times.sort((a, b) => a - b);
        const snap = world.snapshot();
        out.views[name] = { median: times[Math.floor(times.length / 2)], p95: times[Math.floor(times.length * 0.95)], draws: snap.drawCalls, triangles: snap.triangles, buffer: `${snap.viewport.bufferWidth}x${snap.viewport.bufferHeight}` };
      }
      out.memory = { geometries: world.snapshot().geometries, textures: world.snapshot().textures };
      return out;
    }, { tier, views, frames });
    for (const [view, v] of Object.entries(result.views)) if (view !== 'warmup') rows.push({ size: sizeName, tier, view, ...v, readyMs: result.readyMs, ...result.memory });
  }
  await page.close();
}
const gpu = await (async () => { const p = await browser.newPage(); await p.goto('about:blank'); const r = await p.evaluate(() => { const gl = document.createElement('canvas').getContext('webgl2'); const e = gl?.getExtension('WEBGL_debug_renderer_info'); return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'unknown'; }); await p.close(); return r; })();
await browser.close();
console.log(`GPU: ${gpu}\n`);
console.log('| size | tier | view | buffer | median ms | p95 ms | draws | triangles |');
console.log('| --- | --- | --- | --- | --- | --- | --- | --- |');
for (const r of rows) console.log(`| ${r.size} | ${r.tier} | ${r.view} | ${r.buffer} | ${r.median.toFixed(2)} | ${r.p95.toFixed(2)} | ${r.draws} | ${r.triangles} |`);
const byTier = {};
for (const r of rows) byTier[`${r.size}/${r.tier}`] = `${Math.round(r.readyMs)} ms ready, ${r.geometries} geometries, ${r.textures} textures`;
console.log('\nContent ready and GPU memory objects:');
for (const [k, v] of Object.entries(byTier)) console.log(`- ${k}: ${v}`);
