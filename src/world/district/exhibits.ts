import { LinearFilter, SRGBColorSpace, TextureLoader, Vector2 } from 'three';
import type { ResourceScope } from '../runtime.ts';
import { buildingForSlot, categories } from '../../data/showcase.ts';
import { assetUrl } from './materials.ts';

/**
 * Compile-time installation index for a slot's window (EXHIBIT_KIND in the glass shader). The
 * window belongs to the building's category, never to a project listed inside it.
 */
export function exhibitKind(slot: string): number {
  const building = buildingForSlot(slot);
  if (!building) throw new Error(`No building for storefront ${slot}`);
  return categories.indexOf(building.category);
}

/** Artwork atlas tile: one per category, in the same order. */
export function exhibitTile(slot: string): Vector2 {
  const index = exhibitKind(slot);
  return new Vector2(index % 4, 1 - Math.floor(index / 4));
}

export function loadExhibitArt(resources: ResourceScope, isDisposed: () => boolean) {
  let done!: () => void;
  const ready = new Promise<void>((resolve) => { done = resolve; });
  const texture = resources.track(new TextureLoader().load(assetUrl('exhibits/gallery-atlas.webp'),
    (loaded) => { if (isDisposed()) loaded.dispose(); done(); }, undefined,
    () => { console.warn('Exhibit artwork could not load.'); done(); }));
  texture.colorSpace = SRGBColorSpace;
  // No mipmap mixing across artwork tiles; shared by all eight windows.
  texture.generateMipmaps = false;
  texture.minFilter = LinearFilter;
  return { texture, ready };
}
