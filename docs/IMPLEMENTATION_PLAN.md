# Demo District — Detailed Implementation Plan

**Project:** Demo District  
**Primary experience:** A beautiful, walkable 3D district for discovering AI-created demos, games, scenes, experiments, and browser experiences.  
**Primary host target:** ChatGPT Sites  
**World technology:** Three.js  
**Planning date:** 2026-09-24  
**Build style:** Small, chat-friendly slices with a hard checkpoint after every slice.  
**Model options used in this plan:** GPT-5.6 Sol and GPT-6 Astra Pro.

<!-- passes-01-03-status -->
## Current implementation checkpoint — World passes 1–3 (slices 5–12)

**The walkable plaza now exists.** See [pass checkpoint and evidence](PASSES_01-03.md) and [art direction](WORLD_ART_DIRECTION.md).

On 2026-09-24 the user set **desktop browser as the primary target** (mobile secondary but supported), approved CC0 third-party assets, and approved regrouping slices 5–22 into seven passes aimed directly at the mockup (below). Passes 1–3 ran back to back:

- **Pass 1 — composition and light** (slices 5, 6, 10): layout-driven plaza, boulevard, water channels with coping and LED lines, beds, plinths, banners, collision against every solid, golden-hour sun, HDR sky and image-based lighting, haze, lake, and mountains.
- **Pass 2 — architecture and landmark** (slices 7, 8, 12): parametric pavilion kit with three roof families, storefront frames, wood accents, soffit lighting, interior-mapped storefront glass; the arch-and-orb landmark over the fountain.
- **Pass 3 — life and atmosphere** (slices 9, 11): procedural trees, shrubs, grasses, boulders, benches, planters, wind sway; shader water with Fresnel sky reflection, bank shading, LED spill, and a fountain.

An early baseline of slice 20 was needed to keep software-rendered browsers (and CI) usable: automatic high/medium/low tiers. **Pass 4 (signage, targeting, preview) is also done: see [PASS_04.md](PASS_04.md).** **Pass 5 (HUD, search, map, loading) is done: see [PASS_05.md](PASS_05.md).** **Pass 6 (measurement, optimization, quality presets) is done: see [PASS_06.md](PASS_06.md) and [PERFORMANCE_BUDGET.md](PERFORMANCE_BUDGET.md).** **Pass 7 (WORLD ALPHA audit) is done: see [WORLD_ALPHA_AUDIT.md](WORLD_ALPHA_AUDIT.md). It recommends declaring WORLD ALPHA for the desktop browser preview; backend slices (23+) stay locked until the owner decides.** **Blender trees (first Blender-authored asset, slice 9 follow-up) are on `claude/blender-environment-support-darnhc`: see [TREES_BLENDER.md](TREES_BLENDER.md). The landmark sculpture followed: see [LANDMARK_BLENDER.md](LANDMARK_BLENDER.md), then a lighting pass: see [LIGHTING_PASS.md](LIGHTING_PASS.md), and landmark color grading: see [COLOR_GRADING.md](COLOR_GRADING.md).** Native Sites acceptance and physical-device testing remain pending. No merge or deployment is authorized.
<!-- /passes-01-03-status -->

<!-- slice-04-status -->
## Historical implementation checkpoint — Slice 4

**Slice 4 mobile/touch navigation implemented.** See [Slice 4 evidence](SLICE_04.md) and the [navigation contract](NAVIGATION.md).

A one-finger scene drag looks around, and an analog movement stick walks; both work together. Touch never takes keyboard focus, pinch zoom is kept, and the page does not scroll during world interaction. Touch-primary devices hide keyboard-only hints and use a compact layout that covers less than 30% of a phone screen. Keyboard, mouse, and touch share one controller, one motion state, and the engine's single scheduler.

The approved plaza mockup is now in the repository: [art direction](WORLD_ART_DIRECTION.md). The toolchain is on Node 26 (Node 24 also supported).

Native Sites acceptance and physical iPhone/Android testing remain pending. No merge or deployment is authorized. **Milestone 1 (engine boots) is reached in emulation.** Next planned code slice at that checkpoint: **5 — District graybox (6 Astra Pro).**
<!-- /slice-04-status -->

<!-- slice-03-status -->
## Historical implementation checkpoint — Slice 3

**Slice 3 desktop navigation implemented.** See [Slice 3 acceptance and exact CI evidence](SLICE_03.md) for verification status.

Focus-scoped WASD walking, drag/arrow-key look, configurable speeds, human eye height, coarse perimeter bounds, and safe input cleanup now share the engine's single scheduler. Reduced motion supports deliberate navigation without idle decorative animation. No pointer lock is required.

The user's no-paid-Actions requirement is recorded in [CI cost policy](CI_COST_POLICY.md) and AGENTS.md. Only public-repository standard Ubuntu execution is approved; caches and artifact uploads are disabled.

Native Sites acceptance remains pending. No merge or deployment is authorized. Next planned code slice at that checkpoint: **4 — Mobile/touch navigation baseline (5.6 Sol).**
<!-- /slice-03-status -->

<!-- slice-02-status -->
## Historical implementation checkpoint — Slice 2

**Slice 2 implemented and verified as a portable Three.js engine.**

Clean locked installation, repository/runtime unit tests, strict typecheck,
production build/static checks, production-browser tests, development lifecycle
and real HMR tests, and runtime dependency audit passed in CI.

Evidence: https://github.com/ColumbusLabs/demo-district/actions/runs/36054505223 (tested source `84da0e26c6061825b74d756f3f32b1969b881244`).
See [Slice 2 evidence](SLICE_02.md) and [engine contract](WORLD_ENGINE.md).

Native Sites acceptance from Slice 1 remains pending; this is not a claim of Sites
validation or physical mobile performance. No merge or deployment was performed.
Next code slice at that checkpoint: **3 — First-person camera and desktop movement (6 Astra Pro).**
<!-- /slice-02-status -->

<!-- slice-01-status -->
## Historical Slice 1 checkpoint — September 24, 2026

**Slice 1: scaffold verified; native Sites acceptance pending.**

Clean npm ci, 4 repository checks, strict TypeScript check, production build, static artifact check, 12 Chromium smoke cases, and runtime dependency audit passed. Browser cases cover desktop and phone-sized Chromium, not physical iPhone/Safari.

CI evidence: https://github.com/ColumbusLabs/demo-district/actions/runs/36051654434 (source commit `fcc14ad08d8b119a4d1b841d6c8791e0fc67d551`). See [Slice 1 evidence](SLICE_01.md) and [Sites handoff](DEPLOYMENT.md).

No Site was provisioned, saved, deployed, or published. No merge was performed. The final Slice 1 acceptance item requires the native Sites save-only workflow; a green Vite build is not a substitute. At that checkpoint, the next planned implementation was Slice 2. See the current checkpoint above for subsequent work; the host-verification gate remains explicit.
<!-- /slice-01-status -->

---

## 1. Product vision

