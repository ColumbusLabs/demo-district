import { BufferAttribute, BufferGeometry, Mesh, SphereGeometry, Vector3 } from 'three';
import type { Group } from 'three';
import type { ResourceScope } from '../runtime.ts';
import { district } from './layout.ts';
import type { DistrictMaterials } from './materials.ts';
import { bake, disposeModel, loadModel, meshesOf } from './models.ts';

/**
 * Sweep an elliptical cross-section along a planar arch y = H(1 − |s|^p), s ∈ [−1, 1].
 * The section is `width` in the arch plane (tapering toward the crown) and `thickness` across it.
 */
function archRibbon(span: number, height: number, sharpness: number, baseWidth: number, crownWidth: number, thickness: number): BufferGeometry {
  const steps = 96; const around = 20;
  const point = (s: number): Vector3 => new Vector3(s * span / 2, height * (1 - Math.pow(Math.abs(s), sharpness)), 0);
  const positions: number[] = []; const normals: number[] = []; const index: number[] = [];
  const planeNormal = new Vector3(0, 0, 1);
  for (let i = 0; i <= steps; i++) {
    const s = -1 + (2 * i) / steps;
    const p = point(s);
    const tangent = point(Math.min(1, s + 1e-3)).sub(point(Math.max(-1, s - 1e-3))).normalize();
    const inPlane = new Vector3().crossVectors(planeNormal, tangent).normalize();
    const width = crownWidth + (baseWidth - crownWidth) * Math.pow(Math.abs(s), 1.5);
    for (let j = 0; j <= around; j++) {
      const a = (j / around) * Math.PI * 2;
      const c = Math.cos(a); const sn = Math.sin(a);
      const offset = inPlane.clone().multiplyScalar(c * width / 2).addScaledVector(planeNormal, sn * thickness / 2);
      positions.push(p.x + offset.x, p.y + offset.y, p.z + offset.z);
      // Ellipse normal: scale the offset components inversely by their radii.
      const n = inPlane.clone().multiplyScalar(c / (width / 2)).addScaledVector(planeNormal, sn / (thickness / 2)).normalize();
      normals.push(n.x, n.y, n.z);
    }
  }
  for (let i = 0; i < steps; i++) {
    for (let j = 0; j < around; j++) {
      const a = i * (around + 1) + j; const b = a + around + 1;
      index.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute('normal', new BufferAttribute(new Float32Array(normals), 3));
  geometry.setIndex(index);
  return geometry;
}

/**
 * The arch-and-orb landmark over the fountain. The sculpture (lancet arch and crescent wings) is
 * the Blender model public/world/models/landmark.glb (tools/blender/landmark.py); until it loads,
 * and if it fails, a procedural lancet stands in. The orb and fountain stay in code.
 * Returns the orb's drift updater and a task that settles once the sculpture is in place.
 */
export function buildLandmark(root: Group, m: DistrictMaterials, resources: ResourceScope, disposed: () => boolean): { drift: (time: number) => void; ready: Promise<void> } {
  const { x, z, span, height, orbHeight, orbRadius } = district.landmark;
  // The model extends 0.4 m below its origin: set it at paving level so its legs
  // enter the pond and paving directly, with the open ends hidden below both surfaces.
  const base = 0;
  const place = (geometry: BufferGeometry): Mesh => {
    const arch = new Mesh(resources.track(geometry), m.arch);
    arch.position.set(x, base, z);
    arch.castShadow = true; arch.receiveShadow = true; arch.name = 'landmark-arch';
    root.add(arch);
    return arch;
  };
  const fallback = place(archRibbon(span, height, 1.75, 1.5, 1.1, 2.0));
  const ready = loadModel('landmark.glb').then((gltf) => {
    if (!gltf) return;
    const mesh = meshesOf(gltf.scene).find((candidate) => candidate.name === 'landmark_arch' || candidate.parent?.name === 'landmark_arch');
    const geometry = mesh && !disposed() ? bake(mesh) : null;
    disposeModel(gltf.scene);
    if (!geometry || disposed()) { geometry?.dispose(); return; }
    root.remove(fallback);
    place(geometry);
  });
  const orb = new Mesh(resources.track(new SphereGeometry(orbRadius, 64, 48)), m.chrome);
  orb.position.set(x, orbHeight, z);
  orb.castShadow = true; orb.name = 'landmark-orb';
  root.add(orb);
  return { drift: (time) => { orb.position.y = orbHeight + Math.sin(time * 0.35) * 0.12; }, ready };
}
