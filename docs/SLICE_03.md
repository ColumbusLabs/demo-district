# Slice 3 — First-person desktop navigation

**Branch:** `build/demo-district-v1`  
**Baseline:** `8fb3b72f32849d3cf344734b01484dc76e173685`  
**Status:** implementation checkpoint; full CI verification pending.

## Delivered

- Focus-scoped WASD walking and mouse drag/arrow-key looking, without pointer lock or automatic focus.
- Frame-rate-independent movement smoothing, normalized diagonal speed, fixed human eye height, yaw/pitch limits, configurable speeds, coarse perimeter bounds, and reset.
- Input cleanup on blur, Escape/Tab, suspension, context loss, pointer cancellation, and disposal.
- Controller registration in the world's one scheduler. Reduced motion remains navigable and returns to idle demand rendering after movement settles.
- Accessible focus/reset/speed controls and clear separation from the future plaza/touch implementation.
- Unit, real-browser navigation, and existing lifecycle/HMR regression coverage.
- Public-only standard Ubuntu CI; disabled cache/artifact storage; fail-closed workflow policy plus negative tests.

No new dependency, plaza, touch controller, backend, project loading, merge, PR, or deployment is part of this slice. Native Sites validation is still pending.

## Acceptance

Implementation and tests are committed together. Check the CI result for the exact source commit; no unrun result is recorded as a pass here. The chat container cannot reach GitHub/npm by DNS, so full dependency/build/browser verification is performed on the approved public-repository standard Ubuntu runner.

Detailed contracts: [navigation](DESKTOP_NAVIGATION.md), [engine](WORLD_ENGINE.md), [CI cost policy](CI_COST_POLICY.md).

Next planned slice after verification: **4 — Mobile/touch navigation baseline (5.6 Sol).**
