# Demo District — Agent contract

Read `docs/IMPLEMENTATION_PLAN.md`, the latest `docs/SLICE_03.md` checkpoint, and `docs/DEPLOYMENT.md` before editing.

## Scope and branch

- Work on `build/demo-district-v1`; never write application changes to `main` without approval.
- Execute only the requested slice and stop at its acceptance boundary.
- Do not merge, open a PR, deploy, publish, or change Site access unless explicitly requested.
- Preserve future slices in the implementation plan; update status rather than rewriting the roadmap.
- Confirm the branch head before writing. Never force-push over another agent's work.

## Hard cost constraint: no paid Actions

- The user prohibits paid runners/services. Read `docs/CI_COST_POLICY.md` before any workflow change or run.
- Only the literal standard `ubuntu-latest` runner is approved, and only when the repository event explicitly says public. Keep the job-level public-visibility condition; it is evaluated before allocating a runner.
- Never add larger, GPU, custom, self-hosted, matrix-selected, or dynamically named runners. Do not add reusable workflows or extra jobs without reviewing the entire execution path against this policy.
- Do not enable Actions artifact uploads, caches (including automatic setup-node caches), package publishing, custom-image snapshots, or external paid services. Reports remain in logs/job summaries.
- Run `node scripts/check-ci-policy.mjs` BEFORE pushing a workflow change, and keep its negative regression tests in `npm test`. CI also checks the policy, but a check inside a runner is not a pre-allocation enforcement mechanism for an unauthorized new job.
- Do not claim an account-wide billing lock, changed budgets, or protection from edits by other repository administrators. This is the repository's approved configuration and agent policy.

## Architecture

- World logic belongs in `src/world/`; app mounting in `src/app/`; presentation in `src/ui/`.
- Use portable TypeScript and direct Three.js imports. No mandatory UI framework or host SDK yet.
- Read `docs/WORLD_ENGINE.md` and `docs/DESKTOP_NAVIGATION.md`. The world owns the sole renderer/scheduler; controls join through `addSystem` and `invalidate`, never their own animation loop.
- Use a fresh canvas after destroy. Register owned GPU resources with `ResourceScope`/`world.own`.
- Desktop navigation is focus-scoped WASD, drag-look, and arrow-key look. No automatic focus, pointer lock, head bob, jumping, sprint, or mousewheel interception.
- Keep movement math independent of scene geometry. This slice has coarse perimeter bounds, not building/obstacle physics.
- Suspension, blur, Escape, Tab, context loss, and teardown must clear held input and momentum. Reduced motion must remain navigable, with no idle animation loop once movement settles.
- Do not preload creator sites, add iframes, scrape X, or load remote fonts/CDN scripts at startup.
- D1, R2, authentication, ratings, submissions, and real project records remain later slices. No fake hosting IDs or storage bindings.

## Checks and evidence

- Use Node 26 (pinned in `.nvmrc`; Node 24 remains supported), `npm ci`, and `npm run verify`.
- Browser checks: `npx --no-install playwright install chromium`, `npm run test:browser`, `npm run test:lifecycle`.
- Lifecycle tests exercise real HMR and restore their temporary source edit. Run them serially.
- Phone-sized Chromium is not physical iPhone/Safari testing or a performance benchmark.
- Native Sites acceptance remains pending until a real saved version is validated. A static build is not proof.
- Never mark unrun checks as passed. Record exact source, evidence, and any limitation.
- Commit real dependency lockfiles; never fabricate hashes. No new dependencies are needed for Slice 3.
- Update the checkpoint and affected run instructions after each slice.

## Handoff

Report completed work, branch/commit, actual checks, pending gates, and next slice. Keep chat summaries brief.
