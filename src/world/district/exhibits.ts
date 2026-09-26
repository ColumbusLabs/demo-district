import { LinearFilter, SRGBColorSpace, TextureLoader, Vector2 } from 'three';
import type { ResourceScope } from '../runtime.ts';
import { assetUrl } from './materials.ts';

const tiles = ['west-gate', 'east-gate', 'west-promenade', 'east-promenade', 'west-grove', 'east-grove', 'west-plaza', 'east-plaza'];
export function exhibitTile(id: string): Vector2 {
  const index = tiles.indexOf(id);
  if (index < 0) throw new Error(`Missing exhibit artwork: ${id}`);
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
