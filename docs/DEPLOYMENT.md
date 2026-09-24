# Local development and Sites handoff

## Current boundary

This repository is a portable static Vite + TypeScript + Three.js engine/navigation
preview. It is **not yet a Sites-validated project**. There is no Site ID, saved
version, production URL, database, storage bucket, or sign-in integration.

The current chat has GitHub read/write access, but native Sites management was not
exposed by available tool discovery. Documentation establishes a proposed handoff,
not acceptance of these exact artifacts. Do not replace missing evidence with a
claim of compatibility.

## Local setup

```sh
nvm install
nvm use
npm ci
npm run dev
```

Open `http://127.0.0.1:5173`. The preview is the Demo District plaza (world passes 1–3)
with keyboard, mouse, and touch walking/look controls. The static build ships local world
assets under `world/` (about 3.5 MB, CC0, see `public/world/LICENSES.md`) and requests
nothing remote. Choose Explore or click the
canvas, use WASD to walk, drag or use arrow keys to look, Escape to release focus,
and Tab to reach page controls. Reset view and three walking speeds are available.
On a phone, drag the scene to look and use the stick to walk; the `--host` option below lets a phone on your network try it. See `WORLD_ENGINE.md` and `NAVIGATION.md`.
No secrets are required; `.env.example` documents that boundary.

For another device on a trusted local network, explicitly opt in with
`npm run dev -- --host 0.0.0.0`; otherwise servers bind to loopback only. Do not
expose the development server publicly.

## Checks and production-artifact preview

```sh
node scripts/check-ci-policy.mjs
npm run verify
npx --no-install playwright install chromium
npm run test:browser
npm run test:lifecycle
npm run preview
```

`verify` runs repository/runtime/movement/cost-policy tests, strict TypeScript,
production build, and static-output checks. Production browser tests build and
start their own server on 4173. Lifecycle/navigation tests start Vite on 5173;
both ports must be free. The lifecycle suite restores its source edit after actual
HMR testing. On Linux CI use `npx --no-install playwright install --with-deps chromium`.

`preview` serves `dist/` at `http://127.0.0.1:4173`. It is a local inspection tool,
not a production server: https://vite.dev/guide/static-deploy.html

## GitHub Actions cost boundary

Read [CI_COST_POLICY.md](CI_COST_POLICY.md) before modifying workflows. Only standard
Ubuntu in an explicitly public repository is allowed. The job-level condition
skips non-public/unknown visibility before runner allocation. No larger/custom/
self-hosted runners, paid external services, cache uploads, artifact uploads, or
package publishing are configured. Test evidence stays in logs/job summaries.
The policy is checked before pushing and again in CI; it is not an account-wide
billing lock and cannot prevent an administrator from replacing it later.

## Why this shape

The current client needs a canvas and TypeScript, not SSR, a UI framework,
a database, or a Workers adapter. Vite's vanilla TypeScript/static build keeps the
host adapter replaceable: https://vite.dev/guide/

`.openai/hosting.json` has null storage bindings and deliberately omits a project ID.
It conveys unprovisioned intent, not proof of a valid deployment manifest. Native
Sites may require adapter or configuration changes after inspecting the project.

## Native Sites gate — still required

From a Sites-capable session with this branch available, request:

> Prepare ColumbusLabs/demo-district from build/demo-district-v1 for ChatGPT Sites. Inspect the current source commit, confirm the supported build/artifact shape, and make only necessary adapter changes on this branch. Save a private version for validation, but do not deploy, publish, broaden access, add D1/R2, or merge. Report the source commit, actual build result, saved version ID, and any adapter changes. Never treat a deployment URL as a private preview.

Then:

1. Record only real Site/project and saved-version identifiers returned by the host.
2. Record the exact source commit and any necessary adapter changes.
3. Validate entry HTML/assets, Three.js startup, navigation, no-WebGL fallback,
   and browser console in the host's supported private validation surface.
4. Only after observed acceptance mark the native Sites gate complete in the plan.
5. Keep publishing, audience changes, and merge approval separate.

If host validation requires deployment or expanded access, stop and ask for approval.
No automatic GitHub-to-Sites sync or undocumented CLI command is assumed.

## Official references for the eventual host check

- https://learn.chatgpt.com/docs/sites
- https://help.openai.com/en/articles/20001339

Recheck supported behavior in the actual Sites session; these references do not
validate this repository or provision hosting.

## Evidence levels and release safety

Repository checks validate files and contracts. Build/Chromium tests validate the
portable web client. Native Sites acceptance is a separate gate. Physical devices,
Safari, and production world performance remain later QA work.

There is no deploy command, auto-publishing workflow, Pages setup, or hosting token.
When publication is explicitly authorized, select the reviewed version and audience
through the supported host flow. Preserve the prior version for rollback; do not
reset Git history or delete data to roll back a visual build.
