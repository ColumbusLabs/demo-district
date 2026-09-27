# Arrival loading experience — September 26, 2026

Owner requested implementation and publication of the proposed animated welcome.
Branch: `build/demo-district-v1`. Starting Site source: `4f61c62e45d99c9e7a6865f10a4a568bf91765d8`.

## Delivered

- Original transparent architectural diorama, locally served in 720px and 1440px WebP sizes. Generated artwork rather than a second 3D renderer; no Blender dependency added. Provenance: `public/loading/LICENSES.md`.
- Deep blue evening backdrop, warm stone/amber highlights, prominent Demo District and Columbus Labs identity, and “Big ideas. Just around the corner.” copy.
- Soft upward scene reveal, progressive illumination, a glowing route across the artwork tied to actual asset progress, and a gently pulsing progress endpoint.
- Asset loading accounts for 96%; the actual engine-ready callback completes the last 4%. Progress cannot regress, and a four-second minimum display keeps the entrance visible (owner follow-up). Loading runs concurrently; slower loads reveal as soon as ready.
- Brief scale/fade handoff into the real world, automatic touch/desktop hint, occasional discovery tips, and input gating until ready.
- Responsive stacked phone composition, smaller image delivery, compact short-screen layout, and scrolling available if text enlargement needs it.
- Reduced motion removes all decorative animation and scaling; the overlay fades in 150ms. Hidden tabs pause decoration. Completion/teardown cancel timers and the dismissed overlay is removed from layout.
- Graphics failures keep the existing recovery explanation visible while quieting the welcome artwork.
- A DEV-only `?arrival-preview=.67` allows reviewing the loader without waiting for world assets. Production artifact checks reject leakage of this switch.

The diorama is illustrative, not an exact map. Architecture rises as one composed illustration; no live mini-world, simulated inhabitants, or extra WebGL scene is loaded.

## Evidence

- Locked dependency installation completed on supported Node 24.19.0.
- 81 unit/repository tests passed, including 4 new behavioral checks covering monotonic loading, readiness, hidden tabs, stale dismissal on remount, reduced motion, and failure presentation.
- An initial strict typecheck, production build and static artifact check passed. The final publishing workflow reruns the build and artifact checks after the final source changes.
- Image alpha inspected, source 1536 × 1024; web assets 98,462 and 341,324 bytes. All assets stay local.
- Browser visual QA could not run: supervised preview reported running, but the cloud browser rejected its supported address with `ERR_BLOCKED_BY_CLIENT` on initial access and one root-address check. No alternate browser/network path was used. Desktop/mobile visual inspection, existing browser/lifecycle suites, physical iPhone/Safari and real-GPU inspection were not run in this session.
- Publication is authorized by the owner. Preserve the existing owner-private audience and record the successful native deployment in the handoff.

Future platform slices remain unchanged. No merge or CI workflow change.

## Four-second display follow-up

The owner requested a minimum four-second welcome after finding the initial load too quick to see. The overlay now waits for both actual readiness and a 4,000ms timer. It can show 100% and the welcome copy while holding. HUD and world input stay inert until reveal; teardown cancels the hold timer. Reduced motion preserves the hold and shortens only the exit fade.

## Pages preparation follow-up

GitHub `52e8bb1` was verified tree-identical to saved Site version 14. Local checks
on Node 26.8.2 passed: 82 unit tests, build/typecheck/artifact checks, all 24
applicable production-browser cases (including a serial failure rerun), and 41
lifecycle cases. Stale browser copy/readiness assertions were updated. Chrome
visual inspection found a desktop caption/footer overlap; a desktop-only size cap
fixes it while retaining all artwork and timing. Desktop and 390×844 phone loader
views were inspected, plus the real-GPU high-tier district. The final CSS build
and artifact checks passed. See [Pages checkpoint](CLOUDFLARE_PAGES.md) for the
separate publication/authorization status; the ChatGPT Site was not changed.
