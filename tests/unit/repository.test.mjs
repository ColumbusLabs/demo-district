import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const json = async (file) => JSON.parse(await readFile(file, 'utf8'));

test('package has runnable local/build/check commands and cannot accidentally publish to npm', async () => {
  const pkg = await json('package.json');
  assert.equal(pkg.private, true);
  assert.equal(pkg.type, 'module');
  for (const command of ['dev', 'build', 'typecheck', 'test', 'preview', 'test:browser', 'verify']) {
    assert.ok(pkg.scripts[command], `Missing ${command}`);
  }
  assert.equal(pkg.scripts.deploy, undefined);
  assert.deepEqual(Object.keys(pkg.dependencies), ['three']);
});

test('Sites hosts the built output without storage bindings or secrets', async () => {
  const hosting = await json('.openai/hosting.json');
  assert.equal(hosting.d1, null);
  assert.equal(hosting.r2, null);
  assert.equal(typeof hosting.project_id, 'string');
  assert.ok(hosting.project_id.length > 0);
  assert.equal(hosting.static.directory, 'dist');
  assert.deepEqual(Object.keys(hosting).sort(), ['d1', 'project_id', 'r2', 'static']);
});

test('production HTML offers a readable no-JavaScript fallback and no external project loads', async () => {
  const html = await readFile('index.html', 'utf8');
  assert.match(html, /<html lang="en">/);
  assert.equal((html.match(/id="world-canvas"/g) || []).length, 1);
  assert.match(html, /<noscript>/);
  assert.match(html, /role="status"/);
  assert.ok(!/<iframe\b|<video\b|<audio\b|https?:\/\//i.test(html));
  assert.ok(!/user-scalable=no|maximum-scale=1/i.test(html));
});

test('secrets and generated artifacts are ignored but source configuration remains trackable', async () => {
  const lines = (await readFile('.gitignore', 'utf8')).split('\n');
  for (const expected of ['node_modules/', 'dist/', '.env', '.env.*', '!.env.example', 'test-results/']) {
    assert.ok(lines.includes(expected), `Missing ignore rule ${expected}`);
  }
  assert.ok(!lines.includes('.openai/'));
});
