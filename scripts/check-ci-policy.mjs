import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export const PUBLIC_ONLY = "${{ github.event.repository.visibility == 'public' && github.event.repository.private == false }}";
const checkout = 'actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1';
const setup = 'actions/setup-node@820762786026740c76f36085b0efc47a31fe5020';
const commands = [
  'node scripts/check-ci-policy.mjs', 'npm ci', 'npm run verify',
  'npx --no-install playwright install --with-deps chromium', 'npm run test:browser',
  'npm run test:lifecycle', 'npm audit --omit=dev --audit-level=high',
  'git diff --exit-code', 'node scripts/summarize-checks.mjs',
];
const keys = (object, allowed) => {
  assert.ok(object && typeof object === 'object' && !Array.isArray(object));
  for (const key of Object.keys(object)) assert.ok(allowed.includes(key), `Unapproved CI key: ${key}`);
};

/** Fail closed. JSON is used as the workflow's YAML subset so no parser dependency is needed. */
export function validateWorkflow(workflow) {
  keys(workflow, ['name', 'on', 'permissions', 'concurrency', 'jobs']);
  assert.deepEqual(workflow.on, { push: { branches: ['build/demo-district-v1'] }, pull_request: { branches: ['main'] } });
  assert.deepEqual(workflow.permissions, { contents: 'read' });
  assert.deepEqual(workflow.concurrency, { group: 'scaffold-${{ github.ref }}', 'cancel-in-progress': true });
  assert.deepEqual(Object.keys(workflow.jobs), ['verify'], 'New jobs require a cost-policy review BEFORE pushing.');
  const job = workflow.jobs.verify;
  keys(job, ['if', 'runs-on', 'timeout-minutes', 'steps']);
  assert.equal(job.if, PUBLIC_ONLY, 'Skip non-public repositories before runner allocation.');
  assert.equal(job['runs-on'], 'ubuntu-latest', 'Only the standard free public-repository Ubuntu runner is allowed.');
  assert.equal(job['timeout-minutes'], 15);
  assert.equal(job.steps.length, commands.length + 2);
  assert.deepEqual(job.steps[0], { uses: checkout, with: { 'persist-credentials': false } });
  assert.deepEqual(job.steps[1], { uses: setup, with: { 'node-version-file': '.nvmrc', 'package-manager-cache': false } });
  job.steps.slice(2).forEach((step, index) => {
    keys(step, ['name', 'run', 'if']);
    assert.equal(step.run, commands[index], 'Unreviewed command: external paid services/storage are not permitted.');
    assert.equal(step.if, index === commands.length - 1 ? 'always()' : undefined);
  });
}
export async function checkPolicy(root = '.') {
  const files = await readdir(`${root}/.github/workflows`);
  assert.deepEqual(files.sort(), ['ci.yml'], 'Do not add another workflow without reviewing its runner/cost policy.');
  const workflow = JSON.parse(await readFile(`${root}/.github/workflows/ci.yml`, 'utf8'));
  validateWorkflow(workflow);
  return workflow;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await checkPolicy();
  console.log('CI cost policy passed: public-only standard Ubuntu; no larger/self-hosted runners, caches, artifact uploads, or paid services.');
}
