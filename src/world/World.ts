import { ACESFilmicToneMapping, PerspectiveCamera, REVISION, SRGBColorSpace, WebGLRenderer } from 'three';
import type { Scene } from 'three';
import { FrameClock, measureViewport, ResourceScope } from './runtime.ts';
import type { Disposable, Viewport } from './runtime.ts';
import { createTestScene } from './test-scene.ts';

/** Everything scene content may use. The renderer is shared, never re-created or scheduled by content. */
export interface ContentContext {
  resources: ResourceScope;
  renderer: WebGLRenderer;
  camera: PerspectiveCamera;
  /** Request a redraw, e.g. after an asynchronous asset arrives. Safe after destruction. */
  invalidate: () => void;
}
export interface WorldContent {
  scene: Scene;
  /** Decorative animation; the engine skips it under reduced motion. */
  update: (deltaSeconds: number, elapsedSeconds: number) => void;
  /** Replaces the default `renderer.render(scene, camera)`, e.g. for post-processing. */
  render?: () => void;
  /** Called with the CSS size and pixel ratio whenever the drawing buffer changes. */
  resize?: (width: number, height: number, pixelRatio: number) => void;
  /** Settles when essential assets have loaded (or failed and fallen back). */
  ready?: Promise<void>;
  /** Maximum drawing-buffer pixels; defaults to the engine budget. Lower tiers render smaller. */
  pixelBudget?: number;
  /** Rendering tier chosen by the content, reported in snapshots. */
  quality?: string;
  /**
   * False when decorative motion should never run (e.g. software rendering): the world then
   * renders on demand exactly as under reduced motion. Defaults to true.
   */
  animated?: boolean;
}
export type ContentFactory = (context: ContentContext) => WorldContent;

export type WorldState = 'stopped' | 'running' | 'suspended' | 'context-lost' | 'failed' | 'destroyed';
/** Systems share the world's single scheduler. Suspend must not request rendering. */
export interface FrameSystem extends Disposable {
  update(deltaSeconds: number): void;
  needsFrame(): boolean;
  suspend(): void;
}
export interface WorldSnapshot {
  state: WorldState;
  loopActive: boolean;
  frames: number;
  elapsedSeconds: number;
  lastDeltaSeconds: number;
  viewport: Viewport | null;
  cameraAspect: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
  contentReady: boolean;
  quality: string;
}
export interface World {
  readonly scene: Scene;
  readonly camera: PerspectiveCamera;
  readonly revision: string;
  start(): void;
  stop(): void;
  resize(): void;
  invalidate(): void;
  addSystem(system: FrameSystem): () => void;
  own<T extends Disposable>(resource: T): T;
  destroy(): void;
  snapshot(): WorldSnapshot;
}
export interface WorldOptions {
  onStateChange?: (state: WorldState) => void;
  onFrame?: (snapshot: WorldSnapshot) => void;
  /** Scene content; defaults to the lightweight engine test scene. */
  content?: ContentFactory;
  /** Called once when the content's essential assets have settled. */
  onContentReady?: () => void;
}
const owners = new WeakMap<HTMLCanvasElement, World>();

