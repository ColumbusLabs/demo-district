import { prepareCanvas } from '../world/canvas-probe';

/** Mount only the scaffold. Scene, camera, controls, and frame loop belong to Slice 2+. */
export function mountApplication(doc: Document): () => void {
  const canvas = doc.querySelector<HTMLCanvasElement>('#world-canvas');
  const status = doc.querySelector<HTMLElement>('#runtime-status');
  const detail = doc.querySelector<HTMLElement>('#runtime-detail');

  if (!canvas || !status || !detail) {
    const notice = doc.createElement('p');
    notice.setAttribute('role', 'alert');
    notice.textContent = 'Demo District could not start. Reload the page to try again.';
    doc.body.append(notice);
    return () => notice.remove();
  }

  const result = prepareCanvas(canvas);
  if (result.kind === 'unavailable') {
    status.dataset.state = 'unavailable';
    status.textContent = 'The 3D canvas is unavailable on this browser.';
    detail.textContent = 'Try a WebGL 2-capable browser with graphics acceleration enabled. No projects have been loaded.';
    return () => {};
  }

  status.dataset.state = 'ready';
  status.textContent = 'World canvas ready';
  detail.textContent = `Three.js r${result.revision} initialized. No creator experiences are loaded.`;
  const onContextLost = (): void => {
    status.dataset.state = 'unavailable';
    status.textContent = 'The graphics connection was interrupted.';
    detail.textContent = 'Reload this preview to reconnect. No project data has been lost.';
  };
  canvas.addEventListener('webglcontextlost', onContextLost);

  return () => {
    canvas.removeEventListener('webglcontextlost', onContextLost);
    result.dispose();
  };
}