Demo District is not a conventional directory with a 3D landing page attached. The district **is the product surface**.

A visitor should enter a visually memorable, polished, walkable plaza and discover projects by moving through a place. Individual creator projects remain external by default. Demo District stores lightweight metadata, creator attribution, model information, screenshots or creator-provided media, ratings, and destination links. It does **not** preload or host every linked experience.

The first environment should follow the selected visual direction:

- contemporary pedestrian plaza
- white/light-stone architecture
- landscaped planters and mature trees
- shallow linear water features
- large sculptural arch/orb landmark
- warm golden-hour lighting
- restrained premium signage
- separate pavilions/storefronts representing projects and creators
- clear central path and strong long-distance focal point
- minimal interface floating above the 3D scene
- no requirement for fully modeled interiors in V1

The world should feel like a destination rather than a 3D menu.

---

## 2. Core product principles

### 2.1 World first
Do not start by building the full submission, moderation, authentication, ratings, or admin stack. Prove that entering and moving through Demo District is compelling first.

### 2.2 Link out by default
A project record points to the creator's public project URL and original source post. The external experience is loaded only after the visitor deliberately chooses to open it.

### 2.3 Host only with permission
If a creator provides Demo District with a demo, image, video, or build to host, treat that as a separate submission type with explicit permission/ownership metadata.

### 2.4 Data-driven district
Buildings and project slots should not be hard-coded one by one. Project/district data should drive display name, creator, model, category, poster, location, featured state, external URL, source post, and rating summary.

### 2.5 Portable 3D engine
ChatGPT Sites is the first host, but the Three.js world should not depend deeply on Sites-only APIs. The world layer should remain portable to conventional hosting if requirements change.

### 2.6 Progressive enhancement
A high-end desktop may receive richer reflections, shadows, vegetation, effects, and post-processing. A phone should still receive the same layout, content, navigation, and identity with lighter rendering.

### 2.7 No hidden loading wall
Entering Demo District should load the district shell and local assets only. Creator experiences remain unloaded until deliberately opened.

### 2.8 Search is a first-class escape hatch
Walking is the delight, not a mandatory obstacle. Search/direct navigation must always provide a fast route to a project, creator, model, or category.

---

## 3. Current ChatGPT Sites assumptions

This implementation plan assumes the current Sites capabilities documented as of September 24, 2026:

- Sites can host interactive websites/lightweight apps.
- Durable structured records can use D1.
- Uploaded media/files can use R2.
- Public authentication can be added when supported/configured.
- HTTP/HTTPS/WebSockets are supported.
- D1 is suitable for the structured project/community records planned here.
- Sites can associate saved versions with Git commits for local-source projects.
- Sites remains a beta product and some frameworks/hosting patterns/background-service assumptions may not be supported.

**Implementation consequence:** Slice 1 must verify the actual starter/runtime before the repository commits to a framework shape. Keep the Three.js world as portable TypeScript modules.

Official references:
- https://help.openai.com/en/articles/20001339
- https://learn.chatgpt.com/docs/sites

---

## 4. Model assignment strategy

### GPT-6 Astra Pro
Use Astra Pro for:
- foundational architecture decisions
- Three.js rendering/camera/interaction work
- spatial systems and complex world behavior
- visual matching and world-quality audits
- performance instrumentation/optimization
- auth/security boundaries
- costly-to-change schema/workflow decisions
- release/security audits and broad multi-file integration

### GPT-5.6 Sol
Use Sol for:
- scoped implementation that follows an established pattern
- routine UI
- data fixtures/migrations after architecture is settled
- CRUD/data-access work
- focused tests
- forms/admin surfaces
- straightforward cleanup and integration

The goal is to conserve Astra Pro for work where broader reasoning materially reduces rework.

---

## 5. Conceptual repository shape

The Sites starter may alter exact filenames, but preserve these boundaries:

~~~text
demo-district/
├─ README.md
├─ AGENTS.md
├─ docs/
│  ├─ IMPLEMENTATION_PLAN.md
│  ├─ WORLD_ART_DIRECTION.md   (with art/plaza-mockup.jpg)
│  ├─ PERFORMANCE_BUDGET.md
│  ├─ DATA_MODEL.md
│  └─ DEPLOYMENT.md
├─ public/
│  ├─ models/
│  ├─ textures/
│  ├─ posters/
│  └─ icons/
├─ src/
│  ├─ app/
│  ├─ world/
│  │  ├─ renderer/
│  │  ├─ camera/
│  │  ├─ controls/
│  │  ├─ collision/
│  │  ├─ environment/
│  │  ├─ district/
│  │  ├─ interactions/
│  │  ├─ performance/
│  │  └─ debug/
│  ├─ ui/
│  │  ├─ hud/
│  │  ├─ search/
│  │  ├─ project/
│  │  ├─ onboarding/
│  │  └─ accessibility/
│  ├─ data/
│  ├─ server/
│  │  ├─ projects/
│  │  ├─ ratings/
│  │  ├─ submissions/
│  │  ├─ auth/
│  │  └─ admin/
│  └─ shared/
├─ migrations/
└─ tests/
~~~

Do not force this exact shape if the Sites starter requires a different routing/runtime layout.

---

## 6. Technical world direction

### Renderer
Use Three.js WebGLRenderer as the baseline. Centralize renderer creation and feature-detect optional enhancements.

### Scale
Use human-scale scene units. Eye height should feel approximately human. Pavilion doors, paths, benches, water, and landscaping should all share believable proportions.

### Camera
Start first-person because it best supports the fantasy of physically entering the district. Keep the controller abstraction clean enough that a future optional third-person/avatar view would not require rebuilding interaction.

### Movement
Desktop: WASD plus mouse/trackpad look.  
Mobile: drag to look plus compact touch movement.  
Search/direct navigation remains available on all devices.

### Collision
Avoid a heavyweight physics engine in V1 unless a later requirement proves it necessary. Prefer simplified navigation blockers, ground constraints, ramps, and basic player footprint/capsule logic.

### Asset strategy
Prefer modular/procedural architecture, reusable props, instanced vegetation, a small number of optimized GLTF hero assets, compressed textures, and restrained normal maps rather than 4K materials everywhere.

### Lighting
Target the mockup with a warm directional sun, cool environment fill, restrained practical lighting, selective shadows, an environment/sky treatment, tone mapping, and optional lightweight bloom/ambient-occlusion only when performance permits.

### Water
The channels are visual framing, not a simulation. Use shallow planes, normal/distortion animation, controlled highlights/reflections, and a faked fountain effect.

### Interiors
V1 does not require true walk-in interiors. Use glass frontage, warm fake rooms, poster/display planes, and parallax/fake depth.

---

## 7. Performance budget

Performance is a product feature.

