import { ExtrudeGeometry, Mesh, PlaneGeometry, Shape, ShaderMaterial, UniformsLib, UniformsUtils, Vector2 } from 'three';
import type { BufferGeometry, Group, Matrix4, Texture } from 'three';
import type { ResourceScope } from '../runtime.ts';
import { hazeColor, skySampleGlsl } from './environment.ts';
import { place } from './geometry.ts';
import type { StaticBatch } from './geometry.ts';
import { plinthHeight, storefrontSize } from './layout.ts';
import type { PavilionSlot } from './layout.ts';
import { exhibitShapes, exhibitInstallation } from './exhibit-scenes.ts';
import { exhibitKind, exhibitTile } from './exhibits.ts';
import type { DistrictMaterials } from './materials.ts';


/** Rounded-rectangle plan in the XZ plane (shape y = −z), extruded upward by `height`. */
function roundedPlan(width: number, depth: number, radius: number, height: number, bevel = 0): ExtrudeGeometry {
  const w = width / 2; const d = depth / 2; const r = Math.min(radius, w, d);
  const s = new Shape();
  s.moveTo(-w + r, -d); s.lineTo(w - r, -d); s.quadraticCurveTo(w, -d, w, -d + r);
  s.lineTo(w, d - r); s.quadraticCurveTo(w, d, w - r, d); s.lineTo(-w + r, d);
  s.quadraticCurveTo(-w, d, -w, d - r); s.lineTo(-w, -d + r); s.quadraticCurveTo(-w, -d, -w + r, -d);
  return extrudeUp(s, height, bevel);
}
function extrudeUp(shape: Shape, height: number, bevel: number): ExtrudeGeometry {
  const geometry = new ExtrudeGeometry(shape, {
    depth: Math.max(0.01, height - bevel * 2), curveSegments: 20, steps: 1,
    bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4,
  });
  // Shape XY → world XZ (shape y maps to −Z), extrusion → +Y.
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, bevel, 0);
  return geometry;
}
function ellipse(rx: number, rz: number, offsetZ: number): Shape {
  const s = new Shape();
  s.absellipse(0, -offsetZ, rx, rz, 0, Math.PI * 2, false, 0);
  return s;
}

