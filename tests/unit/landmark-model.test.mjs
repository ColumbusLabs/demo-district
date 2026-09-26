import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { district, landmarkFootings } from '../../src/world/district/layout.ts';

/** The JSON chunk of a GLB (header, then a JSON chunk; see the glTF 2.0 binary format). */
function glbJson(path) {
  const data = readFileSync(path);
  assert.equal(data.toString('ascii', 0, 4), 'glTF');
  const length = data.readUInt32LE(12);
  assert.equal(data.readUInt32LE(16), 0x4e4f534a, 'first chunk is JSON');
  return JSON.parse(data.toString('utf8', 20, 20 + length));
}

test('the Blender landmark model matches the layout footings the navigation blocks', () => {
  const gltf = glbJson(new URL('../../public/world/models/landmark.glb', import.meta.url));
  const arch = gltf.meshes.find((mesh) => mesh.name === 'landmark_arch');
  assert.ok(arch?.extras?.footings, 'landmark_arch carries footing extras');
  const { x, z, height } = district.landmark;
  assert.ok(Math.abs(arch.extras.height - height) < 0.1, `model height ${arch.extras.height} vs layout ${height}`);
  const layout = landmarkFootings().map((f) => ({ x: f.x - x, z: f.z - z, radius: f.radius }));
  assert.equal(layout.length, arch.extras.footings.length);
  for (const foot of arch.extras.footings) {
    const match = layout.find((f) => Math.hypot(f.x - foot.x, f.z - foot.z) < 0.02);
    assert.ok(match, `layout has a footing at (${foot.x}, ${foot.z})`);
    assert.ok(match.radius >= foot.radius, 'the blocker covers the modelled leg');
  }
});

test('the Blender shrub model provides every planter shrub kind', () => {
  const gltf = glbJson(new URL('../../public/world/models/shrubs.glb', import.meta.url));
  const names = new Set(gltf.nodes.map((node) => node.name));
  for (const kind of ['shrub_box', 'shrub_glossy', 'shrub_bloom']) assert.ok(names.has(kind), kind);
  assert.equal(gltf.materials.find((m) => m.name === 'shrub_leaves')?.alphaMode, 'MASK');
});

test('the exposed sculpture feet stay blocked without the removed planting islands', async () => {
  const { districtBlockers } = await import('../../src/world/district/layout.ts');
  const blockers = districtBlockers();
  for (const foot of landmarkFootings()) {
    assert.ok(blockers.some((b) => b.x === foot.x && b.z === foot.z && b.radius === foot.radius));
  }
});

test('the Blender tree models provide both levels of detail for every kind', () => {
  const gltf = glbJson(new URL('../../public/world/models/trees.glb', import.meta.url));
  const names = new Set(gltf.nodes.map((node) => node.name));
  for (const kind of ['street_a', 'street_b', 'street_c', 'framing']) for (const lod of [0, 1]) assert.ok(names.has(`${kind}_lod${lod}`), `${kind}_lod${lod}`);
  assert.deepEqual(new Set(gltf.materials.map((m) => m.name)), new Set(['tree_bark', 'tree_leaves']));
  assert.equal(gltf.materials.find((m) => m.name === 'tree_leaves').alphaMode, 'MASK');
});
