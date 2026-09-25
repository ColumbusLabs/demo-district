import {
  CanvasTexture, Color, DoubleSide, LinearMipmapLinearFilter, MeshBasicMaterial, MeshPhysicalMaterial,
  MeshStandardMaterial, RepeatWrapping, SRGBColorSpace, TextureLoader,
} from 'three';
import type { Material, Texture, WebGLRenderer } from 'three';
import type { ResourceScope } from '../runtime.ts';

/** Local, CC0 assets under public/world (see public/world/LICENSES.md). Never remote. */
export const assetUrl = (path: string): string => `${import.meta.env.BASE_URL}world/${path}`;

export interface DistrictMaterials {
  paving: MeshStandardMaterial;
  stone: MeshStandardMaterial;
  plaster: MeshStandardMaterial;
  roof: MeshStandardMaterial;
  soffit: MeshStandardMaterial;
  wood: MeshStandardMaterial;
  charcoal: MeshStandardMaterial;
  bronze: MeshStandardMaterial;
  rock: MeshStandardMaterial;
  bark: MeshStandardMaterial;
  soil: MeshStandardMaterial;
  grassGround: MeshStandardMaterial;
  hedge: MeshStandardMaterial;
  foliage: MeshStandardMaterial;
  grass: MeshStandardMaterial;
  arch: MeshPhysicalMaterial;
  chrome: MeshPhysicalMaterial;
  warmLight: MeshBasicMaterial;
  banner: MeshStandardMaterial;
  /** City facades in two families (see facadeTextures). */
  facadeGlass: MeshStandardMaterial;
  facadeStone: MeshStandardMaterial;
  /** Resolves once every texture has loaded or fallen back to flat color. */
  ready: Promise<void>;
  /** One settling promise per texture set, for progress reporting. */
  tasks: Promise<void>[];
}

type Canvas2D = CanvasRenderingContext2D;
/** Deterministic PRNG so the district looks identical on every visit. */
export function random(seed: number): () => number {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function canvasTexture(doc: Document, size: number, draw: (ctx: Canvas2D, size: number) => void): CanvasTexture {
  const canvas = doc.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) draw(ctx, size);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearMipmapLinearFilter;
  return texture;
}

/** A cluster of small leaves with alpha; used on crossed cards for canopies and shrubs. */
function leafCluster(ctx: Canvas2D, size: number, palette: string[], count: number, leafSize: number, seed: number): void {
  const rand = random(seed);
  ctx.clearRect(0, 0, size, size);
  for (let i = 0; i < count; i++) {
    const angle = rand() * Math.PI * 2;
    const reach = Math.sqrt(rand()) * size * 0.44;
    const x = size / 2 + Math.cos(angle) * reach;
    const y = size / 2 + Math.sin(angle) * reach;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rand() * Math.PI * 2);
    ctx.fillStyle = palette[Math.floor(rand() * palette.length)] ?? '#4a6b35';
    ctx.beginPath();
    const l = leafSize * (0.6 + rand() * 0.7);
    ctx.ellipse(0, 0, l, l * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/** Fine, low-contrast lawn: thousands of short strokes so tiling never reads as a pattern. */
function lawn(ctx: Canvas2D, size: number): void {
  const rand = random(19);
  ctx.fillStyle = '#6f8448'; ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 9000; i++) {
    const x = rand() * size; const y = rand() * size; const g = 110 + Math.floor(rand() * 45);
    ctx.strokeStyle = `rgba(${70 + Math.floor(rand() * 40)}, ${g}, ${50 + Math.floor(rand() * 25)}, 0.55)`;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (rand() - 0.5) * 3, y - 2 - rand() * 3); ctx.stroke();
  }
}

/**
 * Two storeys of city facade (7.2 m square at the geometry's UV scale), in two families that
 * match the district's architecture. `glass`: floor-to-ceiling glazing between slim white slab
 * edges, glass toned toward the haze so distant blocks recede. `stone`: warm cream stone with
 * tall punched windows. A few warm-lit panes suggest golden-hour interiors. Returns [color, glow].
 */
