import { REVISION, WebGLRenderer } from 'three';

type CanvasProbe =
  | { kind: 'ready'; revision: string; dispose: () => void }
  | { kind: 'unavailable' };

/**
 * One clear-only Three.js initialization proves the real dependency and WebGL path.
 * No scene, camera, animation loop, world assets, or controller is created here.
 * Replace this probe with the central World lifecycle in Slice 2.
 */
export function prepareCanvas(canvas: HTMLCanvasElement): CanvasProbe {
  let renderer: WebGLRenderer | undefined;
  let context: WebGL2RenderingContext | null = null;
  try {
    context = canvas.getContext('webgl2', { alpha: false, antialias: false });
    if (!context) return { kind: 'unavailable' };

    renderer = new WebGLRenderer({ canvas, context, antialias: false });
    // A blank buffer does not need native-DPR allocation. Slice 2 owns resize/DPR policy.
    renderer.setPixelRatio(1);
    renderer.setSize(1, 1, false);
    renderer.setClearColor(0x17252b, 1);
    renderer.clear();
  } catch {
    renderer?.dispose();
    context?.getExtension('WEBGL_lose_context')?.loseContext();
    return { kind: 'unavailable' };
  }

  const activeRenderer = renderer;
  let disposed = false;
  return {
    kind: 'ready',
    revision: REVISION,
    dispose: () => {
      if (disposed) return;
      disposed = true;
      activeRenderer.dispose();
      activeRenderer.forceContextLoss();
    },
  };
}
