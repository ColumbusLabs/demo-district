import { AdditiveBlending, Color, Curve, CylinderGeometry, DoubleSide, LatheGeometry, Mesh, RingGeometry, ShaderMaterial, UniformsLib, UniformsUtils, Vector2, Vector3 } from 'three';
import type { BufferGeometry, Group, Texture } from 'three';
import type { ResourceScope } from '../runtime.ts';
import { hazeColor, skySampleGlsl, sunDirection } from './environment.ts';

export interface WaterOptions {
  /** Ripple wavelength scale in meters; larger for the open lake. */
  scale: number;
  deep: number;
  shallow: number;
  /** 1 = opaque (lake); lower lets a shallow channel floor show through. */
  opacity: number;
  /** Peak Fresnel reflection. */
  reflectivity: number;
  /** Ripple slope multiplier: calm channels ~0.3, open lake 1. */
  ripple: number;
  /** 0–1: how much low-angle reflections are darkened, standing in for reflected banks and walls. */
  bankShade: number;
  /** Warm LED glow along the edges: 'sides' for a channel (plane uv.x edges), 'rim' for a round basin. */
  glow?: { mode: 'sides' | 'rim'; size: number };
}

/**
 * Lightweight stylized water: procedural ripple normals, Fresnel sky reflection, and a sun
 * glint. No planar reflection pass or fluid simulation. `time` is decorative only.
 */
export function waterMaterial(skyMap: Texture, resources: ResourceScope, options: WaterOptions): ShaderMaterial {
  // merge() clones uniform values (including textures), so assign the shared sky afterwards.
  const uniforms = UniformsUtils.merge([UniformsLib.fog, {
    time: { value: 0 },
    skyMap: { value: null },
    hazeTint: { value: hazeColor },
    sunDir: { value: sunDirection.clone() },
    sunColor: { value: new Color(0xffe2b8).multiplyScalar(3.2) },
    deep: { value: new Color(options.deep) },
    shallow: { value: new Color(options.shallow) },
    rippleScale: { value: options.scale },
    opacity: { value: options.opacity },
    reflectivity: { value: options.reflectivity },
    ripple: { value: options.ripple },
    bankShade: { value: options.bankShade },
    glowMode: { value: options.glow ? (options.glow.mode === 'sides' ? 1 : 2) : 0 },
    glowSize: { value: options.glow?.size ?? 1 },
    glowColor: { value: new Color(0xffc987).multiplyScalar(1.4) },
  }]);
  uniforms.skyMap = { value: skyMap };
  return resources.track(new ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */`
      varying vec3 vWorld;
      varying vec2 vUv;
      #include <fog_pars_vertex>
      void main() {
        vUv = uv;
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xyz;
        vec4 mvPosition = viewMatrix * world;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */`
      uniform float time;
      uniform vec3 sunDir;
      uniform vec3 sunColor;
      uniform vec3 deep;
      uniform vec3 shallow;
      uniform float rippleScale;
      uniform float opacity;
      uniform float reflectivity;
      uniform float bankShade;
      uniform float ripple;
      uniform int glowMode;
      uniform float glowSize;
      uniform vec3 glowColor;
      varying vec3 vWorld;
      varying vec2 vUv;
      ${skySampleGlsl}
      #include <fog_pars_fragment>
      // Sum of travelling waves; analytic derivatives give the ripple normal.
      vec2 slope(vec2 p) {
        vec2 s = vec2(0.0);
        vec2 dirs[6] = vec2[6](vec2(0.8, 0.6), vec2(-0.5, 0.86), vec2(0.28, -0.96), vec2(-0.93, -0.37), vec2(0.6, -0.8), vec2(-0.2, 0.98));
        float freqs[6] = float[6](1.0, 1.7, 2.9, 4.3, 7.1, 11.3);
        for (int i = 0; i < 6; i++) {
          float k = 6.2831 * freqs[i] / rippleScale;
          float phase = dot(dirs[i], p) * k + time * (1.1 + float(i) * 0.45);
          s += dirs[i] * cos(phase) * 0.06 / freqs[i];
        }
        return s * ripple;
      }
      void main() {
        // Fade ripples with distance so the wave sum never aliases into visible rings.
        vec2 s = slope(vWorld.xz) / (1.0 + distance(cameraPosition, vWorld) / (rippleScale * 12.0));
        // The round pool receives waves from the bell fountain's impact ring. Broad,
        // outward-moving ripples remain readable on a phone without extra meshes or passes.
        float poolWave = 0.0;
        float poolEnvelope = 0.0;
        if (glowMode == 2) {
          vec2 local = (vUv - 0.5) * (2.0 * glowSize);
          float radius = length(local);
          float fromImpact = max(radius - 2.4, 0.0);
          poolEnvelope = smoothstep(2.1, 2.7, radius) * exp(-fromImpact * 0.2);
          float phase = fromImpact * 7.0 - time * 3.0;
          poolWave = sin(phase);
          // Circle UV's Y runs opposite world Z after rotating into the ground plane.
          vec2 radial = vec2(local.x, -local.y) / max(radius, 0.01);
          s += radial * cos(phase) * 0.065 * poolEnvelope;
        }
        vec3 n = normalize(vec3(-s.x, 1.0, -s.y));
        vec3 v = normalize(cameraPosition - vWorld);
        // Capped Fresnel and dimmed reflection: real water here mirrors banks and buildings, not
        // just bright horizon haze, so it should stay darker than the sky.
        float fresnel = 0.03 + reflectivity * pow(1.0 - max(dot(n, v), 0.0), 5.0);
        vec3 r = reflect(-v, n);
        // Low reflected rays would hit coping, trees, and pavilions: shade them like dark banks.
        vec3 reflected = sampleSky(r) * mix(1.0, smoothstep(0.08, 0.7, r.y) * 0.85 + 0.06, bankShade);
        float glint = pow(max(dot(reflect(-sunDir, n), v), 0.0), 240.0);
        vec3 body = mix(deep, shallow, clamp(dot(n, v), 0.0, 1.0) * 0.6);
        vec3 color = mix(body, reflected, fresnel) + sunColor * glint;
        if (glowMode == 2) {
          // Soft moving highlights mark the ripple crests; retain blue-green body color
          // at grazing angles so the pool cannot read as a brown stone platform.
          color = mix(color, body, 0.22);
          color += vec3(0.22, 0.38, 0.4) * pow(max(poolWave, 0.0), 6.0) * poolEnvelope * 0.28;
        }
        if (glowMode > 0) {
          float edge = glowMode == 1 ? min(vUv.x, 1.0 - vUv.x) * glowSize : (1.0 - length(vUv - 0.5) * 2.0) * glowSize;
          // Rippled light spill from the LED strips just above the waterline.
          color += glowColor * (glowMode == 2 ? 0.4 : 1.0) * exp(-edge / (glowMode == 2 ? 0.16 : 0.35)) * (0.8 + 2.5 * s.x / max(ripple, 0.05));
        }
        gl_FragColor = vec4(color, mix(opacity, 1.0, fresnel));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
    fog: true,
    transparent: options.opacity < 1,
    depthWrite: options.opacity >= 1,
  }));
}

