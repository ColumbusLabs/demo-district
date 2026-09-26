# Pond enclosure and direct statue contacts

Source baseline: Site source `aee75ad80d9b410b42e4cd10fcb567922267aa47`.
Branch: `build/demo-district-v1`. Requested September 25, 2026.

## Changes

- Replaced the disconnected basin rim and outward-facing inner cylinder with a continuous lathed wall profile. Its inner faces point into the pond.
- Matched the coping, wall, water, and basin floor to 128 angular segments, eliminating mismatched shoreline slivers.
- Made the basin water opaque and depth-writing; its existing ripple, reflection, and warm edge glow remain. Channels and lake are unchanged.
- Removed the four statue footing drums, their soil islands, and all statue shrub instances and their runtime model request. The reusable shrub asset and Blender generator remain available.
- Placed the sculpture at paving level instead of 0.55 m above it. The existing Blender model extends 0.4 m below its origin, so the main legs enter the water and the wings enter the paving with no exposed base. The procedural loading fallback uses the same placement.
- Restored collision to the sculpture's foot footprints instead of the removed planting islands. No Blender rebuild is needed because both problems are in scene assembly.

## Verification

- `npm run verify`: 70/70 unit tests, TypeScript, production build, static artifact checks passed on Node 24.19.0.
- Geometry probe against the actual assembled scene: 256 rays hit the inward-facing wall; 256 downward rays around the shoreline hit water or coping without gaps. Basin material confirmed opaque with depth writes.
- Updated the asset browser check for 16 requested world assets and no shrub-model request; updated the footing collision test.
- Visual preview unavailable: the managed preview starts, but the cloud browser reports `ERR_BLOCKED_BY_CLIENT` for its required internal URL. No claim of visual, real-GPU, or iPhone verification.
- Browser installation also returns an invalid/truncated Chromium archive; browser/lifecycle suites remain unverified in this environment.

No merge or deployment performed. The repository's AGENTS.md requires explicit publication authorization.

## Follow-up — faster exploration and recognizable water

The owner approved pushing and private publication, then requested at least double walking speed and a clearer fountain pool. Presets are now 4 / 6.4 / 10 m/s (all doubled); the default, menu, controller validation, and touch expectations agree. A maximum-frame-time collision regression checks that 10 m/s movement stops outside the pond.

The pool now has a blue-green body, brighter sky reflections, broader surface ripples, and outward waves from the fountain impact ring. Warm edge spill is narrower and dimmer so it does not color the whole pool brown. The opaque depth-writing surface is retained to prevent the earlier see-through defect. The shader adds no meshes, render passes, textures, or per-frame JavaScript work. Low quality and reduced-motion behavior remain unchanged.

Validation: 71 unit tests, TypeScript, production build, and static artifact checks passed. Browser/iPhone visual verification is still unavailable in this environment, as described above.
