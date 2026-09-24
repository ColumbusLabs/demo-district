# Local development and Sites handoff

## Current boundary

This repository is a portable static Vite + TypeScript + Three.js scaffold. It is **not yet a Sites-validated project**. There is no Site ID, saved version, production URL, database, storage bucket, or sign-in integration.

The current chat has GitHub read/write access, but no native Sites operation was exposed; plugin discovery did not return a Sites management integration. Public documentation establishes the workflow, not acceptance of these exact build artifacts. Do not replace that missing evidence with a claim of compatibility.

## Local setup

```sh
nvm install
nvm use
npm ci
npm run dev
```

Open `http://127.0.0.1:5173`. The preview is deliberately a labeled empty world canvas, not the selected plaza mockup. No secrets are required. `.env.example` documents that boundary.

For another device on a trusted local network, explicitly opt in with `npm run dev -- --host 0.0.0.0`; otherwise servers bind to loopback only. Do not expose the development server publicly.

## Checks and production-artifact preview

```sh
npm run verify
npx playwright install chromium
npm run test:browser
npm run preview
```

`verify` runs repository checks, strict TypeScript checking, the Vite production build, and a static-artifact check. Browser tests start their own production build/preview server on port 4173, which must be free. On Linux CI use `npx playwright install --with-deps chromium`.

`preview` serves `dist/` at `http://127.0.0.1:4173`. It is a local inspection tool, not a production server. Vite documents this distinction: https://vite.dev/guide/static-deploy.html

## Why this shape

The client needs a canvas and TypeScript, not SSR, React, a database, or a Workers adapter in Slice 1. Vite's documented vanilla TypeScript/static build approach keeps the host adapter replaceable: https://vite.dev/guide/

`.openai/hosting.json` uses only documented storage-linkage fields with null bindings, and deliberately omits `project_id`. It conveys unprovisioned intent; it does not prove a valid Sites deployment manifest. Sites may adjust it when preparing the project.

## Native Sites gate — still required

From a Sites-capable ChatGPT Work/web/desktop session with this branch available, request:

> Prepare ColumbusLabs/demo-district from build/demo-district-v1 for ChatGPT Sites. Inspect the current source commit, confirm the supported build/artifact shape, and make only necessary adapter changes on this branch. Save a private version for validation, but do not deploy, publish, broaden access, add D1/R2, or merge. Report the source commit, actual build result, saved version ID, and any adapter changes. Never treat a deployment URL as a private preview.

Then:

1. Record the real Site/project identifier that Sites returns; do not invent one.
2. Record the exact source commit and saved version identifier.
3. Validate the private version's entry HTML, bundled assets, Three.js initialization, no-WebGL fallback, and browser console.
4. Only after acceptance, mark the native Sites gate complete in the implementation plan.
5. Keep publishing and merge approval separate. This slice does not authorize either.

If the native workflow cannot validate without deploying, stop and ask for approval; do not deploy just to finish a checklist. No automatic GitHub-to-Sites sync or CLI command is assumed.

## Official Sites references checked September 24, 2026

- Local project linkage, optional project ID, storage bindings, saved versions, and deployment workflow: https://learn.chatgpt.com/docs/sites
- Availability, supported-runtime caveats, and deployment/access rules: https://help.openai.com/en/articles/20001339

## Evidence levels

- Repository/content checks: validate files and safety boundaries only.
- Build and Chromium smoke tests: validate the static web scaffold only.
- Native Sites saved-version acceptance: required to claim Sites compatibility.
- Physical mobile performance and cross-browser rendering: later world/QA slices.

## Release safety

There is intentionally no deploy command, auto-publishing workflow, GitHub Pages setup, or hosting token. When publishing is eventually authorized, select the reviewed saved version and audience in Sites. Retain the previous version identifier for rollback; do not reset Git history or delete data to roll back a visual build.