Initial engineering goals:
- target smooth 50–60 FPS on a representative modern desktop/laptop at normal quality
- maintain at least a usable 30+ FPS target on a representative modern mid-range phone
- avoid obvious walking stutters
- never preload creator projects
- keep the initial 3D payload deliberately controlled
- limit active shadows
- reuse materials
- instance or merge repeated static objects where useful
- add LOD/distance culling when measured evidence supports it

Eventually support:
- high
- balanced
- mobile

Do not build an elaborate preset system before the world exists. Build one baseline, measure, then split quality tiers from evidence.

---

## 8. Implementation slices

Every slice is intentionally bounded for chat-based work.

Each slice must end with:
1. source changes complete,
2. relevant build/tests/checks run,
3. docs/IMPLEMENTATION_PLAN.md status updated,
4. a concise checkpoint noting what changed and what comes next,
5. no deploy or merge unless explicitly requested.


### Slice 1 — Repository contract and Sites-compatible scaffold
**Model:** GPT-6 Astra Pro
**Status:** Scaffold verified; native Sites compatibility check pending. See the implementation status above.

**Goal:** Establish a repository that ChatGPT Sites can actually build before adding product code.

**Work:**
- Initialize from the Sites-recommended starter, or adapt the new repository to the currently supported Sites project shape.
- Add Three.js only after confirming the starter/build pipeline accepts it.
- Use TypeScript when supported by the starter.
- Add README.md, AGENTS.md, and docs/IMPLEMENTATION_PLAN.md as the project-control documents.
- Define build, typecheck, test, and local-preview scripts supported by the starter.
- Create a single empty route/page that mounts the world canvas/root.
- Document the exact local preview and Sites save/deploy workflow.
- Do not add D1, R2, ratings, auth, submissions, or moderation yet.

**Acceptance:**
- Clean install succeeds.
- Build succeeds.
- Empty site renders.
- Three.js imports successfully.
- The project shape is confirmed compatible with Sites.
- No unnecessary framework churn is introduced.

---

### Slice 2 — Three.js engine shell
**Model:** GPT-6 Astra Pro
**Status:** Implemented and verified. See [Slice 2 evidence](SLICE_02.md); native Sites validation remains pending.

**Goal:** Create the reusable world lifecycle without building the district yet.

**Work:**
- Centralize renderer, scene, camera, resize handling, render loop, and disposal lifecycle.
- Cap device-pixel ratio sanely rather than blindly rendering at maximum DPR.
- Pause or reduce work when the tab is hidden where appropriate.
- Render a temporary test object and neutral floor.
- Expose a clean world init/destroy contract.
- Keep global Three.js state out of unrelated UI modules.
- Expose lightweight development-only renderer statistics.

**Acceptance:**
- Canvas fills the viewport.
- Resize/orientation changes work without distortion.
- Renderer and resources dispose cleanly.
- Hot reload/re-entry does not create duplicate animation loops.
- The test scene works at desktop and phone-sized viewports.

---

### Slice 3 — First-person camera and desktop movement
**Model:** GPT-6 Astra Pro
**Status:** Implemented. Current acceptance status and exact-source CI results are recorded in [Slice 3 evidence](SLICE_03.md).

**Goal:** Make the empty world feel deliberately navigable rather than like a Three.js debug scene.

**Work:**
- Add WASD movement.
- Add website-appropriate mouse-look/pointer behavior without unexpectedly trapping the pointer.
- Add acceleration/deceleration smoothing.
- Make movement speed configurable.
- Set human-scale camera height.
- Add coarse world bounds.
- Clear input state on blur/focus loss.
- Respect reduced-motion preferences where applicable.

**Acceptance:**
- Movement feels smooth.
- The user cannot drift indefinitely outside the world.
- Input cannot remain stuck after focus changes.
- Camera behavior is decoupled from district geometry.

---

### Slice 4 — Mobile/touch navigation baseline
**Model:** GPT-5.6 Sol
**Status:** Implemented. See [Slice 4 evidence](SLICE_04.md); physical-device and native Sites validation remain pending.

**Goal:** Prove the project is mobile-capable before the environment becomes expensive.

**Work:**
- Add touch-drag look controls.
- Add a compact virtual movement control or touch pad.
- Make interaction hit testing touch-safe.
- Hide desktop-only key hints on touch devices.
- Prevent accidental page scrolling during intentional world interaction without breaking normal accessibility behavior.

**Acceptance:**
- The world can be traversed on an iPhone-sized viewport.
- Controls do not cover the entire scene.
- Mobile interaction is stable enough to continue world development.

---

### Slice 5 — District graybox
**Model:** GPT-6 Astra Pro
**Status:** Implemented in world pass 1. See [passes 1–3](PASSES_01-03.md).

**Goal:** Recreate the selected Demo District mockup composition using primitives only.

**Work:**
- Build the central pedestrian axis and spawn point.
- Block out pavilion rows on both sides.
- Block out the central plaza.
- Add shallow water-channel zones.
- Add landscaped zones and future side-path exits.
- Block out the hero arch/orb landmark at the far end.
- Use only boxes, planes, cylinders, simple curves, and placeholder labels.
- Focus on scale, sight lines, spacing, walking distances, and composition rather than materials.

**Acceptance:**
- The spawn silhouette/composition clearly resembles the chosen concept.
- The long-distance landmark reads immediately.
- Walking distances feel intentional.
- Nothing blocks the primary route.

---

### Slice 6 — Ground, curbs, and water-channel geometry
**Model:** GPT-5.6 Sol
**Status:** Implemented in world pass 1.

**Goal:** Replace the graybox floor with a readable plaza circulation system.

**Work:**
- Create the main stone walkway and secondary pavement zones.
- Add curbs and edge treatment.
- Create shallow water channels and required crossings.
- Add planter boundaries.
- Align walkable surfaces and collision/blocker volumes with visible geometry.

**Acceptance:**
- The player always understands what is walkable.
- Decorative edges do not constantly snag movement.
- Water cannot accidentally behave like walkable ground.

---

### Slice 7 — Reusable pavilion architecture kit
**Model:** GPT-6 Astra Pro
**Status:** Implemented in world pass 2.

**Goal:** Create a coherent architecture language that does not look like copied boxes.

**Work:**
- Create modular wall sections.
- Create open/glass storefront sections.
- Create one or more curved roof/canopy variants.
- Establish light-stone/plaster material families.
- Create inset signage zones.
- Create warm interior light-box/fake-room modules.
- Support configurable pavilion widths/depths.
- Produce several distinct silhouettes from the same kit.

**Acceptance:**
- Architecture is coherent without looking cloned.
- At least six storefront positions can be composed without one-off scene code.
- Scale and material language remain consistent.

---

### Slice 8 — Hero arch and orb landmark
**Model:** GPT-6 Astra Pro
**Status:** Implemented in world pass 2. Sculpture remodelled in Blender after the mockup ([LANDMARK_BLENDER.md](LANDMARK_BLENDER.md)).

**Goal:** Build the central signature landmark that anchors Demo District visually.

