# Desktop navigation — Slice 3

## Visitor controls

Click the scene or choose **Explore** to focus it. Use physical WASD keys to walk, drag the left mouse button to look, or use arrow keys for keyboard-only looking. Release the mouse to stop looking. Escape releases scene focus; Tab continues normal page navigation. **Reset view** returns to the spawn without an animated camera flight. **Walk speed** offers Leisurely (2 m/s), Normal (3.2 m/s), and Brisk (5 m/s).

Nothing autofocuses or requests pointer lock. Native scrolling/zoom and browser shortcuts are not intercepted. Touch pointers are ignored by this controller: touch navigation is Slice 4. Keyboard/mouse input remains testable at phone-sized viewports; that is not a claim of touch support.

## Boundaries and tuning

`src/world/controls/motion.ts` is DOM/Three.js-independent. `movementConfig` copies and validates speed, acceleration/deceleration, sensitivity, keyboard look speed, eye height, footprint radius, rectangular bounds, and spawn. Invalid speed or nonfinite/unusable geometry is rejected.

Defaults: eye height 1.7 m, speed 3.2 m/s, acceleration 12/s, deceleration 18/s, mouse sensitivity 0.0025 rad/pixel, keyboard look 1.5 rad/s, maximum pitch 84.6 degrees, footprint radius 0.3 m. The test floor is 80 m square and permitted center coordinates are inside +/-34.7 m. These are coarse perimeter bounds, not raycast collision or full scene physics. The diagnostic cube is not a solid obstacle. The pavilion/path slices will supply real navigation geometry later.

Velocity follows exact exponential integration for each fixed input/time segment rather than per-frame interpolation. Diagonal input is normalized. Walking stays in the XZ plane independent of pitch. Outward boundary velocity is cleared while tangential movement remains possible. A 50 ms simulation cap matches the engine's long-frame safety limit. Pitch is clamped and yaw wrapped; the camera uses YXZ Euler order and no roll, head bob, auto-pan, zoom pulse, or FOV animation.

## Ownership and scheduling

`createDesktopController(canvas, camera, options)` returns a `FrameSystem` plus `focus`, `resetView`, `setSpeed`, and a detached scalar `snapshot`. The application passes the world's `invalidate` callback and a running-state predicate. `world.addSystem(controller)` registers updates and disposal with the world; there is no second scheduler and no production window-global controller.

The engine calls systems before rendering. Reduced-motion mode freezes decorative cube animation but permits frames while the user is walking/looking or decelerating; it returns to demand rendering when input settles. Mouse look can repaint a demand-rendered frame immediately. Detaching a system suspends it; resource ownership remains with the world until destruction. Disposal must be idempotent.

## Input safety

Input is accepted only while the canvas is deliberately focused and the world is running/visible. Text fields, selects, buttons, editable content, IME composition, and Ctrl/Meta/Alt shortcuts are excluded. A repeated keydown after input was cleared cannot reintroduce a stuck key.

Canvas/window blur, Tab/Escape, hidden tabs, zero-sized canvases, world stop, graphics-context loss, pointer cancellation, and teardown clear held keys and momentum. Mouse capture is temporary and released on up/cancel/loss/dispose; document-level move/up listeners provide a fallback if capture is unavailable. All listeners are removed on disposal/HMR. Restoring a stopped/context-lost world preserves the view but does not restore previously held keys.

## Verification

- Unit tests: configuration validation, frame-rate consistency, acceleration/deceleration, diagonal normalization, yaw/pitch behavior, bounds, time-step safety, reset, and speed.
- Production browser tests: real UI focus/escape, speed/reset, keyboard reachability, and changed rendered pixels from walking with decorative animation frozen.
- Lifecycle tests: real keyboard/mouse input, scoped input, bounds, demand-mode movement, suspension/recovery, cancellation, disposal, and camera continuity.
- Existing engine, HMR, no-remote-request, no-WebGL, and fallback checks remain in place.

Run `npm run verify`, `npm run test:browser`, and `npm run test:lifecycle`. CI is restricted by [the no-paid policy](CI_COST_POLICY.md). Native Sites acceptance, physical devices, and later district visuals remain separate gates.

Primary browser API references: https://developer.mozilla.org/en-US/docs/Web/API/Element/setPointerCapture and https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events
