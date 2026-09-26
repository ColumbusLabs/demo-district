# Navigation — Slices 3–4, collision from world pass 1

## Visitor controls

**Keyboard and mouse.** Click the scene or choose **Explore** to focus it. Use physical WASD keys to walk, drag the left mouse button to look, or use arrow keys for keyboard-only looking. Release the mouse to stop looking. Escape releases scene focus; Tab continues normal page navigation.

**Touch.** Drag one finger on the scene to look. Hold and push the movement stick (bottom left) to walk; how far you push sets the speed. Both work at once with two thumbs. Releasing the stick lets the walk ease to a stop. A tap or a small wobble (under 8 CSS px) does not move the camera, which leaves taps free for storefront selection in Slice 14. Two fingers on the scene still pinch-zoom the page.

**Everyone.** **Reset view** returns to the spawn without an animated camera flight. **Walk speed** offers Leisurely (2 m/s), Normal (3.2 m/s), and Brisk (5 m/s), which also caps the stick's top speed.

Nothing autofocuses or requests pointer lock. Browser shortcuts and mouse-wheel scrolling are not intercepted.

## Presentation by input type

`src/ui/input-modality.ts` sets `html[data-input]` to `touch` for touch-primary devices (`hover: none` and `pointer: coarse`) and then follows the most recent pointer, so a touch-screen laptop switches when it is touched. This only changes what is shown; the controller accepts every input at all times.

Touch layout: the stick is shown; the keyboard hint, Explore button, and ready-state engine detail are hidden; the walk-speed label becomes visually hidden but stays accessible; the panel sits to the right of the stick. Error details remain visible. The stick is also hidden whenever navigation is unavailable (loading, paused, graphics lost, or failed). On phone-sized viewports (390×844, 844×390, 320×568) the controls cover less than 30% of the screen, the page never overflows, and touch targets are at least 44 px.

The stick is `aria-hidden` and not focusable: keyboard and screen-reader users already have WASD, and search/direct navigation (Slices 16 and 41) is the accessible route to projects.

## Boundaries and tuning

`src/world/controls/motion.ts` is DOM/Three.js-independent. `movementConfig` copies and validates speed, acceleration/deceleration, mouse and touch look sensitivity, keyboard look speed, eye height, footprint radius, rectangular bounds, and spawn. Invalid speed or nonfinite/unusable geometry is rejected. `stickInput` maps a thumb offset to a unit-disc knob position and analog walking input.

**Collision.** `MovementConfig.blockers` lists solid footprints: oriented boxes (`x`, `z`, half extents, yaw `angle`) and circles. After each step the player's 0.3 m footprint is pushed out of any blocker it overlaps (up to four passes for corners) and velocity into the surface is cancelled, so walking along a wall slides. A spawn inside a blocker is pushed out. The district supplies its spawn, bounds, and blockers from `districtNavigation()` in `src/world/district/layout.ts`; blocker thickness is kept well above the 0.25 m maximum step so fast movement cannot tunnel.

Defaults: eye height 1.7 m, speed 3.2 m/s, acceleration 12/s, deceleration 18/s, mouse sensitivity 0.0025 rad/px, touch sensitivity 0.006 rad/px, keyboard look 1.5 rad/s, maximum pitch 84.6 degrees, footprint radius 0.3 m. Stick travel is 30% of the pad width with a 15% dead zone; output ramps from zero at the dead-zone edge. Without district settings (the engine test scene) the bounds are ±35 m and nothing is solid. The district's walkable area is x ±27 m, z −63 to 22 m, spawning at (0, 10) facing the landmark.

Velocity uses exact exponential integration for each fixed input/time segment. Keyboard and stick input add, then clamp to the unit disc, so diagonal or combined input is never faster than full speed. Walking stays in the XZ plane independent of pitch. Outward boundary velocity is cleared while tangential movement remains possible. A 50 ms simulation cap matches the engine's long-frame safety limit. Pitch is clamped and yaw wrapped; the camera uses YXZ Euler order with no roll, head bob, auto-pan, zoom pulse, or FOV animation.

## Ownership and scheduling

`createNavigationController(canvas, camera, options)` returns a `FrameSystem` plus `focus`, `resetView`, `setSpeed`, and a detached scalar `snapshot`. The application passes the world's `invalidate` callback, a running-state predicate, the optional `movePad` element, and `onStick` for knob presentation. `world.addSystem(controller)` registers updates and disposal with the world; there is no second scheduler and no production window-global controller.

One controller owns one motion state for every input type, so keyboard, mouse, and touch cannot fight over the camera. The engine calls systems before rendering. Reduced-motion mode freezes decorative cube animation but permits frames while the user is walking, looking, holding the stick, or decelerating; it returns to demand rendering when input settles. Look drags can repaint a demand-rendered frame immediately. Disposal is idempotent.

## Input safety

Keyboard input is accepted only while the canvas is deliberately focused and the world is running and visible. Text fields, selects, buttons, editable content, IME composition, and Ctrl/Meta/Alt shortcuts are excluded. A repeated keydown after input was cleared cannot reintroduce a stuck key.

Touch engages navigation without focusing the canvas. The session lasts while a finger is down and until momentum settles. Touch `pointerdown` events are default-prevented, which suppresses compatibility mouse events, so touching the scene or stick never moves keyboard focus. The canvas uses `touch-action: pinch-zoom` (one-finger drags look instead of panning; pinch zoom is kept); the stick uses `touch-action: none`. Non-passive `touchmove` handlers are a fallback for browsers with incomplete `touch-action` support: they block one-finger page panning during a look drag and all panning on the stick.

Canvas/window blur, Tab/Escape, hidden tabs, zero-sized canvases, world stop, graphics-context loss, and teardown clear held keys, the stick, look drags, and momentum. A cancelled stick stops immediately instead of coasting. A cancelled touch look ends just that drag, for example when two canvas fingers become a pinch. A cancelled mouse drag suspends all input as before. Pointer capture is temporary and released on up/cancel/loss/dispose; document-level move/up listeners are a fallback if capture is unavailable. All listeners are removed on disposal/HMR. Restoring a stopped or context-lost world preserves the view but does not restore held input.

## Verification

- Unit tests: configuration validation, frame-rate consistency, acceleration/deceleration, diagonal normalization, yaw/pitch behavior, bounds, time-step safety, reset, speed, stick dead zone/mapping/clamping/malformed input, and analog speed.
- Production browser tests: keyboard UI focus/escape, speed/reset, and reachability (pointer-primary project). Touch layout at three phone sizes, stick hidden when graphics are unavailable or lost, real CDP touch walking and looking that change rendered pixels without page scroll or focus change, and Reset view without focus theft (touch project).
- Lifecycle tests: real keyboard/mouse input, scoped input, bounds, demand-mode movement, suspension/recovery, cancellation, disposal, and camera continuity. Real CDP touch input covers look drag, tap slop, analog stick speed and coasting, two-finger stick-plus-look, reduced-motion frame release, and stick release on blur, hidden tab, cancellation, and disposal.

Touch tests use Chromium's touch emulation through the DevTools protocol. They verify pointer-event generation, `touch-action`, and capture in Chromium, not iOS Safari behavior or physical-device ergonomics. Run `npm run verify`, `npm run test:browser`, and `npm run test:lifecycle`.

Primary browser API references: https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events, https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action, and https://developer.mozilla.org/en-US/docs/Web/API/Element/setPointerCapture
