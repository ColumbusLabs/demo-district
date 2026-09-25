import { Group, PCFShadowMap, Scene, Vector3 } from 'three';
import type { ContentContext, WorldContent } from '../World.ts';
import { createEnvironment } from './environment.ts';
import { StaticBatch } from './geometry.ts';
import { buildGround } from './ground.ts';
import { buildLandmark } from './landmark.ts';
import { buildLandscape } from './landscape.ts';
import { district } from './layout.ts';
import { createMaterials } from './materials.ts';
import { buildPavilion } from './pavilions.ts';
import { buildSignage } from './signage.ts';
import { buildSurroundings } from './surroundings.ts';
import { storefrontTargets } from './targets.ts';
import type { TargetVolume } from '../interactions/targeting.ts';
import { createPost } from './post.ts';
import { chooseQuality } from './quality.ts';
import type { QualityTier } from './quality.ts';
import { createFountain, waterMaterial } from './water.ts';


export { districtNavigation } from './layout.ts';

/**
 * The Demo District plaza as world content. Geometry is built synchronously from the layout;
 * textures and image-based lighting stream in and trigger redraws. Shadows are static and
 * re-rendered only when content changes, not every frame.
 */
export interface District extends WorldContent {
  /** Interaction targets for every storefront (see targets.ts). */
  targets: readonly TargetVolume[];
  /** Show the focus cue on one storefront, or none. */
  highlight: (id: string | null) => void;
}

export interface DistrictOptions {
  /** Asset loading progress, 0–1, for the loading screen. */
  onProgress?: (fraction: number) => void;
  /** Visitor's graphics choice; omitted means automatic detection. */
  quality?: QualityTier;
}

export function createDistrict({ resources, renderer, camera, invalidate }: ContentContext, options: DistrictOptions = {}): District {
  const quality = chooseQuality(renderer, renderer.domElement.ownerDocument.defaultView?.location.search ?? '', options.quality);
  let disposed = false;
  resources.track({ dispose: () => { disposed = true; } });
  const isDisposed = (): boolean => disposed;
  // Static shadows: re-render the shadow map only after geometry or assets change.
  const refresh = (): void => { if (disposed) return; renderer.shadowMap.needsUpdate = true; invalidate(); };
  renderer.shadowMap.enabled = quality.shadows;
  renderer.shadowMap.type = PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.toneMappingExposure = 0.8;
  camera.near = 0.1; camera.far = 1500; camera.fov = 60;
  camera.updateProjectionMatrix();

  const scene = new Scene();
  const root = new Group();
  root.name = 'district';
  scene.add(root);
  const env = createEnvironment(scene, renderer, resources, refresh, isDisposed, quality.shadowMapSize);
  const m = createMaterials(renderer, resources, refresh, isDisposed);
  const water = {
    channel: waterMaterial(env.skyTexture, resources, { scale: 1.6, deep: 0x0f1d21, shallow: 0x2a454c, opacity: 0.96, reflectivity: 0.85, ripple: 0.3, bankShade: 1, glow: { mode: 'sides', size: 3 } }),
    basin: waterMaterial(env.skyTexture, resources, { scale: 1.3, deep: 0x15272c, shallow: 0x3d5f66, opacity: 0.95, reflectivity: 0.8, ripple: 0.5, bankShade: 0.8, glow: { mode: 'rim', size: 8.8 } }),
    lake: waterMaterial(env.skyTexture, resources, { scale: 9, deep: 0x33505e, shallow: 0x6d8a96, opacity: 1, reflectivity: 0.85, ripple: 1, bankShade: 0.15 }),
  };
  const batch = new StaticBatch(resources);
  const lights = new StaticBatch(resources);
  buildGround(root, m, water, resources);
  const glass = new Map(district.pavilions.map((slot) => [slot.id, buildPavilion(slot, m, batch, lights, root, env.skyTexture, resources)] as const));
  buildSignage(root, m, batch, renderer, resources);
  const orbDrift = buildLandmark(root, m, batch, resources);
  const windTime = { value: 0 };
  buildLandscape(root, m, batch, resources, windTime, quality.outerTrees);
  buildSurroundings(root, m, batch, lights, resources, quality.outerTrees);
  batch.build(root);
  lights.build(root, { castShadow: false, receiveShadow: false });
  const { fountain } = district;
  const jets = createFountain(root, resources, new Vector3(fountain.x, 0.36, fountain.z), fountain.radius - 0.7);
  // Measured (docs/PERFORMANCE_BUDGET.md): at DPR ≥ 1.5, 2× MSAA costs ~21% less than 4× and
  // dense pixels hide the difference.
  const dpr = renderer.domElement.ownerDocument.defaultView?.devicePixelRatio ?? 1;
  const samples = dpr >= 1.5 ? Math.min(2, quality.samples) : quality.samples;
  const post = quality.post ? createPost(renderer, scene, camera, resources, samples) : undefined;
  refresh();

  return {
    scene,
    targets: storefrontTargets(),
    highlight: (id) => {
      for (const [slot, material] of glass) { const uniform = material.uniforms.highlight; if (uniform) uniform.value = slot === id ? 1 : 0; }
      if (!disposed) invalidate();
    },
    update: (_delta, elapsed) => {
      for (const material of Object.values(water)) { const time = material.uniforms.time; if (time) time.value = elapsed; }
      windTime.value = elapsed;
      orbDrift(elapsed);
      jets(elapsed);
    },
    ...(post ? { render: post.render, resize: post.resize } : {}),
    pixelBudget: quality.pixelBudget,
    quality: quality.tier,
    animated: quality.animated,
    ready: (() => {
      const tasks = [env.ready, env.skyReady, ...m.tasks];
      let settled = 0;
      options.onProgress?.(0);
      for (const task of tasks) void task.finally(() => { settled += 1; if (!disposed) options.onProgress?.(settled / tasks.length); });
      return Promise.all(tasks).then(() => { refresh(); });
    })(),
  };
}