**Work:**
- Model the looping/intersecting arch form with curves/tubes or optimized custom geometry.
- Add the central orb.
- Build the fountain/base plinth.
- Add subtle orb animation only if it improves the scene.
- Use simple collision so visitors cannot become trapped.
- Keep the landmark geometry budget reasonable.

**Acceptance:**
- The landmark reads clearly from spawn.
- It produces a strong screenshot focal point.
- Any animation is subtle rather than distracting.
- It does not dominate frame time.

---

### Slice 9 — Landscaping kit
**Model:** GPT-5.6 Sol
**Status:** Implemented in world pass 3. Trees replaced by Blender-generated models ([TREES_BLENDER.md](TREES_BLENDER.md)).

**Goal:** Break up hard architecture and establish the premium outdoor atmosphere.

**Work:**
- Add trees, shrubs, grasses/flowers, rocks, planters, benches, and bollard/path lights.
- Reuse and instance repeated props/vegetation where practical.
- Keep vegetation outside navigation-critical areas.
- Establish a consistent planting palette.

**Acceptance:**
- The main path and storefronts remain visually legible.
- Repeated vegetation does not produce an obvious draw-call explosion.
- The district feels inhabited even before NPCs or crowds exist.

---

### Slice 10 — Golden-hour lighting and sky
**Model:** GPT-6 Astra Pro
**Status:** Implemented in world pass 1 (baseline; tuned against the mockup).

**Goal:** Establish the visual identity closest to the selected mockup.

**Work:**
- Create the sky/environment treatment.
- Use a low-angle warm sun with cooler ambient fill.
- Add restrained storefront/path practical lighting.
- Tune tone mapping and exposure.
- Set a deliberate shadow strategy.
- Use subtle haze/fog for depth.
- Compare screenshots against the target mood rather than chasing photorealism.

**Acceptance:**
- Warm/cool contrast feels premium.
- Architecture stays readable in shadow.
- The spawn screenshot has the intended mood before heavy post effects.
- Mobile remains viable.

---

### Slice 11 — Water look and fountain motion
**Model:** GPT-6 Astra Pro
**Status:** Implemented in world pass 3.

**Goal:** Make the water channels feel alive without using expensive fluid simulation.

**Work:**
- Create a lightweight animated water material.
- Use normal/distortion motion and controlled specular response.
- Create the hero fountain effect.
- Provide a reduced-quality fallback.
- Avoid true fluid simulation and unnecessary reflection cost.

**Acceptance:**
- Water reads clearly while walking.
- There is no obvious z-fighting/flicker.
- The fountain is attractive and inexpensive.
- Water complexity can later be reduced by quality tier.

---

### Slice 12 — Storefront windows and implied interiors
**Model:** GPT-5.6 Sol
**Status:** Implemented in world pass 2 (interior-mapped storefront glass).

**Goal:** Make pavilions feel occupied without modeling full interiors.

**Work:**
- Add glass/transparent frontage.
- Add warm interior boxes/planes.
- Add poster/screen display slots.
- Use fake depth/parallax where useful.
- Avoid expensive true refraction.

**Acceptance:**
- Buildings no longer look hollow.
- Fake interiors hold up at normal approach distances.
- Visitors do not need to enter buildings.

---

### Slice 13 — District signage system
**Model:** GPT-5.6 Sol
**Status:** Implemented in world pass 4 ([PASS_04.md](PASS_04.md)).

**Goal:** Turn building fronts into reusable discovery destinations.

**Work:**
- Create world-space project/category/creator signage.
- Add distance-based visibility or fading.
- Prevent shimmering/unreadable text at distance.
- Define sign typography, scale, spacing, and placement rules.
- Use placeholder project content initially.

**Acceptance:**
- Visitors can identify destinations while walking.
- Signage feels integrated into architecture.
- The scene does not become a wall of labels.

---

### Slice 14 — World interaction targeting
**Model:** GPT-6 Astra Pro
**Status:** Implemented in world pass 4.

**Goal:** Make storefronts/project points interactable across desktop and touch.

**Work:**
- Create the raycast/interaction manager.
- Support proximity triggers.
- Add hover/focus states.
- Add a subtle focus cue.
- Support mouse, keyboard, and touch activation.
- Expose one interaction contract that real project records can later use.

**Acceptance:**
- Storefront selection works across input types.
- Interaction does not require pixel-perfect aiming.
- Decorative geometry cannot steal interactions.

---

### Slice 15 — Project preview overlay shell
**Model:** GPT-5.6 Sol
**Status:** Implemented in world pass 4 (sample fixtures only).

**Goal:** Connect the 3D world to a polished 2D project-information layer.

**Work:**
- Create the preview panel/modal.
- Include project title, creator, model, description, rating placeholder, source-post action, and enter-project action.
- Add reliable close/back behavior.
- Pause or de-prioritize scene input while the overlay is active.
- Use fixture data only.

**Acceptance:**
- The overlay feels like the same product as the world.
- It works on mobile.
- Closing the panel returns control predictably.

---

### Slice 16 — Search and jump-to-location
**Model:** GPT-5.6 Sol
**Status:** Implemented in world pass 5 ([PASS_05.md](PASS_05.md)).

**Goal:** Ensure walking is a delight, not mandatory friction.

**Work:**
- Create search UI.
- Search fixture projects by project, creator, model, and category.
- Move/focus the camera near a selected result.
- Define safe arrival points so jumps never place users inside blockers.
- Support keyboard use and touch.

**Acceptance:**
- A project can be reached without traversing the full district.
- Search is usable from keyboard and phone.
- Jump behavior keeps spatial orientation understandable.

---

### Slice 17 — District minimap baseline
**Model:** GPT-5.6 Sol
**Status:** Implemented in world pass 5.

**Goal:** Give users spatial orientation without running a second full 3D renderer.

**Work:**
- Create a simple 2D schematic/precomputed map.
- Show current position.
- Show major landmarks and selected-project marker.
- Add an unobtrusive show/hide control.

**Acceptance:**
- The map is genuinely useful.
- It remains visually secondary.
- It does not duplicate the entire Three.js scene.

---

### Slice 18 — Performance instrumentation
**Model:** GPT-6 Astra Pro
**Status:** Implemented in world pass 6 ([PERFORMANCE_BUDGET.md](PERFORMANCE_BUDGET.md)).

**Goal:** Measure the world before optimizing it.

**Work:**
- Measure FPS/frame time in development.
- Capture renderer draw calls, triangles, textures, and relevant memory stats.
- Inventory asset sizes.
- Measure initial-load behavior.
- Identify the top bottlenecks.
- Create docs/PERFORMANCE_BUDGET.md.
- Define representative desktop and mobile profiles.

**Acceptance:**
- Performance problems are quantifiable.
- Optimization decisions can be tied to measurements rather than perception alone.

---

### Slice 19 — Geometry and material optimization
**Model:** GPT-6 Astra Pro
**Status:** Implemented in world pass 6 (evidence-driven: DPR-aware MSAA; other candidates documented).

