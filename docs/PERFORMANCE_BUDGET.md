# Performance budget

Performance is a product feature. This page records how the district is measured, what it
costs today, the budgets it must stay within, and what remains unmeasured.

## How to measure

```sh
npm run dev                      # terminal 1
node scripts/measure.mjs         # terminal 2 (add --angle=swiftshader for software rendering)
```

`scripts/measure.mjs` builds the district at each quality tier and three screen profiles:

- **desktop:** 1440×900 at DPR 1.
- **laptop2x:** 1440×900 at DPR 2.
- **phone:** 390×844 at DPR 3.

It renders four fixed views synchronously, forcing GPU completion with a 1-pixel readback, and reports the median and p95 frame cost, draw calls, and triangles. These are true per-frame costs, not vsync-capped frame rates. The development HUD (`npm run dev`) shows live draws, triangles, resources, buffer size, tier, and smoothed ms/frame.

## Baseline (2026-09-25, Apple M5, ANGLE Metal, after pass 6)

| size | tier | view | buffer | median ms | p95 ms | draws | triangles |
| --- | --- | --- | --- | --- | --- | --- | --- |
| desktop | high | spawn | 1440x900 | 2.70 | 3.30 | 94 | 87314 |
| desktop | high | plaza | 1440x900 | 2.40 | 2.50 | 65 | 85962 |
| desktop | high | promenade | 1440x900 | 2.40 | 2.60 | 65 | 85844 |
| desktop | high | storefront | 1440x900 | 2.30 | 2.40 | 42 | 64374 |
| desktop | medium | spawn | 1440x900 | 1.90 | 3.00 | 94 | 87314 |
| desktop | medium | plaza | 1440x900 | 1.60 | 1.70 | 65 | 85962 |
| desktop | medium | promenade | 1440x900 | 1.60 | 1.80 | 65 | 85844 |
| desktop | medium | storefront | 1440x900 | 1.50 | 1.60 | 42 | 64374 |
| desktop | low | spawn | 692x433 | 0.70 | 0.80 | 78 | 54964 |
| desktop | low | plaza | 692x433 | 0.60 | 0.70 | 49 | 53612 |
| desktop | low | promenade | 692x433 | 0.60 | 0.70 | 49 | 53494 |
| desktop | low | storefront | 692x433 | 0.50 | 0.60 | 26 | 32024 |
| laptop2x | high | spawn | 2428x1517 | 5.00 | 5.40 | 94 | 87314 |
| laptop2x | high | plaza | 2428x1517 | 4.30 | 4.60 | 65 | 85962 |
| laptop2x | high | promenade | 2428x1517 | 4.40 | 4.70 | 65 | 85844 |
| laptop2x | high | storefront | 2428x1517 | 4.00 | 4.10 | 42 | 64374 |
| laptop2x | medium | spawn | 1600x1000 | 2.10 | 3.70 | 94 | 87314 |
| laptop2x | medium | plaza | 1600x1000 | 1.80 | 1.90 | 65 | 85962 |
| laptop2x | medium | promenade | 1600x1000 | 1.90 | 1.90 | 65 | 85844 |
| laptop2x | medium | storefront | 1600x1000 | 1.70 | 1.80 | 42 | 64374 |
| laptop2x | low | spawn | 692x433 | 0.70 | 0.80 | 78 | 54964 |
| laptop2x | low | plaza | 692x433 | 0.60 | 0.70 | 49 | 53612 |
| laptop2x | low | promenade | 692x433 | 0.60 | 0.70 | 49 | 53494 |
| laptop2x | low | storefront | 692x433 | 0.50 | 0.60 | 26 | 32024 |
| phone | high | spawn | 780x1688 | 2.00 | 2.30 | 72 | 87270 |
| phone | high | plaza | 780x1688 | 1.80 | 1.90 | 61 | 85954 |
| phone | high | promenade | 780x1688 | 1.80 | 1.90 | 50 | 83106 |
| phone | high | storefront | 780x1688 | 1.60 | 1.80 | 42 | 64374 |
| phone | medium | spawn | 780x1688 | 1.70 | 1.90 | 72 | 87270 |
| phone | medium | plaza | 780x1688 | 1.60 | 2.20 | 61 | 85954 |
| phone | medium | promenade | 780x1688 | 1.50 | 1.60 | 50 | 83106 |
| phone | medium | storefront | 780x1688 | 1.40 | 1.50 | 42 | 64374 |
| phone | low | spawn | 372x805 | 0.60 | 0.70 | 56 | 54920 |
| phone | low | plaza | 372x805 | 0.50 | 0.60 | 45 | 53604 |
| phone | low | promenade | 372x805 | 0.50 | 0.60 | 34 | 50756 |
| phone | low | storefront | 372x805 | 0.40 | 0.50 | 26 | 32024 |

