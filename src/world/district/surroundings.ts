import { BufferAttribute, Color, CylinderGeometry, DoubleSide, ExtrudeGeometry, Mesh, MeshStandardMaterial, PlaneGeometry, RingGeometry, Shape } from 'three';
import type { Group } from 'three';
import type { ResourceScope } from '../runtime.ts';
import { place } from './geometry.ts';
import type { StaticBatch } from './geometry.ts';
import { district } from './layout.ts';
import { random } from './materials.ts';
import type { DistrictMaterials } from './materials.ts';

/** Rounded-rectangle plan extruded upward (shape y = −z), centered on its footprint. */
function block(width: number, depth: number, height: number, radius: number): ExtrudeGeometry {
  const w = width / 2; const d = depth / 2; const r = Math.min(radius, w - 0.1, d - 0.1);
  const s = new Shape();
  s.moveTo(-w + r, -d); s.lineTo(w - r, -d); s.quadraticCurveTo(w, -d, w, -d + r);
  s.lineTo(w, d - r); s.quadraticCurveTo(w, d, w - r, d); s.lineTo(-w + r, d);
  s.quadraticCurveTo(-w, d, -w, d - r); s.lineTo(-w, -d + r); s.quadraticCurveTo(-w, -d, -w + r, -d);
  const geometry = new ExtrudeGeometry(s, { depth: height, bevelEnabled: false, curveSegments: 6 });
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

interface Footprint { x: number; z: number; w: number; d: number; yaw: number; h: number }

/**
 * The entrance colonnade, the city ring, the hills behind it, and a faint skyline. Everything
 * here is outside the walkable area and batched, so it adds scenery, not draw calls.
 */
export function buildSurroundings(root: Group, m: DistrictMaterials, batch: StaticBatch, lights: StaticBatch, resources: ResourceScope, detail: boolean): void {
  const rand = random(303);
  const { terrace, gate, city } = district;

  // Entrance colonnade: slender columns under a thick curved canopy with a lit soffit, opening
  // at the center into a taller portal that frames the boulevard.
  const mid = Math.PI / 2;
  const canopyShape = (a0: number, a1: number): Shape => {
    const inner = gate.radius - gate.depth / 2; const outer = gate.radius + gate.depth / 2;
    const s = new Shape();
    s.absarc(0, 0, outer, a0, a1, false);
    s.absarc(0, 0, inner, a1, a0, true);
    return s;
  };
  for (const [a0, a1] of [[terrace.from, mid - gate.opening], [mid + gate.opening, terrace.to]] as const) {
    // Shape space (x, y) → world (x, −z) after rotateX; mirror y so arcs sit behind spawn (+Z).
    const roof = new ExtrudeGeometry(canopyShape(-a1, -a0), { depth: 0.55, bevelEnabled: true, bevelThickness: 0.18, bevelSize: 0.18, bevelSegments: 3, curveSegments: 36 });
    roof.rotateX(-Math.PI / 2);
    batch.add(m.roof, roof, place(terrace.x, gate.height, terrace.z), 5);
    const soffit = new RingGeometry(gate.radius - gate.depth / 2 + 0.2, gate.radius + gate.depth / 2 - 0.2, 36, 1, a0, a1 - a0).rotateX(Math.PI / 2);
    batch.add(m.soffit, soffit, place(terrace.x, gate.height - 0.19, terrace.z), 5);
    lights.add(m.warmLight, new RingGeometry(gate.radius - gate.depth / 2 + 0.15, gate.radius - gate.depth / 2 + 0.25, 36, 1, a0, a1 - a0).rotateX(Math.PI / 2), place(terrace.x, gate.height - 0.2, terrace.z));
    const count = Math.max(2, Math.round(((a1 - a0) * gate.radius) / 2.6));
    for (let i = 0; i <= count; i++) {
      const a = a0 + ((a1 - a0) * i) / count;
      for (const r of [gate.radius - gate.depth / 2 + 0.45, gate.radius + gate.depth / 2 - 0.45]) {
        const cx = terrace.x + Math.cos(a) * r; const cz = terrace.z + Math.sin(a) * r;
        batch.add(m.stone, new CylinderGeometry(0.22, 0.26, gate.height - 0.1, 14), place(cx, gate.height / 2, cz), 1.5);
        // A warm ring at each column foot, like the district's other set-in lights.
        lights.add(m.warmLight, new CylinderGeometry(0.34, 0.34, 0.03, 16, 1, true), place(cx, 0.06, cz));
      }
    }
  }
  // Portal: two tall pylons and a lintel over the axis, taller than the colonnade.
  const portalZ = terrace.z + gate.radius; const portalH = gate.height + 2.4; const span = 2 * gate.radius * Math.sin(gate.opening) + 0.6;
  for (const side of [-1, 1]) batch.box(m.stone, 1.2, portalH, gate.depth + 0.4, place(side * (span / 2 + 0.3), portalH / 2, portalZ), 3);
  batch.box(m.roof, span + 2.8, 1.1, gate.depth + 0.8, place(0, portalH + 0.35, portalZ), 4);
  lights.box(m.warmLight, span - 0.2, 0.04, 0.08, place(0, portalH - 0.22, portalZ - gate.depth / 2 + 0.1));
  // Entry court beyond the portal so the axis continues into the city instead of stopping.
  batch.box(m.paving, span + 8, 0.3, 26, place(0, -0.15, portalZ + 14), 4);

  // Paved city ground under the ring, so gaps between blocks read as streets, not open lawn.
  const { sides, back } = city;
  for (const side of [-1, 1]) {
    const cx = side * (sides.innerX - 3 + (sides.outerX - sides.innerX + 6) / 2);
    batch.box(m.paving, sides.outerX - sides.innerX + 6, 0.3, sides.maxZ - sides.minZ + 16, place(cx, -0.14, (sides.minZ + sides.maxZ) / 2), 8);
  }
  batch.box(m.paving, back.halfWidth * 2 + 12, 0.3, back.maxZ - back.minZ + 40, place(0, -0.14, (back.minZ + back.maxZ) / 2 + 12), 8);

  // City ring: rows of rounded blocks with streets, taller with distance, facing the district.
  const blocks: Footprint[] = [];
  const row = (fromZ: number, toZ: number, x0: number, x1: number, sideYaw: number): void => {
    let x = x0;
    while (Math.abs(x) < Math.abs(x1)) {
      const w = 20 + rand() * 12;
      let z = fromZ;
      while (z < toZ) {
        const d = 18 + rand() * 14;
        const reach = Math.hypot(x, z) / 100;
        // Lower toward the lake so the shoreline stays open and the plaza's sky stays clear.
        const lakeward = Math.max(0, Math.min(1, (z + 20) / 40));
        blocks.push({ x: x + Math.sign(x) * w / 2, z: z + d / 2, w, d, yaw: sideYaw, h: 8 + (reach * 14 + rand() * 10) * (0.35 + 0.65 * lakeward) });
        z += d + city.street;
      }
      x += Math.sign(x) * (w + city.street);
    }
  };
  row(city.sides.minZ, city.sides.maxZ, -city.sides.innerX, -city.sides.outerX, 0);
  row(city.sides.minZ, city.sides.maxZ, city.sides.innerX, city.sides.outerX, 0);
  for (let x = -city.back.halfWidth; x < city.back.halfWidth;) {
    const w = 20 + rand() * 12;
    // Keep the entry court's continuation open as an avenue.
    if (Math.abs(x + w / 2) < 14) { x += w + city.street; continue; }
    let z = city.back.minZ;
    while (z < city.back.maxZ) {
      const d = 18 + rand() * 12;
      blocks.push({ x: x + w / 2, z: z + d / 2, w, d, yaw: 0, h: 10 + (Math.hypot(x, z) / 100) * 16 + rand() * 10 });
      z += d + city.street;
    }
    x += w + city.street;
  }
  // The avenue beyond the portal ends at a civic tower on the axis, framed by the gate.
  blocks.push({ x: 0, z: city.back.maxZ + 14, w: 22, d: 18, yaw: 0, h: 34 });
  for (const b of blocks) {
    const podium = Math.min(b.h, 7 + rand() * 3);
    const radius = 3 + rand() * 4;
    const skin = rand() < 0.55 ? m.facadeGlass : m.facadeStone;
    batch.add(skin, block(b.w, b.d, podium, radius), place(b.x, 0, b.z, b.yaw), 7.2);
    batch.add(m.roof, block(b.w + 0.8, b.d + 0.8, 0.45, radius + 0.4), place(b.x, podium, b.z, b.yaw), 6);
    if (b.h > podium + 3) {
      // A setback upper volume with its own cornice: the stepped silhouettes of the mockup's towers.
      const inset = 2 + rand() * 2.5;
      batch.add(rand() < 0.7 ? skin : skin === m.facadeGlass ? m.facadeStone : m.facadeGlass, block(b.w - inset * 2, b.d - inset * 2, b.h - podium, radius), place(b.x, podium + 0.45, b.z, b.yaw), 7.2);
      batch.add(m.roof, block(b.w - inset * 2 + 0.8, b.d - inset * 2 + 0.8, 0.5, radius + 0.4), place(b.x, b.h + 0.45, b.z, b.yaw), 6);
      if (detail && rand() < 0.35) lights.box(m.warmLight, b.w - inset * 2 - 0.6, 0.05, 0.05, place(b.x, b.h + 0.3, b.z - (b.d / 2 - inset) - 0.4, b.yaw));
    }
  }

  // Hills behind the city: a ring from side to side around the back, never across the lake.
  const hills = new PlaneGeometry(1, 1, 160, 5);
  const pos = hills.getAttribute('position'); const colors = new Float32Array(pos.count * 3);
  const low = new Color(0x5b6f52); const high = new Color(0x8a9a78); const c = new Color();
  const phases = [rand() * 6, rand() * 6, rand() * 6];
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i) + 0.5; const t = pos.getY(i) + 0.5;
    const angle = -1.75 + u * 3.5; // beside the city on one side, round the back, to the other; never over the lake
    const ridge = 0.6 + 0.25 * Math.sin(angle * 4 + (phases[0] ?? 0)) + 0.12 * Math.sin(angle * 11 + (phases[1] ?? 0)) + 0.05 * Math.sin(angle * 29 + (phases[2] ?? 0));
    const radius = 175 + 25 * Math.sin(angle * 2.3) - t * 30;
    pos.setXYZ(i, Math.sin(angle) * radius, ridge * 46 * t - 2, Math.cos(angle) * radius);
    c.copy(low).lerp(high, t); colors.set([c.r, c.g, c.b], i * 3);
  }
  hills.setAttribute('color', new BufferAttribute(colors, 3));
  hills.computeVertexNormals();
  const hillMesh = new Mesh(resources.track(hills), resources.track(new MeshStandardMaterial({ vertexColors: true, roughness: 1, side: DoubleSide })));
  hillMesh.name = 'city-hills';
  root.add(hillMesh);

  // A faint skyline in the haze, beside the mountains as in the mockup.
  if (detail) {
    // Toned toward the horizon haze so the towers recede like distant architecture, not white slabs.
    const skyline = resources.track(new MeshStandardMaterial({ color: 0x9aa7b3, roughness: 1, envMapIntensity: 0.4 }));
    const towers: Array<[number, number, number, number]> = [];
    for (const side of [-1, 1]) {
      for (let i = 0; i < 7; i++) {
        // Angle off the forward (−Z) axis: ahead-left and ahead-right, well clear of the landmark.
        const angle = side * (0.95 + rand() * 0.55);
        const r = 330 + rand() * 90;
        towers.push([Math.sin(angle) * r, -Math.cos(angle) * r, 7 + rand() * 9, 35 + rand() * 60]);
      }
    }
    for (const [x, z, w, h] of towers) batch.add(skyline, block(w, w, h, 1.5), place(x, 0, z), 20);
  }
}
