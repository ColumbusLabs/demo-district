import { Vector3 } from 'three';
import type { PerspectiveCamera } from 'three';
import type { FrameSystem } from '../World.ts';
import { pickTarget, proximityTarget } from './targeting.ts';
import type { TargetVolume } from './targeting.ts';

export type ActivationSource = 'pointer' | 'keyboard';
export interface InteractionOptions {
  targets: readonly TargetVolume[];
  invalidate: () => void;
  /** False while an overlay owns input or the world is not running. */
  canInteract: () => boolean;
  onFocusChange?: (id: string | null, source: 'pointer' | 'proximity' | null) => void;
  onActivate: (id: string, source: ActivationSource) => void;
}
export interface Interactions extends FrameSystem {
  focused(): string | null;
}

// A press becomes a click/tap only if it barely moved; drags stay looks. No time limit: slow
// frames on low-end or software-rendered devices can delay pointerup well past a second, and
// nothing in the world uses long-press.
const clickSlop = 8;

/**
 * One interaction contract for mouse, touch, and keyboard. Pointer picks test only registered
 * target volumes (decorative geometry can never steal them); walking near a storefront and
 * facing it focuses it for Enter. Joins the world scheduler; never schedules frames itself.
 */
export function createInteractions(canvas: HTMLCanvasElement, camera: PerspectiveCamera, options: InteractionOptions): Interactions {
  const doc = canvas.ownerDocument;
  const removers: Array<() => void> = [];
  let hovered: TargetVolume | null = null;
  let nearby: TargetVolume | null = null;
  let focus: string | null = null;
  let press: { id: number; x: number; y: number } | undefined;
  let disposed = false;
  const listen = (target: EventTarget, name: string, handler: EventListener): void => {
    target.addEventListener(name, handler);
    removers.push(() => target.removeEventListener(name, handler));
  };
  const ray = new Vector3();
  const pickAt = (clientX: number, clientY: number): TargetVolume | null => {
    const box = canvas.getBoundingClientRect();
    if (box.width <= 0 || box.height <= 0) return null;
    ray.set(((clientX - box.left) / box.width) * 2 - 1, -((clientY - box.top) / box.height) * 2 + 1, 0.5).unproject(camera).sub(camera.position).normalize();
    return pickTarget([camera.position.x, camera.position.y, camera.position.z], [ray.x, ray.y, ray.z], options.targets);
  };
  const refresh = (): void => {
    const active = options.canInteract() && !disposed;
    const next = active ? (hovered ?? nearby) : null;
    canvas.dataset.hover = active && hovered ? 'target' : '';
    const id = next?.id ?? null;
    if (id !== focus) {
      focus = id;
      options.onFocusChange?.(id, id === null ? null : hovered ? 'pointer' : 'proximity');
      options.invalidate();
    }
  };
  const activate = (target: TargetVolume | null, source: ActivationSource): boolean => {
    if (!target || !options.canInteract() || disposed) return false;
    options.onActivate(target.id, source);
    return true;
  };

  listen(canvas, 'pointermove', (raw) => {
    const event = raw as PointerEvent;
    if (event.pointerType !== 'mouse' || event.buttons !== 0) return;
    hovered = pickAt(event.clientX, event.clientY);
    refresh();
  });
  listen(canvas, 'pointerleave', () => { hovered = null; refresh(); });
  listen(canvas, 'pointerdown', (raw) => {
    const event = raw as PointerEvent;
    if (event.button !== 0 || !event.isPrimary) return;
    press = { id: event.pointerId, x: event.clientX, y: event.clientY };
  });
  listen(doc, 'pointerup', (raw) => {
    const event = raw as PointerEvent;
    const start = press; press = undefined;
    if (!start || start.id !== event.pointerId) return;
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > clickSlop) return;
    activate(pickAt(event.clientX, event.clientY), 'pointer');
  });
  listen(doc, 'pointercancel', () => { press = undefined; });
  listen(doc, 'keydown', (raw) => {
    const event = raw as KeyboardEvent;
    if (event.key !== 'Enter' || event.repeat || doc.activeElement !== canvas || !focus) return;
    const target = options.targets.find((t) => t.id === focus) ?? null;
    if (activate(target, 'keyboard')) event.preventDefault();
  });

  return {
    focused: () => focus,
    update: () => {
      if (disposed) return;
      nearby = proximityTarget(camera.position.x, camera.position.z, camera.rotation.y, options.targets);
      refresh();
    },
    needsFrame: () => false,
    // Suspension clears transient pointer state; proximity is recomputed on the next frame.
    suspend: () => { hovered = null; press = undefined; canvas.dataset.hover = ''; },
    dispose: () => {
      if (disposed) return;
      disposed = true;
      for (const remove of removers.splice(0)) remove();
      hovered = null; nearby = null; press = undefined;
      delete canvas.dataset.hover;
    },
  };
}
