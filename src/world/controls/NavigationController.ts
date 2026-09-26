import type { PerspectiveCamera } from 'three';
import type { FrameSystem } from '../World.ts';
import { advanceMotion, constrainMotion, hasMomentum, initialMotion, movementConfig, resetMotion, rotateView, stickInput } from './motion.ts';
import type { MovementConfig, MotionState } from './motion.ts';

export type NavigationMode = 'idle' | 'active' | 'dragging';
export interface NavigationController extends FrameSystem {
  focus(): void;
  resetView(): void;
  setSpeed(speed: number): void;
  /** Move instantly to a destination (constrained to walkable space), clearing held input. */
  teleport(target: { x: number; z: number; yaw: number; pitch?: number }): void;
  snapshot(): MotionState & { mode: NavigationMode; speed: number; pressedKeys: number; touches: number; stick: { right: number; forward: number } };
}
interface ControllerOptions {
  invalidate: () => void;
  canNavigate: () => boolean;
  config?: Partial<MovementConfig>;
  /** Where to begin (e.g. resuming after a graphics change); Reset view still uses the spawn. */
  start?: { x: number; z: number; yaw: number; pitch: number };
  /** Optional on-screen movement stick. Touch look works on the canvas without it. */
  movePad?: HTMLElement | null;
  onModeChange?: (mode: NavigationMode) => void;
  /** Knob position on the unit disc for presentation; (0, 0, false) on release. */
  onStick?: (x: number, y: number, held: boolean) => void;
}
const navigationKeys = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']);
// CSS pixels a finger may wander before a touch counts as looking rather than a tap.
const touchSlop = 8;
// Knob travel as a fraction of the pad width; styles.css uses the same ratio.
const stickTravel = 0.3;

/**
 * Website-first controls. Keyboard needs deliberate canvas focus; mouse drag is temporary; touch
 * uses a look drag on the canvas and an optional movement stick. Never pointer lock.
 */
