/**
 * Demo District plan in meters. Pure data: geometry and collision both derive from it, so a
 * wall you see is a wall you bump into. +X is right and -Z is "forward" from spawn toward
 * the landmark. No Three.js or DOM imports.
 */
import type { Blocker } from '../controls/motion.ts';

export type RoofStyle = 'disc' | 'wave' | 'shell';
export interface PavilionSlot {
  id: string;
  x: number;
  z: number;
  /** Yaw of the storefront's outward normal; 0 faces +Z (toward spawn). */
  facing: number;
  width: number;
  depth: number;
  height: number;
  roof: RoofStyle;
  /** Warm wood accent panel beside the storefront. */
  accent: 'left' | 'right' | 'none';
  /** Hue family for the implied interior display. */
  display: number;
}
export interface Rect { minX: number; maxX: number; minZ: number; maxZ: number }
export interface Circle { x: number; z: number; radius: number }

const mirror = (slot: PavilionSlot, id: string): PavilionSlot => ({
  ...slot, id, x: -slot.x, facing: -slot.facing,
  accent: slot.accent === 'left' ? 'right' : slot.accent === 'right' ? 'left' : 'none',
  display: (slot.display + 0.37) % 1,
});
const leftRow: PavilionSlot[] = [
  { id: 'west-gate', x: -20.5, z: -10.5, facing: 0.95, width: 12, depth: 11, height: 7, roof: 'disc', accent: 'left', display: 0.78 },
  { id: 'west-promenade', x: -19.5, z: -22, facing: Math.PI / 2, width: 11, depth: 10, height: 5.6, roof: 'wave', accent: 'right', display: 0.62 },
  { id: 'west-grove', x: -21.5, z: -35.5, facing: Math.PI / 2 - 0.25, width: 10, depth: 9, height: 5.2, roof: 'shell', accent: 'left', display: 0.08 },
  { id: 'west-plaza', x: -21.5, z: -55, facing: 1.1, width: 12, depth: 10, height: 6, roof: 'disc', accent: 'none', display: 0.55 },
];

/**
 * Framed like the approved mockup: the landmark stands ~55 m ahead of spawn, sign plinths
 * ~13 m ahead just outside the channels, and gate pavilions flank the first stretch.
 */
export const district = {
  spawn: { x: 0, z: 10, yaw: 0, pitch: 0.035 },
  bounds: { minX: -27, maxX: 27, minZ: -63, maxZ: 22 } satisfies Rect,
  /** Central stone axis from behind spawn to the plaza. */
  boulevard: { halfWidth: 3.6, minZ: -26, maxZ: 26 },
  /** Shallow channels either side of the near boulevard. */
  channels: [
    { minX: -8.2, maxX: -4.1, minZ: -11, maxZ: 21 },
    { minX: 4.1, maxX: 8.2, minZ: -11, maxZ: 21 },
  ] satisfies Rect[],
  copingWidth: 0.4,
  /** Flush light chevrons in the near paving (z of each pair). */
  chevrons: [5, -1],
  /** Circular plaza with the fountain basin and landmark. */
  plaza: { x: 0, z: -44, radius: 18 } satisfies Circle,
  fountain: { x: 0, z: -44, radius: 9.5 } satisfies Circle,
  /**
   * Lancet arch and orb. The sculpture is modelled in tools/blender/landmark.py with these
   * dimensions; its GLB records the same footings, checked by tests/unit/landmark-model.test.mjs.
   * `wingFoot` is where each crescent wing meets the ground, relative to the landmark (+X side).
   */
  landmark: { x: 0, z: -45, span: 10, height: 25.7, orbHeight: 11, orbRadius: 2.6, wingFoot: { x: 10.826, z: -2.621 } },
  /** Waterfront edge; the lake and mountains lie beyond. */
  waterfrontZ: -64,
  pavilions: [...leftRow, ...leftRow.map((slot) => mirror(slot, slot.id.replace('west', 'east')))],
  /** Planted beds with low stone walls; the sign plinths sit at their fronts. */
  beds: [
    { minX: -12.9, maxX: -9, minZ: -8.2, maxZ: -4.9 },
    { minX: 9, maxX: 12.9, minZ: -8.2, maxZ: -4.9 },
  ] satisfies Rect[],
  /** Sign plinths angled toward the approach (text arrives with signage). */
  plinths: [
    { x: -10.4, z: -4.3, width: 4.4, angle: 0.32 },
    { x: 10.4, z: -4.3, width: 4.4, angle: -0.32 },
  ],
  /** Tree allee between the channel ends and the plaza, each in a square planter. */
  allee: [-16, -22].flatMap((z) => [{ x: -6.6, z }, { x: 6.6, z }]),
  planterHalf: 0.85,
  /** Trees in planters where the allee opens into the plaza. */
  plazaTrees: [{ x: -10, z: -27 }, { x: 10, z: -27 }, { x: -13.5, z: -29.5 }, { x: 13.5, z: -29.5 }],
  /** Large trees near spawn whose canopies frame the top corners of the opening view. */
  framingTrees: [{ x: -14.2, z: -1.8 }, { x: 14.2, z: -1.8 }],
  /** Low lit planters lining the path between the channels and the plaza (mockup mid-ground). */
  edgePlanters: [-13.8, -19, -24.2].flatMap((z) => [{ x: -4.45, z }, { x: 4.45, z }]),
  /** Curved stone terrace closing the view behind spawn: center, radius, and arc (radians). */
  terrace: { x: 0, z: 23, radius: 11, from: 0.18, to: Math.PI - 0.18 },
  /** Entrance colonnade on the terrace: a curved canopy on slender columns with a central portal. */
  gate: { radius: 12.6, height: 5.8, depth: 3.2, opening: 0.2 },
  /**
   * The city beyond the district, outside the walkable area: blocks sit behind the side groves
   * and past the entrance; the lake side stays open. Heights rise with distance.
   */
  city: {
    sides: { innerX: 47, outerX: 98, minZ: -58, maxZ: 70 },
    back: { minZ: 62, maxZ: 118, halfWidth: 98 },
    street: 7,
  },
  /** Stone benches with wood tops behind the plinths (long axis along Z). */
  benches: [{ x: -9.4, z: 5.5 }, { x: 9.4, z: 5.5 }, { x: -9.4, z: 11.5 }, { x: 9.4, z: 11.5 }],
  banners: [{ x: -9.3, z: -15.5 }, { x: 9.3, z: -15.5 }],
  /** Lit bollards marking where the channels end and the allee begins. */
  bollards: [-6.15, 6.15].map((x) => ({ x, z: -11.95 })),
} as const;