**Goal:** Reduce scene cost without damaging the visual direction.

**Work:**
- Instance repeated vegetation/props where appropriate.
- Merge static geometry where it lowers overhead.
- Reuse materials/textures.
- Cull hidden/unnecessary surfaces.
- Add LOD and distance culling where evidence supports it.
- Keep project interaction objects independently addressable where required.

**Acceptance:**
- Frame time/draw calls improve measurably.
- Spawn and normal walking views do not suffer meaningful visual regression.

---

### Slice 20 — Adaptive quality presets
**Model:** GPT-6 Astra Pro
**Status:** Implemented in world pass 6: automatic tiers, adaptive step-down, and a live user override ([PASS_06.md](PASS_06.md)).

**Goal:** Scale the same district across high-end desktops and phones.

**Work:**
- Create high, balanced, and mobile presets.
- Control DPR, shadow cost, vegetation density, water complexity, and post-processing by preset.
- Add a reasonable automatic initial heuristic.
- Allow users to override the automatic selection.
- Change quality without a full page reload where practical.

**Acceptance:**
- Mobile mode materially reduces render cost.
- Users retain control over quality.
- The same world layout and content remain available at every quality level.

---

### Slice 21 — Loading experience and progressive assets
**Model:** GPT-5.6 Sol
**Status:** Implemented in world pass 5.

**Goal:** Replace blank-canvas waiting with a polished Demo District entry.

**Work:**
- Create branded loading UI.
- Expose useful progress states.
- Load the critical world shell before secondary decoration where practical.
- Add missing-asset/error fallbacks.
- Never preload external creator projects.

**Acceptance:**
- Visitors understand what is happening during load.
- The district becomes interactive before nonessential detail where possible.

---

### Slice 22 — World visual audit checkpoint
**Model:** GPT-6 Astra Pro
**Status:** Audit complete in world pass 7 ([WORLD_ALPHA_AUDIT.md](WORLD_ALPHA_AUDIT.md)); gate items met with evidence; owner decision pending.

**Goal:** Stop feature growth and decide whether the district itself is compelling enough to justify the platform around it.

**Work:**
- Review spawn, plaza, storefront, and mobile screenshots against art direction.
- Audit lighting, scale, repetition, empty areas, signage readability, navigation, and visual hierarchy.
- Fix only high-value world issues.
- Document remaining gaps.
- Explicitly decide whether to unlock backend/community implementation.

**Acceptance:**
- The district is something we would confidently show publicly as Demo District's identity.
- Remaining visual issues are documented.
- WORLD ALPHA is declared only after the gate is satisfied.

**Milestone:** WORLD ALPHA

---

### Slice 23 — Project data contract
**Model:** GPT-6 Astra Pro

**Goal:** Define the durable project/creator/model contract before creating the database.

**Work:**
- Define project ID/slug, title, description, creator identity/links, source post, project URL, project type, model family/version, category, dates, poster, status, featured state, district slot, and attribution/permission metadata.
- Support external, hosted-media, and creator-submitted hosted-demo cases without conflating them.
- Keep spatial location data independent from raw Three.js object references.

**Acceptance:**
- The contract supports link-only entries and later permissioned hosting.
- A future world-layout refactor does not require rewriting content records.

---

### Slice 24 — D1 project schema and migrations
**Model:** GPT-5.6 Sol

**Goal:** Turn the approved data contract into durable structured storage.

**Work:**
- Create project, creator, model/catalog, and category/tag tables as justified by the approved contract.
- Add useful indexes.
- Create migrations and seed fixtures.
- Create repository/data-access adapters.
- Add constraints for malformed records.

**Acceptance:**
- A fresh database migrates from zero.
- Seed records can be queried.
- Obvious invalid states are rejected.

---

### Slice 25 — Read API and repository integration
**Model:** GPT-5.6 Sol

**Goal:** Replace hard-coded fixture projects with real persisted records.

**Work:**
- Implement project list and detail reads.
- Add model/category filters and search.
- Create a typed data boundary.
- Add loading/error states that cannot crash the renderer.

**Acceptance:**
- The district can consume persisted project records.
- A data error does not take down the Three.js world.

---

### Slice 26 — Data-driven project placement
**Model:** GPT-6 Astra Pro

**Goal:** Bind real records to storefronts without hard-coded scene logic.

**Work:**
- Create a stable slot registry.
- Map project records to slot IDs.
- Create intentional empty-slot states.
- Support featured slots.
- Drive signage and previews from project data.

**Acceptance:**
- Changing a project record changes the district without custom scene code.
- Empty slots still look intentional.

---

### Slice 27 — External project launch flow
**Model:** GPT-5.6 Sol

**Goal:** Open creator experiences clearly and deliberately without silently embedding arbitrary third-party content.

**Work:**
- Make Enter Project navigate/open the creator's external experience.
- Clearly indicate external destinations.
- Add the original source/X-post link.
- Add an analytics hook.
- Guard malformed/unsupported URLs.
- Reserve an unavailable/dead-link state for later.

**Acceptance:**
- Demo District never silently embeds arbitrary creator websites.
- External navigation is explicit.
- Returning to Demo District is understandable.

---

### Slice 28 — Ratings data model
**Model:** GPT-6 Astra Pro

**Goal:** Design ratings so they are simple, useful, and not trivially duplicable.

**Work:**
- Use one overall 1-5 rating per signed-in account per project for V1.
- Allow the user's rating to be edited.
- Support average/count aggregation.
- Do not launch free-form public reviews.
- Design deletion/hiding behavior so ratings do not create unusable orphan states.

**Acceptance:**
- One identity cannot create unlimited ratings for one project.
- Aggregates remain efficient.
- The model can evolve later without requiring a rewrite.

---

### Slice 29 — Public authentication
**Model:** GPT-6 Astra Pro

**Goal:** Add the minimum identity layer required for ratings and creator workflows.

**Work:**
- Use the Sites-supported public authentication path available to the project.
- Create a clean auth/session boundary.
- Create a user profile record only when needed.
- Keep browsing fully public.
- Require sign-in only for actions such as rating/claim/submission where needed.
- Document exactly what user information is stored.

**Acceptance:**
- Signed-out users can browse and launch projects.
- Protected actions require identity.
- No secrets reach the client bundle.

---

### Slice 30 — Rating API and UI
**Model:** GPT-5.6 Sol

**Goal:** Make project ratings work end-to-end.

**Work:**
- Create/update the current user's rating.
- Read the current user's rating.
- Return aggregate average/count.
- Integrate the rating UI into project preview.
- Use responsive/optimistic UI only with correct rollback on failure.

**Acceptance:**
- Repeat rating changes update rather than duplicate.
- Aggregates update correctly.
- Failed requests do not leave false local state.

---

### Slice 31 — Basic rating abuse controls
**Model:** GPT-6 Astra Pro

**Goal:** Prevent the rating system from being trivially gameable.

