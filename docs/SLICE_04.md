# Slice 4 — Mobile/touch navigation baseline

**Branch:** `build/demo-district-v1`  
**Baseline:** `24009e1` (Node 26 toolchain on top of the verified Slice 3 source)  
**Status:** implemented and verified locally. Physical-device and native Sites acceptance remain pending.

## Delivered

- **Touch look:** a one-finger drag on the scene rotates the view (0.006 rad/px, the same direction as a mouse drag). An 8 px slop keeps taps and wobbles from nudging the camera, leaving taps free for Slice 14 selection.
- **Movement stick:** a compact frosted stick at the bottom left (112 px, 30% knob travel, 15% dead zone with a ramp from zero). Push distance sets the walking speed. Releasing it coasts to a stop; cancellation stops at once. Stick and look work together with two thumbs.
- **One controller:** `DesktopController` became `NavigationController`. Keyboard, mouse, and touch share one motion state and the engine's single scheduler, so inputs cannot fight over the camera. Stick math (`stickInput`) is pure and unit-tested in `motion.ts`.
- **Touch safety:** touches never take keyboard focus (compatibility mouse events are suppressed). The canvas keeps pinch zoom (`touch-action: pinch-zoom`); the stick blocks all gestures. Non-passive `touchmove` fallbacks cover incomplete `touch-action` support. Blur, hidden tabs, Escape/Tab, context loss, stop, and disposal release the stick and drags along with keys and momentum.
- **Touch layout:** touch-primary devices hide the keyboard hint, Explore button, and ready-state engine detail. The panel sits beside the stick, error details stay visible, and the speed label stays accessible. The stick hides whenever navigation is unavailable. This fixes the previous landscape-phone page overflow. At 390×844, 844×390, and 320×568 the controls cover less than 30% of the screen, the page never overflows, and targets are at least 44 px. Hybrid devices switch layouts on the first touch or mouse press.
- **Art direction:** the approved mockup is in [art/plaza-mockup.jpg](art/plaza-mockup.jpg), described in [WORLD_ART_DIRECTION.md](WORLD_ART_DIRECTION.md). The stick follows its frosted-pill HUD language.

No new dependency, plaza geometry, interaction targets, backend, merge, PR, or deployment is part of this slice.

## Verified execution (local)

Run on macOS with Node 26.8.2 / npm 11.19.1 from a clean `npm ci`. CI on the pushed commit is recorded separately.

| Check | Result |
| --- | --- |
| Free-only workflow policy | Passed. Workflow unchanged. |
| Clean locked install | Passed. No dependency changes. |
| Unit/repository/runtime/policy tests | 44 passed, 0 failed (5 new stick/touch-config cases). |
| Strict TypeScript, production build, static artifact check | Passed. |
| Production browser tests | 23 passed, 0 failed, 9 skipped by design (touch-only cases on the desktop project, keyboard-UI cases on the touch project). |
| Lifecycle/navigation/touch/actual HMR tests | 46 passed, 0 failed, 6 skipped by design (touch cases on the desktop project). |
| Runtime dependency audit | 0 vulnerabilities. |
| HMR test restored its temporary source edit | Confirmed. |

The touch lifecycle suite was mutation-checked. Removing the tap slop, removing the focus-protecting `preventDefault`, and letting a cancelled stick coast each made a test fail.

## Evidence boundaries

Touch tests drive real touch input through Chromium's DevTools protocol (`Input.dispatchTouchEvent`). They exercise Chromium's pointer-event generation, `touch-action`, and pointer capture. They are **not** iOS Safari or Android device testing: Safari's `touch-action` coverage, pinch-zoom arbitration, safe-area insets, thumb ergonomics, and frame rate still need a real phone. Use `npm run dev -- --host 0.0.0.0` on a trusted network to try it.

Two-finger pinch zoom over the canvas was not automated. The one-finger look drag already covers the path that cancels a look when a pinch begins.

The existing Three.js bundle-size warning remains for the performance slices. The world still has coarse perimeter bounds only. Native Sites validation remains pending. No deployment, merge, pull request, provisioning, or Site-access change was performed.

Contracts: [navigation](NAVIGATION.md), [engine](WORLD_ENGINE.md), [art direction](WORLD_ART_DIRECTION.md), [CI cost policy](CI_COST_POLICY.md), [roadmap](IMPLEMENTATION_PLAN.md).

Next: **Slice 5 — District graybox (6 Astra Pro).**
