# Expo refactor and Passport release plan

Passport scope update: the [simplified 4.2.0 proposal](2026-09-03-martini-passport.md)
supersedes the broad Passport MVP scope in Phases 4–5 below. Its remaining product
decisions require approval before schema implementation. The release record and
completed reliability work in this document remain historical facts.

Status: proposed implementation and release sequence; no implementation or
deployment authorized by this document alone.

Based on the [application/test audit](../expo-app-audit-2026-09-04.md) and
[Martini Passport proposal](2026-09-03-martini-passport.md).
Baseline: `a56149e`, runtime `4.1.0`, branch `codex/expo-app-audit`.
Scope: Expo application and its backend contracts. Next.js admin remains outside
this refactor; the Passport proposal's admin work is a separate scope.

## Recommendation

Deliver a small reliability OTA for existing 4.1.0 installations, then build
Passport on the stabilized main branch and release it as a new 4.2.0 binary.
Carry the reliability improvements into Passport through normal branch ancestry.
Do not combine the audit's entire cleanup backlog and Passport into one change.

The refactor does not inherently require a native build. Passport as currently
planned also uses existing native capabilities and could technically ship as
JavaScript/assets plus a separate database deployment. A 4.2.0 App Store release
is recommended for a clear feature milestone, integrated TestFlight validation,
and an upgrade path for 4.0.2 users. This is a product/release decision, not an
Expo requirement that every new screen needs a binary.

## Delivery classification

| Work                                                                              | Delivery                       | Constraint                                                                          |
| --------------------------------------------------------------------------------- | ------------------------------ | ----------------------------------------------------------------------------------- |
| Cache generations, sign-out cleanup, retry handling                               | 4.1.0 OTA                      | Keep persisted data readable by the previous update                                 |
| Profile/composer service extraction, typed decoders, removing unused JS methods   | OTA-compatible                 | Preserve behavior and backend contracts; do not bundle large unrelated rewrites     |
| Update-prompt lifecycle and Places request deadlines                              | OTA-compatible                 | Use installed modules and preserve existing permissions                             |
| Test cleanup, CI jobs, generated TypeScript types                                 | Repository changes             | No OTA needed solely for these changes                                              |
| Browser-specific storage fix                                                      | Expo web deployment            | Web verification is separate from native OTA verification                           |
| Passport SQL/RPC additions or a Places gateway                                    | Backend deployment             | Deploy compatibly before dependent clients; an OTA does not deploy SQL or functions |
| Passport screens, assets and celebrations using existing modules                  | Technically OTA-compatible     | Recommended delivery is the 4.2.0 feature release                                   |
| Adding/removing native modules, SDK upgrades, native permissions or configuration | New binary and runtime version | Do not relabel incompatible code as 4.1.0                                           |