**Work:**
- Enforce identity server-side.
- Validate inputs server-side.
- Use practical request/rate controls supported by the runtime.
- Store useful audit metadata.
- Allow moderation to invalidate abusive ratings if needed.
- Do not rely on client checks for trust.

**Acceptance:**
- Obvious scripted duplicate voting is constrained.
- Abuse controls are documented and testable.

---

### Slice 32 — Submission schema and workflow
**Model:** GPT-6 Astra Pro

**Goal:** Allow projects to enter Demo District through a reviewable process.

**Work:**
- Create draft, submitted, approved, rejected, hidden, and archived states.
- Store ownership/contact information, source post, project URL, creator handle, model/category, and optional hosting request.
- Keep moderation notes private.
- Separate submission records from the public project record.

**Acceptance:**
- A public submission can never publish itself directly into the district.
- Moderation history and public data remain separable.

---

### Slice 33 — Submission form
**Model:** GPT-5.6 Sol

**Goal:** Create a simple community/creator project submission surface.

**Work:**
- Add form validation and URL validation.
- Add model/category selectors.
- Add permission/ownership confirmations.
- Explain that external projects remain creator-hosted by default.
- Preserve useful input after recoverable errors.
- Send submissions into the moderation queue.

**Acceptance:**
- The form is usable on mobile.
- Validation is clear.
- Successful submissions do not become public automatically.

---

### Slice 34 — R2 media support
**Model:** GPT-6 Astra Pro

**Goal:** Store permissioned creator media without bloating the application bundle.

**Work:**
- Create the upload pipeline.
- Validate allowed file types and sizes.
- Store metadata in D1 and bytes in R2.
- Create safe retrieval paths.
- Add poster fallbacks.
- Define deletion/cleanup behavior.

**Acceptance:**
- Media bytes are not stored in D1.
- Invalid uploads are rejected.
- Missing media cannot break project cards.

---

### Slice 35 — Minimal admin moderation panel
**Model:** GPT-5.6 Sol

**Goal:** Operate the platform without manual database edits.

**Work:**
- List pending submissions.
- Inspect a submission.
- Approve/reject.
- Edit public metadata.
- Feature/unfeature.
- Hide/unhide.
- Move project slots.
- Store moderation notes.
- Restrict privileged routes/actions to authorized admin identity.

**Acceptance:**
- Public users cannot perform admin actions.
- Approval predictably creates/updates the public project.

---

### Slice 36 — Claim-project workflow
**Model:** GPT-6 Astra Pro

**Goal:** Give listed creators a safe path to control their Demo District presence.

**Work:**
- Add Claim this project.
- Require authentication.
- Start with a verification process that can be manual.
- Add admin approval/rejection.
- Create ownership relations after verification.
- Allow verified creators to propose/edit allowed presentation fields.

**Acceptance:**
- Matching an X handle alone cannot automatically claim a project.
- The public listing remains stable while a claim is reviewed.

---

### Slice 37 — Creator profile/property view
**Model:** GPT-5.6 Sol

**Goal:** Make creator presence feel like owning a destination in Demo District.

**Work:**
- Create creator identity/profile panel/page.
- Show creator links and all listed projects.
- Use avatar/media only where permitted.
- Optionally show aggregate visits/ratings.
- Keep 3D property customization intentionally limited in V1.

**Acceptance:**
- Creators have a stable shareable Demo District identity/location.
- V1 does not require a full building editor.

---

### Slice 38 — Model and category discovery
**Model:** GPT-5.6 Sol

**Goal:** Let visitors explore by model and creation type without rebuilding the world.

**Work:**
- Add model filters.
- Add category filters.
- Highlight/fade relevant storefronts.
- Add search facets.
- Add optional teleport/focus anchors for logical zones.

**Acceptance:**
- Filtering does not unload/rebuild the entire world.
- Visitors remain spatially oriented.

---

### Slice 39 — Featured, newest, and top-rated discovery
**Model:** GPT-5.6 Sol

**Goal:** Keep Demo District feeling current without turning spawn into a dashboard.

**Work:**
- Add newest and featured collections.
- Add top-rated with a minimum-vote safeguard.
- Add restrained in-world NEW/featured cues.
- Keep dense discovery UI out of the spawn view.

**Acceptance:**
- Discovery can surface in both 2D UI and subtle world cues.
- Rankings do not overwhelm the spatial experience.

---

### Slice 40 — Visit analytics
**Model:** GPT-5.6 Sol

**Goal:** Measure whether people are actually discovering and launching projects.

**Work:**
- Track district entered, project focused, preview opened, project launched, source post opened, search used, creator profile opened, rating submitted, and submission started/completed.
- Keep analytics event-focused and privacy-conscious.
- Avoid collecting sensitive information.

**Acceptance:**
- Project/creator click-through can be measured.
- Analytics do not require invasive profiling.

---

### Slice 41 — Accessibility pass
**Model:** GPT-6 Astra Pro

**Goal:** Make core discovery usable without requiring perfect 3D navigation.

**Work:**
- Add keyboard navigation and visible focus.
- Ensure search/direct navigation can reach projects without walking.
- Use semantic controls/forms.
- Audit contrast.
- Respect reduced motion.
- Provide screen-reader-accessible project listings/details.
- Ensure external launch flow is operable without spatial navigation.

**Acceptance:**
- Core browse/search/select/launch tasks can be completed without navigating the world spatially.

---

### Slice 42 — Link health and project availability
**Model:** GPT-5.6 Sol

**Goal:** Handle creator URLs that disappear or change.

**Work:**
- Add project availability/status fields.
- Create manual dead-link tooling.
- Show a safe unavailable state.
- Allow admin restoration.
- Document a future automated checker, but do not assume unsupported background services.

**Acceptance:**
- Dead projects do not become broken portals.
- Demo District never implies it hosts an unavailable external project.

---

### Slice 43 — Attribution and creator-respect surfaces
**Model:** GPT-5.6 Sol

**Goal:** Turn the creator-friendly/legal strategy into visible product behavior.

**Work:**
- Prominently show creator attribution.
- Link original source post and creator profile.
- Add claim/edit/remove-request entry points.
- Record permission basis for hosted media.
- Add Terms, Privacy, copyright/takedown, and contact locations for final copy.
- State the site's independent community-showcase nature.

**Acceptance:**
- Every listing can show who made it and where it originated.
- Creators can find claim/removal paths without hunting.

---

### Slice 44 — Security and privacy audit
**Model:** GPT-6 Astra Pro

**Goal:** Review every public-input, upload, auth, and privileged boundary before launch.

**Work:**
- Audit auth/session boundaries and admin authorization.
- Audit server-side validation and URL handling.
- Audit uploads and content injection/XSS risk.
- Audit secrets and database queries.
- Audit request/rate controls and moderation pathways.
- Audit user-data collection and error leakage.
- Document findings by severity and remediate high-severity issues.

**Acceptance:**
- High-severity findings are fixed before launch.
- Remaining accepted risks are explicit.