/** Glass that shows a warm implied room and a glowing display, plus Fresnel sky reflection. */
function storefrontGlass(slot: PavilionSlot, width: number, height: number, skyMap: Texture, artMap: Texture, resources: ResourceScope): ShaderMaterial {
  const uniforms = UniformsUtils.merge([UniformsLib.fog, {
    size: { value: new Vector2(width, height) },
    roomDepth: { value: Math.min(slot.depth * 0.7, 6) },
    hue: { value: slot.display },
    artTile: { value: exhibitTile(slot.id) },
    artMap: { value: null },
    highlight: { value: 0 },
    skyMap: { value: null },
    hazeTint: { value: hazeColor },
  }]);
  uniforms.skyMap = { value: skyMap };
  uniforms.artMap = { value: artMap };
  return resources.track(new ShaderMaterial({
    uniforms,
    defines: { EXHIBIT_KIND: exhibitKind(slot.id) },
    vertexShader: /* glsl */`
      varying vec3 vLocal;
      varying vec3 vCamLocal;
      varying vec3 vWorld;
      varying vec3 vNormal;
      #include <fog_pars_vertex>
      void main() {
        vLocal = position;
        vCamLocal = (inverse(modelMatrix) * vec4(cameraPosition, 1.0)).xyz;
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xyz;
        vNormal = normalize(mat3(modelMatrix) * vec3(0.0, 0.0, 1.0));
        vec4 mvPosition = viewMatrix * world;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */`
      uniform vec2 size;
      uniform float roomDepth;
      uniform float hue;
      uniform sampler2D artMap;
      uniform vec2 artTile;
      uniform float highlight;
      varying vec3 vLocal;
      varying vec3 vCamLocal;
      varying vec3 vWorld;
      varying vec3 vNormal;
      ${skySampleGlsl}
      #include <fog_pars_fragment>
      vec3 hsv(float h, float s, float v) {
        vec3 k = clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
        return v * mix(vec3(1.0), k, s);
      }
      vec3 artwork(vec2 uv) {
        // Inset each tile to avoid neighboring images bleeding at the seams.
        return texture2D(artMap, (artTile + mix(vec2(0.008), vec2(0.992), clamp(uv, 0.0, 1.0))) / vec2(4.0, 2.0)).rgb;
      }
      void displayBox(vec3 origin, vec3 ray, vec3 center, vec3 extent, vec3 tint, inout float nearest, inout vec3 color) {
        vec3 safe = sign(ray) * max(abs(ray), vec3(0.0001)) + vec3(equal(ray, vec3(0.0))) * 0.0001;
        vec3 a = (center - extent - origin) / safe;
        vec3 b = (center + extent - origin) / safe;
        vec3 entry = min(a, b);
        float nearT = max(max(entry.x, entry.y), entry.z);
        vec3 exitT = max(a, b);
        if (nearT > 0.0 && nearT < nearest && nearT < min(min(exitT.x, exitT.y), exitT.z)) {
          nearest = nearT;
          float light = nearT == entry.y ? 1.15 : (nearT == entry.x ? 0.65 : 0.9);
          color = tint * light;
        }
      }
      ${exhibitShapes}
      void main() {
        // Interior mapping: intersect the view ray with an imaginary room behind the glass.
        vec3 dir = normalize(vLocal - vCamLocal);
        vec3 lo = vec3(-size * 0.5, -roomDepth);
        vec3 hi = vec3(size * 0.5, 0.0);
        vec3 safe = sign(dir) * max(abs(dir), vec3(1e-4)) + vec3(equal(dir, vec3(0.0))) * 1e-4;
        vec3 far = max((lo - vLocal) / safe, (hi - vLocal) / safe);
        float t = min(min(far.x, far.y), far.z);
        vec3 hit = vLocal + dir * t;
        vec2 halfSize = size * 0.5;
        float up = clamp((hit.y + halfSize.y) / size.y, 0.0, 1.0);
        vec3 warm = vec3(1.0, 0.8, 0.58);
        vec3 room;
        #if EXHIBIT_KIND == 0
          vec3 wallTint=vec3(0.38,0.31,0.24);
        #elif EXHIBIT_KIND == 1
          vec3 wallTint=vec3(0.035,0.15,0.16);
        #elif EXHIBIT_KIND == 2
          vec3 wallTint=vec3(0.045,0.065,0.14);
        #elif EXHIBIT_KIND == 3
          vec3 wallTint=vec3(0.065,0.095,0.22);
        #elif EXHIBIT_KIND == 4
          vec3 wallTint=vec3(0.24,0.13,0.065);
        #elif EXHIBIT_KIND == 5
          vec3 wallTint=vec3(0.13,0.065,0.16);
        #elif EXHIBIT_KIND == 6
          vec3 wallTint=vec3(0.035,0.12,0.08);
        #elif EXHIBIT_KIND == 8
          vec3 wallTint=vec3(0.03,0.045,0.07);
        #else
          vec3 wallTint=vec3(0.055,0.065,0.16);
        #endif
        if (t == far.z) {
          vec2 p = hit.xy / halfSize;
          vec2 artUv = p * 0.5 + 0.5;
          vec3 accent = hsv(hue, 0.6, 0.5);
          room = mix(vec3(0.055,0.065,0.09), accent*0.24, 0.45);
          float shape = 0.0;
          #if EXHIBIT_KIND == 0
            // Monumental diptych, with a deliberate off-center split.
            shape = step(abs(p.y-0.05),0.79)*step(abs(p.x),0.83)*(1.0-step(abs(p.x+0.15),0.025));
          #elif EXHIBIT_KIND == 1
            // Circular portal to another world.
            float r=length(hit.xy/size.y-vec2(0.0,0.05));
            room += vec3(0.1,0.6,0.65)*exp(-abs(r-0.43)*100.0);
            shape=1.0-step(0.42,r);
          #elif EXHIBIT_KIND == 2
            // A panoramic stage backdrop with narrow acoustic wall fins.
            shape=step(abs(p.y-0.23),0.48)*step(abs(p.x),0.9);
            room += vec3(0.02,0.07,0.12)*step(0.85,fract(p.x*18.0));
          #elif EXHIBIT_KIND == 3
            // Offset tilted game-world screen.
            vec2 q=mat2(0.985,0.174,-0.174,0.985)*(hit.xy/size.y);
            shape=step(abs(q.x),0.43)*step(abs(q.y-0.03),0.36);
            artUv=q+0.5;
          #elif EXHIBIT_KIND == 4
            // Tall illuminated story panels, like pages of a book.
            shape=step(abs(p.x),0.8)*step(abs(p.y),0.83)*(1.0-step(0.91,fract((p.x+1.0)*2.5)));
            room=vec3(0.15,0.075,0.033);
          #elif EXHIBIT_KIND == 5
            // Woven wall across the full studio, behind the physical loom.
            shape=step(abs(p.x),0.9)*step(abs(p.y),0.78);
          #elif EXHIBIT_KIND == 6
            // Round botanical specimen window with a green halo.
            float r=length(hit.xy/size.y-vec2(0.0,0.08));
            shape=1.0-step(0.4,r);
            room+=vec3(0.1,0.6,0.22)*exp(-abs(r-0.42)*90.0);
          #elif EXHIBIT_KIND == 8
            // Optics bench: a dark wall with a faint measuring grid.
            vec2 g=abs(fract(hit.xy/size.y*6.0)-0.5);
            room=vec3(0.02,0.03,0.05)+vec3(0.03,0.07,0.1)*step(0.47,max(g.x,g.y));
          #else
            // Observatory: an uninterrupted dark astronomical panorama.
            shape=step(abs(p.x),0.94)*step(abs(p.y),0.91);
          #endif
          room=mix(room,artwork(artUv)*1.05,shape);
        } else if (t == far.y) {
          float strip = step(abs(hit.z + roomDepth * 0.42), 0.055);
          float joints = max(step(0.975, fract(hit.x / 1.3)), step(0.975, fract(hit.z / 1.3)));
          room = hit.y > 0.0 ? mix(wallTint * 0.5, warm * 2.0, strip)
            : mix(wallTint * 0.8 + vec3(0.045), wallTint * 0.45, joints);
          if (hit.y < 0.0) room *= 0.65 + 0.35 * exp(-length(hit.xz - vec2(0.0, -roomDepth * 0.55)));
        } else {
          float recess = step(abs(hit.z + roomDepth * 0.55), roomDepth * 0.22);
          room = wallTint * mix(0.65, 1.05, up);
          room *= 1.0 - recess * 0.17;
          if (abs(hit.y - halfSize.y + 0.15) < 0.025) room = warm * 1.4;
        }
        ${exhibitInstallation}
        vec3 v = normalize(cameraPosition - vWorld);
        float fresnel = 0.035 + 0.48 * pow(1.0 - abs(dot(v, vNormal)), 5.0);
        vec3 reflection = sampleSky(reflect(-v, vNormal));
        vec3 color = mix(room * (0.95 + 0.5 * highlight), reflection, fresnel);
        // Focus cue: a warm light line traces the glass edge when the storefront is targeted.
        vec2 inset = halfSize - abs(vLocal.xy);
        color += vec3(1.0, 0.78, 0.5) * 1.1 * highlight * exp(-min(inset.x, inset.y) / 0.03);
        gl_FragColor = vec4(color, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
    fog: true,
  }));
}

/** Storefront dimensions shared by the kit, signage, and interaction targets (local frame: front = +Z). */
export function storefrontFrame(slot: PavilionSlot) {
  const frame = place(slot.x, 0, slot.z, slot.facing);
  const { width: storeWidth, height: storeHeight, glassHeight, jamb, proud } = storefrontSize(slot);
  return {
    /** World matrix for a point in the pavilion's local frame. */
    at: (x: number, y: number, z: number): Matrix4 => frame.clone().multiply(place(x, y, z)),
    width: storeWidth, height: storeHeight, glassHeight, jamb, proud,
    /** Facade plane and the frame's outer face. */
    facade: slot.depth / 2, front: slot.depth / 2 + proud,
    bandHeight: storeHeight - glassHeight,
    bandCenterY: plinthHeight + glassHeight + (storeHeight - glassHeight) / 2,
  };
}

/**
 * One pavilion from the kit. Static stone/plaster/wood/charcoal pieces go into the shared
 * batches (world space); the storefront glass is its own mesh because each implies a room.
 */
export function buildPavilion(slot: PavilionSlot, m: DistrictMaterials, batch: StaticBatch, lights: StaticBatch, root: Group, skyMap: Texture, artMap: Texture, resources: ResourceScope): ShaderMaterial {
  const store = storefrontFrame(slot);
  const at = store.at;
  const add = (target: StaticBatch, material: Parameters<StaticBatch['add']>[0], geometry: BufferGeometry, x = 0, y = 0, z = 0, uv = 3): void => target.add(material, geometry, at(x, y, z), uv);
  const { width: w, depth: d, height: h } = slot;
  const front = d / 2;

  // Plinth steps forward into a small forecourt.
  batch.box(m.stone, w + 1.2, plinthHeight, d + 2.6, at(0, plinthHeight / 2, 0.9), 3);
  const bodyRadius = slot.roof === 'disc' ? Math.min(w, d) * 0.42 : 1.4;
  add(batch, m.plaster, roundedPlan(w, d, bodyRadius, h - plinthHeight), 0, plinthHeight, 0, 4);

  // Storefront frame, recessed glass, and a sign band (lettering comes from signage.ts).
  const { width: storeWidth, height: storeHeight, glassHeight, jamb, proud } = store;
  for (const side of [-1, 1]) batch.box(m.charcoal, jamb, storeHeight, proud + 0.3, at(side * (storeWidth / 2 + jamb / 2), plinthHeight + storeHeight / 2, front + proud / 2 - 0.15), 3);
  batch.box(m.charcoal, storeWidth + jamb * 2, storeHeight - glassHeight, proud + 0.3, at(0, plinthHeight + glassHeight + (storeHeight - glassHeight) / 2, front + proud / 2 - 0.15), 3);
  batch.box(m.charcoal, storeWidth, 0.12, proud + 0.3, at(0, plinthHeight + 0.06, front + proud / 2 - 0.15), 3);
  const glassMaterial = storefrontGlass(slot, storeWidth, glassHeight - 0.12, skyMap, artMap, resources);
  const glass = new Mesh(resources.track(new PlaneGeometry(storeWidth, glassHeight - 0.12)), glassMaterial);
  glass.applyMatrix4(at(0, plinthHeight + 0.12 + (glassHeight - 0.12) / 2, front + 0.12));
  glass.name = `storefront-${slot.id}`;
  root.add(glass);

  // Warm wood accent panel and a framed display board on wider facades.
  if (slot.accent !== 'none') {
    const side = slot.accent === 'left' ? -1 : 1;
    batch.box(m.wood, 1.7, (h - plinthHeight) * 0.9, 0.22, at(side * (storeWidth / 2 + jamb + 1.3), plinthHeight + (h - plinthHeight) * 0.45, front + 0.08), 1.5);
    if (w > 12) {
      batch.box(m.charcoal, 2.4, 3.1, 0.14, at(-side * (storeWidth / 2 + jamb + 1.9), plinthHeight + 2.3, front + 0.06), 3);
      batch.box(m.stone, 2.1, 2.8, 0.06, at(-side * (storeWidth / 2 + jamb + 1.9), plinthHeight + 2.3, front + 0.14), 2);
    }
  }

  // Roof families share materials but give distinct silhouettes.
  if (slot.roof === 'disc') {
    add(batch, m.roof, extrudeUp(ellipse(w / 2 + 2.4, d / 2 + 2.6, 1.1), 0.75, 0.3), 0, h, 0, 5);
    add(batch, m.soffit, extrudeUp(ellipse(w / 2 + 2.1, d / 2 + 2.3, 1.1), 0.02, 0), 0, h - 0.025, 0, 5);
  } else if (slot.roof === 'wave') {
    const roof = roundedPlan(w + 2.4, d + 3.6, 1.6, 0.6, 0.22);
    roof.translate(0, 0, 0.9);
    const pos = roof.getAttribute('position');
    for (let i = 0; i < pos.count; i++) {
      const z = pos.getZ(i);
      if (z > 0) pos.setY(i, pos.getY(i) + 1.1 * Math.pow(z / (d / 2 + 2.7), 2));
    }
    roof.computeVertexNormals();
    add(batch, m.roof, roof, 0, h, 0, 5);
  } else {
    // Barrel shell: an arched band spanning the depth, extruded across the width.
    const span = d / 2 + 1.6; const rise = 1.8; const thickness = 0.32;
    const radius = (span * span + rise * rise) / (2 * rise);
    const start = Math.asin(span / radius);
    const band = new Shape();
    band.absarc(0, rise - radius, radius, Math.PI / 2 - start, Math.PI / 2 + start, false);
    band.absarc(0, rise - radius, radius - thickness, Math.PI / 2 + start, Math.PI / 2 - start, true);
    const shell = new ExtrudeGeometry(band, { depth: w + 1.6, bevelEnabled: false, curveSegments: 28 });
    shell.rotateY(Math.PI / 2);
    shell.translate(-(w + 1.6) / 2, 0, 0.8);
    add(batch, m.roof, shell, 0, h, 0, 5);
  }
  // Canopy underside light over the storefront.
  lights.box(m.warmLight, storeWidth + 0.6, 0.04, 0.08, at(0, h - 0.04, front + 0.9));
  return glassMaterial;
}
