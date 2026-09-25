import type { TargetVolume } from '../interactions/targeting.ts';
import { apronReach, district, plinthHeight, storefrontSize } from './layout.ts';

/**
 * One interaction target per storefront, derived from the layout: a generous box around the
 * frame (not pixel-exact) so aiming is easy, and an apron facing it. Decorative geometry is
 * never a target.
 */
export function storefrontTargets(): TargetVolume[] {
  return district.pavilions.map((slot) => {
    const store = storefrontSize(slot);
    const nx = Math.sin(slot.facing); const nz = Math.cos(slot.facing);
    // Box spans from just inside the facade to a little in front of the frame.
    const inner = slot.depth / 2 - 0.3; const outer = slot.depth / 2 + store.proud + 0.5;
    const mid = (inner + outer) / 2; const reach = apronReach(slot);
    return {
      id: slot.id,
      x: slot.x + nx * mid, z: slot.z + nz * mid,
      halfWidth: store.width / 2 + store.jamb + 0.5, halfDepth: (outer - inner) / 2, angle: slot.facing,
      minY: 0, maxY: plinthHeight + store.height + 0.4,
      apron: { x: slot.x + nx * reach, z: slot.z + nz * reach, yaw: slot.facing },
    };
  });
}
