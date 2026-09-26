/** Pure interaction geometry: no DOM, renderer, or scene imports. Meters; yaw as in Three.js. */
export type Vec3 = readonly [number, number, number];

/**
 * An interactable volume: an oriented box standing on the ground. `front` is the outward normal
 * yaw (0 faces +Z). `apron` is a safe standing spot facing the target, used by jumps and prompts.
 */
export interface TargetVolume {
  id: string;
  x: number; z: number; halfWidth: number; halfDepth: number; angle: number;
  minY: number; maxY: number;
  apron: { x: number; z: number; yaw: number };
  /** Where search and map jumps arrive: far enough back to frame the storefront and its sign. */
  view: { x: number; z: number; yaw: number };
}

/** Distance along a ray (unit `dir`) to the volume, or null. Slab test in the box's frame. */
export function rayVolumeDistance(origin: Vec3, dir: Vec3, v: TargetVolume): number | null {
  const cos = Math.cos(v.angle); const sin = Math.sin(v.angle);
  const ox = origin[0] - v.x; const oz = origin[2] - v.z;
  const o = [ox * cos - oz * sin, origin[1], ox * sin + oz * cos];
  const d = [dir[0] * cos - dir[2] * sin, dir[1], dir[0] * sin + dir[2] * cos];
  const lo = [-v.halfWidth, v.minY, -v.halfDepth]; const hi = [v.halfWidth, v.maxY, v.halfDepth];
  let near = 0; let far = Infinity;
  for (let axis = 0; axis < 3; axis++) {
    const oa = o[axis] ?? 0; const da = d[axis] ?? 0; const l = lo[axis] ?? 0; const h = hi[axis] ?? 0;
    if (Math.abs(da) < 1e-9) { if (oa < l || oa > h) return null; continue; }
    let t0 = (l - oa) / da; let t1 = (h - oa) / da;
    if (t0 > t1) [t0, t1] = [t1, t0];
    near = Math.max(near, t0); far = Math.min(far, t1);
    if (near > far) return null;
  }
  return near;
}

/** Nearest volume hit by a ray within `maxDistance`. Only registered targets can be picked. */
export function pickTarget(origin: Vec3, dir: Vec3, volumes: readonly TargetVolume[], maxDistance = 45): TargetVolume | null {
  let best: TargetVolume | null = null; let bestDistance = maxDistance;
  for (const v of volumes) {
    const t = rayVolumeDistance(origin, dir, v);
    if (t !== null && t <= bestDistance) { best = v; bestDistance = t; }
  }
  return best;
}

/**
 * The target a walking visitor is addressing: its front faces them, it is within `maxDistance`
 * of the storefront face, and it sits within `maxAngle` of the view direction. Forgiving by design.
 */
export function proximityTarget(x: number, z: number, yaw: number, volumes: readonly TargetVolume[], maxDistance = 10, maxAngle = 0.62): TargetVolume | null {
  const fx = -Math.sin(yaw); const fz = -Math.cos(yaw);
  let best: TargetVolume | null = null; let bestScore = Infinity;
  for (const v of volumes) {
    const nx = Math.sin(v.angle); const nz = Math.cos(v.angle);
    const faceX = v.x + nx * v.halfDepth; const faceZ = v.z + nz * v.halfDepth;
    const dx = faceX - x; const dz = faceZ - z; const distance = Math.hypot(dx, dz);
    if (distance > maxDistance || distance < 1e-6) continue;
    if (dx * nx + dz * nz > 0) continue; // standing behind or beside the storefront
    const angle = Math.acos(Math.max(-1, Math.min(1, (dx * fx + dz * fz) / distance)));
    if (angle > maxAngle) continue;
    const score = distance * (1 + angle);
    if (score < bestScore) { best = v; bestScore = score; }
  }
  return best;
}