/** A Three.js curve defined by a point function. */
export class PointCurve extends Curve<Vector3> {
  constructor(private readonly point: (t: number, target: Vector3) => Vector3) { super(); }
  override getPoint(t: number, target = new Vector3()): Vector3 { return this.point(t, target); }
}

/** Bell-fountain dimensions (meters, relative to the water surface), shared with its stone pedestal. */
export const fountainBell = { radius: 2.4, apex: 3.1, nozzle: 2.25, stem: 0.32 } as const;

/** Profile of a falling water sheet: from the nozzle over a rounded crown down to the water at `radius`. */
function bellProfile(radius: number, apex: number, nozzle: number, steps: number): Vector2[] {
  const points: Vector2[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // Rise briefly out of the nozzle, turn over the crown, then fall on a steepening curve.
    const r = 0.06 + (radius - 0.06) * t;
    const y = t < 0.18 ? nozzle + (apex - nozzle) * Math.sin((t / 0.18) * Math.PI / 2) : apex * (1 - ((t - 0.18) / 0.82) ** 2.4);
    points.push(new Vector2(r, Math.max(y, 0)));
  }
  return points;
}

/**
 * The mockup's bell fountain: a slender stone pedestal (built with the basin in ground.ts) throws a
 * thin water sheet up and over into a glassy dome that falls back into the pool. The sheet is
 * brightest where it is seen edge-on (its silhouette) and nearly clear face-on, with fine
 * rivulets running down it; a central jet rises inside and white foam rings the landing.
 * Returns an updater for decorative motion; with `time` frozen it still reads as water.
 */
