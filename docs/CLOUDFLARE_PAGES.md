# Cloudflare Pages publication checkpoint

Requested September 26, 2026. Branch: `build/demo-district-v1`.

## Source reconciliation

- Started with clean local `2fc5d83`; fetched and fast-forwarded to GitHub `e861c4a`.
- Latest saved Site: version 14, source `e9bae46fee8cd8b1ed75979a45f1fd24abe50e81`.
- Retrieved Site source through its authenticated Git endpoint without pushing to
  or republishing the Site. Its difference from GitHub contained only the arrival
  update and associated assets, checks and documentation (14 files).
- Preserved both WebP sizes, animated arrival, monotonic progress, actual-readiness
  gate, four-second minimum, reduced-motion behavior and teardown cancellation.
- During verification, GitHub advanced to `52e8bb1a6182fb693e77298e18dee0100ec16ede`.
  Its entire tree matches Site version 14 exactly. Adopted that upstream commit
  while preserving local verification/documentation changes; no duplicate import.
- Updated stale browser assertions to match the new branded heading and no-script
  copy, and wait for the arrival handoff before reduced-motion/touch inspection.
  The only subsequent application change is a desktop illustration size cap:
  Chrome inspection at 1693×843 showed its caption overlapping the loading footer.
  Sizing against available viewport height now leaves a 34px gap at that size;
  the phone layout and all animation/timing logic remain unchanged.

## Checks

- Node 26.8.2; clean `npm ci`, zero reported dependency vulnerabilities.
- `npm run verify`: 82 unit tests, strict TypeScript, Vite build and static artifact
  checks passed. The existing large JavaScript chunk warning remains.
- Production browser suite: 15 passed and 6 intentional modality skips initially;
  all 9 failed cases passed on a serial rerun after updating stale copy/readiness
  assertions. Graphics-context recovery and the three-size phone layout passed
  serially without application changes. Combined: all 24 applicable cases passed.
- The suite covers local assets, entry, search, map, previews, keyboard navigation,
  real Chromium touch walking/look/reset, WebGL fallback and context recovery.
- `npm run test:lifecycle`: 41 passed, 10 intentional modality skips (5.2 minutes),
  including actual Vite HMR, teardown, camera/input lifecycle and touch interaction.
- Chrome visual inspection: desktop loader at 1693×843 and phone loader at 390×844.
  Screenshots are local under `test-results/pages-evidence/` (not committed).
- Inspected the high-tier district in desktop Chrome on the Mac GPU after entry;
  composition matches the existing approved plaza direction. No world changes.
- Re-ran `npm run verify` after the desktop-only CSS correction; all 82 tests,
  typecheck, production build and static artifact checks passed.
- Publication, GitHub automatic deployment and live desktop/mobile checks pending.

Existing ChatGPT publication remains owner-private and untouched. No main merge,
workflow change, paid plan, domain purchase, database, bucket or authentication
feature is part of this deployment. Physical iPhone/Safari validation is separate.
