import { constrainMotion, movementConfig } from '../controls/motion.ts';
import type { TargetVolume } from '../interactions/targeting.ts';
import { apronReach, district, districtNavigation, plinthHeight, storefrontSize } from './layout.ts';

/**
 * One interaction target per storefront, derived from the layout: a generous box around the
 * frame (not pixel-exact) so aiming is easy, and an apron facing it. Decorative geometry is
 * never a target.
 */
export function storefrontTargets(): TargetVolume[] {
  const navigation = movementConfig(districtNavigation());
  const free = (x: number, z: number): boolean => {
    const probe = { x, z, vx: 0, vz: 0, yaw: 0, pitch: 0 };
    constrainMotion(probe, navigation);
    return Math.abs(probe.x - x) < 1e-6 && Math.abs(probe.z - z) < 1e-6;
  };
  return district.pavilions.map((slot) => {
    const store = storefrontSize(slot);
    const nx = Math.sin(slot.facing); const nz = Math.cos(slot.facing);
    // Box spans from just inside the facade to a little in front of the frame.
    const inner = slot.depth / 2 - 0.3; const outer = slot.depth / 2 + store.proud + 0.5;
    const mid = (inner + outer) / 2; const reach = apronReach(slot);
    // Farthest free standing spot on the storefront's axis, up to 6.5 m out, for framed arrivals.
    let viewReach = reach;
    for (let out = slot.depth / 2 + 6.5; out > reach; out -= 0.25) {
      if (free(slot.x + nx * out, slot.z + nz * out)) { viewReach = out; break; }
    }
    return {
      id: slot.id,
      x: slot.x + nx * mid, z: slot.z + nz * mid,
      halfWidth: store.width / 2 + store.jamb + 0.5, halfDepth: (outer - inner) / 2, angle: slot.facing,
      minY: 0, maxY: plinthHeight + store.height + 0.4,
      apron: { x: slot.x + nx * reach, z: slot.z + nz * reach, yaw: slot.facing },
      view: { x: slot.x + nx * viewReach, z: slot.z + nz * viewReach, yaw: slot.facing },
    };
  });
}
