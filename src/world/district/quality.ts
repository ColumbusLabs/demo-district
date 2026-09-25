import type { WebGLRenderer } from 'three';

export type QualityTier = 'high' | 'medium' | 'low';
export interface QualitySettings {
  tier: QualityTier;
  shadows: boolean;
  shadowMapSize: number;
  /** Bloom + HDR target; off means a direct render with the same tone mapping. */
  post: boolean;
  /** MSAA samples for the post-processing target. */
  samples: number;
  /** Drawing-buffer pixel budget handed to the engine. */
  pixelBudget: number;
  /** Trees outside the walkable district (groves, lakeside, behind spawn). */
  outerTrees: boolean;
  /** Decorative motion (water, wind, fountain, orb). Off renders only on demand. */
  animated: boolean;
}

const tiers: Record<QualityTier, QualitySettings> = {
  high: { tier: 'high', shadows: true, shadowMapSize: 4096, post: true, samples: 4, pixelBudget: 3_686_400, outerTrees: true, animated: true },
  // Phones and tablets: same world, smaller shadow map and buffer. Unmeasured on devices until
  // the performance slice; a starting point, not a verified budget.
  medium: { tier: 'medium', shadows: true, shadowMapSize: 2048, post: true, samples: 0, pixelBudget: 1_600_000, outerTrees: true, animated: true },
  // Software rasterizers (SwiftShader, llvmpipe) manage single-digit FPS at full detail, so the
  // low tier also holds decoration still and renders only when the visitor moves.
  low: { tier: 'low', shadows: false, shadowMapSize: 1024, post: false, samples: 0, pixelBudget: 420_000, outerTrees: false, animated: false },
};

/**
 * Baseline tiers ahead of the full preset work (Slice 20): high on desktop GPUs, medium on
 * touch-primary devices, low on software renderers. `?quality=high|low` overrides detection for testing and comparison.
 */
export function chooseQuality(renderer: WebGLRenderer, search: string): QualitySettings {
  const requested = new URLSearchParams(search).get('quality');
  if (requested === 'high' || requested === 'medium' || requested === 'low') return tiers[requested];
  const gl = renderer.getContext();
  const info = gl.getExtension('WEBGL_debug_renderer_info');
  const name = String(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
  if (/swiftshader|llvmpipe|software|basic render/i.test(name)) return tiers.low;
  const touchPrimary = renderer.domElement.ownerDocument.defaultView?.matchMedia('(hover: none) and (pointer: coarse)').matches ?? false;
  return touchPrimary ? tiers.medium : tiers.high;
}
