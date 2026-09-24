import { createWorld } from '../world/World.ts';
import type { World, WorldState } from '../world/World.ts';
import { createWorldDiagnostics } from '../ui/world-diagnostics.ts';

const mounts = new WeakMap<Document, () => void>();

/** Mount one world; repeat calls retire the previous canvas/context and listeners. */
export function mountApplication(doc: Document): () => void {
  mounts.get(doc)?.();
  const placeholder = doc.querySelector<HTMLCanvasElement>('#world-canvas');
  const status = doc.querySelector<HTMLElement>('#runtime-status');
  const detail = doc.querySelector<HTMLElement>('#runtime-detail');
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
  placeholder.replaceWith(canvas);
  let disposed = false;
  let world: World | undefined;
  let diagnostics: ReturnType<typeof createWorldDiagnostics> | undefined;
  const showState = (state: WorldState): void => {
    if (disposed) return;
    if (state === 'running') {
      status.dataset.state = 'ready';
      status.textContent = 'World engine ready';
      detail.textContent = `Three.js r${world?.revision ?? ''} · Test scene only. No creator experiences are loaded.`;
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
  const onPageHide = (event: PageTransitionEvent): void => {
    if (event.persisted) world?.stop(); else unmount();
  };
  const onPageShow = (event: PageTransitionEvent): void => {
    if (event.persisted && !disposed) world?.start();
  };
  const unmount = (): void => {
    if (disposed) return;
    disposed = true;
    win.removeEventListener('pagehide', onPageHide);
    win.removeEventListener('pageshow', onPageShow);
    try { world?.destroy(); }
    finally {
      diagnostics?.destroy();
      if (mounts.get(doc) === unmount) mounts.delete(doc);
    }
  };
  mounts.set(doc, unmount);
  status.dataset.state = 'loading';
  status.textContent = 'Starting the world engine…';
  try {
    if (import.meta.env.DEV) diagnostics = createWorldDiagnostics(doc);
    world = createWorld(canvas, {
      onStateChange: showState,
      ...(diagnostics ? { onFrame: diagnostics.update } : {}),
    });
    world.start();
    win.addEventListener('pagehide', onPageHide);
    win.addEventListener('pageshow', onPageShow);
  } catch {
    unmount();
    status.dataset.state = 'unavailable';
    status.textContent = 'The 3D world is unavailable on this browser.';
    detail.textContent = 'Try a WebGL 2-capable browser with graphics acceleration enabled. No projects have been loaded.';
  }
  return unmount;
}
