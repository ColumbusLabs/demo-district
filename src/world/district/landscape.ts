import { BufferAttribute, BufferGeometry, CylinderGeometry, IcosahedronGeometry, InstancedMesh, Matrix4, PlaneGeometry, Quaternion, Vector3 } from 'three';
import type { Group, Material, MeshStandardMaterial } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { ResourceScope } from '../runtime.ts';
import { place } from './geometry.ts';
import type { StaticBatch } from './geometry.ts';
import { district } from './layout.ts';
import type { Rect } from './layout.ts';
import { random } from './materials.ts';
import type { DistrictMaterials } from './materials.ts';

const up = new Vector3(0, 1, 0);
/** Tapered limb from `from` to `to`, as a non-indexed geometry ready to merge. */
function limb(from: Vector3, to: Vector3, r0: number, r1: number): BufferGeometry {
  const length = from.distanceTo(to);
  const geometry = new CylinderGeometry(r1, r0, length, 7, 1, false).translate(0, length / 2, 0);
  const direction = to.clone().sub(from).normalize();
  geometry.applyQuaternion(new Quaternion().setFromUnitVectors(up, direction));
  geometry.translate(from.x, from.y, from.z);
  return geometry.toNonIndexed();
}

/**
 * Leaf-card cluster: quads scattered in an ellipsoid. Vertex normals point away from the
 * cluster center (blended with up) so the canopy shades like a soft volume, not flat cards.
 */
function canopy(center: Vector3, radius: Vector3, cards: number, cardSize: number, rand: () => number): BufferGeometry {
  const parts: BufferGeometry[] = [];
  const offset = new Vector3(); const normal = new Vector3(); const q = new Quaternion(); const axis = new Vector3();
  for (let i = 0; i < cards; i++) {
    // Bias toward the shell so the silhouette is full but light still breaks through.
    const theta = rand() * Math.PI * 2; const phi = Math.acos(2 * rand() - 1); const r = 0.55 + 0.45 * Math.cbrt(rand());
    offset.set(Math.sin(phi) * Math.cos(theta) * radius.x, Math.cos(phi) * radius.y, Math.sin(phi) * Math.sin(theta) * radius.z).multiplyScalar(r);
    const size = cardSize * (0.75 + rand() * 0.5);
    const card = new PlaneGeometry(size, size).toNonIndexed();
    card.applyQuaternion(q.setFromAxisAngle(axis.set(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize(), rand() * Math.PI));
    card.translate(center.x + offset.x, center.y + offset.y, center.z + offset.z);
    normal.copy(offset).normalize().lerp(up, 0.35).normalize();
    const normals = card.getAttribute('normal');
    for (let v = 0; v < normals.count; v++) normals.setXYZ(v, normal.x, normal.y, normal.z);
    parts.push(card);
  }
  const merged = mergeGeometries(parts, false);
  for (const part of parts) part.dispose();
  if (!merged) throw new Error('Canopy merge failed.');
  return merged;
}

interface TreeTemplate { trunk: BufferGeometry; leaves: BufferGeometry }
/** Slender deciduous tree: a leaning trunk, a few rising limbs, and clustered canopies. */
function treeTemplate(seed: number, height: number): TreeTemplate {
  const rand = random(seed);
  const limbs: BufferGeometry[] = []; const leaves: BufferGeometry[] = [];
  const lean = new Vector3((rand() - 0.5) * 0.35, 0, (rand() - 0.5) * 0.35);
  const fork = new Vector3(0, height * 0.5, 0).add(lean);
  limbs.push(limb(new Vector3(0, -0.2, 0), fork, 0.17, 0.12));
  const branches = 4 + Math.floor(rand() * 2);
  for (let b = 0; b < branches; b++) {
    const angle = (b / branches) * Math.PI * 2 + rand() * 0.8;
    const spread = height * (0.16 + rand() * 0.1);
    const tip = fork.clone().add(new Vector3(Math.cos(angle) * spread, height * (0.3 + rand() * 0.22), Math.sin(angle) * spread));
    limbs.push(limb(fork, tip, 0.1, 0.035));
    leaves.push(canopy(tip, new Vector3(1.15, 1.3, 1.15).multiplyScalar(height / 8.5), 22, 1.2 * height / 8.5, rand));
  }
  leaves.push(canopy(new Vector3(0, height * 0.88, 0).add(lean), new Vector3(1.4, 1.7, 1.4).multiplyScalar(height / 8.5), 30, 1.3 * height / 8.5, rand));
  const trunk = mergeGeometries(limbs, false); const crown = mergeGeometries(leaves, false);
  for (const part of [...limbs, ...leaves]) part.dispose();
  if (!trunk || !crown) throw new Error('Tree merge failed.');
  return { trunk, leaves: crown };
}

/** Wind sway on foliage via a vertex hook; `time` stays frozen under reduced motion. */
export function addWind(material: MeshStandardMaterial, time: { value: number }): void {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.windTime = time;
    shader.vertexShader = `uniform float windTime;\n${shader.vertexShader}`.replace('#include <begin_vertex>', /* glsl */`
      #include <begin_vertex>
      #ifdef USE_INSTANCING
        vec2 anchor = instanceMatrix[3].xz;
      #else
        vec2 anchor = vec2(0.0);
      #endif
      float lift = max(position.y - 1.6, 0.0);
      float sway = sin(windTime * 1.1 + anchor.x * 0.37 + anchor.y * 0.23 + position.y * 0.45) * 0.035 * lift
        + sin(windTime * 2.7 + position.x * 1.7) * 0.012 * lift;
      transformed.x += sway; transformed.z += sway * 0.55;`);
  };
  material.customProgramCacheKey = () => 'district-wind';
}

