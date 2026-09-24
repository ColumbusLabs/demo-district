# Demo District — Agent contract

Read `docs/IMPLEMENTATION_PLAN.md`, its latest status, and `docs/DEPLOYMENT.md` before editing.

## Scope and branch

- Work on `build/demo-district-v1`; never write application changes to `main` without approval.
- Execute only the requested slice. Stop at its acceptance boundary.
- Do not merge, open a pull request, deploy, publish, or change Site access unless explicitly requested.
- Preserve the original implementation plan; update status rather than rewriting later slices.
- Confirm the current branch head before writing. Never force-push over another agent's work.

## Architecture

- World logic belongs in `src/world/`; application mounting in `src/app/`; presentation in `src/ui/`.
- Use portable TypeScript and direct Three.js imports. No mandatory UI framework or host SDK yet.
- The current canvas probe is intentionally not a World engine. Slice 2 replaces it with the central renderer/scene/camera lifecycle.
- Do not preload creator sites, add iframes, scrape X, or load remote fonts/CDN scripts at startup.
- D1, R2, authentication, project records, ratings, and submissions are later slices.
- No database, storage binding, or fake project ID in the scaffold.

## Checks and evidence

- Use Node 22 (at least 22.12), `npm ci`, then `npm run verify`.
- Browser check: `npx playwright install chromium`, then `npm run test:browser`.
- A browser test using a phone viewport is not a physical iPhone/Safari result.
- A local/static build is not proof of native Sites acceptance. Keep that gate explicitly pending until Sites actually validates a saved version.
- Never label unrun checks as passed. Record environment limitations and the exact next verification step.
- Commit dependency lockfiles; never invent an integrity hash or use a synthetic lockfile.
- Update the plan checkpoint and any affected run instructions after each slice.

## Handoff

Report the completed work, branch/commit, checks actually run, pending gates, and next slice. Keep chat summaries brief.
