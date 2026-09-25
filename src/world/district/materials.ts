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
    // Soft white stone with a light satin coat, not chrome: it should match the pavilion roofs.
    arch: own(new MeshPhysicalMaterial({ color: 0xfbf9f5, roughness: 0.48, clearcoat: 0.25, clearcoatRoughness: 0.35, envMapIntensity: 1.6 })),
    chrome: own(new MeshPhysicalMaterial({ color: 0xffffff, metalness: 1, roughness: 0.04, envMapIntensity: 1.2 })),
    // Values above 1 feed the bloom pass: warm LED strips set into stone.
    warmLight: own(new MeshBasicMaterial({ color: new Color(0xffc987).multiplyScalar(2.4), toneMapped: true })),
    banner: standard(0x2b374a, 0.75, { side: DoubleSide }),
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
