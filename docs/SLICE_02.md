# Slice 2 — Three.js engine shell

**Branch:** `build/demo-district-v1`  
**Baseline:** `86247406a66deebdb41c5c0a25b401d797751819`  
**Status:** implementation complete; verification checkpoints recorded below. Native Sites acceptance remains pending.

## Delivered

- Central renderer, scene, perspective camera, and explicit create/start/stop/resize/destroy lifecycle.
- A real test cube and neutral floor, with no remote assets or creator experiences.
- Backing-buffer resizing capped by DPR, total pixels, and the GPU's dimension limit; camera projection stays synchronized.
- One animation scheduler, hidden-tab/zero-size suspension, and bounded simulation deltas.
- Reduced-motion demand rendering, including repaint after a hidden canvas returns at the same size.
- Real graphics-context loss/restoration handling and a useful unavailable-renderer fallback.
- Owned GPU-resource registration and idempotent disposal, fresh-canvas re-entry, and actual Vite HMR.
- Development-only renderer statistics; no production HUD or window-global debug API.

The original canvas probe is removed. No movement, plaza, backend, storage, or
hosted project was added. See [engine contract](WORLD_ENGINE.md).

## Verified checkpoint

Run: https://github.com/ColumbusLabs/demo-district/actions/runs/36054505223  
Tested source: `84da0e26c6061825b74d756f3f32b1969b881244`

Clean npm ci; 11 repository/runtime unit tests; strict TypeScript; Vite production
build; static artifact/HUD-exclusion checks; 14 production-browser cases; and 18
development lifecycle cases, including an actual source-edit HMR test, passed.
Both browser reports recorded zero skipped, unexpected, or flaky cases. The runtime
dependency audit and post-test clean-tree check also passed.

The CI screenshots were inspected at desktop and phone-sized viewports: real
cube/floor rendering, readable preview/status text, and no layout overflow.

## Final hardening after that checkpoint

Added explicit resource registration through `world.own`, repaint on same-size
resume in reduced-motion mode, and stronger tests for shared-resource disposal,
hidden-canvas demand rendering, and exactly one frame loop after actual HMR.
The normal read-only CI reruns the complete suite for these changes; its result
on the final source commit is the authoritative check for that commit.

The temporary success-only documentation job has been removed along with its
helper. CI now has only read permissions, does not modify tracked files, and has
no deployment, publication, merge, or repository-write step. The implementation
plan, README, and agent contract were updated without rewriting future slices.

## Evidence boundaries

Dependency-free clock, sizing, and resource-scope tests also passed in the chat
container. The full locked install/build/browser checks were executed independently
in GitHub Actions, not claimed as local runs in a network-restricted container.

Browser cases use real Three.js/WebGL 2 in Chromium/SwiftShader at desktop and
phone-sized viewports. This is not physical iPhone/Safari testing or a device FPS
benchmark. Visibility/page-transition signals test handlers rather than actual
operating-system backgrounding or bfcache eligibility.

Native Sites acceptance is still pending. No deployment, merge, pull request,
Site provisioning, or Site-access change was performed.

Next: **Slice 3 — First-person camera and desktop movement (6 Astra Pro).**
