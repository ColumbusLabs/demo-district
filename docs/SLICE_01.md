# Slice 1 — Scaffold checkpoint

**Date:** 2026-09-24  
**Branch:** `build/demo-district-v1`  
**Source baseline:** `9632886d320932233229c656b522618ad3622c3a`  
**Status:** implementation prepared; automated execution and native Sites gate tracked separately below.

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
| Clean install | Pending execution in CI; this chat container cannot resolve npm registry DNS. |
| Strict typecheck / production build | Pending execution in CI. |
| Empty page renders | Pending production-browser smoke check. |
| Three.js imports and initializes | Browser smoke requires a real available WebGL 2 context; not a mocked renderer. |
| No external experience at startup | HTML/artifact checks and browser network assertions. |
| Sites accepts this exact project | **Pending native Sites validation; no deployment authorized.** |
| No framework churn / backend scope | Vite + TypeScript only; `three` is the sole runtime dependency. |

Local environment: Node 22.16.0/npm 10.9.2. Direct GitHub clone and npm registry access fail with DNS errors; no package install/build is claimed from this container. GitHub-connected CI is the intended independent execution route.

The workflow will record a successful run URL/source commit only after checks pass. A green CI run must not convert the pending native Sites gate to a pass.

## Next boundary

Complete the native Sites save-only check described in `DEPLOYMENT.md`. Slice 2 is the Three.js engine shell; it may proceed as portable world work only with explicit acceptance that host validation is still outstanding. Do not quietly declare Slice 1 fully accepted or start building the plaza.
