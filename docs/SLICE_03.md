# Slice 3 — First-person desktop navigation

**Branch:** `build/demo-district-v1`  
**Baseline:** `8fb3b72f32849d3cf344734b01484dc76e173685`  
**Status:** implemented and verified. Native Sites acceptance remains pending.

## Delivered

- Focus-scoped WASD walking and mouse drag/arrow-key looking, without pointer lock or automatic focus.
- Frame-rate-independent movement smoothing, normalized diagonal speed, fixed human eye height, yaw/pitch limits, configurable speeds, coarse perimeter bounds, and reset.
- Input cleanup on blur, Escape/Tab, suspension, context loss, pointer cancellation, and disposal.
- Controller registration in the world's one scheduler. Reduced motion remains navigable and returns to idle demand rendering after movement settles.
- Accessible focus/reset/speed controls and clear separation from the future plaza/touch implementation.
- Unit, real-browser navigation, and existing lifecycle/HMR regression coverage.
- Public-only standard Ubuntu CI; disabled cache/artifact uploads; fail-closed workflow policy plus negative tests.

No new dependency, plaza, touch controller, backend, project loading, merge, PR, or deployment is part of this slice.

## Verified execution

**Tested source:** `939e655edfaaedc45ebf419309ba5a13fab6ec57`  
**GitHub Actions run:** https://github.com/ColumbusLabs/demo-district/actions/runs/36061990467  
**Job:** `107842861596` — success, completed September 24, 2026.

| Check | Result |
| --- | --- |
| Pre-push free-only workflow policy | Passed in the chat container; repeated successfully in CI. |
| Clean locked install (`npm ci`) | Passed. No dependency or lockfile changes. |
| Unit/repository/runtime/policy tests | 39 passed, 0 failed, 0 skipped. Includes 14 movement cases and 14 cost-policy cases. |
| Strict TypeScript | Passed. |
| Production build | Passed. |
| Static output / no remote entries / development HUD exclusion | Passed. |
| Production browser tests | 20 passed, 0 unexpected, 0 flaky, 0 skipped. |
| Lifecycle/navigation/actual HMR tests | 40 passed, 0 unexpected, 0 flaky, 0 skipped. |
| Runtime dependency audit | Passed, zero reported vulnerabilities. |
| Tests restore tracked source after HMR | Passed (`git diff --exit-code`). |

Production browser coverage verifies deliberate control focus, escape, speed/reset,
keyboard reachability, and a change in rendered scene pixels during walking with
decorative animation frozen. Lifecycle coverage verifies actual keyboard/mouse
input, world-relative motion, perimeter constraints, input clearing, graphics
loss/restoration, demand rendering, disposal, and the existing one-loop/HMR contract.

This documentation checkpoint follows the verified implementation without changing
its source, tests, dependencies, or workflow. A subsequent normal CI run may also
verify the documentation commit; the source/run pair above remains the reproducible
implementation evidence.

## Free-only execution safeguards

The successful run used the standard hosted Ubuntu runner with a job-level public
repository gate. Larger/custom/self-hosted/dynamic runner selectors are prohibited.
Automatic and explicit Actions caches are disabled, and artifact uploads are removed.
Reports remain in ordinary logs and the job summary. No paid external execution,
package publication, or CI repository-write step was added.

The validator rejects unauthorized workflow structure, runners, missing visibility
guards, uploads, caches, and commands. The pre-push check is important: an in-job test
alone cannot prevent allocation of a different job introduced by someone later.
This is not an account-wide billing lock, and no account budget or payment settings
were changed. Historical artifacts retain their existing expiry; none are created
by this workflow.

## Evidence boundaries

The full clean install, typecheck, build, and browser suites ran in GitHub Actions.
The chat container could run the dependency-free workflow preflight, but could not
reach GitHub/npm for a full local build. No local full-build claim is made.

Browser tests use actual Three.js/WebGL 2 in Chromium/SwiftShader at desktop and
phone-sized viewports. They are not physical iPhone/Safari testing, touch-navigation
acceptance, or a GPU performance benchmark. Visibility/page-transition signals
exercise event handling rather than certifying operating-system background behavior.
The existing Three.js bundle-size warning remains visible for the later performance
slices; it was not hidden or treated as an error.

The world currently has coarse perimeter constraints, not obstacle/building collision.
The test cube remains a diagnostic object. Native Sites validation remains pending.
No deployment, merge, pull request, provisioning, or Site-access change was performed.

Detailed contracts: [navigation](NAVIGATION.md), [engine](WORLD_ENGINE.md),
[CI cost policy](CI_COST_POLICY.md), and [implementation roadmap](IMPLEMENTATION_PLAN.md).

Next: **Slice 4 — Mobile/touch navigation baseline (5.6 Sol).**