/** One owner and scheduler. Destroy is terminal; re-entry requires a fresh canvas. */
export function createWorld(canvas: HTMLCanvasElement, options: WorldOptions = {}): World {
  if (owners.has(canvas)) throw new Error('This canvas already has a world.');
  const doc = canvas.ownerDocument;
  const win = doc.defaultView;
  if (!win) throw new Error('A browser window is required.');
  const resources = new ResourceScope();
  const systems = new Set<FrameSystem>();
  const removers: Array<() => void> = [];
  const clock = new FrameClock();
  let renderer: WebGLRenderer | undefined;
  let context: WebGL2RenderingContext | null = null;
  let scene: Scene | undefined;
  let state: WorldState = 'stopped';
  let destroyed = false;
  let failed = false;
  let contextLost = false;
  let requested = false;
  let loopActive = false;
  let viewport: Viewport | null = null;
  let drawable = false;
  let frames = 0;
  let elapsedSeconds = 0;
  let lastDeltaSeconds = 0;
  let lastReport = -Infinity;
  let contentReady = false;
  let invalidateLater: () => void = () => undefined;
  const setState = (next: WorldState): void => {
    if (next === state) return;
    state = next;
    options.onStateChange?.(next);
  };
  const pauseLoop = (): void => {
    if (loopActive) renderer?.setAnimationLoop(null);
    loopActive = false;
    clock.reset();
    lastDeltaSeconds = 0;
  };
  const suspendSystems = (): void => { for (const system of systems) system.suspend(); };
  const cleanup = (): void => {
    pauseLoop();
    for (const remove of removers.splice(0)) remove();
    try { resources.dispose(); }
    finally {
      systems.clear();
      scene?.clear();
      if (renderer) {
        try { renderer.dispose(); } finally { renderer.forceContextLoss(); }
      } else { context?.getExtension('WEBGL_lose_context')?.loseContext(); }
    }
  };
  try {
    context = canvas.getContext('webgl2', { alpha: false, antialias: true, powerPreference: 'default' });
    if (!context || context.isContextLost()) throw new Error('WebGL 2 is unavailable.');
    renderer = new WebGLRenderer({ canvas, context, alpha: false, antialias: true });
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.info.autoReset = false;
    const activeRenderer = renderer;
    const maxDimension = Number(context.getParameter(context.MAX_RENDERBUFFER_SIZE));
    const camera = new PerspectiveCamera(55, 1, 0.1, 120);
    camera.position.set(0, 1.7, 6);
    camera.lookAt(0, 0.85, 0);
    const fixture = (options.content ?? createTestScene)({
      resources, renderer: activeRenderer, camera, invalidate: () => invalidateLater(),
    });
    scene = fixture.scene;
    const ready = fixture.ready ?? Promise.resolve();
    ready.catch(() => undefined).finally(() => {
      if (destroyed) return;
      contentReady = true;
      options.onContentReady?.();
      invalidateLater();
    });
    const reducedMotion = win.matchMedia('(prefers-reduced-motion: reduce)');
    const snapshot = (): WorldSnapshot => ({
      state, loopActive, frames, elapsedSeconds, lastDeltaSeconds,
      viewport: viewport ? { ...viewport } : null, cameraAspect: camera.aspect,
      drawCalls: activeRenderer.info.render.calls, triangles: activeRenderer.info.render.triangles,
      geometries: activeRenderer.info.memory.geometries, textures: activeRenderer.info.memory.textures,
      contentReady, quality: fixture.quality ?? 'default',
    });
    const report = (time: number, force = false): void => {
      if (options.onFrame && (force || time - lastReport >= 250)) {
        lastReport = time;
        options.onFrame(snapshot());
      }
    };
    const needsInteractionFrame = (): boolean => [...systems].some((system) => system.needsFrame());
    // Decoration animates only when the visitor allows motion and the content can afford it.
    const decorative = (): boolean => !reducedMotion.matches && fixture.animated !== false;
    const render = (time: number, advance: boolean): void => {
      if (destroyed || failed || contextLost || !drawable || doc.hidden || !requested) return;
      try {
        const tick = advance ? clock.tick(time) : { delta: 0, elapsed: elapsedSeconds };
        lastDeltaSeconds = tick.delta;
        elapsedSeconds = tick.elapsed;
        if (advance && decorative()) fixture.update(tick.delta, tick.elapsed);
        for (const system of systems) system.update(tick.delta);
        // Multi-pass content resets stats per pass; count the whole frame instead.
        activeRenderer.info.reset();
        if (fixture.render) fixture.render(); else activeRenderer.render(fixture.scene, camera);
        frames += 1;
        report(time);
      } catch {
        failed = true;
        pauseLoop();
        suspendSystems();
        setState('failed');
      }
    };
    const frame = (time: number): void => {
      render(time, true);
      // User-directed movement still works with reduced motion; idle decoration does not animate.
      if (!decorative() && !needsInteractionFrame()) { pauseLoop(); report(time, true); }
    };
    const reconcile = (redraw = false): void => {
      if (destroyed) return;
      if (failed || contextLost || !requested || doc.hidden || !drawable) {
        pauseLoop();
        setState(failed ? 'failed' : contextLost ? 'context-lost' : !requested ? 'stopped' : 'suspended');
        suspendSystems();
        report(win.performance.now(), true);
        return;
      }
      const resumed = state !== 'running';
      if (!decorative() && !needsInteractionFrame()) {
        pauseLoop();
        setState('running');
        if (redraw || resumed) render(win.performance.now(), false);
      } else {
        setState('running');
        if (!loopActive) {
          clock.reset();
          loopActive = true;
          activeRenderer.setAnimationLoop(frame);
          redraw = true;
        }
        if (redraw) render(win.performance.now(), false);
      }
      report(win.performance.now(), true);
    };
    const resize = (): void => {
      if (destroyed || failed || contextLost) return;
      const bounds = canvas.getBoundingClientRect();
      const next = measureViewport(bounds.width, bounds.height, win.devicePixelRatio, maxDimension, fixture.pixelBudget);
      drawable = next !== null;
      const changed = next !== null && (viewport === null || viewport.width !== next.width ||
        viewport.height !== next.height || viewport.pixelRatio !== next.pixelRatio);
      if (next && changed) {
        activeRenderer.setDrawingBufferSize(next.width, next.height, next.pixelRatio);
        camera.aspect = next.width / next.height;
        camera.updateProjectionMatrix();
        fixture.resize?.(next.width, next.height, next.pixelRatio);
        viewport = next;
      }
      reconcile(changed);
    };
    const onVisibility = (): void => { resize(); reconcile(true); };
    const onMotion = (): void => { reconcile(true); };
    const onLost = (event: Event): void => { event.preventDefault(); contextLost = true; reconcile(); };
    const onRestored = (): void => {
      if (destroyed || !context || context.isContextLost()) return;
      contextLost = false;
      viewport = null;
      resize();
      reconcile(true);
    };
    doc.addEventListener('visibilitychange', onVisibility);
    win.addEventListener('resize', resize);
    win.visualViewport?.addEventListener('resize', resize);
    reducedMotion.addEventListener('change', onMotion);
    canvas.addEventListener('webglcontextlost', onLost);
    canvas.addEventListener('webglcontextrestored', onRestored);
    removers.push(
      () => doc.removeEventListener('visibilitychange', onVisibility),
      () => win.removeEventListener('resize', resize),
      () => win.visualViewport?.removeEventListener('resize', resize),
      () => reducedMotion.removeEventListener('change', onMotion),
      () => canvas.removeEventListener('webglcontextlost', onLost),
      () => canvas.removeEventListener('webglcontextrestored', onRestored),
    );
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    removers.push(() => observer.disconnect());
    let resolution: MediaQueryList | undefined;
    const onResolution = (): void => { watchResolution(); resize(); };
    const watchResolution = (): void => {
      resolution?.removeEventListener('change', onResolution);
      resolution = win.matchMedia(`(resolution: ${win.devicePixelRatio}dppx)`);
      resolution.addEventListener('change', onResolution);
    };
    watchResolution();
    removers.push(() => resolution?.removeEventListener('change', onResolution));
    invalidateLater = () => { if (!destroyed) reconcile(true); };
    const world: World = {
      scene: fixture.scene, camera, revision: REVISION,
      start: () => {
        if (destroyed || failed || requested) return;
        requested = true; resize(); reconcile(true);
      },
      stop: () => { if (!destroyed) { requested = false; reconcile(); } },
      resize,
      invalidate: () => { reconcile(true); },
      addSystem: (system: FrameSystem): (() => void) => {
        if (destroyed || failed || systems.has(system)) throw new Error('Cannot attach this world system.');
        systems.add(system);
        resources.track(system);
        return () => {
          if (systems.delete(system)) { system.suspend(); reconcile(true); }
        };
      },
      own: <T extends Disposable>(resource: T): T => resources.track(resource),
      snapshot,
      destroy: () => {
        if (destroyed) return;
        destroyed = true; requested = false; owners.delete(canvas);
        try { cleanup(); } finally { setState('destroyed'); }
      },
    };
    resize();
    owners.set(canvas, world);
    return world;
  } catch (error) {
    destroyed = true;
    try { cleanup(); } catch { /* Preserve the initialization error. */ }
    throw error;
  }
}
