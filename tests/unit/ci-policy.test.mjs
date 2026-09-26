import test from 'node:test';
import assert from 'node:assert/strict';
import { checkPolicy, validateWorkflow } from '../../scripts/check-ci-policy.mjs';
const workflow = await checkPolicy();
test('checked-in workflow permits only public-repository standard Ubuntu and no paid storage', () => validateWorkflow(workflow));
for (const [name, mutate] of [
  ['larger runner', (w) => { w.jobs.verify['runs-on'] = 'ubuntu-latest-16-cores'; }],
  ['self-hosted runner', (w) => { w.jobs.verify['runs-on'] = ['self-hosted', 'linux']; }],
  ['dynamic runner', (w) => { w.jobs.verify['runs-on'] = '${{ matrix.runner }}'; }],
  ['missing public gate', (w) => { delete w.jobs.verify.if; }],
  ['private execution', (w) => { w.jobs.verify.if = 'always()'; }],
  ['additional job', (w) => { w.jobs.paid = structuredClone(w.jobs.verify); }],
  ['reusable workflow', (w) => { w.jobs.verify.uses = 'owner/repo/.github/workflows/billable.yml@main'; }],
  ['artifact upload', (w) => { w.jobs.verify.steps.push({ uses: 'actions/upload-artifact@v4' }); }],
  ['automatic cache', (w) => { w.jobs.verify.steps[1].with['package-manager-cache'] = true; }],
  ['explicit cache', (w) => { w.jobs.verify.steps[1].with.cache = 'npm'; }],
  ['paid command', (w) => { w.jobs.verify.steps[3].run = 'paid-cloud run'; }],
  ['write permission', (w) => { w.permissions.contents = 'write'; }],
  ['scheduled billing', (w) => { w.on.schedule = [{ cron: '* * * * *' }]; }],
]) {
  test(`cost policy rejects ${name}`, () => {
    const changed = structuredClone(workflow); mutate(changed);
    assert.throws(() => validateWorkflow(changed));
  });
}
