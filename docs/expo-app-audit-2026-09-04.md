# Expo application audit — September 4, 2026

Baseline: `a56149efebbceb244f31e21a6c1400244aeed380` (4.1.0).
Audit branch: `codex/expo-app-audit`.

## Scope and method

Reviewed the Expo route tree, components, hooks, contexts, services, utilities,
configuration, dependency declarations, and CI/release safeguards. Considered
Supabase interfaces consumed by the app. The Next.js admin implementation is
excluded; the shared CI file was read only to assess Expo verification.

This is a source audit with focused executable probes, not a production security
assessment or device performance profile. Live Supabase policies, Google Cloud
key restrictions, EAS settings, App Store availability, and production telemetry
were not inspected. No application behavior, database, or deployment was changed.

Method: read implementation and existing tests, trace imports and callers, run
the non-admin test suite, and execute the actual TypeScript cache implementations
with controlled asynchronous dependencies. Static reachability treats all Expo
routes as entry points and recognizes platform-specific modules. It is a
candidate-finding tool, not proof that every route is useful to users.

## Assessment

The app has useful foundations: transactional review publishing, cursor-based
feeds, focused domain services, batched image signing, explicit visitor/member
behavior, and substantial behavioral tests. A rewrite is not justified by this
review. The main debt is inconsistent ownership of asynchronous state, retained
legacy methods, weak typing at data interfaces, and release verification that
does not exercise the shipped bundle or database contracts.

Priority meanings: P1 = address first due to session/data correctness; P2 =
reliability or infrastructure improvement; P3 = cleanup. Confidence is stated
separately from priority.

## Findings

### 1. P1 — Clearing caches does not invalidate in-flight writes

Evidence: `services/databaseService.ts:85` and `:956`;
`utils/authCache.ts:94`, `:127`, `:178`; `utils/imageCache.ts:360`.

`clearAllCaches()` clears maps, but previously started requests unconditionally
write their results back afterward. Deleting a pending Promise from a map does
not stop that Promise. An older request's `finally` can also delete the tracking
entry for a newer request with the same key.

**Reproduced against the real databaseService implementation:** start a delayed
`getUserProfile`, clear all caches, resolve the old read, then read again. Cache
size became 1 and total network requests stayed at 1; a fresh post-invalidation
read should require a second request. This proves stale cache resurrection, not
a demonstrated production disclosure or RLS bypass.

Recommendation: add a cache generation checked before writes, and delete pending
entries only when they still reference that request. Scope member-sensitive keys
to viewer identity. Apply the same lifecycle rule to profile and image caches;
ProfileContext's generation guard protects React state but not those caches.

### 2. P1 — Automatic sign-out bypasses complete cache cleanup

Evidence: `app/_layout.tsx:519`, `context/profile-context.tsx:78`,
`utils/signOut.ts:17`.

Settings, onboarding, and account deletion explicitly call `clearUserCaches`.
The root `SIGNED_OUT` handler only clears authCache; the account-gone flow also
only clears authCache. Consequently session loss and remote account removal do
not have the same cleanup guarantees as pressing Sign out. Database cache keys
such as `profile_<id>` do not encode the viewing account.

Recommendation: centralize member-cache invalidation at the auth-session
transition, with idempotent cleanup and the generation guard from finding 1.
Keep navigation intent separate. Test explicit logout, token rejection,
account removal, and A-to-B account switching with reads in flight.

### 3. P2 — Expo web selects native-only session storage

Evidence: `utils/supabase.ts:45`, `utils/sessionStorage.ts:64`;
installed `expo-secure-store/src/SecureStore.ts:156` and
`expo-secure-store/build/ExpoSecureStore.web.js`.

Storage selection tests `typeof window`, which distinguishes a server from a
browser but not a browser from React Native. A browser therefore receives
LargeSecureStore. The installed SecureStore web implementation exports an empty
object, while LargeSecureStore calls its native key-reading/writing methods.
Session persistence will fail when that browser path needs an encryption key.