---

### Slice 45 — Cross-device browser QA
**Model:** GPT-6 Astra Pro

**Goal:** Validate Demo District as a real public browser experience.

**Work:**
- Test desktop Chrome, Safari, and Firefox where practical.
- Test iPhone Safari and Android Chrome.
- Test small/large viewports, mouse, keyboard, and touch.
- Test reduced-motion behavior and mobile/low-power quality mode.
- Exercise load -> move/search -> select -> preview -> external launch.

**Acceptance:**
- No known blocker remains in the core visitor flow on supported representative devices.

---

### Slice 46 — Production performance gate
**Model:** GPT-6 Astra Pro

**Goal:** Run the final performance pass after launch functionality exists.

**Work:**
- Compare results against the Slice 18 baseline.
- Audit initial transfer, frame time, memory behavior, long walking sessions, overlay cycles, search jumps, and quality fallback.
- Check mobile thermal/performance sanity.
- Fix high-value regressions.
- Document accepted exceptions.

**Acceptance:**
- Performance budgets are met or explicit exceptions are recorded.
- No obvious memory leak appears during repeated interaction.

---

### Slice 47 — Seed launch collection
**Model:** GPT-5.6 Sol

**Goal:** Populate enough real projects for Demo District to feel alive at launch.

**Work:**
- Curate launch projects.
- Verify project/source URLs.
- Verify creator attribution.
- Treat model/version claims as creator-stated/sourced where possible.
- Assign district slots.
- Use only permitted thumbnails/media.
- Remove mystery placeholder attribution.

**Acceptance:**
- Every public launch slot is intentional and attributable.
- No copied/unsupported hosted build is included.

---

### Slice 48 — Sites release candidate and launch gate
**Model:** GPT-6 Astra Pro

**Goal:** Prepare the first public Demo District release without accidentally publishing unfinished work.

**Work:**
- Run build, typecheck, and tests.
- Review database migrations.
- Save a Sites version/release candidate.
- Inspect preview.
- Verify public access/auth behavior.
- Verify external links and private admin access.
- Verify analytics and attribution/legal surfaces.
- Create rollback notes.
- Do not deploy publicly until explicit approval.

**Acceptance:**
- The saved version is a reproducible release candidate.
- Public deployment remains a deliberate separate action.

**Milestone:** DEMO DISTRICT V1 RELEASE CANDIDATE

---

## 8a. World passes (approved regrouping of slices 5–22)

The slices above remain the definition of done. Execution groups them into passes that
each end with tests, a checkpoint, and a side-by-side comparison against the mockup:

| Pass | Slices | Outcome | Status |
| --- | --- | --- | --- |
| 1. Composition + light | 5, 6, 10 | Layout, circulation, collision, golden-hour lighting and sky | Done ([checkpoint](PASSES_01-03.md)) |
| 2. Architecture + landmark | 7, 8, 12 | Pavilion kit, implied interiors, arch and orb | Done |
| 3. Life + atmosphere | 9, 11 | Landscaping, water, fountain | Done |
| 4. Interaction | 13, 14, 15 | Signage, targeting, preview overlay | Done ([checkpoint](PASS_04.md)) |
| 5. Mockup HUD | 16, 17, 21 | Search, map, loading in the mockup's frosted-pill style | Done ([checkpoint](PASS_05.md)) |
| 6. Performance + quality | 18, 19, 20 | Measurement, optimization, full presets (baseline tiers exist) | Done ([checkpoint](PASS_06.md)) |
| 7. WORLD ALPHA audit | 22 | Mockup comparison and go/no-go | Done — recommendation recorded; owner decision pending ([audit](WORLD_ALPHA_AUDIT.md)) |

A cheap draw-call/triangle counter runs from pass 1 on (development HUD) so phones are not
quietly overloaded before pass 6.

---

## 9. Explicitly not V1

To protect the chat-based build from scope explosion, do not bring these into early slices:

- multiplayer avatars
- voice chat
- full social-network/friends systems
- creator-uploaded arbitrary 3D geometry directly into the district
- full walk-in interiors for every property
- vehicles
- jumping/platforming
- complex physics
- dynamic weather/day-night system
- real-time crowds/NPC simulation
- crypto/NFT/property ownership
- free-form public comments/reviews
- arbitrary third-party site embedding inside the district
- automatic X scraping at scale
- procedural infinite city
- user building editor
- real-time creator presence
- background link crawlers unless the Sites runtime explicitly supports the chosen approach

---

## 10. V1 core loop

A successful visitor flow:

1. Open Demo District.
2. See the plaza with a polished loading transition.
3. Spawn facing the hero landmark.
4. Walk, search, or open the map.
5. Notice a creator/project storefront.
6. Select it.
7. Read its preview.
8. See the creator and model used.
9. Optionally rate after signing in.
10. Open the creator's project or original source post.
11. Return and continue exploring.

Every V1 feature should strengthen this loop.

---

## 11. WORLD ALPHA gate

Backend/community expansion should not outrun the world. Before declaring WORLD ALPHA:

- spawn view matches the selected Demo District direction
- movement feels deliberately tuned
- desktop and mobile navigation work
- hero landmark exists
- pavilion kit exists
- landscaping exists
- water exists
- golden-hour lighting exists
- at least six interactive placeholder storefronts exist
- preview overlay works
- search can jump/focus a storefront
- no external project is loaded at world entry
- performance is measured
- baseline optimization is complete
- quality presets exist
- we would willingly show a public screen recording of the world

If this gate fails, fix the world before expanding community plumbing.

---

## 12. V1 release criteria

### World
- polished plaza and landmark
- first-person desktop navigation
- touch navigation
- search/direct navigation
- map
- project storefronts
- adaptive quality
- polished loading/error states

### Discovery
- persisted project metadata
- creator/model/category information
- featured/new/top-rated surfaces
- external project/source links

### Community
- public browsing
- sign-in for protected actions
- one rating per user/project
- submissions
- creator claims
- moderation
- basic abuse controls

### Storage
- D1 for structured records
- R2 only for permissioned hosted media/files
- no unnecessary duplication of creator-hosted projects

### Operations
- admin moderation
- unavailable-link handling
- analytics
- attribution/claim/remove workflow
- security/privacy audit
- cross-device QA
- Sites saved-version/release workflow

---

## 13. Chat-based execution protocol

Because most implementation is expected to happen from chat rather than long autonomous sessions:

### Before editing
- inspect current repository state
- read this plan and current slice status
- inspect only files relevant to the active slice
- do not opportunistically refactor unrelated areas

### During editing
- stay inside the named slice
- prefer a few cohesive changes over broad rewrites
- preserve the portability of the Three.js world
- do not replace working architecture without a slice-specific reason
- add tests/checks proportional to the change

### After editing
- run the smallest meaningful build/test set
- fix failures caused by the slice
- update plan status
- checkpoint/commit when appropriate
- report only: completed slice, result, checks, next slice

