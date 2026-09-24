/** Pure lifecycle helpers; no DOM, framework, or Three.js globals. */
export interface Disposable { dispose(): void }

/** Tracks only resources this world owns. Shared resources are disposed once. */
export class ResourceScope {
  private readonly resources = new Set<Disposable>();
  private disposed = false;

  track<T extends Disposable>(resource: T): T {
    if (this.disposed) throw new Error('Cannot add resources to a disposed scope.');
    this.resources.add(resource);
    return resource;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    const failures: unknown[] = [];
    for (const resource of this.resources) {
      try { resource.dispose(); } catch (error) { failures.push(error); }
    }
    this.resources.clear();
    if (failures.length) throw new AggregateError(failures, 'World resource cleanup failed.');
  }
}

/** Resets on every suspension so returning to a tab never advances by minutes. */
export class FrameClock {
  private previous: number | undefined;
  private elapsed = 0;

  reset(): void { this.previous = undefined; }

  tick(timestamp: number): { delta: number; elapsed: number } {
    if (!Number.isFinite(timestamp)) return { delta: 0, elapsed: this.elapsed };
    const delta = this.previous === undefined ? 0 : Math.min(0.05, Math.max(0, (timestamp - this.previous) / 1000));
    this.previous = timestamp;
    this.elapsed += delta;
    return { delta, elapsed: this.elapsed };
  }
}

export interface Viewport {
  width: number;
  height: number;
  pixelRatio: number;
  bufferWidth: number;
  bufferHeight: number;
}

/** Limit DPR, total pixels, and the GPU's maximum renderbuffer dimension. */
export function measureViewport(width: number, height: number, dpr: number, maxDimension = 8192, pixelBudget = 3_686_400): Viewport | null {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) return null;
  const w = Math.floor(width);
  const h = Math.floor(height);
  const ratio = Number.isFinite(dpr) && dpr > 0 ? dpr : 1;
  const limit = Number.isFinite(maxDimension) && maxDimension >= 1 ? maxDimension : 8192;
  const budget = Number.isFinite(pixelBudget) && pixelBudget >= 1 ? pixelBudget : 3_686_400;
  const pixelRatio = Math.min(ratio, 2, Math.sqrt(budget / (w * h)), limit / w, limit / h);
  if (w * pixelRatio < 1 || h * pixelRatio < 1) return null;
  return { width: w, height: h, pixelRatio,
    bufferWidth: Math.max(1, Math.floor(w * pixelRatio)),
    bufferHeight: Math.max(1, Math.floor(h * pixelRatio)) };
}
