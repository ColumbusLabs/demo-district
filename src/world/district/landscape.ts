import {
  BufferAttribute, BufferGeometry, CylinderGeometry, DoubleSide, IcosahedronGeometry, InstancedMesh, Matrix4,
  MeshStandardMaterial, PlaneGeometry, Quaternion, SphereGeometry, Vector3,
} from 'three';
import type { Group, Material, Mesh, Texture } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { ResourceScope } from '../runtime.ts';
import { place } from './geometry.ts';
import type { StaticBatch } from './geometry.ts';
import { district } from './layout.ts';
import type { Rect } from './layout.ts';
import { random } from './materials.ts';
import type { DistrictMaterials } from './materials.ts';
import { bake, disposeModel, loadModel, meshesOf } from './models.ts';

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
function treeTemplate(seed: number, height: number, shape: { lean?: Vector3; spread?: number } = {}): TreeTemplate {
  const rand = random(seed);
  const limbs: BufferGeometry[] = []; const leaves: BufferGeometry[] = [];
  const lean = shape.lean ?? new Vector3((rand() - 0.5) * 0.35, 0, (rand() - 0.5) * 0.35);
  const spread = shape.spread ?? 1;
  const fork = new Vector3(0, height * 0.5, 0).add(lean);
  limbs.push(limb(new Vector3(0, -0.2, 0), fork, 0.17, 0.12));
  const branches = 4 + Math.floor(rand() * 2);
  for (let b = 0; b < branches; b++) {
    const angle = (b / branches) * Math.PI * 2 + rand() * 0.8;
    const reach = height * (0.16 + rand() * 0.1) * spread;
    const tip = fork.clone().add(new Vector3(Math.cos(angle) * reach + lean.x * 0.6, height * (0.3 + rand() * 0.22) / Math.sqrt(spread), Math.sin(angle) * reach + lean.z * 0.6));
    limbs.push(limb(fork, tip, 0.1, 0.035));
    leaves.push(canopy(tip, new Vector3(1.15 * spread, 1.3, 1.15 * spread).multiplyScalar(height / 8.5), Math.round(22 * spread), 1.2 * height / 8.5, rand));
  }
  leaves.push(canopy(new Vector3(0, height * 0.88 / Math.sqrt(spread), 0).add(lean.clone().multiplyScalar(1.4)), new Vector3(1.4 * spread, 1.7, 1.4 * spread).multiplyScalar(height / 8.5), Math.round(30 * spread), 1.3 * height / 8.5, rand));
  const trunk = mergeGeometries(limbs, false); const crown = mergeGeometries(leaves, false);
  for (const part of [...limbs, ...leaves]) part.dispose();
  if (!trunk || !crown) throw new Error('Tree merge failed.');
  return { trunk, leaves: crown };
}

/**
 * Trees modelled in Blender (tools/blender/trees.py): three upright street trees and the leaning
 * framing tree, in the same order as the procedural templates, each at two levels of detail.
 */
const treeKinds = ['street_a', 'street_b', 'street_c', 'framing'] as const;
interface TreeModels { near: TreeTemplate[]; far: TreeTemplate[]; barkMap: Texture; leafMap: Texture }