export const eyeHeight = 1.7;
export const plinthHeight = 0.35;

/** Storefront opening dimensions for a pavilion (local frame, front = +Z). Shared by kit and targets. */
export function storefrontSize(slot: PavilionSlot): { width: number; height: number; glassHeight: number; jamb: number; proud: number } {
  const height = (slot.height - plinthHeight) * 0.8;
  return { width: Math.min(slot.width * 0.46, 6.2), height, glassHeight: height * 0.74, jamb: 0.28, proud: 0.45 };
}
/** Distance from a pavilion's center to its storefront apron (where visitors stand). */
export const apronReach = (slot: PavilionSlot): number => slot.depth / 2 + 1.8;

/** Where the sculpture meets the ground: the main arch's two legs and the two wing feet. */
export function landmarkFootings(): Circle[] {
  const { x, z, span, wingFoot } = district.landmark;
  return [-1, 1].flatMap((side) => [
    { x: x + side * span / 2, z, radius: 1.4 },
    { x: x + side * wingFoot.x, z: z + wingFoot.z, radius: 1.0 },
  ]);
}

const rectBlocker = (r: Rect): Blocker => ({
  x: (r.minX + r.maxX) / 2, z: (r.minZ + r.maxZ) / 2, halfWidth: (r.maxX - r.minX) / 2, halfDepth: (r.maxZ - r.minZ) / 2,
});

/** Solid footprints for navigation. Kept slightly generous so the camera never clips geometry. */
export function districtBlockers(): Blocker[] {
  const blockers: Blocker[] = [];
  for (const channel of district.channels) blockers.push(rectBlocker(channel));
  for (const bed of district.beds) blockers.push(rectBlocker(bed));
  for (const p of district.pavilions) {
    // Pavilion body plus a little roof overhang margin at the storefront.
    blockers.push({ x: p.x, z: p.z, halfWidth: p.width / 2, halfDepth: p.depth / 2 + 0.2, angle: p.facing });
  }
  for (const plinth of district.plinths) blockers.push({ x: plinth.x, z: plinth.z, halfWidth: plinth.width / 2, halfDepth: 0.45, angle: plinth.angle });
  for (const tree of [...district.allee, ...district.plazaTrees, ...district.framingTrees]) blockers.push({ x: tree.x, z: tree.z, halfWidth: district.planterHalf, halfDepth: district.planterHalf });
  for (const planter of district.edgePlanters) blockers.push({ x: planter.x, z: planter.z, halfWidth: 0.55, halfDepth: 0.55 });
  for (const bench of district.benches) blockers.push({ x: bench.x, z: bench.z, halfWidth: 0.35, halfDepth: 1.25 });
  for (const banner of district.banners) blockers.push({ x: banner.x, z: banner.z, radius: 0.35 });
  for (const bollard of district.bollards) blockers.push({ x: bollard.x, z: bollard.z, radius: 0.25 });
  blockers.push({ x: district.fountain.x, z: district.fountain.z, radius: district.fountain.radius + 0.4 });
  // Only the sculpture remains: avoid invisible collisions from the removed shrub beds.
  for (const foot of landmarkFootings()) blockers.push({ ...foot });
  return blockers;
}

/** Movement settings for the district; merged into the controller's defaults. */
export function districtNavigation(): { bounds: Rect; spawn: typeof district.spawn; blockers: Blocker[] } {
  return { bounds: { ...district.bounds }, spawn: { ...district.spawn }, blockers: districtBlockers() };
}
