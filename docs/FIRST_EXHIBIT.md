# First real exhibit — The Plane of Focus (2026-09-26)

The owner opened real project records and chose this as the first listing.

## Record

| Field | Value | Source |
| --- | --- | --- |
| Title | The Plane of Focus | Page heading at the project URL (redirects to `sael.net/plane-of-focus/`) |
| Creator | @RyanSael (handle only, by owner direction) | X post |
| Model | Claude Opus 5.5 | X post |
| Build | 1 h 26 min, one shot, $25.66 API, as reported by the creator | X post (https://x.com/RyanSael/status/2102591147927654847, located via runtimewire.com coverage) |
| Project URL | https://lens.lab.sael.net/ (the URL the creator shared) | X post; owner confirmed live |
| Building | Learning, at `east-gate` | Chosen for visibility from spawn |

## Building model (revised the same day after owner review)

The first version gave the demo its own storefront installation, a "Now showing" gate plaque, and an "Original post" button. After seeing it deployed the owner asked for:

- **Buildings hold many demos.** Each storefront is a category building (`buildings` in `src/data/showcase.ts`). The preview shows the building's demos one at a time with previous/next buttons and left/right arrow keys, and a "1 of N" count when there is more than one.
- **Windows belong to the category, not a project.** The lens-bench installation and the "Now showing" plaque were removed; the east gate shows the Learning orrery and its original gate words. Worlds moved to `east-plaza`.
- **No source-post button.** The project record no longer carries `sourcePostUrl`.
- **No fake samples.** Empty buildings open to a "Coming soon" card. Search matches buildings by category and demos by title, creator, and model; the map labels buildings with their demo count.

## Open button on the deployed Site

The owner reported that Open and Original post did nothing on the deployed Site. The links were correct locally (`href` set, `target="_blank"`), and nothing in the app blocks anchor clicks, so the likely cause is the host serving the page in a sandboxed frame that silently blocks new tabs. This is not yet confirmed on the Site itself. Open now calls `window.open`; if the browser refuses a new tab it navigates this tab (top frame when allowed) to the demo instead. Modified clicks (middle, Cmd/Ctrl) keep native link behaviour.

## Evidence

- `npm run verify`: unit tests (showcase and search rewritten for buildings), TypeScript, production build, static artifact checks.
- Browser and lifecycle suites updated for buildings (Music replaces the old Tidepool Synth sample in interaction and quality tests; the HUD test stubs `window.open` and checks the launch call).
- Desktop app browser pane, this Mac's GPU: Learning window from the boulevard, the demo card, the pager with a second in-memory demo (not committed), Open calling `window.open` with the current demo, and the empty Music card.
- Not checked: the deployed Site, Safari, physical phone.
