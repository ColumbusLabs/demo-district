# World engine — Slice 2

## Scope

`src/world/World.ts` replaces the Slice 1 canvas probe. The preview renders only a
slowly rotating test cube on a neutral floor with two inexpensive lights. It is
not the approved plaza, a movement controller, or a project directory. Dependencies
remain exactly as locked in Slice 1. No remote assets or creator sites are loaded.

## Ownership and API

- `createWorld(canvas, options?)` creates one renderer, scene, and perspective camera.
  It measures the viewport but does not start continuous rendering.
- `start()` requests rendering; repeated calls do not create another loop.
- `stop()` cancels frame work and resets the delta clock; repeated calls are safe.
- `resize()` synchronizes CSS dimensions, drawing buffer, and camera projection.
- `snapshot()` returns a detached diagnostic value, not mutable renderer state.
- `destroy()` is terminal and idempotent. It cancels animation, unsubscribes browser
  events/observers/media queries, disposes owned materials/geometries, clears the
  scene, disposes the renderer, and deliberately loses the retired canvas context.
- Supply a **fresh canvas** after destruction. `mountApplication` handles this,
  including repeated entry and real Vite hot-module replacement. Do not reuse a
  canvas whose context has been deliberately retired.
- A second simultaneous owner of the same canvas is rejected.
- Scene and camera references are available for later world/controller slices;
  the renderer stays private. No Three.js objects are installed on `window`.

`ResourceScope` explicitly tracks ownership and disposes shared resources once.
Register future geometries, materials, textures, and other owned disposables with
that scope; attaching an object to the scene is **not** ownership registration.
Do not indiscriminately dispose assets shared with another world. Resource cleanup
continues through individual failures before reporting an aggregate error.

## Scheduling and resilience

The renderer's `setAnimationLoop` is the sole animation scheduler. Hidden tabs,
zero-sized canvases, an explicit stop, and lost graphics contexts suspend it.
The clock discards time spent suspended and clamps resumed/long-frame simulation
deltas to 50 ms. This is a simulation safety limit, not an FPS measurement.

Reduced-motion mode freezes the test object's animation and renders on demand
(initial frame, resize, restoration) without an ongoing loop. Preference changes
are handled while the page is open. No pointer capture or controls are installed.

A real `webglcontextlost` event cancels the loop and shows a recovery message.
`webglcontextrestored` reapplies buffer/projection state and resumes the requested
mode after Three.js restores its internals. Terminal render errors stop safely.
Partial initialization failures also release already-allocated resources.

At application level, persisted `pagehide`/`pageshow` events stop/resume for
back-forward-cache use. Non-persisted departure and HMR unmount clean up the world.
The tests exercise page-transition signals; they do not certify every browser's
actual back-forward-cache eligibility or eviction policy.

## Resolution

CSS remains the authority for canvas layout. Backing-buffer resolution is limited
by DPR 2, a 3,686,400-pixel budget, and the GPU's maximum renderbuffer dimension.
Very large viewports may use DPR below 1. A zero/invalid size waits for usable
layout instead of allocating an invalid buffer.

ResizeObserver, window/visual-viewport resize, and a re-armed resolution media
query handle layout, orientation, zoom, and monitor-DPR changes. Perspective
aspect/projection updates happen with the buffer resize. These are conservative
engine defaults, not the later adaptive-quality system or a device FPS promise.

## Development diagnostics

`npm run dev` includes a small HUD showing state, loop mode, frames, draw calls,
triangles, resource counts, and backing-buffer size/DPR. Updates are throttled to
four per second during continuous rendering. No timer or global debug API is used.
The HUD implementation is removed from the production bundle by Vite's DEV guard;
`check:dist` and production-browser tests verify this boundary.

## Verification

```
npm ci
npm run verify
npx playwright install chromium
npm run test:browser
npm run test:lifecycle
```

Production tests use `dist/` on 4173. Lifecycle tests use the real development
modules on 5173 and include an actual temporary source edit to verify HMR, restored
in a `finally` block. They run serially to avoid source-change interference.
Browser tests run real Three.js/WebGL 2 through Chromium/SwiftShader at desktop
and phone-sized viewports. Neither physical iPhone/Safari nor GPU performance is
claimed. The native Sites acceptance gate also remains pending.

## Primary API references

- Three.js renderer lifecycle, animation loop, drawing buffer, and diagnostics:
  https://threejs.org/docs/pages/WebGLRenderer.html
- Three.js geometry disposal: https://threejs.org/docs/pages/BufferGeometry.html
- Three.js material disposal: https://threejs.org/docs/pages/Material.html

Next code boundary: Slice 3, first-person desktop camera and movement. No plaza,
backend, storage, authentication, or creator data was implemented in this slice.
