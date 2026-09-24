# Demo District

Demo District is a walkable 3D community showcase for the best things people build with new AI models.

Instead of presenting projects as another grid of links, Demo District turns discovery into a place. Visitors enter a polished Three.js district, walk past creator storefronts and exhibits, search by creator/model/category, inspect project previews, rate what they find, and deliberately open the original creator-hosted experience.

The district is the product surface.

## Vision

When a new model launches, creators quickly post games, 3D worlds, interactive experiments, buildings, prototypes, simulations, and other demos across X and the web. Those projects are impressive, but they are scattered across timelines and disappear quickly.

Demo District is intended to give them a persistent, explorable home.

A project in Demo District can include:

- project title and description
- creator name and profile
- original source/X post
- model and model version used
- category
- preview media
- community rating
- an intentional link to the original experience

Creator projects remain externally hosted by default. Demo District does **not** preload every linked project when a visitor enters the world.

If a creator explicitly provides media or a demo for Demo District to host, that is handled as a separate permissioned submission.

## The world

The first Demo District environment is being designed as a premium pedestrian exhibition district rather than a generic metaverse lobby.

The visual direction includes:

- a strong central pedestrian boulevard
- contemporary light-stone pavilions and storefronts
- landscaped planters, trees, benches, and path lighting
- shallow linear water features
- a large sculptural arch/orb landmark
- warm golden-hour lighting
- subtle project signage
- lightweight implied interiors
- minimal UI layered over the 3D environment

The target is a visually memorable environment that is still realistic to build and run well in Three.js on the web.

## Core principles

### World first

The 3D district comes before the full community backend. If the world itself is not worth entering, the rest of the product does not matter.

### Walking is optional

Exploration should be enjoyable, not friction. Search, direct navigation, and a district map will let users quickly reach projects without walking the entire world.

### Link out by default

Projects normally remain on the creator's own site. Demo District stores lightweight metadata and links rather than loading every external experience into the district.

### Creator-friendly by design

Listings should preserve attribution and the original source. Creators should have clear claim, edit, and removal paths. Hosted creator media or demos require permission.

### Mobile matters

The same district should work across desktop and mobile, with adaptive rendering quality and touch-friendly navigation.

### Portable Three.js architecture

ChatGPT Sites is the initial hosting target, but the Three.js world should remain portable rather than being tightly coupled to a single hosting environment.

## Planned technology

The exact application scaffold will be verified against the current ChatGPT Sites runtime before implementation begins.

Current direction:

- **Three.js** — 3D world and interaction
- **TypeScript** — application/world code
- **ChatGPT Sites** — initial hosting target
- **D1** — structured project/community data
- **R2** — permissioned uploaded images, video, and files
- **Sites-supported authentication** — protected community actions such as ratings and creator claims

The project intentionally avoids a heavyweight physics system for V1 unless later requirements prove one is necessary.

## Build strategy

Demo District is being built in small, checkpointed slices so that most implementation can be managed directly through ChatGPT rather than relying on long autonomous coding sessions.

Every slice should:

1. stay inside its defined scope,
2. make a small cohesive set of changes,
3. run the smallest meaningful build/test checks,
4. update the implementation plan,
5. checkpoint the work,
6. avoid merging or deploying unless explicitly requested.

The first major gate is **WORLD ALPHA**.

Backend/community work should not outrun the visual and interaction quality of the district.

## Roadmap

The current plan contains 48 implementation slices across these major stages:

1. repository and Three.js foundation
2. Demo District world construction
3. navigation, interaction, performance, and WORLD ALPHA
4. real project data and external linking
5. ratings and authentication
6. creator/community submissions and moderation
7. creator claims and profiles
8. discovery and analytics
9. accessibility, security, QA, performance, and release

The detailed implementation plan is here:

**[docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md)**

## V1 visitor flow

A successful first-version visit should look like this:

1. Enter Demo District.
2. Spawn facing the main landmark.
3. Walk, search, or use the map.
4. Discover a creator/project storefront.
5. Open its Demo District preview.
6. See the creator, model used, project description, source, and rating.
7. Optionally rate the project after signing in.
8. Open the original creator-hosted project or source post.
9. Return to the district and continue exploring.

## What V1 is not

Demo District V1 is intentionally not trying to become everything at once.

Out of scope for the initial build:

- multiplayer avatars
- voice chat
- vehicles
- complex physics
- platforming
- fully modeled interiors for every property
- real-time crowds
- user-created building editors
- arbitrary third-party site embedding
- free-form public comments
- automatic large-scale X scraping
- procedural infinite cities
- crypto/NFT/property ownership

These can be reconsidered only after the core discovery experience proves itself.

## Current status

**Status:** Planning complete; implementation has not started.

The detailed implementation plan is the first committed project document.

The next implementation task is:

**Slice 1 — Repository contract and Sites-compatible scaffold**

Model assignment: **GPT-6 Astra Pro**

No production deployment should occur until explicitly approved.

---

Demo District is intended to be a community place for discovering what people are actually making with the newest AI models — not just reading benchmark numbers or watching model announcements.
