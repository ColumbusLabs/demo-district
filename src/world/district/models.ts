import { BufferAttribute, BufferGeometry, Mesh } from 'three';
import type { Object3D } from 'three';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { assetUrl } from './materials.ts';

/**
 * Loads a Blender-authored model from public/world/models (see tools/blender/). The glTF loader
 * and meshopt decoder are a separate chunk, fetched while the loading screen is up. Resolves
 * null on failure so callers keep their procedural fallback.
 */
export function loadModel(file: string): Promise<GLTF | null> {
  return Promise.all([import('three/addons/loaders/GLTFLoader.js'), import('three/addons/libs/meshopt_decoder.module.js')])
    .then(([{ GLTFLoader }, { MeshoptDecoder }]) => new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(assetUrl(`models/${file}`)))
    .then((gltf) => { gltf.scene.updateMatrixWorld(true); return gltf; })
    .catch(() => null);
}

/** Every mesh in a loaded model. */
export function meshesOf(root: Object3D): Mesh[] {
  const meshes: Mesh[] = [];
  root.traverse((object) => { if (object instanceof Mesh) meshes.push(object); });
  return meshes;
}

/** Float copy of a glTF primitive (meshopt data is quantized) with its node transform baked in. */
export function bake(mesh: Mesh): BufferGeometry {
  const source = mesh.geometry; const geometry = new BufferGeometry();
  for (const name of ['position', 'normal', 'uv', 'color']) {
    const attribute = source.getAttribute(name);
    if (!attribute) continue;
    const size = attribute.itemSize; const out = new Float32Array(attribute.count * size);
    const read = [attribute.getX, attribute.getY, attribute.getZ, attribute.getW].slice(0, size);
    for (let i = 0; i < attribute.count; i++) read.forEach((get, k) => { out[i * size + k] = get.call(attribute, i); });
    geometry.setAttribute(name, new BufferAttribute(out, size));
  }
  if (source.index) geometry.setIndex(Array.from(source.index.array));
  geometry.applyMatrix4(mesh.matrixWorld);
  return geometry;
}

/** Dispose the loader's own geometries, materials, and textures, except the textures kept. */
export function disposeModel(root: Object3D, keep: ReadonlySet<unknown> = new Set()): void {
  for (const mesh of meshesOf(root)) {
    mesh.geometry.dispose();
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      for (const value of Object.values(material)) if (value && typeof value === 'object' && 'isTexture' in value && !keep.has(value)) (value as { dispose(): void }).dispose();
      material.dispose();
    }
  }
}
