# Side planting repair — September 25, 2026

Replaced the low vegetation shown in the owner's phone screenshot. Large transparent leaf cards made disconnected, ragged silhouettes and protruded from the planters.

- Dense opaque hemisphere crowns with 24 small folded geometric leaves replace the leaf-card shrubs throughout the district.
- One compact shrub per small planter and one low collar per tree planter replaces randomly overlapping clusters. Crowns fit within the planter openings.
- Removed the crossed-plane grass tufts from the beds. Trees and their Blender assets remain unchanged.
- Uses the existing local hedge texture with vertex shading, no downloads or new dependencies. Static instancing and resource ownership are preserved.
- The statue remains free of shrubs.

71 unit tests, TypeScript, production build, and static artifact checks pass. Browser preview remains blocked by the environment, so no final visual or physical-device verification is claimed.

Static geometry accounting (entire district, before visibility culling): 46 shrub instances × 228 triangles = 10,488 low-plant triangles, versus 3,480 previously including grass. One instanced draw replaces two. This is a geometry count, not a GPU timing measurement; the scene should be remeasured on a real GPU.

## Tree planter simplification

At the owner’s request, removed all 10 tree-base shrub collars. Trunks now enter the existing flat dark soil directly. Standalone shrubs remain. Other seeded placements are preserved. This removes 2,280 triangles; low planting now has 36 instances and 8,208 triangles. TypeScript, production build, and static artifact validation passed; visual confirmation remains unavailable in this environment.
