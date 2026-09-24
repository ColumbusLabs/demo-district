import type { PerspectiveCamera } from 'three';
import type { FrameSystem } from '../World.ts';
import { advanceMotion, hasMomentum, initialMotion, movementConfig, resetMotion, rotateView } from './motion.ts';
import type { MovementConfig, MotionState } from './motion.ts';

export type NavigationMode = 'idle' | 'active' | 'dragging';
export interface DesktopController extends FrameSystem {
  focus(): void;
  resetView(): void;
  setSpeed(speed: number): void;
  snapshot(): MotionState & { mode: NavigationMode; speed: number; pressedKeys: number };
}
interface ControllerOptions {
  invalidate: () => void;
  canNavigate: () => boolean;
  config?: Partial<MovementConfig>;
  onModeChange?: (mode: NavigationMode) => void;
}
const navigationKeys = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']);

/** Website-first controls: deliberate focus, temporary mouse drag, never pointer lock. */
export function createDesktopController(canvas: HTMLCanvasElement, camera: PerspectiveCamera, options: ControllerOptions): DesktopController {
  const doc = canvas.ownerDocument;
  const win = doc.defaultView;
  if (!win) throw new Error('Navigation requires a browser window.');
  const config = movementConfig(options.config);
  let motion = initialMotion(config);
  const keys = new Set<string>();
  const removers: Array<() => void> = [];
  let disposed = false;
  let mode: NavigationMode = 'idle';
  let drag: { id: number; x: number; y: number } | undefined;
  const listen = (target: EventTarget, name: string, handler: EventListener): void => {
    target.addEventListener(name, handler);
    removers.push(() => target.removeEventListener(name, handler));
  };
  const usable = (): boolean => !disposed && !doc.hidden && options.canNavigate();
  const focused = (): boolean => usable() && doc.activeElement === canvas;
  const applyCamera = (): void => {
    camera.position.set(motion.x, config.eyeHeight, motion.z);
    camera.rotation.set(motion.pitch, motion.yaw, 0, 'YXZ');
  };
  const updateMode = (): void => {
    const next = !focused() ? 'idle' : drag ? 'dragging' : 'active';
    if (next !== mode) { mode = next; options.onModeChange?.(mode); }
  };
  const releaseDrag = (): void => {
    const current = drag;
    drag = undefined;
    if (current) {
      try { if (canvas.hasPointerCapture(current.id)) canvas.releasePointerCapture(current.id); }
      catch { /* The browser can already have released capture on cancellation. */ }
    }
  };
  // Called by world suspension as well as browser focus changes. Never schedules a frame.
  const suspend = (): void => { keys.clear(); resetMotion(motion); releaseDrag(); updateMode(); };
  const wake = (): void => { if (!disposed) options.invalidate(); };
  const isEditing = (target: EventTarget | null): boolean => {
    const element = target as HTMLElement | null;
    return Boolean(element?.closest?.('input, textarea, select, button, [contenteditable]:not([contenteditable="false"])'));
  };
  const focus = (): void => {
    if (!usable()) return;
    canvas.focus({ preventScroll: true });
    updateMode();
  };

  listen(doc, 'keydown', (raw) => {
    const event = raw as KeyboardEvent;
    if (event.key === 'Escape' && doc.activeElement === canvas) {
      suspend(); canvas.blur(); updateMode(); wake(); return;
    }
    if (event.key === 'Tab' || event.metaKey || event.ctrlKey || event.altKey) {
      suspend(); wake(); return;
    }
    if (!focused() || isEditing(event.target) || event.isComposing || !navigationKeys.has(event.code)) return;
    // After blur/suspension a held key must be released and pressed again.
    if (event.repeat && !keys.has(event.code)) return;
    event.preventDefault();
    keys.add(event.code);
    wake();
  });
  listen(doc, 'keyup', (raw) => {
    const event = raw as KeyboardEvent;
    if (keys.delete(event.code)) { if (focused()) event.preventDefault(); wake(); }
  });
  listen(canvas, 'focus', () => { updateMode(); });
  listen(canvas, 'blur', () => { suspend(); wake(); });
  listen(win, 'blur', () => { suspend(); wake(); });
  listen(doc, 'visibilitychange', () => { if (doc.hidden) suspend(); });
  listen(win, 'pagehide', () => { suspend(); });
  listen(canvas, 'pointerdown', (raw) => {
    const event = raw as PointerEvent;
    if (!usable() || event.pointerType !== 'mouse' || event.button !== 0 || event.ctrlKey || event.metaKey || event.altKey) return;
    focus();
    releaseDrag();
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
    try { canvas.setPointerCapture(event.pointerId); }
    catch { /* Document move/up handlers remain a fallback for this drag. */ }
    updateMode();
  });
  listen(doc, 'pointermove', (raw) => {
    const event = raw as PointerEvent;
    if (!drag || event.pointerId !== drag.id) return;
    if (!focused() || (event.buttons & 1) === 0) { suspend(); wake(); return; }
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    drag.x = event.clientX;
    drag.y = event.clientY;
    // Bounded samples reject pathological jumps while allowing normal fast dragging.
    rotateView(motion, -Math.max(-800, Math.min(800, dx)) * config.sensitivity,
      -Math.max(-800, Math.min(800, dy)) * config.sensitivity, config);
    applyCamera();
    wake();
  });
  listen(doc, 'pointerup', (raw) => {
    if ((raw as PointerEvent).pointerId === drag?.id) { releaseDrag(); updateMode(); }
  });
  const onCancel = (raw: Event): void => {
    if ((raw as PointerEvent).pointerId === drag?.id) { suspend(); wake(); }
  };
  listen(doc, 'pointercancel', onCancel);
  listen(canvas, 'lostpointercapture', onCancel);

  applyCamera();
  return {
    focus,
    update: (delta: number): void => {
      if (disposed) return;
      if (!focused()) { suspend(); return; }
      const held = (key: string): number => keys.has(key) ? 1 : 0;
      advanceMotion(motion, {
        forward: held('KeyW') - held('KeyS'), right: held('KeyD') - held('KeyA'),
        yaw: held('ArrowLeft') - held('ArrowRight'), pitch: held('ArrowUp') - held('ArrowDown'),
      }, delta, config);
      applyCamera();
    },
    needsFrame: (): boolean => focused() && (keys.size > 0 || hasMomentum(motion)),
    suspend,
    resetView: (): void => {
      if (disposed) return;
      suspend(); motion = initialMotion(config); applyCamera(); wake();
    },
    setSpeed: (speed: number): void => {
      if (!Number.isFinite(speed) || speed < 0.5 || speed > 8) throw new RangeError('Walk speed must be 0.5–8 m/s.');
      if (disposed) return;
      config.speed = speed;
      resetMotion(motion);
      wake();
    },
    snapshot: () => ({ ...motion, mode, speed: config.speed, pressedKeys: keys.size }),
    dispose: (): void => {
      if (disposed) return;
      disposed = true;
      suspend();
      for (const remove of removers.splice(0)) remove();
    },
  };
}