Confidence: directly established by adapter selection and installed dependency
source; a browser login was not executed. Impact is conditional on continuing to
support authenticated Expo web, which remains declared in app configuration.

Recommendation: explicit native/browser/server storage adapters and one browser
session persistence test. If Expo web is intentionally unsupported, remove that
support claim and associated release expectations deliberately.

### 4. P2 — Transient image errors suppress retries for 90 minutes

Evidence: `utils/imageCache.ts:24`, `:104`.

The single-image signer writes the missing-image sentinel for every returned
Storage error, including temporary network/auth/server failures. Its comment
describes missing objects, but the condition does not restrict caching to those.
The editable-review loader uses this path (`services/databaseService.ts:518`).

**Reproduced:** a mocked transient Storage error followed by an immediate retry
made only one signing request and left a cached null result. The second attempt
never reached Storage.

Recommendation: negative-cache only confirmed missing objects, with a short TTL;
leave transient failures retryable. Check per-object batch errors too. Add the
transient-error-then-success scenario to imageCache tests.

### 5. P2 — Production target validation checks presence, not identity

Evidence: `app.config.ts:33`, `:61`; `eas.json`; `RELEASE.md`.

Release config checks that several values exist, but does not reject an unknown
APP_ENV string or prove the production Supabase hostname matches production.
BACKEND_ENV is metadata, not a validation of the URL. The release runbook
requires manual verification, but a wrong nonempty URL can pass code validation.

Recommendation: validate environment names and the allowed target matrix;
validate non-secret expected project identifiers before build/update publication.
Preserve the intentional development-client-to-production workflow. A release
preflight should verify branch/commit, runtime, channel, environment and backend
without printing credentials. No actual misdeployment was established here.

### 6. P2 — CI can cancel unrelated audits and misses release artifacts

Evidence: `.github/workflows/ci.yml:12` and `:46`.

Every PR and main push shares the concurrency group `main-audit`, with cancellation
enabled. A push on one PR can cancel another PR's or main's audit. Scope concurrency
by workflow and PR/ref.

Expo validation resolves config with placeholder credentials but does not export
the iOS bundle. There is no database-contract test step or Edge Function typecheck
in this workflow, although the app depends on those contracts and pgTAP tests
exist. The root TypeScript config explicitly excludes Edge Functions.

Recommendation: add an iOS export smoke check, a focused local Supabase contract
job for changes to app-facing SQL, and relevant Edge Function checks. Treat
passing main CI as a release gate. These are missing checks, not proof that
current deployed SQL or the bundle is broken.

### 7. P2 — App Store update checks need stronger lifecycle behavior

Evidence: `services/appVersionService.ts:73`, `:83`;
`app/_layout.tsx:67` and `:296`.

The 12-hour timestamp is written before a lookup succeeds. A failed startup
lookup suppresses checks for the next 12 hours in the same process. Conversely,
both throttling and dismissal are memory-only, so restarting permits another
lookup and prompt immediately. The update alert and tracking permission request
start concurrently; the alert has no presentation queue or active-state check
after its awaited request. Opening the store has no rejection handler.

Recommendation: distinguish successful-check cadence from failure retry delay,
persist a modest dismissal cooldown, and present only after startup/other system
prompts complete while the app is active. Catch store-opening failures. Treat
concurrent prompt loss as a test scenario, not a reproduced device defect.

The lookup also has no country parameter, and its displayed installed version
comes from OTA config. Validate desired storefront behavior and native-version
identity before expanding this into a mandatory-update mechanism.

### 8. P2 — Profile ownership is split across three modules

Evidence: `context/profile-context.tsx:101`, `utils/authCache.ts:104`,
`services/databaseService.ts:135` and `:156`.

authCache reads and persists profiles, ProfileContext repeats a direct database
read when it receives null, and databaseService owns another read cache and write
path. authCache catches query errors and returns null, so the context cannot
distinguish an absent session from a failed fetch without asking again. This
adds requests on failure and spreads invalidation knowledge between callers.

