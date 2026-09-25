import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('dist');
const html = await readFile(path.join(root, 'index.html'), 'utf8');
assert.ok(html.includes('id="world-canvas"'), 'Build must retain the world canvas.');
assert.ok(!html.includes('/src/'), 'Build must not contain source-module references.');
assert.ok(!/https?:\/\//.test(html), 'Entry HTML must not request remote assets.');
assert.ok(!/<iframe\b/i.test(html), 'No external project frames.');
const references = [...html.matchAll(/(?:src|href)="([^"#]+)"/g)]
  .map((match) => match[1]).filter((ref) => !ref.startsWith('data:'));
assert.ok(references.some((ref) => ref.endsWith('.js')), 'Bundled JavaScript is required.');
for (const ref of references) {
  const destination = path.resolve(root, ref);
  assert.ok(destination.startsWith(`${root}${path.sep}`), `Asset escaped dist: ${ref}`);
  assert.ok((await stat(destination)).isFile(), `Missing asset: ${ref}`);
}
const entries = await readdir(path.join(root, 'assets'));
// World assets must resolve relative to the page (Vite base './') so a subpath host works.
const bundle = (await Promise.all(entries.filter((name) => name.endsWith('.js')).map((name) => readFile(path.join(root, 'assets', name), 'utf8')))).join('\n');
assert.ok(bundle.includes('./') && /world\//.test(bundle) && !/["'`]\/world\//.test(bundle), 'World asset URLs must be relative.');
for (const file of ['world/LICENSES.md', 'world/sky/kloppenheim_06_1k.hdr', 'world/sky/kloppenheim_06_upper.webp', 'world/models/trees.glb']) {
  assert.ok((await stat(path.join(root, file))).isFile(), `Missing world asset: ${file}`);
}
assert.ok(entries.every((name) => !name.endsWith('.map')), 'Do not publish source maps.');
for (const file of entries.filter((name) => name.endsWith('.js'))) {
  const js = await readFile(path.join(root, 'assets', file), 'utf8');
  assert.ok(!js.includes('DEVELOPMENT · WORLD ENGINE'), 'Development HUD leaked into production.');
  assert.ok(!js.includes('__ddWorld'), 'Browser test globals leaked into production.');
  assert.ok(!/['"`]engine-test['"`]/.test(js), 'The development engine-test switch leaked into production.');
  assert.ok(!/https?:\/\/(?!www\.w3\.org)[^"'\s]*\.(?:webp|hdr|jpg|png|glb|gltf)/i.test(js), 'World assets must be local, never remote.');
}
console.log(`Static artifact check passed: ${references.length} local entry assets; no embeds, remote entries, or development HUD.`);
