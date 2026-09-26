import { BoxGeometry, BufferAttribute, BufferGeometry, Matrix4, Mesh, Quaternion, Vector3 } from 'three';
import type { Material, Object3D } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { ResourceScope } from '../runtime.ts';

const normal = new Vector3();
/**
 * Replace UVs with world-space projections (meters / scale) chosen by each face's dominant
 * axis, so textures stay continuous and consistently sized across merged pieces.
 */
export function worldUV(geometry: BufferGeometry, scale: number): BufferGeometry {
  const flat = geometry.index ? geometry.toNonIndexed() : geometry;
  if (!flat.getAttribute('normal')) flat.computeVertexNormals();
  const position = flat.getAttribute('position');
  const normals = flat.getAttribute('normal');
  const uv = new Float32Array(position.count * 2);
  for (let face = 0; face < position.count; face += 3) {
    // Project a whole triangle by its first vertex normal so seams never cut through a face.
    normal.fromBufferAttribute(normals, face);
    const ax = Math.abs(normal.x); const ay = Math.abs(normal.y); const az = Math.abs(normal.z);
    for (let i = face; i < face + 3 && i < position.count; i++) {
      const x = position.getX(i); const y = position.getY(i); const z = position.getZ(i);
      const [u, v] = ay >= ax && ay >= az ? [x, z] : ax >= az ? [z, y] : [x, y];
      uv[i * 2] = u / scale; uv[i * 2 + 1] = v / scale;
    }
  }
  flat.setAttribute('uv', new BufferAttribute(uv, 2));
  return flat;
}

const position = new Vector3(); const quaternion = new Quaternion(); const scaleVector = new Vector3(); const yAxis = new Vector3(0, 1, 0);
/** Transform matrix for a piece placed at (x, y, z) with a yaw about Y. */
export function place(x: number, y: number, z: number, yaw = 0, scale = 1): Matrix4 {
  return new Matrix4().compose(position.set(x, y, z), quaternion.setFromAxisAngle(yAxis, yaw), scaleVector.setScalar(scale));
}

/**
 * Collects static pieces per material and merges each group into one mesh. Pieces are
 * transformed to world space first, then given world UVs, so repeated blocks share texture
 * scale. Temporary geometries are disposed; merged ones are owned by the world.
 */
export class StaticBatch {
  private readonly groups = new Map<Material, BufferGeometry[]>();

  constructor(private readonly resources: ResourceScope) {}

  add(material: Material, geometry: BufferGeometry, matrix?: Matrix4, uvScale = 3): void {
    if (matrix) geometry.applyMatrix4(matrix);
    const prepared = worldUV(geometry, uvScale);
    if (prepared !== geometry) geometry.dispose();
    // Keep only the attributes every piece shares so groups can merge.
    for (const name of Object.keys(prepared.attributes)) if (!['position', 'normal', 'uv'].includes(name)) prepared.deleteAttribute(name);
    const list = this.groups.get(material) ?? [];
    list.push(prepared);
    this.groups.set(material, list);
  }

  box(material: Material, width: number, height: number, depth: number, matrix: Matrix4, uvScale = 3): void {
    this.add(material, new BoxGeometry(width, height, depth), matrix, uvScale);
  }

  /** Merge everything into the parent. Call once. */
  build(parent: Object3D, { castShadow = true, receiveShadow = true } = {}): Mesh[] {
    const meshes: Mesh[] = [];
    for (const [material, pieces] of this.groups) {
      const merged = mergeGeometries(pieces, false);
      for (const piece of pieces) piece.dispose();
      if (!merged) continue;
      merged.computeBoundingSphere();
      const mesh = new Mesh(this.resources.track(merged), material);
      mesh.castShadow = castShadow; mesh.receiveShadow = receiveShadow;
      mesh.matrixAutoUpdate = false;
      parent.add(mesh);
      meshes.push(mesh);
    }
    this.groups.clear();
    return meshes;
  }
}