- **Content ready:** 320–470 ms locally (geometry is interactive immediately; textures stream in). The production preview is interactive in about 0.5 s.
- **Transfer:** 16 requests, 2.27 MB encoded, all same-origin: 3.5 MB of local world assets uncompressed, plus a 680 kB JS bundle.
- **Software rendering (SwiftShader, CI and machines without GPU acceleration):** the full scene ran at 0.4 fps. The low tier gives about 4 fps at 1440×900 and 9 fps at phone size. It renders only on demand, so the page idles when nothing moves.

## Findings and changes

1. **The cost driver is pixel count × MSAA samples on the half-float target.** Draw calls (≤ 94) and triangles (≤ 87k) are not limiting on this GPU.
2. **DPR-aware MSAA:** at DPR ≥ 1.5 the high tier uses 2× instead of 4× MSAA. Measured effect: 2× DPR desktop 5.6 → 4.4–5.0 ms, phone-density high 4.4 → 2.0 ms. Dense pixels hide the difference.
3. **Static shadows:** the shadow map re-renders only when content changes, not every frame.
4. **Instancing and merging:** vegetation, rocks, and grass are instanced. All static architecture merges into one mesh per material.
5. **Candidates held back for lack of evidence:** a sign-text atlas (about 20 fewer draws), merged storefront glass (7 fewer), and LOD. Revisit if a CPU-bound device shows draw-call cost.

## Budgets

| Metric | Budget | Now |
| --- | --- | --- |
| High tier, desktop 1440×900, reference GPU (M5), median | ≤ 6 ms (≥ 2.5× headroom under 16.7 ms) | 2.7 ms |
| High tier, DPR 2, reference GPU, median | ≤ 8 ms | 5.0 ms |
| Draw calls at spawn | ≤ 120 | 106 (Blender trees, SwiftShader count) |
| Triangles in view | ≤ 150k | 144k at spawn (Blender trees, SwiftShader count) |
| Initial transfer | ≤ 5 MB | 2.27 MB |
| Local assets ready (broadband) | ≤ 2 s | about 0.5 s |
| JS bundle (uncompressed) | ≤ 750 kB | 717 kB main + 71 kB lazy glTF loader |

**Adaptive safety net.** In automatic mode, if the smoothed frame interval stays above 26 ms (about 38 fps) for 4 s after a 3 s warmup, the world steps down one tier in place. Judging starts only once content has loaded. A visitor's explicit graphics choice is never overridden. The governor's logic is unit-tested and exercised end to end on SwiftShader.

**City ring (2026-09-25).** The entrance colonnade, city blocks, hills, and skyline add about 24k triangles and 5 draw calls (spawn: 121k triangles, 100 draws). An A/B run under identical conditions shows no measurable frame-time change: all city geometry merges into existing per-material batches. The low tier drops the skyline and roof light accents.

**Blender trees (2026-09-25).** Trees now come from `public/world/models/trees.glb` (see [TREES_BLENDER.md](TREES_BLENDER.md)). Planter and terrace trees use ~1.5k-triangle models; groves and street trees use a ~430-triangle LOD. Measured with SwiftShader at 1440×900 (counts only; SwiftShader frame times are not meaningful):

- High spawn: 100 → 106 draws, 121.6k → 144.3k triangles. Plaza and promenade: 129k.
- Low spawn: 104.5k triangles.
- Main bundle: 687 → 717 kB, plus a 71 kB lazy loader chunk. The GLB adds 263 kB of transfer.

Frame time on the reference GPU is not yet re-measured.

## Quality tiers

| Tier | Chosen for | Shadows | Post | MSAA | Buffer budget | Groves | Decorative motion |
| --- | --- | --- | --- | --- | --- | --- | --- |
| High | desktop GPUs | 4096, static | bloom + tone map | 4× (2× at DPR ≥ 1.5) | 3.7 MP | yes | yes |
| Balanced (medium) | touch-primary devices | 2048, static | bloom | none | 1.6 MP | yes | yes |
| Light (low) | software renderers | none | none | none | 0.3 MP | no | none (on demand) |

Visitors can override the tier in the Explore menu (Automatic / High / Balanced / Light). The choice applies live, keeps their position, and is saved in the browser when storage allows.

## Not yet measured (release gate, slice 46)

Mid-range laptops with integrated graphics, Windows and Linux GPUs, and physical iPhone and Android devices (thermal behaviour, Safari's WebGL). The budgets above hold on the reference machine only; the governor is the safety net until real devices are measured.