Recommendation: one typed profile service with explicit absent-session,
account-gone, and retryable-error outcomes. Keep React state in the context and
storage/query details behind the service interface. Consolidate writes as part of
that change rather than adding another generic repository wrapper.

### 9. P2 — Data interfaces rely on assertions instead of contracts

Evidence: `utils/authCache.ts:44`, `services/databaseService.ts:20`,
`services/regionService.ts:17`, `services/reviewFeedService.ts:59`,
`services/public-content-service.ts:75`, `utils/supabase.ts:45`.

Strict TypeScript is enabled, but the Supabase client has no generated Database
generic, broad services return `any`, and public-content casts response bodies
to T without validation. Feed decoding verifies only a small portion of Review
before asserting the whole object. Typechecking therefore cannot verify much
of the app/server contract.

Recommendation: generate database types from migrations and add targeted decoders
at RPC/Edge Function seams, starting with profiles, review pages and regions.
Keep internal transformations typed. Do not duplicate validation at every screen.

### 10. P2 — Places transport has no explicit request deadline

Evidence: `services/placesService.ts:52`, `:207`;
`components/LocationInput.tsx:148`.

The transport has no AbortSignal/deadline, parses JSON without checking HTTP
status, and converts failures to empty results. Callers guard against stale
responses but cannot cancel superseded searches through this interface. Users
cannot distinguish no matches from service failure. The venue cache has no
capacity or expiry policy.

Recommendation: add cancellation/deadlines and an explicit recoverable error
outcome at this existing service seam; bound the venue cache. The API key is
client-visible and used directly in REST calls. Verify its cloud restrictions,
quotas and permitted APIs separately; this audit did not establish key abuse or
inspect Google Cloud settings. Consider a constrained server gateway if the
required restrictions cannot be enforced for this client flow.

## Cleanup and refactoring opportunities

### P3 — Remove obsolete methods before restructuring active modules

No orphaned TypeScript files were found by the static route import walk. However,
repository-wide caller searches found no application callers for:

- `databaseService.getReviews`, `searchProfiles`, and `getComments`. Current
  feed/location/profile pages use `getReviewPage`; comments use `getCommentPage`.
  The old getReviews implementation retains its own hydration pipeline.
- `imageCache.getAvatarUrl` (deprecated async wrapper), `getLocationImage`, and
  cache-stat methods. The location-image downloader retains base64 persistence
  machinery with no app caller.
- `AnalyticService.identify` and `reset`, which are empty functions.

`authCache.onAppStateChange` is called but intentionally does nothing. Remove
that wrapper and its call together. Keep legacy session migration logic: it
protects users upgrading installed apps and is not dead merely because new
installs do not use it.

Before deletion, check tests, non-app scripts, dynamic references, and public
exports. Remove only exclusive helpers; some databaseService hydration helpers
are specific to the old feed method. Do not remove old server RPCs merely because
the current app stopped calling them: shipped older clients may still need them.

Dependency inspection produced false positives that were manually rejected:
expo-clipboard is dynamically imported, expo-localization is a config plugin,
and native/runtime peers need not appear in application imports. No dependency
removal is justified by the import scan alone.

### Refactor by responsibility, not file length

- `app/review.tsx` (1,414 lines): move image preparation/upload/removal and draft
  orchestration behind a review-composer service/hook. Preserve the existing
  transactional publisher and compensation behavior.
- `app/_layout.tsx` (741 lines): extract startup/session orchestration and prompt
  scheduling with the existing startup-routing tests as the behavioral contract.
- `app/onboarding.tsx` (1,097 lines): separate avatar/profile completion from the
  screen. Much of the length is legal copy and styling, not algorithmic complexity;
  moving text alone is organization, not a performance improvement.
- `services/databaseService.ts` (972 lines): delete obsolete methods first, then
  separate remaining cohesive profile, review and engagement responsibilities.

