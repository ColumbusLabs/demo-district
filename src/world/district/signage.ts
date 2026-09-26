import { CanvasTexture, LinearMipmapLinearFilter, Mesh, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, SRGBColorSpace } from 'three';
import type { Group, Matrix4, WebGLRenderer } from 'three';
import { buildingForSlot } from '../../data/showcase.ts';
import type { ResourceScope } from '../runtime.ts';
import { place } from './geometry.ts';
import type { StaticBatch } from './geometry.ts';
import { district } from './layout.ts';
import type { DistrictMaterials } from './materials.ts';
import { storefrontFrame } from './pavilions.ts';
import { signCopy } from './signage-copy.ts';

const font = (weight: number, px: number): string => `${weight} ${px}px ui-sans-serif, system-ui, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif`;

interface TextLayout {
  lines: string[];
  /** Canvas pixels per meter; 256 keeps 10 cm letters crisp at close range. */
  width: number;
  height: number;
  size: number;
  weight?: number;
  color: string;
  tracking?: number;
  align?: 'left' | 'center';
  lineHeight?: number;
  arrow?: 'left' | 'right';
  rule?: boolean;
}

/** Draw letter-spaced text (manual tracking works in every canvas implementation). */
function drawTracked(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, tracking: number, align: 'left' | 'center'): void {
  const widths = [...text].map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + tracking * Math.max(0, text.length - 1);
  let cursor = align === 'center' ? x - total / 2 : x;
  [...text].forEach((ch, i) => { ctx.fillText(ch, cursor, y); cursor += (widths[i] ?? 0) + tracking; });
}

function textTexture(doc: Document, renderer: WebGLRenderer, layout: TextLayout): CanvasTexture {
  const scale = 256;
  const canvas = doc.createElement('canvas');
  canvas.width = Math.round(layout.width * scale); canvas.height = Math.round(layout.height * scale);
  const ctx = canvas.getContext('2d');
  if (ctx) {
    let px = layout.size * scale;
    ctx.font = font(layout.weight ?? 500, px);
    // Shrink to fit: the widest tracked line must stay inside 90% of the plane.
    const widest = Math.max(...layout.lines.map((line) => ctx.measureText(line).width + (layout.tracking ?? 0.18) * px * Math.max(0, line.length - 1)));
    const room = canvas.width * (layout.align === 'left' ? 0.8 : 0.9);
    if (widest > room) { px *= room / widest; ctx.font = font(layout.weight ?? 500, px); }
    const lineHeight = (layout.lineHeight ?? 1.35) * px;
    ctx.fillStyle = layout.color; ctx.strokeStyle = layout.color;
    ctx.textBaseline = 'middle';
    const align = layout.align ?? 'center';
    const x = align === 'center' ? canvas.width / 2 : canvas.width * 0.12;
    const blockHeight = lineHeight * layout.lines.length + (layout.arrow ? lineHeight : 0);
    let y = (canvas.height - blockHeight) / 2 + lineHeight / 2;
    for (const line of layout.lines) { drawTracked(ctx, line, x, y, (layout.tracking ?? 0.18) * px, align); y += lineHeight; }
    if (layout.arrow) {
      // A thin arrow under the label, pointing toward the future destination.
      const dir = layout.arrow === 'left' ? -1 : 1; const len = px * 1.4; const cx = canvas.width / 2;
      ctx.lineWidth = Math.max(2, px * 0.07); ctx.beginPath();
      ctx.moveTo(cx - (len / 2) * dir, y); ctx.lineTo(cx + (len / 2) * dir, y);
      ctx.moveTo(cx + (len / 2) * dir - px * 0.35 * dir, y - px * 0.3); ctx.lineTo(cx + (len / 2) * dir, y); ctx.lineTo(cx + (len / 2) * dir - px * 0.35 * dir, y + px * 0.3);
      ctx.stroke();
    }
    if (layout.rule) { ctx.fillRect(x, canvas.height - px * 1.8, px * 0.9, Math.max(2, px * 0.08)); }
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return texture;
}

/**
 * World-space signage: plinth labels, storefront sign bands, gate word slabs, and banner text.
 * Text sits on its own thin planes just proud of the surfaces it labels.
 */
export function buildSignage(root: Group, m: DistrictMaterials, batch: StaticBatch, renderer: WebGLRenderer, resources: ResourceScope): void {
  const doc = renderer.domElement.ownerDocument;
  const plane = (layout: TextLayout, matrix: Matrix4, lit: boolean, name: string): void => {
    const map = resources.track(textTexture(doc, renderer, layout));
    const material = resources.track(lit
      ? new MeshBasicMaterial({ map, transparent: true, depthWrite: false, toneMapped: true })
      : new MeshStandardMaterial({ map, transparent: true, depthWrite: false, roughness: 0.7 }));
    const mesh = new Mesh(resources.track(new PlaneGeometry(layout.width, layout.height)), material);
    mesh.applyMatrix4(matrix); mesh.name = name; mesh.renderOrder = 1;
    root.add(mesh);
  };

  // Plinths: engraved-looking dark grey lettering on the front face, with a direction arrow.
  district.plinths.forEach((p, i) => {
    const copy = signCopy.plinths[i];
    if (!copy) return;
    const out = 0.402;
    plane({ lines: [copy.label], width: p.width - 0.3, height: 1.2, size: 0.3, weight: 500, color: '#57524d', tracking: 0.26, arrow: copy.arrow },
      place(p.x + Math.sin(p.angle) * out, 0.86, p.z + Math.cos(p.angle) * out, p.angle), false, `plinth-sign-${i}`);
  });

  // Storefront sign bands: the building's category, lit like the mockup's GAMES band.
  for (const slot of district.pavilions) {
    const building = buildingForSlot(slot.id);
    if (!building) continue;
    const band = storefrontFrame(slot);
    plane({ lines: [building.category.toUpperCase()], width: band.width * 0.9, height: band.bandHeight * 0.8, size: Math.min(0.28, band.bandHeight * 0.34), weight: 500, color: '#f1ebe1', tracking: 0.32 },
      band.at(0, band.bandCenterY, band.front + 0.012), true, `sign-band-${slot.id}`);
  }

  // Gate pavilions: freestanding dark slabs with stacked words beside the storefront.
  for (const slot of district.pavilions) {
    const words = signCopy.gateWalls[slot.id];
    if (!words) continue;
    const band = storefrontFrame(slot);
    const side = slot.accent === 'left' ? 1 : -1; // opposite the wood panel
    const x = side * (band.width / 2 + 1.5);
    batch.box(m.charcoal, 1.9, 4.4, 0.24, band.at(x, 0.35 + 2.2, band.front + 1.2), 3);
    plane({ lines: words, width: 1.7, height: 3.4, size: 0.19, weight: 450, color: '#e9e2d6', tracking: 0.22, align: 'left', lineHeight: 1.55 },
      band.at(x, 0.35 + 2.55, band.front + 1.325), true, `gate-words-${slot.id}`);
  }

  // Banners: small stacked caps near the top and a short rule, as in the mockup.
  district.banners.forEach((b, i) => {
    const words = signCopy.banners[i];
    if (!words) return;
    const x = b.x + (b.x < 0 ? -0.95 : 0.95);
    for (const [z, yaw] of [[b.z + 0.012, 0], [b.z - 0.012, Math.PI]] as const) {
      plane({ lines: words, width: 1.5, height: 3.2, size: 0.13, weight: 450, color: '#d7dbe2', tracking: 0.2, align: 'left', lineHeight: 1.6, rule: true },
        place(x, 9.0, z, yaw), false, `banner-text-${i}`);
    }
  });
}