function facadeTextures(doc: Document, size: number, style: 'glass' | 'stone', seed: number): [HTMLCanvasElement, HTMLCanvasElement] {
  const color = doc.createElement('canvas'); const glow = doc.createElement('canvas');
  color.width = color.height = glow.width = glow.height = size;
  const c = color.getContext('2d'); const g = glow.getContext('2d');
  if (!c || !g) return [color, glow];
  const rand = random(seed); const floor = size / 2;
  g.fillStyle = '#000'; g.fillRect(0, 0, size, size);
  const pane = (x: number, y: number, w: number, h: number, base: string): void => {
    const lit = rand() < 0.1;
    c.fillStyle = lit ? '#6b5c4b' : base;
    c.fillRect(x, y, w, h);
    const sheen = c.createLinearGradient(0, y, 0, y + h);
    sheen.addColorStop(0, 'rgba(214, 224, 232, 0.35)'); sheen.addColorStop(0.55, 'rgba(214, 224, 232, 0.05)'); sheen.addColorStop(1, 'rgba(214, 224, 232, 0.12)');
    c.fillStyle = sheen; c.fillRect(x, y, w, h);
    if (lit) { g.fillStyle = `rgb(${210 + Math.floor(rand() * 45)}, ${150 + Math.floor(rand() * 35)}, ${80 + Math.floor(rand() * 25)})`; g.fillRect(x, y + h * 0.15, w, h * 0.75); }
  };
  if (style === 'glass') {
    c.fillStyle = '#f3efe8'; c.fillRect(0, 0, size, size);
    for (let f = 0; f < 2; f++) {
      const top = f * floor + floor * 0.1; const height = floor * 0.86;
      const bays = 4; const bay = size / bays;
      for (let b = 0; b < bays; b++) pane(b * bay + 1, top, bay - 2, height, rand() < 0.5 ? '#7d8d9a' : '#8898a4');
    }
  } else {
    c.fillStyle = '#e4d8c6'; c.fillRect(0, 0, size, size);
    // Faint stone coursing so the wall is not a flat fill.
    c.fillStyle = 'rgba(120, 100, 80, 0.06)';
    for (let y = 0; y < size; y += size / 12) c.fillRect(0, y, size, 1);
    for (let f = 0; f < 2; f++) {
      const top = f * floor + floor * 0.2; const height = floor * 0.62;
      const columns = 3; const bay = size / columns;
      for (let b = 0; b < columns; b++) pane(b * bay + bay * 0.3, top, bay * 0.4, height, '#6f7c86');
    }
  }
  return [color, glow];
}

/** Leaves spread edge to edge and wrapped at the borders, so hedges tile without visible blobs. */
function leafField(ctx: Canvas2D, size: number, palette: string[], count: number, leafSize: number, seed: number): void {
  const rand = random(seed);
  for (let i = 0; i < count; i++) {
    const x = rand() * size; const y = rand() * size; const angle = rand() * Math.PI * 2;
    const l = leafSize * (0.6 + rand() * 0.7);
    ctx.fillStyle = palette[Math.floor(rand() * palette.length)] ?? '#4a6b35';
    for (const dx of [-size, 0, size]) for (const dy of [-size, 0, size]) {
      if (x + dx < -l || x + dx > size + l || y + dy < -l || y + dy > size + l) continue;
      ctx.beginPath(); ctx.ellipse(x + dx, y + dy, l, l * 0.42, angle, 0, Math.PI * 2); ctx.fill();
    }
  }
}

function grassTuft(ctx: Canvas2D, size: number): void {
  const rand = random(7);
  ctx.clearRect(0, 0, size, size);
  for (let i = 0; i < 90; i++) {
    const base = size * (0.1 + rand() * 0.8);
    const height = size * (0.45 + rand() * 0.5);
    const lean = (rand() - 0.5) * size * 0.35;
    const green = 90 + Math.floor(rand() * 60);
    ctx.strokeStyle = `rgb(${60 + Math.floor(rand() * 50)}, ${green}, ${40 + Math.floor(rand() * 25)})`;
    ctx.lineWidth = 1.5 + rand() * 2.5;
    ctx.beginPath();
    ctx.moveTo(base, size);
    ctx.quadraticCurveTo(base + lean * 0.3, size - height * 0.6, base + lean, size - height);
    ctx.stroke();
  }
}