export function createNavigationController(canvas: HTMLCanvasElement, camera: PerspectiveCamera, options: ControllerOptions): NavigationController {
  const doc = canvas.ownerDocument;
  const win = doc.defaultView;
  if (!win) throw new Error('Navigation requires a browser window.');
  const pad = options.movePad ?? undefined;
  const config = movementConfig(options.config);
  let motion = initialMotion(config);
  if (options.start) {
    motion = { ...options.start, vx: 0, vz: 0 };
    rotateView(motion, 0, 0, config);
    constrainMotion(motion, config);
  }
  const keys = new Set<string>();
  const removers: Array<() => void> = [];
  let disposed = false;
  let mode: NavigationMode = 'idle';
  let drag: { id: number; x: number; y: number; startX: number; startY: number; touch: boolean; moved: boolean } | undefined;
  let stick: { id: number; centerX: number; centerY: number; travel: number } | undefined;
  let stickMove = { right: 0, forward: 0 };
  // A touch interaction engages navigation without focusing the canvas, and lasts until momentum settles.
  let touchSession = false;

  const listen = (target: EventTarget, name: string, handler: EventListener, opts?: AddEventListenerOptions): void => {
    target.addEventListener(name, handler, opts);
    removers.push(() => target.removeEventListener(name, handler, opts));
  };
  const usable = (): boolean => !disposed && !doc.hidden && options.canNavigate();
  const focused = (): boolean => usable() && doc.activeElement === canvas;
  const engaged = (): boolean => focused() || (usable() && touchSession);
  const applyCamera = (): void => {
    camera.position.set(motion.x, config.eyeHeight, motion.z);
    camera.rotation.set(motion.pitch, motion.yaw, 0, 'YXZ');
  };
  const updateMode = (): void => {
    const next = !engaged() ? 'idle' : drag ? 'dragging' : 'active';
    if (next !== mode) { mode = next; options.onModeChange?.(mode); }
  };
  const releaseCapture = (target: Element, id: number): void => {
    try { if (target.hasPointerCapture(id)) target.releasePointerCapture(id); }
    catch { /* The browser can already have released capture on cancellation. */ }
  };
  const releaseDrag = (): void => {
    const current = drag;
    drag = undefined;
    if (current) releaseCapture(canvas, current.id);
  };
  const releaseStick = (): void => {
    const current = stick;
    stick = undefined;
    stickMove = { right: 0, forward: 0 };
    if (current && pad) { releaseCapture(pad, current.id); options.onStick?.(0, 0, false); }
  };
  const settleTouch = (): void => {
    if (touchSession && !drag?.touch && !stick && !hasMomentum(motion)) { touchSession = false; updateMode(); }
  };
  // Called by world suspension as well as browser focus changes. Never schedules a frame.
  const suspend = (): void => {
    keys.clear(); resetMotion(motion); releaseDrag(); releaseStick(); touchSession = false; updateMode();
  };
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
  const moveStick = (event: PointerEvent): void => {
    if (!stick) return;
    const next = stickInput(event.clientX - stick.centerX, event.clientY - stick.centerY, stick.travel);
    stickMove = { right: next.right, forward: next.forward };
    options.onStick?.(next.x, next.y, true);
    wake();
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
    if (!usable() || event.button !== 0 || event.ctrlKey || event.metaKey || event.altKey) return;
    const touch = event.pointerType !== 'mouse';
    if (touch) {
      // One look finger; further canvas fingers belong to the browser's pinch zoom.
      if (drag) return;
      // Suppress compatibility mouse events so a touch never moves keyboard focus to the canvas.
      event.preventDefault();
      touchSession = true;
    } else {
      focus();
      releaseDrag();
    }
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, touch, moved: !touch };
    try { canvas.setPointerCapture(event.pointerId); }
    catch { /* Document move/up handlers remain a fallback for this drag. */ }
    updateMode();
  });
  listen(doc, 'pointermove', (raw) => {
    const event = raw as PointerEvent;
    if (stick && event.pointerId === stick.id) {
      if (!usable()) { suspend(); wake(); } else moveStick(event);
      return;
    }
    if (!drag || event.pointerId !== drag.id) return;
    if (!engaged() || (event.buttons & 1) === 0) { suspend(); wake(); return; }
    if (!drag.moved) {
      // A tap stays a tap; a small wobble must not nudge the camera.
      if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < touchSlop) return;
      drag.moved = true;
      drag.x = event.clientX;
      drag.y = event.clientY;
      return;
    }
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    drag.x = event.clientX;
    drag.y = event.clientY;
    const sensitivity = drag.touch ? config.touchSensitivity : config.sensitivity;
    // Bounded samples reject pathological jumps while allowing normal fast dragging.
    rotateView(motion, -Math.max(-800, Math.min(800, dx)) * sensitivity,
      -Math.max(-800, Math.min(800, dy)) * sensitivity, config);
    applyCamera();
    wake();
  });
  listen(doc, 'pointerup', (raw) => {
    const id = (raw as PointerEvent).pointerId;
    if (id === stick?.id) { releaseStick(); settleTouch(); updateMode(); wake(); }
    if (id === drag?.id) { releaseDrag(); settleTouch(); updateMode(); }
  });
  const onCancel = (raw: Event): void => {
    const id = (raw as PointerEvent).pointerId;
    // A cancelled stick stops immediately rather than coasting.
    if (id === stick?.id) { releaseStick(); resetMotion(motion); settleTouch(); updateMode(); wake(); }
    if (id !== drag?.id) return;
    if (drag.touch) { releaseDrag(); settleTouch(); updateMode(); } else { suspend(); wake(); }
  };
  listen(doc, 'pointercancel', onCancel);
  listen(canvas, 'lostpointercapture', onCancel);
  // iOS fallback where touch-action is incomplete: keep a one-finger look from panning the page.
  listen(canvas, 'touchmove', (raw) => {
    if (drag?.touch && (raw as TouchEvent).touches.length === 1) raw.preventDefault();
  }, { passive: false });
  if (pad) {
    listen(pad, 'pointerdown', (raw) => {
      const event = raw as PointerEvent;
      if (!usable() || stick || event.button !== 0) return;
      event.preventDefault();
      const box = pad.getBoundingClientRect();
      stick = { id: event.pointerId, centerX: box.left + box.width / 2, centerY: box.top + box.height / 2, travel: box.width * stickTravel };
      touchSession = true;
      try { pad.setPointerCapture(event.pointerId); }
      catch { /* Document move/up handlers remain a fallback for this stick. */ }
      moveStick(event);
      updateMode();
    });
    listen(pad, 'lostpointercapture', onCancel);
    listen(pad, 'touchmove', (raw) => { raw.preventDefault(); }, { passive: false });
    listen(pad, 'contextmenu', (raw) => { raw.preventDefault(); });
  }

  applyCamera();
  return {
    focus,
    update: (delta: number): void => {
      if (disposed) return;
      if (!engaged()) { suspend(); return; }
      const held = (key: string): number => keys.has(key) ? 1 : 0;
      advanceMotion(motion, {
        forward: held('KeyW') - held('KeyS') + stickMove.forward, right: held('KeyD') - held('KeyA') + stickMove.right,
        yaw: held('ArrowLeft') - held('ArrowRight'), pitch: held('ArrowUp') - held('ArrowDown'),
      }, delta, config);
      applyCamera();
      settleTouch();
    },
    needsFrame: (): boolean => engaged() &&
      (keys.size > 0 || stickMove.right !== 0 || stickMove.forward !== 0 || hasMomentum(motion)),
    suspend,
    resetView: (): void => {
      if (disposed) return;
      suspend(); motion = initialMotion(config); applyCamera(); wake();
    },
    teleport: (target) => {
      if (disposed) return;
      keys.clear(); releaseDrag(); releaseStick(); touchSession = false;
      const destination = { x: target.x, z: target.z, yaw: target.yaw, pitch: target.pitch ?? 0, vx: 0, vz: 0 };
      rotateView(destination, 0, 0, config);
      constrainMotion(destination, config);
      motion = destination; applyCamera(); updateMode(); wake();
    },
    setSpeed: (speed: number): void => {
      if (!Number.isFinite(speed) || speed < 0.5 || speed > 10) throw new RangeError('Walk speed must be 0.5–10 m/s.');
      if (disposed) return;
      config.speed = speed;
      resetMotion(motion);
      wake();
    },
    snapshot: () => ({
      ...motion, mode, speed: config.speed, pressedKeys: keys.size,
      touches: (drag?.touch ? 1 : 0) + (stick ? 1 : 0), stick: { ...stickMove },
    }),
    dispose: (): void => {
      if (disposed) return;
      disposed = true;
      suspend();
      for (const remove of removers.splice(0)) remove();
    },
  };
}
