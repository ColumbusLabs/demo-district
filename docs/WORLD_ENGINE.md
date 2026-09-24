# World engine — through Slice 4

## Scope

`src/world/World.ts` owns the renderer, perspective camera, and scene lifecycle.
The preview contains a slowly rotating diagnostic cube on a neutral floor with two
inexpensive lights. Slices 3 and 4 add first-person keyboard, mouse, and touch
navigation through a separate controller; the district itself and creator directory
are later work. Dependencies remain as locked in Slice 1. No remote assets or creator sites
are loaded. See [navigation](NAVIGATION.md).

## Ownership and API

- `createWorld(canvas, options?)` creates one renderer, scene, and perspective camera.
  It measures the viewport but does not start continuous rendering.
- `start()` requests rendering; repeated calls do not create another loop.
- `stop()` cancels frame work, clears system input through suspension, and resets
  the delta clock; repeated calls are safe.
- `resize()` synchronizes CSS dimensions, drawing buffer, and camera projection.
- `invalidate()` requests a redraw/reconciliation without creating another scheduler.
- `addSystem(system)` registers a `FrameSystem` for updates and lifetime ownership.
  It returns a detacher that unregisters and suspends the system. Detachment is not
  disposal: resource ownership remains with the world until destruction.
- `snapshot()` returns a detached diagnostic value, not mutable renderer state.
- `own(resource)` registers a disposable owned by this world, returning it unchanged.
- `destroy()` is terminal and idempotent. It cancels animation, unsubscribes browser
  events/observers/media queries, disposes owned systems/materials/geometries, clears
  the scene, disposes the renderer, and loses the retired canvas context.
- Supply a **fresh canvas** after destruction. `mountApplication` handles this,
  including repeated entry and real Vite hot-module replacement.
- A second simultaneous owner of the same canvas is rejected.
- Scene and camera references are available to world/controllers; the renderer
  stays private. No Three.js objects or controller handles are installed on `window`.

`ResourceScope` explicitly tracks ownership and disposes shared resources once.
Register future owned geometries, materials, textures, and other disposables with
`world.own(resource)`; scene factories receive the scope directly. Attaching an
object to the scene is **not** ownership registration. Do not dispose assets shared
with another world. Cleanup continues through individual resource failures before
reporting an aggregate error. Systems must implement idempotent `dispose()`.

## System contract

A `FrameSystem` implements `update(deltaSeconds)`, `needsFrame()`, `suspend()`, and
`dispose()`. The engine updates systems before rendering. Controllers must never
start a timer, requestAnimationFrame loop, or another renderer. Input handlers can
use `world.invalidate()`; `suspend()` must not request rendering or re-enter the
engine. Suspension clears held keys, velocity, and temporary drag capture.

## Scheduling and resilience

The renderer's `setAnimationLoop` is the sole animation scheduler. Hidden tabs,
zero-sized canvases, explicit stops, and lost contexts suspend it and registered
systems. The clock discards time spent suspended and clamps simulation deltas to
50 ms. This is a safety limit, not an FPS measurement.

Reduced-motion mode freezes decorative test-object animation. It uses demand
rendering when idle, but temporarily enables the same loop for user-directed
walking/keyboard look and deceleration. Once input/momentum settles, the loop is
removed. Mouse drag, resize, restoration, and resuming a hidden canvas can redraw
on demand. Even an unchanged-size canvas repaints after resuming. Preference changes
are handled while the page is open. No pointer lock is requested.

A real `webglcontextlost` event cancels the loop, clears navigation input, and shows
a recovery message. `webglcontextrestored` reapplies buffer/projection state after
Three.js restores its internals. Returning does not resurrect old held keys.
Terminal render errors stop safely. Partial initialization failures release resources.

At application level, persisted `pagehide`/`pageshow` signals stop/resume without
remounting. Non-persisted departure and HMR unmount clean up the world/controller.
Tests exercise these signals, not every browser's actual back-forward-cache policy.

## Resolution

CSS controls canvas layout. Backing-buffer resolution is limited by DPR 2, a
3,686,400-pixel budget, and the GPU's maximum renderbuffer dimension. Large viewports
may use DPR below 1. A zero/invalid size waits for usable layout instead of allocating
an invalid buffer.

ResizeObserver, window/visual-viewport resize, and a re-armed resolution media query
handle layout, orientation, zoom, and monitor-DPR changes. Perspective projection
updates with the buffer. These are engine defaults, not the later quality-tier system.

## Development diagnostics

`npm run dev` includes a small HUD showing state, loop mode, frames, draw calls,
triangles, resource counts, and buffer size/DPR. Updates are throttled to four per
second during continuous rendering. No timer or global debug API is used. Vite's
DEV guard removes it from production; artifact/browser tests verify that boundary.

## Verification

```sh
node scripts/check-ci-policy.mjs
npm ci
npm run verify
npx --no-install playwright install chromium
npm run test:browser
npm run test:lifecycle
```

Production tests use `dist/` on 4173. Lifecycle tests use development modules on
5173 and restore the temporary source edit used to verify actual HMR. They run
serially to avoid source-change interference. Browser tests use actual Three.js/
WebGL 2 through Chromium/SwiftShader at desktop and phone-sized viewports, not
physical iPhone/Safari or GPU benchmarks. Native Sites acceptance remains pending.
See [Slice 4 evidence](SLICE_04.md) and the [no-paid CI policy](CI_COST_POLICY.md).

## Primary API references

- https://threejs.org/docs/pages/WebGLRenderer.html
- https://threejs.org/docs/pages/BufferGeometry.html
- https://threejs.org/docs/pages/Material.html

Next code boundary: Slice 5, the district graybox. No plaza, backend, storage,
authentication, or creator data is implemented yet.