Retain the deep modules that already earn their interfaces: transactional review
publishing, activity decoding, cursor pagination, and batched image signing.
There is insufficient evidence to justify a Redux/React Query migration, a
generic repository framework, or a complete navigation rewrite.

## Suggested implementation order

1. Fix cache generations and centralize auth-transition cleanup; add interleaving
   tests against the public service interfaces.
2. Fix transient image retries and web storage selection if Expo web is supported.
3. Harden target validation and CI isolation/export/database checks.
4. Consolidate profile data ownership and strengthen app-facing types.
5. Delete verified legacy methods, then extract composer/startup responsibilities.
6. Harden update-prompt lifecycle and Places transport with focused tests.

Keep each change independently reviewable. Do not combine cache correctness,
native dependency upgrades, backend API removals and visual redesign in one PR.

## Validation and limitations

- `npm run typecheck`: passed.
- `npx eslint app components context hooks services utils theme types --quiet`:
  failed on one existing test-harness violation at
  `context/__tests__/profile-context.test.tsx:76` (`react-hooks/globals`):
  ProfileProbe assigns to an outer variable during render. This is a test
  cleanup item, not an established application runtime defect. The current
  explicit Expo-only lint result is not clean despite the passing test suite.
- `npm test -- --runInBand --testPathIgnorePatterns=/admin/`: 92 suites,
  560 tests passed, including the existing public-content function suite.
- Two source-level executable probes reproduced cache resurrection and transient
  image-error suppression. These used TypeScript transpilation and VM-injected
  dependencies; they did not call production services or modify implementation.
- Static import reachability and repository-wide caller searches informed cleanup
  candidates. They are not a full bundle-size or asset-usage analysis.
- No native build, browser login, device performance profile, live RLS audit,
  vulnerability database scan, or deployment was performed in this audit.

## Test-value audit

### Conclusion and scope

Not every assertion should be retained. Preserve the behavioral core, remove
obsolete coverage with obsolete code, and replace brittle presentation checks
with a few checks of real interactions. Do not pursue a percentage reduction or
coverage target without regard to the failures those tests can detect.

Inventory: 92 non-admin Jest files, approximately 10,586 lines and 283 explicit
`jest.mock` declarations. Counts include the public-content helper test. These
are maintenance indicators, not quality scores. The existing run passed 560 tests
in about 15 seconds; execution speed is not currently a compelling reason to
delete coverage. Parameterized contrast checks account for many small cases.

This review inventories the entire non-admin suite and examines selected test
bodies in depth, especially high-mock suites, legacy methods, data writes,
authentication, cache behavior and visual assertions. It is not mutation testing
of every assertion. The Next.js tests remain excluded.

### Concrete removal and reduction candidates

