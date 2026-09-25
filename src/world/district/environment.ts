import {
  BackSide, BufferAttribute, DoubleSide, Color, DirectionalLight, EquirectangularReflectionMapping, FogExp2, Mesh, MeshStandardMaterial,
  PlaneGeometry, PMREMGenerator, RepeatWrapping, ShaderMaterial, SphereGeometry, SRGBColorSpace, TextureLoader, Vector3,
} from 'three';
import type { Scene, Texture, WebGLRenderer } from 'three';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import type { ResourceScope } from '../runtime.ts';
import { assetUrl, random } from './materials.ts';

/**
 * Sky: Poly Haven "Kloppenheim 06 (Pure Sky)". Its sun sits at u = 0.612, 4.7° up, which in
 * Three.js equirect convention is behind and right of the spawn view. The shadow-casting sun
 * uses the same azimuth, raised to ~14° so shadows stay readable.
 */
const sunAzimuth = (0.6123 - 0.5) * Math.PI * 2;
export const sunDirection = new Vector3(Math.cos(sunAzimuth), Math.tan(0.245), Math.sin(sunAzimuth)).normalize();
export const hazeColor = new Color(0xd9d5d2);
/** Fraction of the full equirect height kept in the cropped upper-sky image (1152 / 2048 rows). */
const skyCrop = 1152 / 2048;

/** GLSL: direction → cropped sky texture, faded to haze below the horizon. Shared with water. */
export const skySampleGlsl = /* glsl */`
uniform sampler2D skyMap;
uniform vec3 hazeTint;
vec3 sampleSky(vec3 d) {
  d = normalize(d);
  float u = atan(d.z, d.x) * 0.15915494 + 0.5;
  float fromTop = (1.5707963 - asin(clamp(d.y, -1.0, 1.0))) * 0.31830989;
  vec3 sky = texture2D(skyMap, vec2(u, 1.0 - min(fromTop / ${skyCrop.toFixed(6)}, 0.999))).rgb;
  // Atmospheric haze thickens toward the horizon and replaces everything below it.
  float haze = smoothstep(0.16, -0.01, d.y);
  return mix(sky, hazeTint, haze * 0.85);
}`;

export interface Environment {
  sun: DirectionalLight;
  skyTexture: Texture;
  ready: Promise<void>;
}

