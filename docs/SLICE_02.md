# Slice 2 — Three.js engine shell

**Branch:** `build/demo-district-v1`  
**Baseline:** `86247406a66deebdb41c5c0a25b401d797751819`  
**Status:** implementation prepared; independent CI verification pending.

## Delivered

Central renderer/scene/perspective-camera lifecycle; test cube and neutral floor;
DPR/pixel-budget/hardware-capped resizing; one animation loop; hidden/zero-size
suspension; reduced-motion on-demand rendering; context-loss recovery; complete
owned-resource cleanup; fresh-canvas re-entry and HMR; development-only statistics.
The initial canvas probe is removed. No movement, plaza, backend, or hosted project
is included. See [engine contract](WORLD_ENGINE.md).

## Acceptance evidence

The dependency-free clock, viewport, and resource-scope unit tests passed locally.
This container cannot resolve GitHub/the npm registry, so it has not performed a
full dependency install or browser build. The GitHub-connected CI run is the
independent execution path for the pinned full stack.

CI will verify clean install, existing repository checks, new runtime unit tests,
strict typecheck, production build/static output, production browser cases, and
real development-module lifecycle/HMR cases. Evidence is only recorded as passed
after those jobs actually succeed.

Native Sites acceptance is still pending. Chromium phone-sized testing is not
physical iPhone/Safari testing; synthetic visibility/page-transition checks test
handlers, not operating-system tab throttling or actual bfcache eligibility.
No deploy, merge, pull request, or Site-access change is part of this slice.

Next planned slice: **3 — First-person camera and desktop movement (6 Astra Pro).**