| Test location                                           | Decision                                                                 | Reason and replacement                                                                                                                                                                                                                                                                                                                             |
| ------------------------------------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/__tests__/UserProfileTabs.test.tsx`         | Replace or remove this one-test suite                                    | Twenty mocks produce synthetic header/tab nodes, then assert their nesting. It never exercises real Reviews/Regulars switching. Prefer an actual tab-switch behavior test at the ProfileContentTabs/ProfileBody seam if that flow warrants automation.                                                                                             |
| `components/map/__tests__/ClusteredMap.test.tsx`        | Remove the single test unless a documented native workaround requires it | It checks that a mocked map receives `animationEnabled: true`; it cannot demonstrate the claimed animation while mounted. Device review is the relevant visual check.                                                                                                                                                                              |
| `components/nav/__tests__/AppHeader.test.tsx`           | Trim selected assertions, keep the suite                                 | Remove exact font-size/line-height equality, chevron color and badge pixel geometry checks. Keep capped badge text, custom-content behavior and actions. The form-sheet `collapsable: false` assertion may protect a native workaround: retain it if that regression is documented.                                                                |
| `components/shared/__tests__/RatingPips.test.tsx`       | Trim implementation-specific cases                                       | SVG path-prefix matching, exact brand color, and echoing `getOliveIconCanvasSize` back into SVG props couple tests to implementation. Keep whole/half rating selection, minimum value, continuous drag outcomes and screen-reader adjustments. Preserve the intended fractional-rating behavior without fixing its rendering mechanism to opacity. |
| `theme/__tests__/typography.test.ts`                    | Replace exact enumerations with meaningful invariants                    | Exact object-key order and the entire size array turn normal token edits into test edits. The test named “loads only the five faces” only reads exported font keys; it does not inspect font loading. Retain a minimum-size invariant if it is policy and test the actual input line-height constraint if needed.                                  |
| `utils/__tests__/reviewComposerSteps.test.ts`           | Trim copy equality                                                       | The seven exact question titles duplicate copy. Keep progress endpoints, ordering by semantic step identity, and camera/preview offsets if those are behavioral requirements.                                                                                                                                                                      |
| `components/explore/__tests__/GoldenGlassList.test.tsx` | Trim copy checks; retain interaction                                     | The exact subtitle is low-value. Header placement/loading can protect scrolling behavior; the “How Golden Glass works” navigation test checks a useful action.                                                                                                                                                                                     |
| `services/__tests__/databaseService.test.ts:98–149`     | Remove three tests with the old `getReviews` method                      | They exercise the unused followed-feed, visitor feed, and visitor-personalization path. Keep the active location-verification and comment-relationship tests. Verify the corresponding guarantees on `getReviewPage` before deletion.                                                                                                              |

Do not delete whole mixed suites merely because some assertions are brittle.
Do not remove tests of active behavior first and leave the implementation behind
without protection. In particular, the legacy feed tests should disappear in
the same change that removes the legacy method.

### Keep even when they are small or use mocks

- Session encryption/migration, unavailable Keychain, auth deep links, membership
  gates, sign-out routing and onboarding startup tests protect account access.
  `rootStartupRouting.test.tsx` has 28 mocks and about 829 lines, but its scenarios
  include real routing races and session failures. Simplify its setup as the
  implementation is extracted; do not discard those scenarios for being large.
- Review-publishing and edited-review compensation tests protect stored data.
  Their apparent overlap is meaningful: creating a review must remove a new
  upload after failure; editing must preserve the old image until success.
- `homeStartupLoad.test.tsx` protects duplicate requests, outage pagination loops
  and stale responses after feed-source switches. Those are distinct from a
  service's RPC-payload test.
- `reviewComposerFlow`, `reviewStepValidation` and `reviewSubmission` cover
  different decisions: screen transitions, deliberate rating input, and
  celebration/navigation ordering. Small pure tests are cheap; file count alone
  is not a reason to merge or remove them.
- Contrast thresholds, accessibility rating controls and summary labels protect
  legibility and accessible behavior. Contrast tests intentionally allow colors
  to change while preserving a threshold; that differs from exact-color tests.
- Routing compatibility, cursor decoding, privacy projection, mention identity,
  ranking calculations, review cropping, and timeout behavior retain useful
  contracts. Database tests of authorization complement mocked client tests;
  one cannot substitute for the other.
- `reviewEvents.test.ts` checks unsubscribe semantics, not just a wrapper call.
  Its small size is appropriate. `activityBadge.test.ts` can consolidate its two
  forwarding cases, but the more useful addition is its currently untested
  negative/nonfinite/fractional-count normalization.

### Tests that currently promise more than they prove

1. `app/__tests__/appConfig.test.ts`, “points the audited production app at the
   production backend,” sets BACKEND_ENV to production and asserts that the
   string is copied. Its URL is a placeholder. It does not prove backend identity.
   Rename it accurately and add target-mismatch rejection coverage with the
   configuration fix. Also restore originally absent environment variables by
   deleting them; assigning undefined to process.env does not restore absence.
2. `utils/__tests__/signOut.test.ts`, “empties all three caches,” only proves
   three mocked functions are called. Keep the best-effort orchestration check,
   but do not count it as protection against cache resurrection. A real cache
   with a deferred network response is needed for that failure.
3. `supabase/functions/public-content/index.test.ts` only imports imageDelivery
   and checks a URL helper. Despite the filename, it does not execute the HTTP
   handler, authenticate a request, validate inputs, or verify privacy projection.
   Rename to imageDelivery.test.ts; handler coverage is separate work.
4. `hooks/__tests__/useReviewEngagement.test.ts` tests
   `utils/reviewEngagement.buildReviewPreviewComments`, not the hook. Move/rename
   the test to describe its actual subject. Likewise `components/__tests__/useComments.test.tsx`
   renders ReviewItem behavior rather than testing a hook called useComments.
5. `services/__tests__/appVersionService.test.ts` says it handles “the installed
   or an older version,” but only exercises an equal version. Its interval test
   checks suppression one millisecond later but never checks resumption after
   12 hours. Keep and extend meaningful cases; do not mistake the title for coverage.
6. `services/__tests__/reviewFeedService.test.ts` omits
   `is_location_verified` from its fixture and has no Supabase `from` mock.
   Award hydration therefore takes the caught-error path while the page test
   still passes. Make the fixture complete for a normal-page test and test the
   fallback deliberately, with explicit success and failure outcomes.

### Coverage to prioritize over more visual assertions

| Risk                | Current weakness                                                                | Valuable next test                                                                                           |
| ------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Cache invalidation  | Existing clear-cache mocks and sequential cache tests miss in-flight completion | Begin read, invalidate/change account, resolve old read, verify no stale cache write or stale UI             |
| Image recovery      | imageCache has one batch URL happy-path test                                    | Transient signing error followed by success; expiry refresh; confirmed missing object behavior               |
| Automatic sign-out  | Explicit UI logout is covered more strongly than all auth transitions           | Trigger actual SIGNED_OUT orchestration and verify member-sensitive caches cannot survive                    |
| Update notification | Service tests do not exercise the root prompt or failure retry cadence          | Offline startup then successful foreground retry, deferred presentation, dismissal cooldown                  |
| Browser session     | Native storage mocks cannot reveal unavailable web Keychain methods             | Browser adapter persists and restores a session without native SecureStore                                   |
| Backend contract    | RPC mocks accept shapes/auth rules without running Postgres                     | Run the relevant pgTAP suites in CI and add an app-facing contract check where a migration changes a payload |

### Test infrastructure improvements

- Make root Jest exclude `admin/`; it currently discovers those tests and the CI
  workflow runs an additional admin test command. Keep app and admin reporting
  separate without modifying the admin application itself. Likewise, name the
  Edge Function helper test so it is not mistaken for handler verification.
- Replace oversized repeated mocks with small explicit fixtures at the service
  seam. Avoid a global mock framework that makes every network call succeed by
  default; that would hide precisely the error cases the audit found.
- Unmount rendered trees consistently. For example, UserProfileTabs and the
  RatingPips render helper do not provide suite-wide teardown. This is a hygiene
  risk, not evidence that those tests are currently flaky.
- Correct the existing ProfileProbe render-time assignment lint error while
  retaining its account-transition scenarios. Do not globally disable the rule.
- The audit found no snapshot assertions or skipped/todo test calls in the
  scanned non-admin test files. Snapshot churn and deliberately skipped suites
  are not the immediate problem.

### Proposed test cleanup sequence

1. Remove the confirmed obsolete feed implementation and its three tests together.
2. Remove/replace the two low-value single-test renderer suites above, then trim
   pixel/font/copy assertions from mixed suites while retaining interactions.
3. Rename misleading suites and test titles; fix the feed fixture and teardown.
4. Add cache interleaving and retry regressions alongside the corresponding fixes.
5. Split runner scope and add relevant database/bundle checks.

No tests were deleted or changed during this audit. The prior 92-suite/560-test
run remains the baseline; this follow-up changed documentation only, so rerunning
the same tests would not validate any new application behavior.
