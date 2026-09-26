import { HalfFloatType, Vector2, WebGLRenderTarget } from 'three';
import type { PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import type { ResourceScope } from '../runtime.ts';

/**
 * HDR render → restrained bloom (only emissive light above luminance 1.5 glows, not sunlit stone
 * or sky) → tone map/sRGB.
 * The multisampled target keeps the antialiasing the default framebuffer would have had.
 */
export function createPost(renderer: WebGLRenderer, scene: Scene, camera: PerspectiveCamera, resources: ResourceScope, samples: number): { render: () => void; resize: (w: number, h: number, dpr: number) => void } {
  const target = new WebGLRenderTarget(1, 1, { type: HalfFloatType, samples });
  const composer = new EffectComposer(renderer, target);
  const bloom = new UnrealBloomPass(new Vector2(1, 1), 0.42, 0.55, 1.5);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  resources.track({ dispose: () => { composer.dispose(); bloom.dispose(); target.dispose(); } });
  return {
    render: () => composer.render(),
    resize: (w, h, dpr) => { composer.setPixelRatio(dpr); composer.setSize(w, h); bloom.resolution.set(w * dpr / 2, h * dpr / 2); },
  };
}
