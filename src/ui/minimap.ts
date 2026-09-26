import { projectForSlot } from '../data/showcase.ts';
import { district, landmarkFootings } from '../world/district/layout.ts';

const ns = 'http://www.w3.org/2000/svg';
export interface Minimap {
  /** Visitor position and heading (Three.js yaw); cheap to call every frame. */
  update(x: number, z: number, yaw: number): void;
  setFocus(slot: string | null): void;
  destroy(): void;
}

/**
 * A precomputed schematic, not a second renderer: SVG in world meters (x right, z down the
 * page, so the landmark sits at the top). Storefronts are buttons that jump to that listing.
 */
export function createMinimap(svg: SVGSVGElement, onSelect: (slot: string) => void): Minimap {
  const doc = svg.ownerDocument;
  const el = (name: string, attrs: Record<string, string | number>, parent: Element = svg): SVGElement => {
    const node = doc.createElementNS(ns, name);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
    parent.append(node);
    return node;
  };
  svg.replaceChildren();
  const { bounds, channels, plaza, fountain, landmark, pavilions, boulevard, waterfrontZ } = district;
  el('rect', { x: -31, y: -80, width: 62, height: waterfrontZ + 80, fill: '#5d7f93', stroke: 'none', opacity: 0.85 }); // lake
  el('rect', { x: bounds.minX - 3, y: waterfrontZ, width: bounds.maxX - bounds.minX + 6, height: bounds.maxZ - waterfrontZ + 3, rx: 1.5, fill: '#d9d4cb', stroke: 'none', opacity: 0.92 });
  el('rect', { x: -boulevard.halfWidth, y: boulevard.minZ, width: boulevard.halfWidth * 2, height: bounds.maxZ - boulevard.minZ, fill: '#efe9df', stroke: 'none' });
  for (const c of channels) el('rect', { x: c.minX, y: c.minZ, width: c.maxX - c.minX, height: c.maxZ - c.minZ, fill: '#5d7f93', stroke: 'none' });
  el('circle', { cx: plaza.x, cy: plaza.z, r: plaza.radius, fill: '#efe9df', stroke: '#b9b0a2', 'stroke-width': 0.35 });
  el('circle', { cx: fountain.x, cy: fountain.z, r: fountain.radius, fill: '#5d7f93', stroke: 'none' });
  for (const leg of landmarkFootings()) el('circle', { cx: leg.x, cy: leg.z, r: 0.9, fill: '#ffffff', stroke: 'none' });
  el('circle', { cx: landmark.x, cy: landmark.z, r: 1.6, fill: '#ffffff', stroke: '#8a97a0', 'stroke-width': 0.3 });
  const slots = new Map<string, SVGElement>();
  for (const p of pavilions) {
    const project = projectForSlot(p.id);
    const group = el('g', {
      class: 'slot', transform: `translate(${p.x} ${p.z}) rotate(${(-p.facing * 180) / Math.PI})`,
      role: 'button', tabindex: 0, 'aria-label': project ? `Go to ${project.title} (${project.category})` : `Go to ${p.id}`,
    });
    el('rect', { class: 'slot__body', x: -p.width / 2, y: -p.depth / 2, width: p.width, height: p.depth, rx: 2, fill: '#fbfaf6', stroke: '#8a97a0', 'stroke-width': 0.35 }, group);
    // Storefront edge in warm light, on the local +Z face.
    el('rect', { x: -2.5, y: p.depth / 2 - 0.6, width: 5, height: 0.9, fill: '#e2b77c', stroke: 'none' }, group);
    const select = (event: Event): void => {
      if (event instanceof KeyboardEvent && event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault(); onSelect(p.id);
    };
    group.addEventListener('click', select);
    group.addEventListener('keydown', select);
    slots.set(p.id, group);
  }
  const marker = el('g', { class: 'you' });
  el('circle', { r: 4.2, fill: '#ffffff', opacity: 0.25, stroke: 'none' }, marker);
  el('path', { d: 'M0 -3.4 L2.3 2.6 L0 1.3 L-2.3 2.6 Z', fill: '#1b2a32', stroke: '#ffffff', 'stroke-width': 0.5 }, marker);
  let last = '';
  return {
    update: (x, z, yaw) => {
      // Forward is (−sin yaw, −cos yaw); the arrow points up (−z) at yaw 0.
      const transform = `translate(${x.toFixed(1)} ${z.toFixed(1)}) rotate(${((-yaw * 180) / Math.PI).toFixed(0)})`;
      if (transform !== last) { marker.setAttribute('transform', transform); last = transform; }
    },
    setFocus: (slot) => { for (const [id, node] of slots) node.toggleAttribute('data-focus', id === slot); },
    destroy: () => svg.replaceChildren(),
  };
}
