/**
 * Adaptive quality: watches real frame intervals while the world animates and asks to step
 * down when frames stay slow. Pure logic (no DOM or timers) so it is unit-testable. It never
 * steps up automatically: oscillating quality is worse than a slightly lighter scene.
 */
export interface GovernorOptions {
  /** Frame interval (ms) considered too slow, e.g. 26 ≈ below ~38 fps. */
  slowFrameMs: number;
  /** How long frames must stay slow before acting. */
  sustainMs: number;
  /** Ignore the first moments after (re)starting: shader compiles and uploads are not steady state. */
  warmupMs: number;
}
export interface Governor {
  /** Feed one frame interval (ms) and the time now (ms). Returns true when a step down is due. */
  sample(intervalMs: number, nowMs: number): boolean;
  /** Forget history, e.g. after a pause, a hidden tab, or a tier change. */
  reset(nowMs: number): void;
}

export function createGovernor(options: GovernorOptions): Governor {
  let startedAt = -Infinity; let slowSince: number | null = null; let ema: number | null = null;
  return {
    sample(intervalMs, nowMs) {
      if (!Number.isFinite(intervalMs) || intervalMs <= 0) return false;
      // Hidden tabs and explicit stops already halt the loop. Remaining multi-second gaps are
      // stalls (debugger, OS sleep), not rendering cost; genuinely slow frames (0.3–1 s on
      // software rendering) still count.
      if (intervalMs > 1500) { slowSince = null; ema = null; return false; }
      if (nowMs - startedAt < options.warmupMs) return false;
      ema = ema === null ? intervalMs : ema * 0.9 + intervalMs * 0.1;
      if (ema <= options.slowFrameMs) { slowSince = null; return false; }
      slowSince ??= nowMs;
      if (nowMs - slowSince < options.sustainMs) return false;
      slowSince = null; ema = null; startedAt = nowMs;
      return true;
    },
    reset(nowMs) { startedAt = nowMs; slowSince = null; ema = null; },
  };
}