export function createFountain(parent: Group, resources: ResourceScope, center: Vector3, _rimRadius: number): (time: number) => void {
  const time = { value: 0 };
  const sheet = (tint: number, strength: number, rivulets: number): ShaderMaterial => resources.track(new ShaderMaterial({
    uniforms: { time, tint: { value: new Color(tint) }, strength: { value: strength }, rivulets: { value: rivulets } },
    vertexShader: /* glsl */`
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        vUv = uv;
        vec4 world = modelMatrix * vec4(position, 1.0);
        vNormal = normalize(mat3(modelMatrix) * normal);
        vView = normalize(cameraPosition - world.xyz);
        gl_Position = projectionMatrix * viewMatrix * world;
      }`,
    fragmentShader: /* glsl */`
      uniform float time;
      uniform vec3 tint;
      uniform float strength;
      uniform float rivulets;
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vView;
      float hash(float n) { return fract(sin(n) * 43758.5453); }
      void main() {
        // Lathe uv: x runs around the bell, y from the nozzle (0) down to the water (1).
        float grazing = 1.0 - abs(dot(normalize(vNormal), normalize(vView)));
        float edge = pow(grazing, 2.2);
        // Rivulets: thin lanes around the bell whose brightness flows downward and flickers.
        float lane = vUv.x * rivulets;
        float id = floor(lane);
        float across = abs(fract(lane) - 0.5) * 2.0;
        float flow = fract(vUv.y * 3.0 - time * (0.9 + hash(id) * 0.5) + hash(id + 7.0));
        float streak = (1.0 - smoothstep(0.0, 0.6, across)) * smoothstep(0.0, 0.25, flow) * smoothstep(1.0, 0.55, flow);
        // The sheet thins and breaks up as it falls; it fades out into the foam at the waterline.
        float body = 0.07 + 0.55 * edge + 0.22 * streak * (0.4 + vUv.y);
        float alpha = body * strength * smoothstep(0.0, 0.04, vUv.y) * (1.0 - smoothstep(0.9, 1.0, vUv.y));
        gl_FragColor = vec4(tint * (0.75 + 0.6 * edge + 0.5 * streak), alpha);
      }`,
    transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide,
  }));
  const { radius, apex, nozzle } = fountainBell;
  const add = (geometry: BufferGeometry, material: ShaderMaterial, name: string, order: number): void => {
    const mesh = new Mesh(resources.track(geometry), material);
    mesh.position.copy(center); mesh.name = name; mesh.renderOrder = order;
    parent.add(mesh);
  };
  // Outer bell and a smaller, fainter inner sheet give the dome depth.
  add(new LatheGeometry(bellProfile(radius, apex, nozzle, 26), 48), sheet(0xdcebf0, 1, 56), 'fountain-bell', 2);
  add(new LatheGeometry(bellProfile(radius * 0.72, apex * 0.9, nozzle, 20), 36), sheet(0xcfe3ea, 0.55, 40), 'fountain-bell-inner', 1);
  // Central jet: a short column above the nozzle, visible through the bell.
  const jet = new LatheGeometry([new Vector2(0.001, apex - 0.05), new Vector2(0.09, apex - 0.3), new Vector2(0.12, nozzle), new Vector2(0.001, nozzle - 0.05)].reverse(), 16);
  add(jet, sheet(0xeef6f8, 0.9, 10), 'fountain-jet', 3);
  // Foam where the sheet lands: a flat ring on the water and a low, noisy spray skirt.
  const foam = resources.track(new ShaderMaterial({
    uniforms: { time, tint: { value: new Color(0xf2f6f6) } },
    vertexShader: /* glsl */`
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
      uniform float time;
      uniform vec3 tint;
      varying vec2 vUv;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
      }
      void main() {
        // uv.x around the ring, uv.y across it (0 inner/bottom → 1 outer/top).
        vec2 p = vec2(vUv.x * 90.0, vUv.y * 6.0 - time * 1.4);
        float n = noise(p) * 0.6 + noise(p * 2.7 + 3.1) * 0.4;
        float band = smoothstep(0.0, 0.35, vUv.y) * (1.0 - smoothstep(0.45, 1.0, vUv.y));
        gl_FragColor = vec4(tint, smoothstep(0.35, 0.85, n) * band * 0.7);
      }`,
    transparent: true, depthWrite: false, side: DoubleSide,
  }));
  const ring = new RingGeometry(radius - 0.45, radius + 0.55, 72, 1).rotateX(-Math.PI / 2);
  // RingGeometry's uv is planar; remap to (around, across) for the foam shader.
  const position = ring.getAttribute('position'); const uv = ring.getAttribute('uv');
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i); const z = position.getZ(i);
    uv.setXY(i, (Math.atan2(z, x) / (Math.PI * 2) + 0.5), (Math.hypot(x, z) - (radius - 0.45)) / 1.0);
  }
  add(ring.translate(0, 0.02, 0), foam, 'fountain-foam', 4);
  add(new CylinderGeometry(radius + 0.1, radius + 0.25, 0.45, 72, 1, true).translate(0, 0.2, 0), foam, 'fountain-spray', 5);
  return (elapsed) => { time.value = elapsed; };
}