type PbrSet = [Texture | null, Texture | null, Texture | null];
/** Loads each Poly Haven PBR set once. Geometry carries world-meter UVs, so textures do not repeat here. */
function pbrLoader(anisotropy: number, resources: ResourceScope, disposed: () => boolean): (name: string) => Promise<PbrSet> {
  const loader = new TextureLoader();
  const cache = new Map<string, Promise<PbrSet>>();
  const load = (name: string, suffix: string, srgb: boolean): Promise<Texture | null> => new Promise((resolve) => {
    loader.load(assetUrl(`textures/${name}_${suffix}.webp`), (texture) => {
      // A world torn down mid-load (remount, HMR) must not adopt late textures.
      if (disposed()) { texture.dispose(); resolve(null); return; }
      texture.wrapS = RepeatWrapping; texture.wrapT = RepeatWrapping;
      texture.anisotropy = anisotropy;
      if (srgb) texture.colorSpace = SRGBColorSpace;
      resolve(resources.track(texture));
    }, undefined, () => resolve(null));
  });
  return (name) => {
    let set = cache.get(name);
    if (!set) {
      set = Promise.all([load(name, 'diff', true), load(name, 'nor', false), load(name, 'rough', false)]);
      cache.set(name, set);
    }
    return set;
  };
}
/** Failures leave the flat-color fallback in place. */
function applyPbr(load: (name: string) => Promise<PbrSet>, material: MeshStandardMaterial, name: string, onLoad: () => void): Promise<void> {
  return load(name).then(([map, normal, rough]) => {
    if (!map && !normal && !rough) return;
    if (map) material.map = map;
    if (normal) material.normalMap = normal;
    if (rough) material.roughnessMap = rough;
    material.needsUpdate = true;
    onLoad();
  });
}

