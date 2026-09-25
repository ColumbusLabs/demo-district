import { BoxGeometry, CircleGeometry, CylinderGeometry, LatheGeometry, Mesh, PlaneGeometry, RingGeometry, Shape, ShapeGeometry, Vector2 } from 'three';
import type { Group, Material, ShaderMaterial } from 'three';
import type { ResourceScope } from '../runtime.ts';
import { place, StaticBatch } from './geometry.ts';
import { district } from './layout.ts';
import type { Rect } from './layout.ts';
import type { DistrictMaterials } from './materials.ts';
import { fountainBell } from './water.ts';

const paveUv = 4; // meters of paving per texture repeat
const slab = 0.3; // paving thickness below y = 0

/** Plaza circulation: paving, channels, beds, plinths, banners, bollards, basin, and waterfront. */
export function buildGround(root: Group, m: DistrictMaterials, water: { channel: ShaderMaterial; basin: ShaderMaterial; lake: ShaderMaterial }, resources: ResourceScope): void {
  const batch = new StaticBatch(resources);
  const lights = new StaticBatch(resources);
  const pave = (r: Rect, material: Material = m.paving): void => {
    const w = r.maxX - r.minX; const d = r.maxZ - r.minZ;
    if (w > 0 && d > 0) batch.box(material, w, slab, d, place((r.minX + r.maxX) / 2, -slab / 2, (r.minZ + r.maxZ) / 2), paveUv);
  };
  const { channels, bounds } = district;
  const [west, east] = channels;
  if (!west || !east) throw new Error('District layout needs two channels.');
  const outer = 34; const front = bounds.maxZ + 4; const back = district.waterfrontZ;
  // Paving everywhere except the channel cut-outs.
  pave({ minX: -outer, maxX: west.minX, minZ: west.minZ, maxZ: front });
  pave({ minX: west.maxX, maxX: east.minX, minZ: west.minZ, maxZ: front });
  pave({ minX: east.maxX, maxX: outer, minZ: west.minZ, maxZ: front });
  pave({ minX: west.minX, maxX: west.maxX, minZ: west.maxZ, maxZ: front });
  pave({ minX: east.minX, maxX: east.maxX, minZ: east.maxZ, maxZ: front });
  pave({ minX: -outer, maxX: outer, minZ: back, maxZ: west.minZ });

  // Channels: floor, walls, raised coping with a warm LED line inside the lip.
  for (const c of channels) {
    const w = c.maxX - c.minX; const d = c.maxZ - c.minZ; const cx = (c.minX + c.maxX) / 2; const cz = (c.minZ + c.maxZ) / 2;
    batch.box(m.stone, w, 0.1, d, place(cx, -0.5, cz), 2);
    const cope = district.copingWidth;
    for (const x of [c.minX - cope / 2, c.maxX + cope / 2]) batch.box(m.stone, cope, 0.62, d + cope * 2, place(x, -0.19, cz), 2);
    batch.box(m.stone, w, 0.62, cope, place(cx, -0.19, c.minZ - cope / 2), 2);
    batch.box(m.stone, w, 0.62, cope, place(cx, -0.19, c.maxZ + cope / 2), 2);
    // LED strip facing the water on both long sides.
    lights.box(m.warmLight, 0.03, 0.04, d - 0.2, place(c.minX + 0.02, 0.05, cz));
    lights.box(m.warmLight, 0.03, 0.04, d - 0.2, place(c.maxX - 0.02, 0.05, cz));
    const surface = new Mesh(resources.track(new PlaneGeometry(w, d).rotateX(-Math.PI / 2)), water.channel);
    surface.position.set(cx, -0.12, cz);
    surface.name = 'channel-water';
    root.add(surface);
  }

  // Flush light lines edging the boulevard, and chevrons near spawn like the mockup's foreground.
  const { halfWidth, minZ, maxZ } = district.boulevard;
  for (const x of [-halfWidth, halfWidth]) lights.box(m.warmLight, 0.05, 0.02, maxZ - minZ, place(x, 0.004, (minZ + maxZ) / 2));
  for (const side of [-1, 1]) {
    for (const z of district.chevrons) lights.box(m.warmLight, 0.045, 0.02, 2.6, place(side * 2.6, 0.004, z, side * 0.55));
  }

  // Planted beds: low stone walls around soil.
  for (const bed of district.beds) {
    const w = bed.maxX - bed.minX; const d = bed.maxZ - bed.minZ; const cx = (bed.minX + bed.maxX) / 2; const cz = (bed.minZ + bed.maxZ) / 2;
    batch.box(m.stone, w, 0.55, 0.3, place(cx, 0.275, bed.minZ + 0.15), 2);
    batch.box(m.stone, w, 0.55, 0.3, place(cx, 0.275, bed.maxZ - 0.15), 2);
    batch.box(m.stone, 0.3, 0.55, d - 0.6, place(bed.minX + 0.15, 0.275, cz), 2);
    batch.box(m.stone, 0.3, 0.55, d - 0.6, place(bed.maxX - 0.15, 0.275, cz), 2);
    batch.box(m.soil, w - 0.6, 0.1, d - 0.6, place(cx, 0.42, cz), 2);
  }

  // Sign plinths: long stone blocks lifted on a shadow gap with an uplight (text arrives in Slice 13).
  for (const p of district.plinths) {
    batch.box(m.stone, p.width, 1.45, 0.8, place(p.x, 0.82, p.z, p.angle), 3);
    batch.box(m.charcoal, p.width - 0.3, 0.1, 0.6, place(p.x, 0.05, p.z, p.angle), 3);
    lights.box(m.warmLight, p.width - 0.4, 0.03, 0.03, place(p.x + Math.sin(p.angle) * 0.42, 0.1, p.z + Math.cos(p.angle) * 0.42, p.angle));
  }

  // Tall banners (placeholder fabric; messaging comes later).
  for (const b of district.banners) {
    batch.add(m.bronze, new CylinderGeometry(0.09, 0.11, 11.5, 12), place(b.x, 5.75, b.z));
    batch.box(m.bronze, 1.9, 0.08, 0.08, place(b.x + (b.x < 0 ? -0.95 : 0.95), 11.1, b.z));
    batch.box(m.stone, 0.7, 0.35, 0.7, place(b.x, 0.175, b.z), 2);
    const cloth = new Mesh(resources.track(new PlaneGeometry(1.7, 5.2)), m.banner);
    cloth.position.set(b.x + (b.x < 0 ? -0.95 : 0.95), 8.4, b.z);
    cloth.castShadow = true;
    root.add(cloth);
  }

  // Bollards with warm heads mark the channel ends.
  for (const b of district.bollards) {
    batch.add(m.stone, new CylinderGeometry(0.16, 0.18, 0.85, 14), place(b.x, 0.425, b.z), 1);
    lights.add(m.warmLight, new CylinderGeometry(0.165, 0.165, 0.06, 14), place(b.x, 0.78, b.z));
  }

  // Central plaza: a dark stone ring inlay and the fountain basin.
  const { plaza, fountain } = district;
  const ring = new Mesh(resources.track(new RingGeometry(plaza.radius - 0.35, plaza.radius, 96).rotateX(-Math.PI / 2)), m.charcoal);
  ring.position.set(plaza.x, 0.006, plaza.z); ring.receiveShadow = true;
  root.add(ring);
  const rim = new Shape();
  rim.absarc(0, 0, fountain.radius, 0, Math.PI * 2, false);
  const hole = new Shape(); hole.absarc(0, 0, fountain.radius - 0.7, 0, Math.PI * 2, true);
  rim.holes.push(hole);
  const rimGeometry = new ShapeGeometry(rim, 64).rotateX(-Math.PI / 2);
  batch.add(m.stone, rimGeometry, place(fountain.x, 0.55, fountain.z), 2);
  batch.add(m.stone, new CylinderGeometry(fountain.radius, fountain.radius, 0.55, 96, 1, true), place(fountain.x, 0.275, fountain.z), 2);
  batch.add(m.stone, new CylinderGeometry(fountain.radius - 0.7, fountain.radius - 0.7, 0.55, 96, 1, true), place(fountain.x, 0.275, fountain.z), 2);
  lights.add(m.warmLight, new CylinderGeometry(fountain.radius + 0.01, fountain.radius + 0.01, 0.035, 96, 1, true), place(fountain.x, 0.08, fountain.z));
  batch.add(m.stone, new CircleGeometry(fountain.radius - 0.7, 64).rotateX(-Math.PI / 2), place(fountain.x, -0.2, fountain.z), 2);
  // Bell-fountain pedestal: a slender stem flaring into a shallow cup that throws the water sheet.
  const { nozzle, stem } = fountainBell;
  const pedestal = new LatheGeometry([
    [0.001, -0.56], [stem * 1.9, -0.56], [stem * 1.9, -0.2], [stem * 1.15, 0.05], [stem, 0.4],
    [stem, nozzle - 0.45], [stem * 1.25, nozzle - 0.2], [stem * 1.75, nozzle - 0.04], [stem * 1.75, nozzle], [0.001, nozzle],
  ].map(([r, y]) => new Vector2(r, y)), 32);
  batch.add(m.stone, pedestal, place(fountain.x, 0.36, fountain.z), 1.5);
  const basin = new Mesh(resources.track(new CircleGeometry(fountain.radius - 0.7, 64).rotateX(-Math.PI / 2)), water.basin);
  basin.position.set(fountain.x, 0.36, fountain.z); basin.name = 'fountain-water';
  root.add(basin);

  // Waterfront: a low parapet with steps down to the lake, which runs to the mountains.
  batch.box(m.stone, outer * 2, 0.6, 0.6, place(0, 0.3, back - 0.3), 3);
  batch.box(m.stone, outer * 2, 0.3, 1.2, place(0, -0.45, back - 1.2), 3);
  lights.box(m.warmLight, outer * 2, 0.03, 0.03, place(0, 0.08, back + 0.02));
  const lake = new Mesh(resources.track(new PlaneGeometry(3200, 1600).rotateX(-Math.PI / 2)), water.lake);
  lake.position.set(0, -0.8, back - 800); lake.name = 'lake';
  root.add(lake);

  // Lawns beyond the paved district so side views and the look back never hit a void.
  for (const [cx, w] of [[-outer - 150, 300], [outer + 150, 300]] as const) {
    batch.add(m.grassGround, new BoxGeometry(w, 0.2, 700), place(cx, -0.12, back + 350), 6);
  }
  batch.add(m.grassGround, new BoxGeometry(outer * 2, 0.2, 400), place(0, -0.12, front + 200), 6);

  // Terrace behind spawn: a curved stone wall with an LED line and a hedge band, so the view
  // back toward the entrance ends in architecture and planting rather than open lawn.
  const { terrace } = district;
  const segments = 22;
  for (let i = 0; i < segments; i++) {
    const a0 = terrace.from + ((terrace.to - terrace.from) * i) / segments;
    const a1 = terrace.from + ((terrace.to - terrace.from) * (i + 1)) / segments;
    const a = (a0 + a1) / 2; const chord = 2 * terrace.radius * Math.sin((a1 - a0) / 2) + 0.05;
    // The entrance portal stands on the axis: leave the wall open there.
    if (Math.abs(a - Math.PI / 2) < district.gate.opening) continue;
    const x = terrace.x + Math.cos(a) * terrace.radius; const z = terrace.z + Math.sin(a) * terrace.radius;
    const yaw = Math.PI / 2 - a;
    batch.box(m.stone, chord, 0.9, 0.55, place(x, 0.45, z, yaw), 2);
    // Planting behind the colonnade; the portal keeps its view through to the entry court.
    const back = district.gate.radius + district.gate.depth / 2 + 1.2;
    batch.box(m.hedge, chord * (back / terrace.radius), 1.7, 1.2, place(terrace.x + Math.cos(a) * back, 0.85, terrace.z + Math.sin(a) * back, yaw), 1.2);
    lights.box(m.warmLight, chord, 0.03, 0.03, place(x - Math.cos(a) * 0.29, 0.12, z - Math.sin(a) * 0.29, yaw));
  }
  batch.box(m.paving, terrace.radius * 2 + 4, slab, terrace.radius + 3, place(terrace.x, -slab / 2, terrace.z + terrace.radius / 2 - 0.5), paveUv);

  batch.build(root);
  lights.build(root, { castShadow: false, receiveShadow: false });
}