function instanced(root: Group, geometry: BufferGeometry, material: Material, matrices: Matrix4[], resources: ResourceScope, name: string, shadows = true): void {
  if (!matrices.length) return;
  const mesh = new InstancedMesh(resources.track(geometry), material, matrices.length);
  matrices.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
  mesh.computeBoundingSphere();
  mesh.castShadow = shadows; mesh.receiveShadow = true;
  mesh.name = name;
  root.add(mesh);
}

/** Displaced icosahedron boulder; deterministic per seed. */
function boulder(seed: number): BufferGeometry {
  const rand = random(seed);
  const geometry = new IcosahedronGeometry(1, 3);
  const pos = geometry.getAttribute('position');
  const p = new Vector3();
  const lumps = Array.from({ length: 5 }, () => new Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize());
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    let r = 1;
    for (const lump of lumps) r += Math.max(0, p.dot(lump)) ** 3 * 0.18;
    r *= 0.92 + rand() * 0.06;
    p.multiplyScalar(r); p.y = Math.max(p.y * 0.62, -0.25);
    pos.setXYZ(i, p.x, p.y, p.z);
  }
  geometry.computeVertexNormals();
  // Planar UVs keep the rock texture from pinching at the poles.
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) { uv[i * 2] = pos.getX(i) * 0.5 + pos.getZ(i) * 0.3; uv[i * 2 + 1] = pos.getY(i) * 0.5; }
  geometry.setAttribute('uv', new BufferAttribute(uv, 2));
  return geometry;
}

