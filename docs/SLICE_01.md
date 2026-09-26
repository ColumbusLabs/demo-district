# Slice 1 — Scaffold checkpoint

**Date:** 2026-09-24  
**Branch:** `build/demo-district-v1`  
**Source baseline:** `9632886d320932233229c656b522618ad3622c3a`  
**Status:** scaffold checks passed; native Sites acceptance is still pending.

## Delivered scope

- Minimal Vite + strict TypeScript client, direct Three.js dependency, no UI framework or backend.
- Semantic, mobile-sized foundation page and an empty canvas mount.
- A real clear-only WebGL 2 / Three.js initialization probe, failure fallback, and cleanup on HMR.
- No scene, camera, animation loop, controls, buildings, or project content. Those are subsequent slices.
- Development, production build, typecheck, repository tests, browser smoke tests, and local preview commands.
- Unprovisioned Sites linkage intent, no storage/auth/environment requirements.
- Agent contract, environment/ignore rules, deployment handoff, and roadmap checkpoint.
- Genuine npm-generated lockfile and pinned direct dependency versions.
- Read-only CI with pinned Actions, no stored checkout credentials, and no deployment commands.

## Acceptance ledger

| Requirement | Evidence/status |
| --- | --- |
| Clean install | Passed in GitHub Actions using a genuine generated lockfile and a fresh npm ci. |
| Strict typecheck / production build | Passed in GitHub Actions. |
| Empty page renders | Passed in production-browser Chromium smoke tests. |
| Three.js imports and initializes | Passed with an actual available WebGL 2 context, not a mocked renderer. |
| No external experience at startup | Passed HTML/artifact checks and browser network assertions. |
| Sites accepts this exact project | **Pending native Sites validation; no deployment authorized.** |
| No framework churn / backend scope | Vite + TypeScript only; `three` is the sole runtime dependency. |

Local environment: Node 22.16.0/npm 10.9.2. Direct GitHub clone and npm registry access failed with DNS errors; no package install/build is claimed from this container. Repository tests also passed locally. GitHub Actions provided independent install/build/browser execution.

## Verified execution

Clean npm ci, 4 repository checks, strict TypeScript check, production build, static artifact check, 12 Chromium smoke cases, and runtime dependency audit passed. Browser cases cover desktop and phone-sized Chromium, not physical iPhone/Safari. Headless rendering uses SwiftShader; this is not a device performance benchmark.

Verified bootstrap run: https://github.com/ColumbusLabs/demo-district/actions/runs/36051654434  
Tested source commit: `fcc14ad08d8b119a4d1b841d6c8791e0fc67d551`  
Lockfile/documentation checkpoint: `ddf5e1c34f8099abfc5fbdd47eb02deb181c7b12`

Desktop and phone-sized production screenshots were retrieved and visually inspected: identity, status, spacing, and canvas layout are readable without overflow. Earlier runs caught a strict receiver-typing error in a test and a no-script locator issue; both were corrected before the passing run. No failing case was skipped or retried into a pass.

The temporary CI bootstrap generated the real lockfile and recorded evidence on this implementation branch. Its write permission and helper script have now been removed. Ongoing CI uses `npm ci`, cannot push commits, and verifies that checks do not modify tracked files. The cleanup commit triggers a separate locked, read-only verification run; inspect its check result rather than assuming success from the bootstrap run.

## Known non-blocking build note

The Three.js-containing JavaScript bundle is approximately 523 kB minified / 130 kB gzip in the verified scaffold build. Vite emits its default 500 kB chunk warning. This is recorded, not silenced; loading boundaries and world budgets belong to the engine/performance slices. The blank canvas is a build/import proof, not the final visual experience or a performance benchmark for the planned plaza.

## Next boundary

Complete the native Sites save-only check described in `DEPLOYMENT.md`. No Site was provisioned, saved, deployed, or published; no merge was performed. A successful Vite build is not evidence that Sites accepted the project.

Slice 2 is the Three.js engine shell. It may proceed as portable world work only with explicit acceptance that host validation is still outstanding. Do not quietly declare Slice 1 fully accepted or start building the plaza.
