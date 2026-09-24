import { createWorld } from '../world/World.ts';
import type { World, WorldState } from '../world/World.ts';
import { createDesktopController } from '../world/controls/DesktopController.ts';
import type { DesktopController } from '../world/controls/DesktopController.ts';
import { createWorldDiagnostics } from '../ui/world-diagnostics.ts';

const mounts = new WeakMap<Document, () => void>();

/** Mount one world; repeat calls retire the old canvas, inputs, and renderer together. */
export function mountApplication(doc: Document): () => void {
  mounts.get(doc)?.();
  const placeholder = doc.querySelector<HTMLCanvasElement>('#world-canvas');
  const status = doc.querySelector<HTMLElement>('#runtime-status');
  const detail = doc.querySelector<HTMLElement>('#runtime-detail');
  const navigationStatus = doc.querySelector<HTMLElement>('#navigation-status');
  const enter = doc.querySelector<HTMLButtonElement>('#enter-navigation');
  const reset = doc.querySelector<HTMLButtonElement>('#reset-view');
  const speed = doc.querySelector<HTMLSelectElement>('#walk-speed');
  const win = doc.defaultView;
  if (!placeholder || !status || !detail || !win) {
    const notice = doc.createElement('p');
    notice.setAttribute('role', 'alert');
    notice.textContent = 'Demo District could not start. Reload the page to try again.';
    doc.body.append(notice);
    const unmount = (): void => { notice.remove(); if (mounts.get(doc) === unmount) mounts.delete(doc); };
    mounts.set(doc, unmount);
    return unmount;
  }
  const canvas = placeholder.cloneNode(false) as HTMLCanvasElement;
  canvas.removeAttribute('width');
  canvas.removeAttribute('height');
  canvas.dataset.navigation = 'idle';
  placeholder.replaceWith(canvas);
  let disposed = false;
  let world: World | undefined;
  let controls: DesktopController | undefined;
  let diagnostics: ReturnType<typeof createWorldDiagnostics> | undefined;
  const setControlsEnabled = (enabled: boolean): void => {
    if (enter) enter.disabled = !enabled;
    if (reset) reset.disabled = !enabled;
    if (speed) speed.disabled = !enabled;
  };
  const showState = (state: WorldState): void => {
    if (disposed) return;
    setControlsEnabled(state === 'running');
    if (state === 'running') {
      status.dataset.state = 'ready';
      status.textContent = 'World engine ready';
      detail.textContent = `Three.js r${world?.revision ?? ''} · Movement test only. No creator experiences are loaded.`;
    } else if (state === 'stopped' || state === 'suspended') {
      status.dataset.state = 'paused';
      status.textContent = 'World rendering paused';
      detail.textContent = 'The engine resumes when this preview is visible again.';
    } else if (state === 'context-lost') {
      status.dataset.state = 'unavailable';
      status.textContent = 'The graphics connection was interrupted.';
      detail.textContent = 'Waiting for the browser to restore graphics. Reload this preview if it does not recover.';
    } else if (state === 'failed') {
      status.dataset.state = 'unavailable';
      status.textContent = 'The world renderer stopped safely.';
      detail.textContent = 'Reload this preview to try again. No project data has been lost.';
    }
  };
  const onEnter = (): void => { controls?.focus(); };
  const onReset = (): void => { controls?.resetView(); controls?.focus(); };
  const onSpeed = (): void => { if (speed) controls?.setSpeed(Number(speed.value)); };
  const onPageHide = (event: PageTransitionEvent): void => {
    if (event.persisted) world?.stop(); else unmount();
  };
  const onPageShow = (event: PageTransitionEvent): void => { if (event.persisted && !disposed) world?.start(); };
  const unmount = (): void => {
    if (disposed) return;
    disposed = true;
    setControlsEnabled(false);
    win.removeEventListener('pagehide', onPageHide);
    win.removeEventListener('pageshow', onPageShow);
    enter?.removeEventListener('click', onEnter);
    reset?.removeEventListener('click', onReset);
    speed?.removeEventListener('change', onSpeed);
    try { controls?.dispose(); world?.destroy(); }
    finally {
      diagnostics?.destroy();
      if (mounts.get(doc) === unmount) mounts.delete(doc);
    }
  };
  mounts.set(doc, unmount);
  setControlsEnabled(false);
  status.dataset.state = 'loading';
  status.textContent = 'Starting the world engine…';
  if (navigationStatus) navigationStatus.textContent = 'Click the scene or choose Explore to use a keyboard and mouse.';
  if (speed) speed.value = '3.2';
  try {
    if (import.meta.env.DEV) diagnostics = createWorldDiagnostics(doc);
    world = createWorld(canvas, { onStateChange: showState, ...(diagnostics ? { onFrame: diagnostics.update } : {}) });
    const activeWorld = world;
    controls = createDesktopController(canvas, world.camera, {
      invalidate: () => activeWorld.invalidate(),
      canNavigate: () => activeWorld.snapshot().state === 'running',
      onModeChange: (mode) => {
        canvas.dataset.navigation = mode;
        if (navigationStatus) navigationStatus.textContent = mode === 'idle'
          ? 'Click the scene or choose Explore to use a keyboard and mouse.'
          : mode === 'dragging' ? 'Looking around · Release the mouse to stop looking.'
          : 'WASD to walk · Drag or use arrow keys to look · Escape to release focus.';
      },
    });
    world.addSystem(controls);
    enter?.addEventListener('click', onEnter);
    reset?.addEventListener('click', onReset);
    speed?.addEventListener('change', onSpeed);
    world.start();
    win.addEventListener('pagehide', onPageHide);
    win.addEventListener('pageshow', onPageShow);
  } catch {
    unmount();
    status.dataset.state = 'unavailable';
    status.textContent = 'The 3D world is unavailable on this browser.';
    detail.textContent = 'Try a WebGL 2-capable browser with graphics acceleration enabled. No projects have been loaded.';
    if (navigationStatus) navigationStatus.textContent = 'Navigation is unavailable until graphics recover.';
  }
  return unmount;
}
