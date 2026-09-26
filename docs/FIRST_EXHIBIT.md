# First real exhibit — The Plane of Focus (2026-09-26)

The owner opened real project records and chose this as the first listing.

## Record

| Field | Value | Source |
| --- | --- | --- |
| Title | The Plane of Focus | Page heading at the project URL (redirects to `sael.net/plane-of-focus/`) |
| Creator | @RyanSael (handle only, by owner direction) | X post |
| Model | Claude Opus 5.5 | X post |
| Build | 1 h 26 min, one shot, $25.66 API, as reported by the creator | X post |
| Project URL | https://lens.lab.sael.net/ (the URL the creator shared) | X post; owner confirmed live |
| Source post | https://x.com/RyanSael/status/2102591147927654847 | Linked from runtimewire.com coverage; X itself was not fetchable without sign-in |
| Slot / category | `east-gate` / Learning | Chosen for visibility from spawn; categories no longer own slots |

## Presentation precedent

- **Slot by visibility, not category.** The first real exhibit takes the east gate, the first storefront visible from spawn. The displaced Worlds sample (Lantern Coast) moved to `east-plaza`, replacing the Learning sample (Orbit Primer).
- **Own art in the window.** An original analytic lens-bench installation (`EXHIBIT_KIND 8`, "Lens"): a tree on a stand, three glass elements in brass barrel rings, light rays converging on a glowing plane of focus, and a dark gridded wall. No creator media is used. Listings may set `exhibit`; otherwise the category's installation is used.
- **"Now showing" plaque.** A real listing at a gate pavilion turns the gate's word slab into NOW SHOWING / title / handle.
- **Preview card.** "Now showing" badge instead of "Sample listing", model, build provenance row labelled "as reported by the creator", and a note naming the destination host before the visitor opens it in a new tab (`noopener noreferrer`). Nothing is embedded or preloaded.

## Evidence

- `npm run verify`: 74 unit tests (new `tests/unit/showcase.test.mjs`), TypeScript, production build, static artifact checks: passed.
- `npm run test:browser`: 29 passed, 6 skipped (per-project skips). The HUD spec now searches "focus" and checks handle, build line, host note, and link targets.
- `npm run test:lifecycle`: 53 passed, 9 skipped.
- Visual check in the desktop app's browser pane on this Mac's GPU (high tier): lens installation up close, the east gate with plaque from the boulevard, and the preview card. Not checked: Safari, physical phone, or the hosted Site.
