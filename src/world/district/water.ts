import { AdditiveBlending, Color, Curve, CylinderGeometry, DoubleSide, Mesh, ShaderMaterial, TubeGeometry, UniformsLib, UniformsUtils, Vector3 } from 'three';
import type { Group, Texture } from 'three';
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
    sunColor: { value: new Color(0xffe2b8).multiplyScalar(6) },
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
        if (glowMode > 0) {
          float edge = glowMode == 1 ? min(vUv.x, 1.0 - vUv.x) * glowSize : (1.0 - length(vUv - 0.5) * 2.0) * glowSize;
          // Rippled light spill from the LED strips just above the waterline.
          color += glowColor * exp(-edge / 0.35) * (0.8 + 2.5 * s.x / max(ripple, 0.05));
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
const curve = (point: (t: number, target: Vector3) => Vector3): Curve<Vector3> => new PointCurve(point);

/** Fountain: a central column and a ring of arcing jets. Returns an updater for decorative motion. */
export function createFountain(parent: Group, resources: ResourceScope, center: Vector3, rimRadius: number): (time: number) => void {
  const material = resources.track(new ShaderMaterial({
    uniforms: { time: { value: 0 }, tint: { value: new Color(0xd8ecf2).multiplyScalar(0.9) } },
    vertexShader: /* glsl */`
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
      uniform float time;
      uniform vec3 tint;
      varying vec2 vUv;
      void main() {
        // Streaks travel along the jet (uv.x); edges fade so the tube reads as water, not glass.
        float flow = fract(vUv.x * 6.0 - time * 1.6 + sin(vUv.y * 18.85) * 0.08);
        float streak = smoothstep(0.0, 0.5, flow) * smoothstep(1.0, 0.6, flow);
        float edge = sin(vUv.y * 3.14159);
        float alpha = (0.18 + 0.5 * streak) * edge * smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.85, vUv.x);
        gl_FragColor = vec4(tint * (0.8 + streak), alpha);
      }`,
    transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide,
  }));
  // Central column: tube along a vertical path so uv.x runs upward like the arcing jets.
  const up = curve((t, target) => target.set(center.x, center.y + t * 3.4, center.z));
  const column = resources.track(new TubeGeometry(up, 12, 0.22, 16, false));
  parent.add(new Mesh(column, material));
  const cap = resources.track(new CylinderGeometry(0.5, 1.1, 0.5, 20, 1, true));
  const splash = new Mesh(cap, material);
  splash.position.set(center.x, center.y + 0.25, center.z);
  parent.add(splash);
  const jetCount = 14;
  for (let i = 0; i < jetCount; i++) {
    const angle = (i / jetCount) * Math.PI * 2;
    const from = new Vector3(Math.cos(angle) * (rimRadius - 0.5), 0, Math.sin(angle) * (rimRadius - 0.5));
    const to = new Vector3(Math.cos(angle) * (rimRadius - 3.4), 0, Math.sin(angle) * (rimRadius - 3.4));
    const arc = curve((t, target) => target.lerpVectors(from, to, t).setY(Math.sin(t * Math.PI) * 1.6 * (1 - t * 0.25)).add(center));
    parent.add(new Mesh(resources.track(new TubeGeometry(arc, 24, 0.05, 6, false)), material));
  }
  return (time) => { const uniform = material.uniforms.time; if (uniform) uniform.value = time; };
}
