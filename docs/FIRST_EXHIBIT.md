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

The owner reported that the popup-based Open button still did nothing in the deployed iPhone host. The original short URL was checked on 2026-09-26: it returns HTTP 301 to `https://sael.net/plane-of-focus/`, which returns HTTP 200 and the expected lens demo. The listing now uses that canonical address.

The primary action is a native anchor with `target="_top"` and no click interception, `window.open`, or scripted fallback. This lets the user's tap navigate the browser context directly in hosts that allow user-activated top navigation. Browser restrictions cannot be overridden by application code. The panel therefore also exposes a read-only, selectable URL and Copy link; if clipboard access fails, it selects the address and provides manual-copy instructions.

The production browser session reached the owner's sign-in gate; managed preview returned `ERR_BLOCKED_BY_CLIENT`. The exact iPhone host failure is therefore unconfirmed. The revised browser test follows an actual native navigation to an intercepted test destination rather than merely asserting a stubbed `window.open` call. It has not been run in this environment; iPhone end-to-end confirmation is still required.

## Evidence

- `npm run verify`: unit tests (showcase and search rewritten for buildings), TypeScript, production build, static artifact checks.
- Browser and lifecycle suites updated for buildings (Music replaces the old Tidepool Synth sample in interaction and quality tests; the HUD test checks native navigation to an intercepted destination).
- Desktop app browser pane, this Mac's GPU: Learning window from the boulevard, the demo card, the pager with a second in-memory demo (not committed), Open calling `window.open` with the current demo, and the empty Music card.
- Not checked: the deployed Site, Safari, physical phone.
