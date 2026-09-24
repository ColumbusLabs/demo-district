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

## Acceptance ledger

| Requirement | Evidence/status |
| --- | --- |
| Clean install | Passed in GitHub Actions using a genuine generated lockfile and a fresh npm ci. |
| Strict typecheck / production build | Passed in GitHub Actions. |
| Empty page renders | Passed in production-browser Chromium smoke tests. |
| Three.js imports and initializes | Browser smoke requires a real available WebGL 2 context; not a mocked renderer. |
| No external experience at startup | HTML/artifact checks and browser network assertions. |
| Sites accepts this exact project | **Pending native Sites validation; no deployment authorized.** |
| No framework churn / backend scope | Vite + TypeScript only; `three` is the sole runtime dependency. |

Local environment: Node 22.16.0/npm 10.9.2. Direct GitHub clone and npm registry access fail with DNS errors; no package install/build is claimed from this container. GitHub-connected CI is the intended independent execution route.

The workflow will record a successful run URL/source commit only after checks pass. A green CI run must not convert the pending native Sites gate to a pass.

## Next boundary

Complete the native Sites save-only check described in `DEPLOYMENT.md`. Slice 2 is the Three.js engine shell; it may proceed as portable world work only with explicit acceptance that host validation is still outstanding. Do not quietly declare Slice 1 fully accepted or start building the plaza.

## Verified execution

Clean npm ci, 4 repository checks, strict TypeScript check, production build, static artifact check, 12 Chromium smoke cases, and runtime dependency audit passed. Browser cases cover desktop and phone-sized Chromium, not physical iPhone/Safari.

Run: https://github.com/ColumbusLabs/demo-district/actions/runs/36051654434
Source commit: `fcc14ad08d8b119a4d1b841d6c8791e0fc67d551`

The generated package-lock.json and exact direct versions are committed with this evidence. CI did not invoke Sites, deploy, or merge.
