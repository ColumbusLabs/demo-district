import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('dist');
const html = await readFile(path.join(root, 'index.html'), 'utf8');
assert.ok(html.includes('id="world-canvas"'), 'Build must retain the world canvas.');
assert.ok(!html.includes('/src/'), 'Build must not contain source-module references.');
assert.ok(!/https?:\/\//.test(html), 'Scaffold must not request remote assets.');
assert.ok(!/<iframe\b/i.test(html), 'No external project frames in the scaffold.');
const references = [...html.matchAll(/(?:src|href)="([^"#]+)"/g)]
  .map((match) => match[1]).filter((ref) => !ref.startsWith('data:'));
assert.ok(references.some((ref) => ref.endsWith('.js')), 'Bundled JavaScript is required.');
for (const ref of references) {
  const destination = path.resolve(root, ref);
  assert.ok(destination.startsWith(`${root}${path.sep}`), `Asset escaped dist: ${ref}`);
  assert.ok((await stat(destination)).isFile(), `Missing asset: ${ref}`);
}
const entries = await readdir(path.join(root, 'assets'));
assert.ok(entries.every((name) => !name.endsWith('.map')), 'Do not publish source maps in this scaffold.');
console.log(`Static artifact check passed: ${references.length} local entry assets; no embeds or remote entry assets.`);
