import type { WorldSnapshot } from '../world/World.ts';

/** Invoked only inside import.meta.env.DEV; stripped from the production bundle. */
export function createWorldDiagnostics(doc: Document): { update: (snapshot: WorldSnapshot) => void; destroy: () => void } {
  const panel = doc.createElement('pre');
  panel.dataset.worldDiagnostics = '';
  panel.className = 'world-diagnostics';
  panel.setAttribute('aria-label', 'Development renderer diagnostics');
  // Deliberately not a live region: frame statistics must not interrupt screen readers.
  doc.body.append(panel);
  return {
    update: (snapshot) => {
      const size = snapshot.viewport;
      panel.textContent = [
        'DEVELOPMENT · WORLD ENGINE',
        `${snapshot.state} · ${snapshot.loopActive ? 'continuous' : 'on demand / paused'}`,
        `Frames ${snapshot.frames} · Draws ${snapshot.drawCalls} · Triangles ${snapshot.triangles}`,
        `Geometries ${snapshot.geometries} · Textures ${snapshot.textures}`,
        size ? `${size.bufferWidth} × ${size.bufferHeight} · DPR ${size.pixelRatio.toFixed(2)}` : 'Waiting for a visible canvas',
      ].join('\n');
    },
    destroy: () => panel.remove(),
  };
}
