# Demo District

A walkable 3D community showcase for things people build with AI models.

Demo District turns discovery into a place: a pedestrian exhibition district with creator storefronts, project previews, model attribution, and deliberate links to the original experiences. Creator projects remain externally hosted by default; entering the district never preloads everyone's demos. Media or builds are hosted only with explicit permission.

## Current build

**Slice 3: desktop movement implemented and verified.** See [verification evidence](docs/SLICE_03.md): 39 unit/policy tests, 20 production-browser cases, and 40 lifecycle/navigation cases passed, along with clean installation, typechecking, build, and runtime audit.

The current preview is a test cube and neutral floor with WASD walking, drag/arrow-key looking, adjustable speed, and reset. It is not yet the selected plaza, touch-navigation experience, or live project directory. Native ChatGPT Sites acceptance remains pending. Nothing has been merged or deployed.

## Try the preview locally

Use Node 22 (at least 22.12) and the committed npm lockfile. No credentials are required.

```sh
nvm install
nvm use
npm ci
npm run dev
```

Development runs at `http://127.0.0.1:5173`. Choose **Explore** or click the scene, then use WASD to walk. Drag to look, or use arrow keys. Escape releases focus and Tab moves through the page controls. Reset view returns to the spawn. No pointer lock, head bob, jumping, or automatic camera movement is required.

```sh
node scripts/check-ci-policy.mjs
npm run verify
npx --no-install playwright install chromium
npm run test:browser
npm run test:lifecycle
npm run preview
```

Production preview uses `http://127.0.0.1:4173`. Browser tests start their own servers; ports 4173 and 5173 must be free. Lifecycle tests run serially and restore the source edit used to exercise actual hot reload.

[Deployment/Sites handoff](docs/DEPLOYMENT.md) · [Agent contract](AGENTS.md) · [Desktop navigation](docs/DESKTOP_NAVIGATION.md) · [World engine](docs/WORLD_ENGINE.md)

## No paid GitHub Actions

CI uses only the standard `ubuntu-latest` runner and a job-level public-repository condition. It skips non-public repositories rather than consuming a paid private-repository allowance. Caches and artifact uploads are disabled; results stay in logs/job summaries. A dependency-free policy check rejects unapproved runners, extra jobs, paid services, and storage-related workflow changes. Run it before any workflow push.

This is a repository configuration/agent rule, not an account-wide billing lock. See [the cost policy and its boundaries](docs/CI_COST_POLICY.md).

## The destination

The approved visual direction is a contemporary light-stone plaza with a strong central boulevard, landscaped pavilions, shallow water channels, warm golden-hour lighting, and a sculptural arch/orb landmark. The world must be attractive and usable before the full community platform is added.

Walking is optional. Search, a map, and direct navigation will provide faster ways to find projects. Listings will show the creator, source X post, model/version, description, permitted media, ratings, and a deliberate external launch action. Creators should have accessible claim, edit, and removal paths.

## Roadmap and implementation

[The detailed implementation plan](docs/IMPLEMENTATION_PLAN.md) contains 48 bounded slices. Recent execution evidence is in [Slice 1](docs/SLICE_01.md), [Slice 2](docs/SLICE_02.md), and [Slice 3](docs/SLICE_03.md). Next: **Slice 4 — Mobile/touch navigation baseline (5.6 Sol).**

The build proceeds through engine/navigation, district construction, World Alpha, persisted project discovery, ratings/authentication, submissions/moderation, creator claims, and release checks. Work stays on `build/demo-district-v1`. Each requested slice ends at its defined boundary with checks and a checkpoint; merge and deployment require separate approval.

Current stack: portable TypeScript, direct Three.js, and Vite. ChatGPT Sites is the intended host, subject to native validation. Planned later storage/authentication choices must be validated against the eventual host before provisioning anything. No D1/R2/authentication or real creator records are active now.

V1 deliberately excludes multiplayer avatars, vehicles, voice chat, complex physics, fully modeled interiors for every property, a building editor, free-form comments, arbitrary project embeds, large-scale X scraping, infinite-city generation, and crypto/property ownership.

Demo District is an independent community exhibition project. Its goal is to help people discover what others are making, while sending attention and credit back to the original creators.