export function buildLandscape(root: Group, m: DistrictMaterials, batch: StaticBatch, resources: ResourceScope, windTime: { value: number }, outerTrees: boolean): void {
  addWind(m.foliage, windTime);
  const rand = random(97);
  const templates = [treeTemplate(3, 9.5), treeTemplate(8, 8.2), treeTemplate(21, 10.5)];
  const trees: Matrix4[][] = templates.map(() => []);
  const plant = (x: number, z: number, scale = 1, y = 0): void => {
    const pick = Math.floor(rand() * templates.length);
    trees[pick]?.push(place(x, y, z, rand() * Math.PI * 2, scale * (0.9 + rand() * 0.2)));
  };

  // Allee and plaza trees in square stone planters with a hedge collar.
  const h = district.planterHalf;
  for (const t of [...district.allee, ...district.plazaTrees]) {
    for (const [dx, dz, w, d] of [[0, -h + 0.12, h * 2, 0.24], [0, h - 0.12, h * 2, 0.24], [-h + 0.12, 0, 0.24, h * 2 - 0.48], [h - 0.12, 0, 0.24, h * 2 - 0.48]] as const) {
      batch.box(m.stone, w, 0.62, d, place(t.x + dx, 0.31, t.z + dz), 1.5);
    }
    batch.box(m.hedge, h * 2 - 0.5, 0.42, h * 2 - 0.5, place(t.x, 0.72, t.z), 1.2);
    plant(t.x, t.z, 1.2, 0.5);
  }

  // Beds: shrubs, grass tufts, and boulders, clustered toward the back.
  const shrubs: Matrix4[] = []; const grass: Matrix4[] = []; const rocks: Matrix4[][] = [[], []];
  const scatter = (bed: Rect, count: number, fn: (x: number, z: number) => void): void => {
    for (let i = 0; i < count; i++) fn(bed.minX + 0.6 + rand() * (bed.maxX - bed.minX - 1.2), bed.minZ + 0.6 + rand() * (bed.maxZ - bed.minZ - 1.2));
  };
  for (const bed of district.beds) {
    scatter(bed, 7, (x, z) => shrubs.push(place(x, 0.4, z, rand() * 6, 0.7 + rand() * 0.5)));
    scatter(bed, 26, (x, z) => grass.push(place(x, 0.45, z, rand() * 6, 0.6 + rand() * 0.5)));
    scatter(bed, 2, (x, z) => rocks[Math.floor(rand() * 2)]?.push(place(x, 0.45, z, rand() * 6, 0.45 + rand() * 0.35)));
  }
  // Shrubs and boulders framing pavilion forecourts.
  for (const p of district.pavilions) {
    for (const side of [-1, 1]) {
      const along = side * (p.width / 2 + 1.1); const out = p.depth / 2 + 0.8;
      const x = p.x + Math.cos(p.facing) * along + Math.sin(p.facing) * out;
      const z = p.z - Math.sin(p.facing) * along + Math.cos(p.facing) * out;
      shrubs.push(place(x, 0, z, rand() * 6, 1.1 + rand() * 0.4));
      rocks[Math.floor(rand() * 2)]?.push(place(x + rand() - 0.5, 0, z + rand() - 0.5, rand() * 6, 0.6 + rand() * 0.4));
    }
  }
  // Groves outside the paved district: behind the pavilions, and along the lakefront sides.
  for (let i = 0; i < (outerTrees ? 70 : 0); i++) {
    const side = i % 2 ? 1 : -1;
    const x = side * (29 + rand() * 26); const z = -70 + rand() * 105;
    plant(x, z, 1 + rand() * 0.35);
  }
  for (let i = 0; i < (outerTrees ? 16 : 0); i++) plant((rand() - 0.5) * 56, 30 + rand() * 30, 1.1);

  templates.forEach((template, i) => {
    instanced(root, template.trunk, m.bark, trees[i] ?? [], resources, `tree-trunks-${i}`);
    instanced(root, template.leaves, m.foliage, trees[i] ?? [], resources, `tree-canopies-${i}`);
  });
  instanced(root, canopy(new Vector3(0, 0.55, 0), new Vector3(0.9, 0.6, 0.9), 22, 0.75, random(5)), m.foliage, shrubs, resources, 'shrubs');
  const tuft = mergeGeometries([0, 1, 2].map((k) => new PlaneGeometry(0.8, 0.6).translate(0, 0.3, 0).rotateY((k * Math.PI) / 3).toNonIndexed()), false);
  if (tuft) instanced(root, tuft, m.grass, grass, resources, 'grass', false);
  rocks.forEach((list, i) => instanced(root, boulder(31 + i * 17), m.rock, list, resources, `boulders-${i}`));

  // Benches: stone blocks with a warm wood top.
  for (const b of district.benches) {
    batch.box(m.stone, 0.62, 0.4, 2.4, place(b.x, 0.2, b.z), 1.5);
    batch.box(m.wood, 0.66, 0.07, 2.44, place(b.x, 0.435, b.z), 1);
  }
}
