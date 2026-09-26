# World passes 1–3 — plaza, architecture, landscape (slices 5–12)

**Branch:** `build/demo-district-v1`  
**Baseline:** `0ece14e` (Slice 4 checkpoint)  
**Status:** implemented and verified locally; CI evidence recorded below after push. Native Sites acceptance and physical-device testing remain pending.

| Approved mockup | Pass 3 spawn render (desktop, high tier) |
| --- | --- |
| ![Mockup](art/plaza-mockup.jpg) | ![Current spawn](art/pass-03-spawn.jpg) |

More views: [plaza](art/pass-03-plaza.jpg), [storefront interior](art/pass-03-storefront.jpg).

## Decisions this round

- **Desktop browser is the primary target** (user, 2026-09-24). Mobile stays supported with a lighter tier.
- **CC0 assets approved.** Poly Haven sky, lighting HDR, and PBR textures are stored locally with a [license manifest](../public/world/LICENSES.md). Poly Haven's photoscanned models (0.3–7 M triangles per tree) are far too heavy, so vegetation and boulders are procedural.
- **Slices 5–22 regrouped into seven passes** (see the plan's section 8a). Passes 1–3 ran back to back.

## Delivered

**Layout and navigation (slices 5, 6).** `src/world/district/layout.ts` is pure data: one plan in meters drives both geometry and collision. From spawn the landmark is ~55 m ahead, framed like the mockup. The camera sits between wide water channels, with sign plinths ~14 m ahead and gate pavilions just beyond. A short tree allee leads into an 18 m plaza. Navigation adds oriented-box and circle blockers to the pure motion math (push-out resolution with sliding). The player collides with channels, beds, plinths, pavilions, planters, benches, banners, bollards, the fountain, and the arch footings. Water is never walkable.

**Lighting and sky (slice 10).** HDR image-based lighting (Kloppenheim 06 pure sky) and a camera-following sky dome from a cropped 4k backdrop. A warm directional sun shares the HDR sun's azimuth, raised to ~14° for readable shadows. The render adds exponential haze, ACES tone mapping, and restrained bloom so only the LED strips, displays, and fountain glow. Shadows are static: the 4k shadow map re-renders only when content changes, not every frame.

**Architecture (slices 7, 12).** A parametric pavilion kit with rounded plaster bodies, stone plinth forecourts, dark storefront frames with a blank sign band, wood accent panels, and lit soffits. Three roof families (elliptical disc, swept wave, barrel shell) give 8 distinct pavilions from one kit. Storefront glass uses an interior-mapping shader: a lit room with depth, a ceiling light, side posters, and a glowing display, plus Fresnel sky reflection. No modelled interiors.

**Landmark (slice 8).** A swept elliptical-section main arch with two crossing wing arches, a chrome orb with a subtle drift, stone footings, and a fountain basin with a lit rim.

**Landscape and water (slices 9, 11).** Procedural trees in three templates: tapered trunks and limbs, with leaf-card canopies whose normals bend outward for soft volumetric shading. Also shrubs, grass tufts, displaced boulders, planters, and benches, all instanced where repeated, with wind sway. Water uses one shader for channels, basin, and lake: layered ripple normals faded with distance, capped Fresnel sky reflection, and bank shading so low reflections read as dark banks. LED spill glows near lit edges. The fountain has a central column and 14 arcing jets.

**Engine.** `createWorld` now accepts pluggable content (`ContentFactory`) with optional `render`, `resize`, `ready`, `pixelBudget`, and `quality`. The test cube remains the engine default. The world keeps the single scheduler; decorative motion (water, wind, orb, fountain) freezes under reduced motion. Late-arriving textures after teardown are dropped. `canvas[data-content]` becomes `ready` when assets settle.

**Quality tiers (early slice 20 baseline).** Tiers are chosen automatically:

- **High** on desktop GPUs: 4096 shadows, 4× MSAA bloom, 3.7 MP buffer.
- **Medium** on touch-primary devices: 2048 shadows, bloom without MSAA, 1.6 MP buffer. Unmeasured on devices.
- **Low** on software renderers: no shadows, no post-processing, 0.42 MP buffer, no outer groves.

`?quality=high|medium|low` overrides detection. This was required for CI: SwiftShader rendered the full scene at 0.4 fps.

## Measurements (local, not a benchmark)

| Setting | Result |
| --- | --- |
| Apple M5 via ANGLE Metal, 1440×900, high | ~60 fps (vsync-capped); assets ready in ~0.65 s; 76 draw calls, ~85k triangles at spawn |
| SwiftShader, 1440×900, forced full detail | 0.4 fps, ~10 s to first frame (why the low tier exists) |
| SwiftShader, 1440×900, low tier | ~4 fps, ~3.5 s to first frame |
| SwiftShader, 390×844, low tier | ~9 fps |
| Production output | 4.2 MB total: 3.5 MB local world assets, 658 kB JS (Three.js size warning persists) |

## Verified execution

Local, macOS, Node 26.8.2, clean `npm ci`:

| Check | Result |
| --- | --- |
| Free-only workflow policy | Passed; workflow unchanged. |
| Unit/repository/runtime/policy/layout/quality tests | 54 passed, 0 failed. New: collision (4), layout reachability and water (3), quality tiers (2), pixel budget (1). |
| Strict TypeScript, build, static artifact check | Passed. The artifact check now also proves world assets are relative and local, the license manifest ships, and the `engine-test` switch is stripped (verified to fail when the guard is removed). |
| Production browser tests | 25 passed, 9 skipped by design. New: all 14 world assets load locally with no errors. |
| Lifecycle/navigation/touch/HMR tests | 46 passed, 6 skipped by design (HMR re-run 3× per project after a timeout fix, 6/6). |
| Runtime dependency audit | 0 vulnerabilities. |

The layout reachability test flood-fills the walkable grid from spawn. It caught a real bug during development: a planting bed blocked a storefront. The multi-view render review caught another: textures arriving after teardown threw on remount.

## Evidence boundaries and known gaps

- **Visual match** was tuned by side-by-side comparison with the mockup on a desktop GPU. It is a stylized real-time likeness, not the offline render. Gaps: no signage text or HUD (pass 4/5), no people, simpler vegetation than the render, and fewer mid-ground planters and lights.
- Browser tests run on SwiftShader and therefore exercise the **low tier**. The high tier is verified only by local GPU renders and measurements above. The medium tier has not been measured on a phone.
- The lake ripple pattern and shadow-map edge are visible only from elevated, non-walkable views.
- Development-only `?engine-test` mounts the lightweight engine scene for engine/controller lifecycle tests; production strips it.
- The world is still a preview: storefronts have no real projects, no interaction targets, and no loading screen yet.

Contracts: [world engine](WORLD_ENGINE.md), [navigation](NAVIGATION.md), [art direction](WORLD_ART_DIRECTION.md), [roadmap](IMPLEMENTATION_PLAN.md).

Next: **Pass 4 — interaction (slices 13 signage, 14 targeting, 15 preview overlay).**
