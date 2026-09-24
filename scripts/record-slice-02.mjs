// One-time, success-only documentation checkpoint. Removed before final handoff.
import assert from 'node:assert/strict';
import fs from 'node:fs';
const repo = 'ColumbusLabs/demo-district';
assert.equal(process.env.GITHUB_REPOSITORY, repo);
assert.equal(process.env.GITHUB_REF, 'refs/heads/build/demo-district-v1');
const sha = process.env.GITHUB_SHA;
assert.match(sha ?? '', /^[0-9a-f]{40}$/);
const run = `https://github.com/${repo}/actions/runs/${process.env.GITHUB_RUN_ID}`;
function replace(file, from, to) {
  const text = fs.readFileSync(file, 'utf8');
  assert.ok(text.includes(from), `Missing expected checkpoint text in ${file}`);
  fs.writeFileSync(file, text.replace(from, to));
}
const plan = 'docs/IMPLEMENTATION_PLAN.md';
const before = fs.readFileSync(plan, 'utf8');
const future = before.slice(before.indexOf('### Slice 3 —'));
if (before.includes('<!-- slice-02-status -->')) process.exit(0);
const checkpoint = `<!-- slice-02-status -->
## Current implementation checkpoint — Slice 2

**Slice 2 implemented and verified as a portable Three.js engine.**

Clean locked installation, repository/runtime unit tests, strict typecheck,
production build/static checks, production-browser tests, development lifecycle
and real HMR tests, and runtime dependency audit passed in CI.

Evidence: ${run} (tested source \`${sha}\`).
See [Slice 2 evidence](SLICE_02.md) and [engine contract](WORLD_ENGINE.md).

Native Sites acceptance from Slice 1 remains pending; this is not a claim of Sites
validation or physical mobile performance. No merge or deployment was performed.
Next code slice: **3 — First-person camera and desktop movement (6 Astra Pro).**
<!-- /slice-02-status -->

`;
replace(plan, '<!-- slice-01-status -->', checkpoint + '<!-- slice-01-status -->');
replace(plan, '## Implementation status — September 24, 2026', '## Historical Slice 1 checkpoint — September 24, 2026');
replace(plan, 'Next planned implementation: Slice 2 (Three.js engine shell), with this host-verification gate still explicit.', 'At that checkpoint, the next planned implementation was Slice 2. See the current checkpoint above for subsequent work; the host-verification gate remains explicit.');
replace(plan, '### Slice 2 — Three.js engine shell\n**Model:** GPT-6 Astra Pro', '### Slice 2 — Three.js engine shell\n**Model:** GPT-6 Astra Pro\n**Status:** Implemented and verified. See [Slice 2 evidence](SLICE_02.md); native Sites validation remains pending.');
assert.equal(fs.readFileSync(plan, 'utf8').slice(fs.readFileSync(plan, 'utf8').indexOf('### Slice 3 —')), future, 'Later slices must be preserved byte for byte.');
replace('README.md', '**Status:** Slice 1 scaffold implemented and checked.', '**Status:** Slice 2 world engine implemented and verified.');
replace('README.md', '**Slice 2 — Three.js engine shell**', '**Slice 3 — First-person camera and desktop movement**');
replace('README.md', '## Run the scaffold', '## Run the engine preview');
replace('README.md', 'then `npm run test:browser`.', 'then `npm run test:browser` and `npm run test:lifecycle`.');
replace('README.md', 'This is an empty, labeled foundation canvas—not the plaza, movement system, or a live directory.', 'This is a real Three.js test scene with a cube and neutral floor—not the plaza, movement system, or a live directory. The engine handles resizing, pause/resume, reduced motion, context recovery, HMR, and cleanup. See [engine contract](docs/WORLD_ENGINE.md) and [Slice 2 evidence](docs/SLICE_02.md).');
replace('AGENTS.md', '- The current canvas probe is intentionally not a World engine. Slice 2 replaces it with the central renderer/scene/camera lifecycle.', '- Slice 2 centralizes renderer/scene/camera lifecycle in `src/world/World.ts`. Read `docs/WORLD_ENGINE.md` before changing it. Use a fresh canvas after destroy; never create a second scheduler or scatter renderers across UI modules. Register owned GPU resources with `ResourceScope`.');
replace('AGENTS.md', '- Browser check: `npx playwright install chromium`, then `npm run test:browser`.', '- Browser checks: `npx playwright install chromium`, then `npm run test:browser` and `npm run test:lifecycle`. The latter exercises real HMR and restores its temporary source edit.');
replace('docs/DEPLOYMENT.md', 'portable static Vite + TypeScript + Three.js scaffold.', 'portable static Vite + TypeScript + Three.js engine preview.');
replace('docs/DEPLOYMENT.md', 'The preview is deliberately a labeled empty world canvas, not the selected plaza mockup.', 'The preview is deliberately a test cube on a neutral floor, not the selected plaza mockup. Engine ownership and lifecycle are documented in `WORLD_ENGINE.md`.');
replace('docs/DEPLOYMENT.md', 'npm run test:browser\nnpm run preview', 'npm run test:browser\nnpm run test:lifecycle\nnpm run preview');
replace('docs/DEPLOYMENT.md', 'On Linux CI use', 'The separate lifecycle suite starts Vite on port 5173 and requires that port to be free; it restores the temporary source edit used for HMR verification. On Linux CI use');
replace('docs/SLICE_02.md', '**Status:** implementation prepared; independent CI verification pending.', '**Status:** implemented and verified; native Sites acceptance remains pending.');
fs.appendFileSync('docs/SLICE_02.md', `\n## Verified execution\n\nClean npm ci; 11 repository/runtime unit tests; strict TypeScript; Vite production\nbuild; static artifact/HUD exclusion checks; 14 production-browser cases; and 18\ndevelopment lifecycle cases (including actual HMR) passed. Runtime dependency audit\npassed. All browser cases use real Three.js/WebGL 2 in Chromium at desktop and\nphone-sized viewports. No skipped cases are counted as passes.\n\nRun: ${run}\nTested source: \`${sha}\`\n\nThe temporary documentation-checkpoint job only updates these documentation files\nafter verification succeeds and checks the branch has not advanced before pushing.\nIt and its helper are removed at final handoff; normal CI remains read-only.\n`);