/** Procedural ridge ring: layered sines give believable, deterministic silhouettes. */
function mountainGeometry(): PlaneGeometry {
  const segments = 220;
  const geometry = new PlaneGeometry(1, 1, segments, 6);
  const positions = geometry.getAttribute('position');
  const colors = new Float32Array(positions.count * 3);
  const rand = random(41);
  const phases = Array.from({ length: 5 }, () => rand() * Math.PI * 2);
  const low = new Color(0x3f5261); const high = new Color(0x74879a); const c = new Color();
  for (let i = 0; i < positions.count; i++) {
    const u = positions.getX(i) + 0.5; // 0..1 around the ring
    const t = positions.getY(i) + 0.5; // 0 base .. 1 crest
    const angle = u * Math.PI * 2;
    // Taller range ahead (−Z, beyond the lake), gentler hills behind the spawn.
    const ahead = Math.max(0, -Math.cos(angle));
    const ridge = 0.55 + 0.25 * Math.sin(angle * 3 + (phases[0] ?? 0)) + 0.14 * Math.sin(angle * 7 + (phases[1] ?? 0))
      + 0.07 * Math.sin(angle * 17 + (phases[2] ?? 0)) + 0.035 * Math.sin(angle * 41 + (phases[3] ?? 0));
    const height = (10 + 48 * ahead) * ridge * t;
    const radius = 560 + 60 * Math.sin(angle * 2 + (phases[4] ?? 0)) - t * 40;
    positions.setXYZ(i, Math.sin(angle) * radius, height - 4, Math.cos(angle) * radius);
    c.copy(low).lerp(high, t * t);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geometry.setAttribute('color', new BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

export function createEnvironment(scene: Scene, renderer: WebGLRenderer, resources: ResourceScope, invalidate: () => void, disposed: () => boolean, shadowMapSize: number): Environment {
  scene.fog = new FogExp2(hazeColor.getHex(), 0.00105);
  scene.background = hazeColor.clone();

  const sun = new DirectionalLight(0xffc488, 4.3);
  sun.position.copy(sunDirection).multiplyScalar(120);
  sun.target.position.set(0, 0, -8);
  sun.castShadow = true;
  const shadow = sun.shadow;
  shadow.mapSize.set(shadowMapSize, shadowMapSize);
  Object.assign(shadow.camera, { left: -58, right: 58, top: 62, bottom: -62, near: 10, far: 260 });
  shadow.camera.updateProjectionMatrix();
  shadow.bias = -0.00025; shadow.normalBias = 0.04;
  scene.add(sun, sun.target);

  // Cropped upper-hemisphere backdrop for the dome and water reflections.
  const skyTexture = resources.track(new TextureLoader().load(assetUrl('sky/kloppenheim_06_upper.webp'), () => { if (!disposed()) invalidate(); }));
  skyTexture.colorSpace = SRGBColorSpace;
  skyTexture.wrapS = RepeatWrapping;
  const dome = new Mesh(
    resources.track(new SphereGeometry(900, 48, 24)),
    resources.track(new ShaderMaterial({
      uniforms: { skyMap: { value: skyTexture }, hazeTint: { value: hazeColor }, intensity: { value: 1.12 }, saturation: { value: 1.08 }, glow: { value: new Color(0xf6d2b2) } },
      vertexShader: /* glsl */`
        varying vec3 vDirection;
        void main() {
          vDirection = position;
          vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_Position = clip.xyww; // pin to the far plane
        }`,
      fragmentShader: /* glsl */`
        uniform float intensity;
        uniform float saturation;
        uniform vec3 glow;
        varying vec3 vDirection;
        ${skySampleGlsl}
        void main() {
          vec3 sky = sampleSky(vDirection);
          // A touch more saturation matches the mockup's clear blue without a new asset.
          sky = mix(vec3(dot(sky, vec3(0.2126, 0.7152, 0.0722))), sky, saturation);
          // The mockup's warm peach band low on the horizon, strongest toward the landmark (−Z).
          vec3 d = normalize(vDirection);
          float band = smoothstep(0.32, 0.0, d.y) * smoothstep(-0.05, 0.02, d.y);
          sky = mix(sky, glow, band * (0.35 + 0.35 * max(0.0, -d.z)));
          gl_FragColor = vec4(sky * intensity, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
      side: BackSide, depthWrite: false, fog: false,
    })),
  );
  dome.name = 'sky-dome';
  dome.frustumCulled = false;
  dome.renderOrder = -1;
  // The dome follows the camera so it always reads as infinitely far away.
  dome.onBeforeRender = (_renderer, _scene, camera) => { dome.position.copy(camera.position); dome.updateMatrixWorld(); };
  scene.add(dome);

  const mountains = new Mesh(resources.track(mountainGeometry()), resources.track(new MeshStandardMaterial({ vertexColors: true, roughness: 1, side: DoubleSide })));
  mountains.name = 'distant-mountains';
  mountains.receiveShadow = false;
  scene.add(mountains);

  // Image-based lighting from the real HDR so stone, glass, and chrome agree with the sky.
  const ready = new Promise<void>((resolve) => {
    new HDRLoader().load(assetUrl('sky/kloppenheim_06_1k.hdr'), (hdr) => {
      if (disposed()) { hdr.dispose(); resolve(); return; }
      hdr.mapping = EquirectangularReflectionMapping;
      const pmrem = new PMREMGenerator(renderer);
      const target = resources.track(pmrem.fromEquirectangular(hdr));
      pmrem.dispose(); hdr.dispose();
      scene.environment = target.texture;
      scene.environmentIntensity = 0.42;
      invalidate();
      resolve();
    }, undefined, () => {
      // Without the HDR the scene still renders with direct light plus a soft fill.
      scene.environmentIntensity = 0;
      resolve();
    });
  });
  return { sun, skyTexture, ready };
}