/** Loads public/world/models/trees.glb; resolves null on failure or after teardown. */
function loadTrees(resources: ResourceScope, disposed: () => boolean): Promise<TreeModels | null> {
  return loadModel('trees.glb').then((gltf) => {
    if (!gltf) return null;
    const meshes = meshesOf(gltf.scene);
    const material = (mesh: Mesh): MeshStandardMaterial | undefined => (Array.isArray(mesh.material) ? undefined : mesh.material as MeshStandardMaterial);
    const part = (tree: string, kind: 'tree_bark' | 'tree_leaves'): Mesh | undefined => {
      const node = gltf.scene.getObjectByName(tree);
      return node ? meshesOf(node).find((mesh) => material(mesh)?.name === kind) : undefined;
    };
    const lod = (level: number): TreeTemplate[] | null => {
      const list: TreeTemplate[] = [];
      for (const kind of treeKinds) {
        const bark = part(`${kind}_lod${level}`, 'tree_bark'); const leaves = part(`${kind}_lod${level}`, 'tree_leaves');
        if (!bark || !leaves) return null;
        list.push({ trunk: bake(bark), leaves: bake(leaves) });
      }
      return list;
    };
    const near = disposed() ? null : lod(0); const far = near ? lod(1) : null;
    const barkMap = meshes.map(material).find((m) => m?.name === 'tree_bark')?.map ?? null;
    const leafMap = meshes.map(material).find((m) => m?.name === 'tree_leaves')?.map ?? null;
    // Only the two textures and the baked copies survive; the loader's own objects go now.
    disposeModel(gltf.scene, new Set([barkMap, leafMap]));
    if (!near || !far || !barkMap || !leafMap || disposed()) {
      for (const t of [...(near ?? []), ...(far ?? [])]) { t.trunk.dispose(); t.leaves.dispose(); }
      barkMap?.dispose(); leafMap?.dispose();
      return null;
    }
    return { near, far, barkMap: resources.track(barkMap), leafMap: resources.track(leafMap) };
  });
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

/** Dense low boxwood: an opaque crown with small folded leaves, never alpha-cut cards. */
function compactShrub(): BufferGeometry {
  const core = new SphereGeometry(0.43, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.9, 1).toNonIndexed();
  const positions = Array.from(core.getAttribute('position').array);
  const normals = Array.from(core.getAttribute('normal').array);
  const uvs = Array.from(core.getAttribute('uv').array);
  const colors: number[] = [];
  for (let i = 0; i < positions.length; i += 3) {
    const light = 0.56 + 0.44 * Math.max(positions[i + 1] ?? 0, 0) / 0.4;
    colors.push(light * 0.78, light * 0.88, light * 0.7);
  }
  core.dispose();
  const rand = random(541);
  const n = new Vector3(); const tangent = new Vector3(); const across = new Vector3();
  for (let i = 0; i < 24; i++) {
    // Golden-angle distribution keeps the silhouette even; leaves sit on the solid crown.
    const y = (i + 0.5) / 24; const a = i * 2.399963;
    const reach = Math.sqrt(1 - y * y);
    n.set(Math.cos(a) * reach, y, Math.sin(a) * reach);
    const center = new Vector3(n.x * 0.435, n.y * 0.395, n.z * 0.435);
    tangent.crossVectors(n, new Vector3(0, 0, 1)).normalize();
    across.crossVectors(n, tangent).normalize();
    const length = 0.07 + rand() * 0.035; const width = length * 0.43;
    const points = [center.clone().addScaledVector(tangent, -length), center.clone().addScaledVector(across, width), center.clone().addScaledVector(tangent, length), center.clone().addScaledVector(across, -width), center.clone().addScaledVector(n, 0.025)];
    const tint = 0.78 + rand() * 0.2;
    for (const ids of [[0, 1, 4], [1, 2, 4], [2, 3, 4], [3, 0, 4]]) {
      for (const id of ids) {
        const p = points[id]!;
        positions.push(p.x, p.y, p.z); normals.push(n.x, n.y, n.z);
        uvs.push(id === 4 ? 0.5 : id % 2, id === 4 ? 0.5 : (id < 2 ? 0 : 1));
        colors.push(tint * 0.8, tint * 0.94, tint * 0.72);
      }
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute('normal', new BufferAttribute(new Float32Array(normals), 3));
  geometry.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2));
  geometry.setAttribute('color', new BufferAttribute(new Float32Array(colors), 3));
  return geometry;
}

/**
 * Plants, rocks, benches, and trees. Everything but the trees is built now; the trees come from
 * the Blender model file (or the procedural templates if it fails to load) once the returned
 * task settles, before the loading screen lifts.
 */
export function buildLandscape(root: Group, m: DistrictMaterials, batch: StaticBatch, resources: ResourceScope, windTime: { value: number }, outerTrees: boolean, disposed: () => boolean): Promise<void> {
  addWind(m.foliage, windTime);
  const rand = random(97);
  // Trees in the district and on the terrace use full detail; groves and street trees beyond it,
  // where dozens are in view at once, use the light level of detail. The terrace line gets its
  // own meshes so it is culled whenever it is behind the visitor.
  type TreeGroup = 'near' | 'terrace' | 'far';
  const groups: Record<TreeGroup, Matrix4[][]> = { near: treeKinds.map(() => []), terrace: treeKinds.map(() => []), far: treeKinds.map(() => []) };
  const plant = (x: number, z: number, scale = 1, y = 0, group: TreeGroup = 'near'): void => {
    const pick = Math.floor(rand() * 3);
    groups[group][pick]?.push(place(x, y, z, rand() * Math.PI * 2, scale * (0.9 + rand() * 0.2)));
  };

  const shrubs: Matrix4[] = []; const rocks: Matrix4[][] = [[], []];
  // Allee and plaza trees in square stone planters with a hedge collar.
  const h = district.planterHalf;
  for (const t of [...district.allee, ...district.plazaTrees, ...district.framingTrees]) {
    for (const [dx, dz, w, d] of [[0, -h + 0.12, h * 2, 0.24], [0, h - 0.12, h * 2, 0.24], [-h + 0.12, 0, 0.24, h * 2 - 0.48], [h - 0.12, 0, 0.24, h * 2 - 0.48]] as const) {
      batch.box(m.stone, w, 0.62, d, place(t.x + dx, 0.31, t.z + dz), 1.5);
    }
    batch.box(m.soil, h * 2 - 0.48, 0.1, h * 2 - 0.48, place(t.x, 0.52, t.z), 1.2);
    const framing = district.framingTrees.some((f) => f.x === t.x && f.z === t.z);
    if (framing) groups.near[3]?.push(place(t.x, 0.5, t.z, t.x < 0 ? 0 : Math.PI, 1.15));
    else plant(t.x, t.z, 1.2, 0.5);
    // One low dense collar sits inside the opening; the trunk passes through its center.
    shrubs.push(place(t.x, 0.55, t.z, rand() * 6, 1.12));
  }

  // Low lit planters along the path edge, as in the mockup's mid-ground.
  for (const p of district.edgePlanters) {
    batch.box(m.stone, 1.1, 0.55, 1.1, place(p.x, 0.275, p.z), 1.2);
    batch.box(m.soil, 0.9, 0.06, 0.9, place(p.x, 0.53, p.z), 1.2);
    const inward = p.x < 0 ? 1 : -1;
    batch.box(m.warmLight, 0.03, 0.03, 0.9, place(p.x + inward * 0.56, 0.08, p.z), 1);
    shrubs.push(place(p.x, 0.555, p.z, rand() * 6, 0.92));
  }

  // Beds: low dense shrubs and boulders; no crossed grass cards.
  const scatter = (bed: Rect, count: number, fn: (x: number, z: number) => void): void => {
    for (let i = 0; i < count; i++) fn(bed.minX + 0.6 + rand() * (bed.maxX - bed.minX - 1.2), bed.minZ + 0.6 + rand() * (bed.maxZ - bed.minZ - 1.2));
  };
  for (const bed of district.beds) {
    scatter(bed, 7, (x, z) => shrubs.push(place(x, 0.4, z, rand() * 6, 0.7 + rand() * 0.5)));
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
    const x = side * (29 + rand() * 14); const z = -70 + rand() * 120;
    plant(x, z, 1 + rand() * 0.35, 0, 'far');
  }
  // A dense tree line behind the terrace closes the view back toward the entrance.
  const { terrace } = district;
  for (let i = 0; i < 18; i++) {
    const a = terrace.from + ((terrace.to - terrace.from) * (i + rand() * 0.6)) / 18;
    const r = district.gate.radius + district.gate.depth / 2 + 3.5 + rand() * 3.5;
    if (Math.abs(a - Math.PI / 2) < district.gate.opening + 0.05) continue;
    plant(terrace.x + Math.cos(a) * r, terrace.z + Math.sin(a) * r, 1.15 + rand() * 0.3, 0, 'terrace');
  }
  // Street trees along the city edges soften the block faces.
  for (let i = 0; i < (outerTrees ? 30 : 0); i++) {
    const side = i % 2 ? 1 : -1;
    plant(side * (44 + rand() * 2), -52 + rand() * 118, 1.1 + rand() * 0.3, 0, 'far');
  }

  const plantTrees = (models: TreeModels | null): void => {
    if (disposed()) return;
    let bark: Material = m.bark; let leaves: Material = m.foliage;
    let near: TreeTemplate[]; let far: TreeTemplate[];
    if (models) {
      bark = resources.track(new MeshStandardMaterial({ map: models.barkMap, vertexColors: true, roughness: 0.92 }));
      const foliage = resources.track(new MeshStandardMaterial({ map: models.leafMap, vertexColors: true, roughness: 0.8, alphaTest: 0.5, side: DoubleSide }));
      addWind(foliage, windTime);
      leaves = foliage; near = models.near; far = models.far;
    } else {
      near = [treeTemplate(3, 9.5), treeTemplate(8, 8.2), treeTemplate(21, 10.5),
        // Framing tree: leans over the walkway (+X local) with a wide crown, like the mockup's corners.
        treeTemplate(55, 12.5, { lean: new Vector3(1.9, 0, 0), spread: 1.4 })];
      far = near;
    }
    const used = new Set<BufferGeometry>();
    const add = (template: TreeTemplate | undefined, matrices: Matrix4[] | undefined, name: string): void => {
      if (!template || !matrices?.length) return;
      instanced(root, template.trunk, bark, matrices, resources, `tree-trunks-${name}`);
      instanced(root, template.leaves, leaves, matrices, resources, `tree-canopies-${name}`);
      used.add(template.trunk).add(template.leaves);
    };
    treeKinds.forEach((_, i) => {
      add(near[i], groups.near[i], `${i}`);
      add(near[i], groups.terrace[i], `terrace-${i}`);
      add(far[i], groups.far[i], `far-${i}`);
    });
    for (const t of [...near, ...far]) for (const g of [t.trunk, t.leaves]) if (!used.has(g)) g.dispose();
  };
  const shrubMaterial = resources.track(m.hedge.clone());
  shrubMaterial.vertexColors = true;
  shrubMaterial.side = DoubleSide;
  shrubMaterial.roughness = 0.86;
  instanced(root, compactShrub(), shrubMaterial, shrubs, resources, 'compact-shrubs');
  rocks.forEach((list, i) => instanced(root, boulder(31 + i * 17), m.rock, list, resources, `boulders-${i}`));

  // Benches: stone blocks with a warm wood top.
  for (const b of district.benches) {
    batch.box(m.stone, 0.62, 0.4, 2.4, place(b.x, 0.2, b.z), 1.5);
    batch.box(m.wood, 0.66, 0.07, 2.44, place(b.x, 0.435, b.z), 1);
  }
  return loadTrees(resources, disposed).then(plantTrees);
}