Expo pairs JavaScript updates with a compatible native runtime. Here,
`runtimeVersion.policy = appVersion`, so the reliability OTA must keep version
4.1.0. Bump app.config.ts and the package.json mirror to 4.2.0 only on the feature
release path. A 4.1.0 OTA still cannot reach 4.0.2.
Reference: [Expo runtime versions](https://docs.expo.dev/eas-update/runtime-versions/).

## Phase 1 — Targeted reliability fixes

Deliver in small reviewable changes, without first extracting the entire root
layout or replacing the cache architecture.

1. Add invalidation generations to database, profile and signed-image caches.
   Old requests must not write after invalidation; their completion must not
   delete newer pending-request entries. Check all member-sensitive keys for
   viewer scoping.
2. Centralize cache cleanup on actual auth-session transitions. Preserve the
   explicit-sign-out navigation behavior, account-gone handling and visitor
   state. Cleanup must be idempotent and failure-tolerant.
3. Cache confirmed missing images separately from retryable signing errors.
   Preserve signed URL expiration margins and batch signing.
4. Correct update-check failure retry timing, foreground presentation and
   dismissal behavior using existing dependencies. If prompt scheduling expands
   into a large startup rewrite, ship it in a later focused OTA instead.

Acceptance: deferred reads cannot resurrect member caches; A-to-B account
switching does not reuse A's state; transient image failure can recover; auth
callbacks, onboarding, explicit/automatic logout and review publishing still
work. Keep existing persistence formats and migrations readable on rollback.

Tests: reproduce each cache interleaving and recovery failure at the real service
interface before its fix. Retain root startup and review-compensation scenarios.
Use bounded manual simulator/device checks for foreground prompts and account
switching. No arbitrary coverage or test-count target.

## Phase 2 — Verification and release safeguards

Can proceed independently of most Phase 1 implementation; complete before its
production release where practical.

- Repair the existing test-harness lint error; scope root Jest to the app and
  relevant app-facing helpers, excluding admin discovery.
- Scope CI cancellation by PR/ref. Add an iOS export smoke check and relevant
  database/Edge Function checks for changes affecting those runtimes.
- Validate environment names and allowed release targets. Check actual backend
  project identity, runtime, channel and commit in a release preflight. Preserve
  the intentionally supported dev-client-to-production workflow.
- Correct misleading test names/fixtures, especially production-target metadata
  and feed award hydration. These tests should state what they really exercise.

Release gate: relevant regression tests, app-wide typecheck/lint/test checks,
formatting and diff checks, and an exported bundle. Verify the update on a
compatible installed release client; a Metro simulator run alone does not prove
OTA installation. Preview uses development Supabase, so separately validate the
production environment and backend contract before production publication.

Publish the focused 4.1.0 OTA from tested main. Record its commit/update IDs and
the previous compatible update for rollback. Observe sign-in, profile loading,
review publish success and image failures over representative usage before
adding Passport to the release path. A calendar interval alone is insufficient
if almost no one has run the update. No production monitoring is scheduled by
this planning document.

## Phase 3 — Simplify the shared Passport interfaces

Start Passport integration after this focused foundation is available; the rest
of the audit need not become a feature prerequisite.

- Consolidate signed-in profile reads/writes and cache ownership into one typed
  service. Keep ProfileContext as the React-facing orchestration layer.
- Extract review image preparation/upload/removal from the route while retaining
  the existing transactional publisher. Preserve replacement-image ordering and
  cleanup on failed edits.
- Give the post-review result/celebration flow a clear typed interface that
  handles absent optional achievements. Preserve normal navigation on dismissal
  and when there are no achievements.
- Remove the unused getReviews/searchProfiles/getComments methods only after
  checking all callers. Remove their exclusive helpers and obsolete tests in the
  same change. Keep server RPCs required by older installed clients.

Do not introduce a generic repository framework, new global state library or
native dependency as part of this phase. Reuse existing service conventions.
Test observable state transitions and data contracts rather than file structure.

Acceptance: active profile/review behavior is unchanged, old publish results
still decode, and the Passport feature can attach progress/celebration metadata
without owning authentication or duplicating review writes.

## Phase 4 — Passport MVP on the stabilized foundation

Branch Passport from updated main, or update an existing implementation branch
with the completed foundation before editing overlapping files. In this audit,
the Passport document is a proposal; implementation completion is not assumed.

Implement the additive data model and own/public read interfaces, then Profile
entry points, overview/region screens, and post-review celebration integration.
Keep broader retention/sharing experiments separate from the initial release
unless they are already required for the agreed MVP.

Resolve these backend details before extending the existing publish transaction:

- **Old clients:** changes to publish_review_v2 affect 4.0.2 and 4.1.0 callers
  too, even if they cannot see Passport. Preserve existing fields and semantics;
  test their payloads against the migrated database.
- **Failure policy:** the proposal mixes atomic award evaluation with review
  success protection. Explicitly decide what happens if evaluation fails. A
  failing evaluator inside the transaction can roll back the review. A suitable
  design is transactional pending evaluation plus idempotent retry if synchronous
  evaluation fails; do not silently lose awards or claim an earned stamp before
  it is committed. Confirm the desired immediate-celebration tradeoff first.
- **Existing history:** specify backfill eligibility and rollout. Do not invent
  historical Golden Glass recognition from today's rankings.
- **Rollout control:** define an actual server-read flag and evaluator disable
  mechanism. A UI-only flag does not protect older clients from database errors.
  Check idempotency, visibility/blocking, account deletion and query cost with
  realistic review histories.

Deploy additive SQL to development first; verify migration tests and old/new
client compatibility. Deploy the reviewed compatible backend to production
before releasing the feature client. Avoid destructive schema changes or server
RPC removal during this rollout.

## Phase 5 — 4.2.0 feature release

Create a 4.2.0 preview binary against development and exercise old/new accounts,
private/blocked profiles, empty/large passports, offline reads, review edits,
deletions, concurrent awards and celebration dismissal. Then build the approved
production commit for TestFlight against production and complete release checks.
The binary embeds all accepted reliability work, including the version prompt.

Keep Passport enablement controlled separately from binary distribution. Ensure
the feature-off state is useful and the evaluator can be disabled without
breaking review submission. Backend rollback is a separate operation from OTA
rollback: prefer disabling the feature and forward-fixing additive SQL while
preserving awards, rather than dropping tables or undoing earned history.

Existing 4.1.0 users with the version-check OTA can be prompted when 4.2.0 is
available in the checked store. Existing 4.0.2 users still require the normal App
Store upgrade path; no backport is planned here.

## Later independent improvements

Do not delay Passport for exhaustive cosmetic cleanup, a full databaseService
rewrite, startup architecture replacement, all dependency upgrades, or a Places
gateway migration. Schedule these independently when their audit findings are
addressed. Verify Expo web's intended support before spending a native feature
release on browser-only work.

Trim exact pixel/font/SVG/copy assertions in small test-maintenance changes;
retain accessibility, route compatibility and data-integrity tests. Replace
high-mock layout-only suites with interaction coverage only where a meaningful
behavioral risk warrants it.

## Merge policy

Separate PRs/commits for reliability, test/CI maintenance, shared-interface
refactoring and Passport. They can all converge into main in dependency order
and ultimately ship together in 4.2.0. Publish the reliability improvements sooner
through 4.1.0 OTA. Keep unfinished Passport changes off any commit selected for
that OTA; an OTA bundles the selected source tree, not just its latest commit.

## Implementation progress — 2026-09-04

The first reliability slice is implemented on `codex/expo-app-audit`:

- Guard full cache clears against late database, profile and image responses.
- Prevent previous-account profile responses from replacing the current account.
- Serialize persisted cache writes and cleanup so an already-started write cannot
  restore data after sign-out cleanup.
- Run shared user-cache cleanup on automatic sign-out as well as explicit logout.
- Retry transient image-signing failures; only confirmed missing objects receive
  a short negative-cache lifetime. Discard old persisted negative image entries.
- Add behavioral regression tests and repair the existing profile test harness
  lint error.

Validation: TypeScript passed; Expo-scoped lint completed with zero errors and
41 warnings; all 92 non-admin Jest suites passed (569 tests); `git diff --check`
passed. Simulator/device smoke testing and release validation remain outstanding.

These changes are uncommitted and have not been deployed. No native dependencies,
runtime versions, backend state or release configuration changed.

### Second slice — update lifecycle and test maintenance

- Extracted foreground-aware update presentation into `useAppUpdatePrompt`,
  gated by startup readiness and completion of the tracking-permission request.
  Late results cannot present after backgrounding or unmounting. Discovered
  updates remain available for the next foreground event.
- Failed lookups can retry on a foreground check after five minutes instead of
  waiting twelve hours. Successful lookups retain the twelve-hour interval.
  Dismissed versions have a twelve-hour in-session cooldown; failed store links
  allow a later attempt without an unhandled rejection.
- Root Jest now excludes admin. Renamed the image-delivery and review-engagement
  helper suites to match their subjects; clarified the cache-cleanup test name.
- Corrected feed fixtures and added explicit award-hydration success/failure
  checks. Fixed environment restoration in config tests and clarified that they
  test metadata, not real backend identity.
- Replaced exact typography enumerations and composer copy assertions with
  readability, input alignment, declared-font and semantic-step contracts.

Validation: all 93 app/helper suites passed (579 tests), TypeScript passed,
lint completed with zero errors and 41 warnings, and `git diff --check` passed.
No simulator/device or installed-OTA checks were performed for this slice.
Changes remain uncommitted and undeployed. Release safeguards, remaining test
cleanup, shared profile/composer extraction and Passport remain outstanding.

### Third slice — release-target guardrails and compilation gate

- App configuration now rejects unknown app/backend environment names and
  mismatched preview/production backend declarations. Preview defaults to
  development; development clients retain the production-backend workflow.
- GitHub Actions cancellation is scoped to workflow/ref instead of cancelling
  unrelated PR audits. Added an iOS export smoke check with placeholder config,
  dotenv disabled and source-map uploads disabled. Admin steps were unchanged.
- Added ten configuration regression cases. All 93 app/helper suites now pass
  (589 tests); TypeScript, repository formatting and diff checks pass. Expo lint
  has zero errors and 41 warnings. The workflow YAML parses successfully.
- A local production-mode iOS export succeeded: 2,836 modules, 81 assets, an
  8.1 MB Hermes bundle. `dist/ios-smoke` uses placeholder credentials and is not
  a release artifact. GitHub-hosted execution has not been verified yet.

Current UI changes are also included in this validation: review preview sizing
and scroll clearance, welcome copy, compact Regulars rows, and shared region/
location selection-row styles. The user confirmed preview scrolling works.

No commits, merges, remote configuration changes, database changes or releases
were performed. Actual Supabase project identity, channel/runtime/commit
preflight, database/Edge CI coverage and installed-release OTA validation remain
outstanding; declared environment validation does not replace those checks.

### Local commit checkpoint

Application changes are now committed on `codex/expo-app-audit`:

- `7103adf`: cache and update-prompt reliability fixes and regression tests.
- `cd6d61e`: approved UI and shared selection-row styles.
- `a48d343`: test scope, fixtures, naming and assertion cleanup.
- `afd1525`: CI export and release environment validation.

Read-only EAS verification confirmed that the active production channel points
to the production branch. Its latest iOS update is still group
`8527b9ce-5738-4b9d-96d1-a989dd5f14c7`, runtime `4.1.0`, commit `a56149e`.
That prior update records a dirty source tree, so its commit alone is not proof
of an exact source match. The new local commits have not been pushed or released.
No package, lockfile, EAS profile or native-directory differences were found
against `a56149e`; runtime compatibility still needs installed-client validation.

Tracked application files are clean. Audit/plan documents and pre-existing
Passport/App Store design work remain untracked and were excluded from commits.

### Production OTA release — 2026-09-04

User authorized merge and publication. `main` was fast-forwarded and pushed to
`afd152590b451c4feb19a82193e4b0cf4ba183f6`. Publication used a clean isolated main
checkout at `/tmp/tini-ota-release.YmN74o`, excluding the original workspace's
untracked documents and design files.

- Production environment URL and anonymous-key project identity matched;
  the production auth health endpoint returned success.
- `npm run verify` passed in the clean checkout using Node 24.8.0: 93 suites,
  589 tests. GitHub audit run `33923453316` completed successfully.
- Published iOS update group: `3ded0ee4-a11f-4b1d-99a4-d920c6b3fd0a`.
- iOS update ID: `01a06e70-1683-7e5c-824b-ab7f90c9b15a`.
- Production channel/branch and runtime `4.1.0` confirmed by read-back;
  EAS reports the exact main commit and `isGitWorkingTreeDirty=false`.
- Previous compatible group for rollback:
  `8527b9ce-5738-4b9d-96d1-a989dd5f14c7`.

No database or native build was deployed. Runtime 4.0.2 is unaffected. Delivery
metadata is verified; installation and behavior on a physical release client
have not been verified in this session.
