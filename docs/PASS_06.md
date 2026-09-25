# World pass 6 — measurement, optimization, quality presets (slices 18–20)

**Branch:** `build/demo-district-v1` · **Baseline:** `84a3ac3` · **Status:** implemented and verified locally; CI recorded after push.

See **[PERFORMANCE_BUDGET.md](PERFORMANCE_BUDGET.md)** for the method, tables, budgets, and gaps.

## Delivered

- **Instrumentation (slice 18).**
  - `scripts/measure.mjs` measures true GPU frame cost, draws, and triangles per view across 3 tiers × 3 screen profiles, plus time to content ready and GPU object counts.
  - The engine reports real (unclamped) frame intervals.
  - The development HUD shows the tier and smoothed ms/frame.
  - Production load was measured: 16 same-origin requests, 2.27 MB encoded, interactive in about 0.5 s locally.
- **Optimization (slice 19), driven by measurement.** Pixel count × MSAA samples was the cost driver; draws (≤ 94) and triangles (≤ 87k) were not. At DPR ≥ 1.5 the high tier now uses 2× MSAA, which measured 5.6 → 4.4–5.0 ms at 2× DPR and 4.4 → 2.0 ms at phone density. A sign atlas, merged glass, and LOD are documented but held back until a device shows draw-call cost.
- **Quality presets (slice 20).**
  - The Explore menu's Graphics control (Automatic / High / Balanced / Light) applies live without a page reload and keeps the visitor's position and walk speed.
  - The choice is saved per visitor when storage allows; blocked storage falls back to automatic.
  - Reset view still returns to the spawn.
  - `data-quality` on the canvas reports the active tier.
- **Adaptive governor.** Pure and unit-tested. In automatic mode, frames slower than 26 ms sustained for 4 s after a 3 s warmup step the world down one tier in place, with a brief notice. It only judges once content has loaded, handles very slow software frames, ignores multi-second stalls, never steps up, and never overrides an explicit choice.

## Caught in review

- The governor originally treated any interval over 250 ms as a pause, so the slowest devices, the ones it exists for, would never step down.
- It also judged loading-time frames (shader compiles, uploads), which demoted the tier before the district had even loaded.
- A benchmark artefact: the first measured view absorbed one-time costs. The script now discards a warmup view.
- The initial "MSAA costs 4 ms at spawn" reading was partly GPU power-state noise. Only the reproducible high-DPR saving was acted on.

## Verified execution (local, Node 26.8.2)

| Check | Result |
| --- | --- |
| Unit | 66 passed (new: governor ×5). |
| Build, artifact check | Passed; bundle 680 kB. |
| Production browser | 31 passed and 3 timed out in a run while another process held the machine at a load average of 30–39. Rerun with less contention, all 3 passed (the resize test 3/3 with `--repeat-each`). CI is the clean record. |
| Lifecycle | 58 passed, 8 skipped by design. New `quality.spec`: governor steps down in place; live choice persists across reload and is never demoted; blocked storage is safe. |

## Not measured

Real mid-range laptops and physical phones. The governor is the safety net until the slice 46 device gate.
