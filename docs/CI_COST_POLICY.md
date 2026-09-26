# GitHub Actions — no paid execution

The user's constraint is to never run paid Actions for Demo District.

## Approved configuration

- One verification job with literal `runs-on: ubuntu-latest` (standard GitHub-hosted Ubuntu).
- Job-level condition requires both `github.event.repository.visibility == 'public'` and `github.event.repository.private == false`. Missing/unknown visibility fails closed. The condition is evaluated by GitHub before routing the job to a runner.
- No larger/GPU/custom/self-hosted runners, runner groups, dynamic selectors, matrix, service containers, reusable workflows, scheduled runs, or paid external execution.
- Read-only token; checkout does not persist credentials.
- setup-node automatic package-manager caching is explicitly false; no explicit caches.
- No upload-artifact, GitHub Packages publishing, image snapshots, or remote evidence storage. Playwright generates temporary files only on the ephemeral runner. Test counts remain in logs and job summaries.
- Concurrency cancels superseded checks; timeout is 15 minutes. Browser suites must fit: under software rendering every district load costs about 10 s, so the phone project runs only phone- and touch-specific specs (see the Playwright configs). Since 2026-09-26 keyboard/mouse navigation, pointer hover, and the modality-agnostic scaffold checks run on desktop only, and app re-entry runs three cycles; the run that prompted this was cancelled at 15 min 12 s with about a minute of phone checks left. Raising the timeout is a policy change that needs the owner's approval.

The workflow is authored in JSON syntax, a YAML subset, to allow a dependency-free fail-closed policy validator. Do not convert it to arbitrary YAML without preserving equivalent validation. `node scripts/check-ci-policy.mjs` checks the complete workflow inventory, job condition, fixed runner, pinned allowed actions, disabled caching, read-only permissions, and approved commands. Negative tests cover common paid-runner/storage regressions. Run this validator before pushing, not only after CI starts.

## Boundaries

This is not an account-wide billing switch. A repository administrator could replace/bypass the workflow and validator; other branches and repositories have their own configuration. Repository-side tests cannot stop an unauthorized parallel job that someone has already added to a workflow. No account budget, payment method, or organization policy was changed. Recheck official pricing before changing the approved runner policy. Existing artifacts from earlier slices are not uploaded again; their existing retention/expiry is unchanged.

## Primary sources checked September 24, 2026

- Standard hosted Actions for public repositories are free; larger runners are billable; artifact/cache storage has separate rules. Logs and job summaries do not count toward artifact storage: https://docs.github.com/en/billing/concepts/product-billing/github-actions
- Job-level conditions are processed before routing the job to a runner: https://docs.github.com/en/actions/reference/workflows-and-actions/contexts
- Disable setup-node automatic cache behavior: https://github.com/actions/setup-node#caching-global-packages-data

No claim is made about past account charges or unrelated repositories.