export function createMaterials(renderer: WebGLRenderer, resources: ResourceScope, invalidate: () => void, disposed: () => boolean): DistrictMaterials {
  const doc = renderer.domElement.ownerDocument;
  const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const own = <T extends Material>(material: T): T => resources.track(material);
  const standard = (color: number, roughness: number, extra: ConstructorParameters<typeof MeshStandardMaterial>[0] = {}): MeshStandardMaterial =>
    own(new MeshStandardMaterial({ color, roughness, metalness: 0, ...extra }));

  const leafTexture = resources.track(canvasTexture(doc, 256, (ctx, size) => leafCluster(ctx, size, ['#5f7c3e', '#7a974c', '#8fae5c', '#4b6a33', '#a0bb6a', '#6b8a45'], 480, 8, 11)));
  const hedgeTexture = resources.track(canvasTexture(doc, 256, (ctx, size) => { ctx.fillStyle = '#3d5a2c'; ctx.fillRect(0, 0, size, size); leafField(ctx, size, ['#56753c', '#6b8a47', '#44622f', '#7b9850', '#35512a'], 2600, 6.5, 23); }));
  hedgeTexture.wrapS = RepeatWrapping; hedgeTexture.wrapT = RepeatWrapping;
  const grassTexture = resources.track(canvasTexture(doc, 128, grassTuft));
  const lawnTexture = resources.track(canvasTexture(doc, 256, lawn));
  const facade = (style: 'glass' | 'stone', seed: number): MeshStandardMaterial => {
    const [colorCanvas, glowCanvas] = facadeTextures(doc, 256, style, seed);
    const map = resources.track(new CanvasTexture(colorCanvas)); const glow = resources.track(new CanvasTexture(glowCanvas));
    for (const t of [map, glow]) { t.colorSpace = SRGBColorSpace; t.wrapS = RepeatWrapping; t.wrapT = RepeatWrapping; t.anisotropy = anisotropy; }
    return standard(0xffffff, style === 'glass' ? 0.35 : 0.8, { map, emissive: 0xffffff, emissiveMap: glow, emissiveIntensity: 0.8, envMapIntensity: style === 'glass' ? 1.3 : 1 });
  };
  lawnTexture.wrapS = RepeatWrapping; lawnTexture.wrapT = RepeatWrapping;

  const materials: Omit<DistrictMaterials, 'ready' | 'tasks'> = {
    // Light, cool-grey polished stone; texture tint keeps the marble's veining but not its beige cast.
    paving: standard(0xc6c3bd, 0.2, { envMapIntensity: 1.2 }),
    stone: standard(0xe6e1d8, 0.55),
    plaster: standard(0xf6f3ec, 0.8, { envMapIntensity: 1.3 }),
    roof: standard(0xfbf9f5, 0.55, { envMapIntensity: 1.6 }),
    // Canopy undersides catch warm bounce light in the mockup; a faint emissive stands in for it.
    soffit: standard(0xf2e8da, 0.9, { emissive: 0xffc58a, emissiveIntensity: 0.22 }),
    wood: standard(0x7d6e60, 0.62),
    charcoal: standard(0x2a3036, 0.5, { metalness: 0.2 }),
    bronze: standard(0x3a3632, 0.35, { metalness: 0.8 }),
    rock: standard(0xb9b1a4, 0.9),
    bark: standard(0x6b5a4a, 0.95),
    soil: standard(0x4a4034, 1),
    grassGround: standard(0xffffff, 1, { map: lawnTexture }),
    hedge: standard(0xffffff, 0.9, { map: hedgeTexture }),
    foliage: standard(0xffffff, 0.8, { map: leafTexture, alphaTest: 0.5, side: DoubleSide }),
    grass: standard(0xffffff, 0.9, { map: grassTexture, alphaTest: 0.45, side: DoubleSide }),
    // Landmark color grading, matched to the mockup by sampling the same patches (see
    // COLOR_GRADING.md). Pearl stone: near-neutral so the sun supplies the warmth and the shade
    // takes the sky's cool; a strong satin clearcoat gives the rounded legs bright edge streaks.
    // Note: with scene.environment in use, three.js (r163+) ignores a material's envMapIntensity
    // and applies scene.environmentIntensity, so these two are graded by color alone.
    arch: own(new MeshPhysicalMaterial({ color: 0xc9c6c1, roughness: 0.34, clearcoat: 0.65, clearcoatRoughness: 0.15 })),
    // Warm-tinted polished chrome, darker than a pure mirror, as in the mockup.
    chrome: own(new MeshPhysicalMaterial({ color: 0xcdc6bf, metalness: 1, roughness: 0.04 })),
    // Luminance above the bloom threshold (1.5 in post.ts): warm LED strips set into stone.
    warmLight: own(new MeshBasicMaterial({ color: new Color(0xffc987).multiplyScalar(3), toneMapped: true })),
    banner: standard(0x2b374a, 0.75, { side: DoubleSide }),
    facadeGlass: facade('glass', 71),
    facadeStone: facade('stone', 73),
  };
  const load = pbrLoader(anisotropy, resources, disposed);
  const onLoad = (): void => { if (!disposed()) invalidate(); };
  const tasks = [
    applyPbr(load, materials.paving, 'marble_01', onLoad),
    applyPbr(load, materials.stone, 'plastered_wall_04', onLoad),
    applyPbr(load, materials.plaster, 'plastered_wall_04', onLoad),
    applyPbr(load, materials.roof, 'plastered_wall_04', onLoad),
    applyPbr(load, materials.wood, 'red_oak_veneer', onLoad),
    applyPbr(load, materials.rock, 'rock_boulder_dry', onLoad),
  ];
  return { ...materials, ready: Promise.all(tasks).then(() => undefined), tasks };
}
