# Local development and hosting

## Cloudflare Pages setup — September 26, 2026

The owner requested a public, username-free Cloudflare Pages deployment from
`ColumbusLabs/demo-district`, production branch `build/demo-district-v1`.
Use the Pages GitHub integration (not Workers or Direct Upload), project name
`demo-district` or, if unavailable, `demo-district-columbuslabs`.
Build from the repository root with `npm run build`, output `dist`, and
`NODE_VERSION=26`. No Functions, D1, R2, paid plan, domain purchase, or secrets are
needed. Keep automatic production branch deployments enabled.

Before publication, Site version 14 source
`e9bae46fee8cd8b1ed75979a45f1fd24abe50e81` was fetched and compared with GitHub
`e861c4a`. The complete source difference is the arrival-loading update, its local
artwork, tests and documentation. It was applied on top of the GitHub branch,
preserving the newer walkways, bridges and storefront link behavior.
While checks ran, GitHub received the same complete source as `52e8bb1`; its tree
was verified identical to Site version 14 and adopted as the deployment baseline.
The existing owner-private ChatGPT Site and `.openai/hosting.json` remain intact.

Publication and live verification are pending GitHub browser sign-in/setup.
See [Pages checkpoint](CLOUDFLARE_PAGES.md) for the latest evidence.

## Current publication — September 26, 2026

Demo District is published at `https://demo-district.zspringhorn.chatgpt.site` with owner-private access. The owner explicitly authorized publishing the loading-screen update to the existing site. Keep its project ID and audience unchanged; the older username-free-domain restriction below records the initial deployment discussion and is superseded for this requested existing-site update.

Use the Sites opening/publishing workflow with `.openai/hosting.json`, preserve `build/demo-district-v1`, and publish the exact validated source/archive. This static Vite app needs no D1/R2 or runtime secret changes. See [arrival checkpoint](ARRIVAL_LOADING.md) for this update and its QA limitations.

For the managed preview use `sites-preview start` from the checkout. A running preview can still be unreachable from the cloud browser; this session reported `ERR_BLOCKED_BY_CLIENT`. That is not evidence of a broken deployed app. For a portable local development environment, the commands below remain applicable.


## Historical initial boundary (September 25)

This repository is a portable static Vite + TypeScript + Three.js engine/navigation
preview. A private GPT Sites project and saved source version now exist, but the
hosted runtime has not been deployed or inspected. There is no live URL, database,
storage bucket, or sign-in integration.

**Native Site record (2026-09-25):** project `appgprj_6ab6a5af37448191aabfb8e68c409ac3`
(`Demo District`, slug `demo-district`); saved version 1 is
`appgprj_6ab6a5af37448191aabfb8e68c409ac3~appgver_1b998178b3a88191bc3a98b69cb40e11`,
from Site source commit `36aa59f14323b205717944ec2d02fd1d953a6aee`. The supported
static archive was accepted with `dist/` as its output directory. This save does
not prove the hosted page renders correctly.

The account's built-in GPT Sites hostname includes its username. The owner requires
a username-free public URL, so do not deploy to that hostname. Recommend a custom
subdomain such as `demo-district.<owned-domain>`; an owner-controlled domain and
DNS validation are needed before the public URL can meet that requirement. The
current Site has no live URL.

## Local setup

```sh
nvm install
nvm use
npm ci
npm run dev
```

Open `http://127.0.0.1:5173`. The preview is the Demo District plaza (world passes 1–3)
with keyboard, mouse, and touch walking/look controls. The static build ships local world
assets under `world/` (about 3.5 MB, CC0, see `public/world/LICENSES.md`) and requests
nothing remote. Choose Explore or click the
canvas, use WASD to walk, drag or use arrow keys to look, Escape to release focus,
and Tab to reach page controls. Reset view and three walking speeds are available.
On a phone, drag the scene to look and use the stick to walk; the `--host` option below lets a phone on your network try it. See `WORLD_ENGINE.md` and `NAVIGATION.md`.
No secrets are required; `.env.example` documents that boundary.

For another device on a trusted local network, explicitly opt in with
`npm run dev -- --host 0.0.0.0`; otherwise servers bind to loopback only. Do not
expose the development server publicly.

## Checks and production-artifact preview

```sh
node scripts/check-ci-policy.mjs
npm run verify
npx --no-install playwright install chromium
npm run test:browser
npm run test:lifecycle
npm run preview
```

`verify` runs repository/runtime/movement/cost-policy tests, strict TypeScript,
production build, and static-output checks. Production browser tests build and
start their own server on 4173. Lifecycle/navigation tests start Vite on 5173;
both ports must be free. The lifecycle suite restores its source edit after actual
HMR testing. On Linux CI use `npx --no-install playwright install --with-deps chromium`.

`preview` serves `dist/` at `http://127.0.0.1:4173`. It is a local inspection tool,
not a production server: https://vite.dev/guide/static-deploy.html

## GitHub Actions cost boundary

Read [CI_COST_POLICY.md](CI_COST_POLICY.md) before modifying workflows. Only standard
Ubuntu in an explicitly public repository is allowed. The job-level condition
skips non-public/unknown visibility before runner allocation. No larger/custom/
self-hosted runners, paid external services, cache uploads, artifact uploads, or
package publishing are configured. Test evidence stays in logs/job summaries.
The policy is checked before pushing and again in CI; it is not an account-wide
billing lock and cannot prevent an administrator from replacing it later.

## Why this shape

The current client needs a canvas and TypeScript, not SSR, a UI framework,
a database, or a Workers adapter. Vite's vanilla TypeScript/static build keeps the
host adapter replaceable: https://vite.dev/guide/

`.openai/hosting.json` binds the real Site project and static output directory
`dist/`, with D1 and R2 unconfigured. No secrets or runtime bindings are required.

## Native Sites gate — runtime validation still required

The private version above confirms that Sites accepted the source commit and static
archive. It has not been deployed, so the following runtime checks remain pending:

1. Resolve a username-free URL using an owner-controlled domain.
2. Publish only the reviewed saved version through GPT Sites and inspect the hosted
   page on desktop and phone-sized viewports.
3. Verify entry HTML/assets, Three.js startup, navigation, no-WebGL fallback, and
   browser console against the deployed Site.

The source branch remains `build/demo-district-v1`. Do not merge it. A deployment
URL is production, even when access is private; never present one as a preview.

## Official references for the eventual host check

- https://learn.chatgpt.com/docs/sites
- https://help.openai.com/en/articles/20001339

Recheck supported behavior in the actual Sites session; these references do not
validate this repository or provision hosting.

## Evidence levels and release safety

Repository checks validate files and contracts. Build/Chromium tests validate the
portable web client. Native Sites acceptance is a separate gate. Physical devices,
Safari, and production world performance remain later QA work.

There is no deploy command, auto-publishing workflow, Pages setup, or hosting token.
When publication proceeds, preserve the prior version for rollback; do not reset Git
history or delete data to roll back a visual build. Public deployment was requested
on 2026-09-25, conditioned on a username-free URL choice.