### If blocked
Record:
- blocker
- evidence
- smallest next action

Do not broaden the task to compensate for a blocker.

---

## 14. Branch strategy

Recommended starting branch model:

~~~text
main
└─ build/demo-district-v1
~~~

Because this is intended to be built mostly through chat, one long-lived V1 branch with clean per-slice commits is simpler than dozens of branches.

Suggested commits:

~~~text
slice-01: establish Sites-compatible project scaffold
slice-02: add Three.js world engine shell
slice-03: add desktop first-person movement
...
~~~

Do not merge to main or deploy publicly until explicitly requested.

If parallel agents begin changing overlapping files later, move to per-slice/per-feature branches.

---

## 15. Directional data model

Slice 23 owns the final schema. Directionally:

~~~text
users
- id
- auth_subject
- display_name
- created_at
- updated_at

creators
- id
- slug
- display_name
- handle
- profile_url
- avatar_asset_id?
- claimed_by_user_id?
- claim_status
- created_at
- updated_at

projects
- id
- slug
- title
- description
- creator_id
- project_url
- source_post_url
- project_type
- model_family
- model_version
- category
- status
- featured
- district_slot
- poster_asset_id?
- published_at
- created_at
- updated_at

ratings
- id
- project_id
- user_id
- score
- created_at
- updated_at
UNIQUE(project_id, user_id)

submissions
- id
- submitted_by_user_id
- proposed_creator_name
- proposed_creator_handle
- title
- description
- project_url
- source_post_url
- model_family
- model_version
- category
- permission_attestation
- status
- moderation_notes
- created_at
- updated_at

creator_claims
- id
- creator_id
- user_id
- verification_method
- evidence
- status
- created_at
- resolved_at

assets
- id
- r2_key
- mime_type
- bytes
- purpose
- permission_basis
- uploaded_by_user_id
- created_at
~~~

Do not store aggregate ratings as the only source of truth. Aggregates can be cached/materialized later if necessary.

---

## 16. Interaction design rules

### Walking
- no sprint requirement
- no jump requirement
- no maze-like navigation
- primary destinations visible from main circulation
- movement speed optimized for a web visit, not realism

### Project selection
- proximity/focus should reveal a subtle prompt
- selection opens a Demo District preview before external navigation
- leaving the site is deliberate

### Search
- always available
- match project, creator, model, and category
- jump/focus behavior should orient rather than disorient

### UI
- minimal at spawn
- hide complexity until requested
- avoid persistent giant cards over the world
- do not turn the 3D view into a dashboard

### Mobile
- assume thumbs and limited viewport
- treat search as especially important
- use lighter graphics automatically when warranted

---

## 17. Art-direction guardrails

Use the approved mockup as a composition/mood reference, not as a literal asset sheet.

### Preserve
- strong central axis
- premium contemporary architecture
- warm sunset/golden-hour identity
- water framing
- sculptural landmark
- high-end landscaping
- calm hierarchy
- open pedestrian space

### Avoid
- cyberpunk overload
- giant floating UI
- generic metaverse avatars
- cartoon theme-park styling
- realistic vehicle traffic
- excessive model-provider logos
- noisy advertising
- dense skyscraper spawn
- hyper-reflective materials everywhere
- dark environments where signage becomes the only readable element

Demo District should feel like a **beautiful public exhibition district**, not a game lobby or shopping mall.

---

## 18. Asset and creator-content policy

Until real creator content arrives:

- use original/procedural architecture
- use licensed/generated environment assets with clear rights
- maintain an asset source/license manifest
- do not assume public creator thumbnails/videos may simply be copied
- prefer creator-submitted media, supported source-post embeds, or explicitly permitted media
- always preserve creator attribution and source links
- external projects remain creator-hosted by default

---

## 19. Testing strategy

Do not overbuild test infrastructure before functionality exists.

### World
Prefer:
- deterministic unit tests for movement/collision math
- DOM/UI tests for overlays/search
- visual screenshot/manual gates for art direction
- browser smoke tests when practical

### Data/community
Test:
- migrations
- validation
- rating uniqueness
- submission transitions
- admin authorization
- URL validation
- creator-claim ownership logic

### Release
Always run:
- typecheck
- build
- focused tests
- desktop smoke flow
- mobile smoke flow
- Sites preview before public deployment

---

## 20. Major risks and mitigation

### Sites runtime incompatibility
**Mitigation:** verify starter + Three.js in Slice 1 and keep the world portable.

### World looks like a cheap template
**Mitigation:** world-first gate plus dedicated architecture, lighting, landscape, water, interior, signage, and audit slices.

### Mobile performance
**Mitigation:** establish touch support early, instrument before optimizing, add quality tiers.

### Users dislike walking
**Mitigation:** search/map/jump navigation are core features, not later conveniences.

### External links disappear
**Mitigation:** availability status plus moderation controls.

### Rating brigading
**Mitigation:** authenticated one-user/one-project rating, server-side enforcement, and basic request abuse controls.

### Creators object to inclusion
**Mitigation:** attribution, original source, claim/edit/remove paths, and permission-first hosting.

### Scope growth
**Mitigation:** explicit non-V1 list and a hard WORLD ALPHA gate.

---

## 21. Milestones

### Milestone 1 — Engine boots
After Slice 4:
- Three.js runs
- desktop navigation works
- mobile navigation works

### Milestone 2 — District recognizable
After Slice 15:
- plaza
- landmark
- pavilion kit
- landscape
- water
- lighting
- signage
- world interaction
- preview UI

### Milestone 3 — WORLD ALPHA
After Slice 22:
- world visual audit passed
- measured/optimized
- adaptive quality
- search/map/loading complete

### Milestone 4 — Real directory
After Slice 27:
- persisted records drive storefronts
- real external project/source links work

### Milestone 5 — Community layer
After Slice 35:
- auth
- ratings
- submissions
- hosted media
- moderation

### Milestone 6 — Creator layer
After Slice 37:
- creator claims
- creator profiles/properties

### Milestone 7 — Release candidate
After Slice 48:
- accessibility
- security
- QA
- performance
- seed content
- launch checklist

---

## 22. First build session

After repository initialization, execute **only Slice 1**.

The implementation agent should receive:
- the repository
- this implementation plan
- the selected plaza mockup
- instruction to work on build/demo-district-v1
- instruction not to deploy or merge
- instruction to stop after Slice 1
- requirement to update this implementation plan
- requirement to report build/typecheck/test results

Do not combine Slice 1 with world construction. The repository and Sites deployment shape should be boring and correct before visual work begins.

---

## 23. Final scope statement

> **Demo District is a premium walkable Three.js district that acts as a community exhibition space for AI-created projects, with creator attribution, model metadata, ratings, submissions, and deliberate links out to the original experiences.**

The project succeeds only if the world itself is worth entering. That is why the plan deliberately invests the first 22 slices in environment, navigation, interaction, visual identity, and performance before completing the community platform underneath it.