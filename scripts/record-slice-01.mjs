// One-time bootstrap helper. Removed with the temporary CI write permission.
import fs from 'node:fs';
import assert from 'node:assert/strict';

assert.equal(process.env.GITHUB_REF, 'refs/heads/build/demo-district-v1');
const report = JSON.parse(fs.readFileSync('test-results/results.json', 'utf8'));
assert.ok(report.stats.expected > 0);
assert.equal(report.stats.unexpected, 0);
assert.equal(report.stats.skipped, 0);
assert.equal(report.stats.flaky, 0);
const run = `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`;
const evidence = `Clean npm ci, 4 repository checks, strict TypeScript check, production build, static artifact check, ${report.stats.expected} Chromium smoke cases, and runtime dependency audit passed. Browser cases cover desktop and phone-sized Chromium, not physical iPhone/Safari.`;

let plan = fs.readFileSync('docs/IMPLEMENTATION_PLAN.md', 'utf8');
const marker = '\n---\n';
assert.ok(plan.includes(marker));
assert.ok(!plan.includes('<!-- slice-01-status -->'));
plan = plan.replace(marker, `\n<!-- slice-01-status -->\n## Implementation status — September 24, 2026\n\n**Slice 1: scaffold verified; native Sites acceptance pending.**\n\n${evidence}\n\nCI evidence: ${run} (source commit \`${process.env.GITHUB_SHA}\`). See [Slice 1 evidence](SLICE_01.md) and [Sites handoff](DEPLOYMENT.md).\n\nNo Site was provisioned, saved, deployed, or published. No merge was performed. The final Slice 1 acceptance item requires the native Sites save-only workflow; a green Vite build is not a substitute. Next planned implementation: Slice 2 (Three.js engine shell), with this host-verification gate still explicit.\n<!-- /slice-01-status -->\n${marker}`);
const heading = '### Slice 1 — Repository contract and Sites-compatible scaffold\n**Model:** GPT-6 Astra Pro';
assert.ok(plan.includes(heading));
plan = plan.replace(heading, `${heading}\n**Status:** Scaffold verified; native Sites compatibility check pending. See the implementation status above.`);
fs.writeFileSync('docs/IMPLEMENTATION_PLAN.md', plan);

let readme = fs.readFileSync('README.md', 'utf8');
const oldStatus = '**Status:** Planning complete; implementation has not started.';
assert.ok(readme.includes(oldStatus));
readme = readme.replace(oldStatus, '**Status:** Slice 1 scaffold implemented and checked. Native ChatGPT Sites acceptance is still pending; nothing has been deployed or merged.');
readme = readme.replace('The exact application scaffold will be verified against the current ChatGPT Sites runtime before implementation begins.', 'The client scaffold now uses Vite + TypeScript with a direct Three.js dependency. It produces a tested static artifact; acceptance by the native Sites runtime remains a separate, pending gate. D1, R2, and authentication below remain planned, not provisioned.');
readme = readme.replace('The next implementation task is:\n\n**Slice 1 — Repository contract and Sites-compatible scaffold**', 'The next verification step is the native Sites save-only check in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).\n\nThe next planned code slice is **Slice 2 — Three.js engine shell**.');
readme += `\n## Run the scaffold\n\nUse Node 22 (at least 22.12). No credentials are required.\n\n\`\`\`sh\nnvm install\nnvm use\nnpm ci\nnpm run dev\n\`\`\`\n\nLocal development: \`http://127.0.0.1:5173\`. For the production artifact, run \`npm run verify\` then \`npm run preview\` and open \`http://127.0.0.1:4173\`. Browser smoke checks: \`npx playwright install chromium\` then \`npm run test:browser\`. See [deployment and validation](docs/DEPLOYMENT.md), [agent contract](AGENTS.md), and [Slice 1 evidence](docs/SLICE_01.md).\n\nThis is an empty, labeled foundation canvas—not the plaza, movement system, or a live directory. It does not request or embed external creator experiences.\n`;
fs.writeFileSync('README.md', readme);

let status = fs.readFileSync('docs/SLICE_01.md', 'utf8');
status = status.replace('implementation prepared; automated execution and native Sites gate tracked separately below.', 'scaffold checks passed; native Sites acceptance is still pending.');
status = status.replace('Pending execution in CI; this chat container cannot resolve npm registry DNS.', 'Passed in GitHub Actions using a genuine generated lockfile and a fresh npm ci.');
status = status.replace('Pending execution in CI.', 'Passed in GitHub Actions.');
status = status.replace('Pending production-browser smoke check.', 'Passed in production-browser Chromium smoke tests.');
status += `\n## Verified execution\n\n${evidence}\n\nRun: ${run}\nSource commit: \`${process.env.GITHUB_SHA}\`\n\nThe generated package-lock.json and exact direct versions are committed with this evidence. CI did not invoke Sites, deploy, or merge.\n`;
fs.writeFileSync('docs/SLICE_01.md', status);
