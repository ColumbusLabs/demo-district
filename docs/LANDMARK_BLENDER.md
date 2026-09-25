# Blender landmark — the arch sculpture after the mockup

**Branch:** `claude/blender-environment-support-darnhc` (after [TREES_BLENDER.md](TREES_BLENDER.md)) · **Status:** implemented and verified locally (software rendering). Not merged, not deployed.

## Why

The pass-2 landmark was three round tubes: a main arch whose legs converged like an "A", and two full wing arches crossing over its crown. The mockup's sculpture reads differently:

- a tall lancet main arch on straight, parallel legs;
- a deep, softened band section, whose underside shows at the crown;
- two crescent wings that rise outside the legs and join them where the crown springs, never crossing the opening;
- the orb hanging in clear sky.

Smooth swept bands with a controlled section are exactly what Blender is for.

Mockup (left) and this branch (right), same crop:

![Mockup vs landmark](art/landmark-vs-mockup.jpg)

| Spawn | From the plaza | Blender (Cycles) |
| --- | --- | --- |
| ![Spawn](art/landmark-spawn.jpg) | ![Plaza](art/landmark-plaza.jpg) | ![Model](art/landmark-blender.jpg) |

In-app views are headless Chromium with SwiftShader at the high tier. Judge the final look on a real GPU.

## Delivered

- **`tools/blender/landmark.py`.** Builds the whole sculpture as one mesh: 8.5k triangles, 56 kB meshopt-compressed.
  - **Main arch:** 10 m between leg centers. The legs rise straight to 19 m, then a lancet crown (arc radius 1.4 × half-span, apex softened) peaks at 25.7 m.
  - **Band section:** a rounded rectangle, 1.5 × 2.0 m at the base tapering to 1.1 × 1.6 m at the crown.
  - **Wings:** crescent blades up to 2.5 m wide. Each rises from the ground outside a leg and joins it at 0.62 of the height, set 0.5 m behind the leg and yawed 20° back for depth.
  - **Footings:** the model records its ground contacts as mesh extras.
- **World integration.**
  - `landmark.ts` loads the model through the new shared `models.ts`, which the trees now use too, and places it with the district's satin arch material.
  - A procedural lancet covers loading and load failure.
  - The chrome orb (2.6 m radius at 11 m, same slow drift), the stone footings, and the fountain stay in code.
- **Layout.** `district.landmark` now describes the new sculpture (span 10, height 25.7, `wingFoot`). `landmarkFootings()` returns the two legs and the two wing feet, and drives both the navigation blockers and the footing geometry. The wing feet sit outside the fountain basin.
- **Consistency test.** `tests/unit/landmark-model.test.mjs` reads the GLB and fails if its footings or height disagree with the layout. It also checks that the tree GLB has every kind and level of detail.
- **Build.** `tools/blender/build.sh [model…]` replaces `build-trees.sh` and builds every model.

## Cost (SwiftShader counts, desktop 1440×900)

| View | Draws (trees → + landmark) | Triangles (trees → + landmark) |
| --- | --- | --- |
| high · spawn | 106 → 104 | 139.1k → 135.9k |
| high · plaza | 75 → 73 | 124.6k → 121.4k |
| high · storefront | 50 → 50 | — → 102.1k |
| low · spawn | 84 → 82 | 98.3k → 95.0k |

## Verified execution (local, Node 26.10.0)

| Check | Result |
| --- | --- |
| `npm run verify` | 68 unit tests passed, including the new landmark and tree model checks; build and artifact check passed. The dist check requires both GLBs. |
| Browser and lifecycle | Running at commit time; results are added in the follow-up commit. |
| Visual | Spawn and plaza views on SwiftShader at the high tier, compared with the mockup crop above. |

## Not done / next

- Real-GPU comparison. Under the golden-hour backlight, bloom and haze wash the arch toward white. That comes from the existing lighting and material, which this change leaves untouched.
- The mockup's crown shows a faint second inner outline, which may be a nested inner arch. The depth band gives a similar read; a true nested arch could be added if wanted.
