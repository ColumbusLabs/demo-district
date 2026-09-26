import { LinearFilter, SRGBColorSpace, TextureLoader, Vector2 } from 'three';
import type { ResourceScope } from '../runtime.ts';
import { exhibitForSlot, exhibitKinds } from '../../data/showcase.ts';
import { assetUrl } from './materials.ts';

/** Compile-time installation index for a slot's window (EXHIBIT_KIND in the glass shader). */
export const exhibitKind = (slot: string): number => exhibitKinds.indexOf(exhibitForSlot(slot));

/** Artwork atlas tile: one per category; the lens bench reuses the dark Learning panorama. */
export function exhibitTile(slot: string): Vector2 {
  const index = Math.min(exhibitKind(slot), 7);
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
