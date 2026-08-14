# Future updates

_Last updated: 2026-08-04. Current release: 3.0.1._

This is the working delivery plan for Tini Time Club. Product direction remains
in `GROWTH_PLAN.md`, release mechanics remain in `RELEASE.md`, and outstanding
security operations remain in `SECURITY_ACTIONS.md`. This document turns those
inputs into sequenced updates with a test expectation for every phase.

## Current baseline

- Rank rings and Regulars are live.
- Post-review rank and Regular celebrations are recognition-only; they do not
  include sharing.
- Onboarding collects the profile, explains rankings and Regulars, then presents
  the Terms of Service.
- The mobile app has Feed, Explore (Map, Top Places, and Members), review creation, profiles, and push
  notifications.
- The admin web app provides operations, analytics, and public review pages.
- Automated tests: 19 suites and 214 tests.
- Existing automated coverage is strongest for utilities, ratings, rankings,
  auth helpers, comment patching, reminders, and theme contrast.

## Release priorities

### Phase 1: Protect the current experience

Goal: make the account, review, and discovery loops dependable before adding
more surface area.

- Add screen-level coverage for onboarding draft restoration, profile creation,
  favorite-location selection, Terms acceptance, and final navigation.
- Add an integration test for review submission through rank/Regular detection,
  profile refresh, celebration dismissal, and Feed navigation.
- Test map pin selection, location-sheet replacement, and navigation from a
  location name into its detail page.
- Test username validation states, including unavailable names, malformed names,
  network failures, and the disabled Next button.
- Reduce the existing lint-warning backlog, beginning with stale Hook
  dependencies and functions accessed before declaration.
- Add `.easignore` so mobile builds do not upload admin and support files.

Exit criteria:

- Onboarding, review posting, and map-pin selection each have one passing happy
  path and their important failure paths automated.
- Typecheck, lint with zero errors, unit tests, and integration tests run in CI.
- A development build completes against development Supabase without production
  credentials or data.

### Phase 2: Retention and social reliability

Goal: make the existing club feel active and worth returning to.

- Add reliable notification deep links for comments, likes, follows, rank
  changes, and Regular membership changes.
- Add weekly recap and review-progress reminders with user-level controls.
- Improve empty, loading, offline, and retry states across Feed, Explore, and
  profiles.
- Add report moderation states to the admin dashboard.
- Measure onboarding completion, first review, second review, and seven-day
  return without mixing development and production analytics.

Required tests:

- Table-driven notification-route tests for every supported notification kind.
- Push registration tests covering permission denial, token refresh, multiple
  devices, and sign-out cleanup.
- Feed refresh tests for cache bypass, pagination, deduplication, and offline
  fallback.
- Admin moderation tests for authorization and state transitions.

### Phase 3: Acquisition and public sharing

Goal: turn reviews and profiles into reliable acquisition paths while keeping
celebrations focused on recognition.

- Finish public profile pages and verify universal/deep-link fallbacks.
- Improve public review metadata, image fallbacks, and App Store calls to action.
- Add invite attribution from public entry through completed onboarding.
- Add privacy controls for public profile and review visibility before expanding
  sharing.

Required tests:

- Web tests for public review/profile success, missing, deleted, and private
  states.
- Deep-link tests from cold start, warm start, signed-out, and newly onboarded
  sessions.
- Analytics tests proving one event per action with the correct environment and
  attribution source.
- Accessibility checks for public pages and share controls.

### Phase 4: Business claiming and offers

Goal: let venues participate without weakening review trust.

- Add business accounts and manually reviewed location claims.
- Let approved owners correct venue details and respond to reviews.
- Add status-gated offers and a simple server-recorded redemption flow.
- Keep paid placement explicitly labelled and separate from organic ratings.

Required tests:

- Database tests for claim ownership, approval permissions, and cross-venue
  isolation.
- RLS tests proving members, owners, admins, and anonymous users have only their
  intended access.
- Redemption concurrency, expiration, one-per-user, and replay-protection tests.
- End-to-end owner claim and member redemption flows against a disposable test
  project.

### Phase 5: Club rewards

Goal: give rank and Regular status durable real-world value.

- Add tier rewards, event eligibility, and optional fulfillment details.
- Add member history for earned ranks, Regular placements, and redeemed perks.
- Add admin fulfillment and support tools before announcing physical rewards.

Required tests:

- Idempotent reward issuance at exact tier boundaries.
- Privacy and authorization tests for fulfillment data.
- Audit-log tests for administrative changes.
- End-to-end tests for earning, claiming, fulfillment, and cancellation.

## Test strategy

### Existing strengths to preserve

- Rating math and fractional olive rendering.
- Rank thresholds and progress.
- Address, venue, distance, and location filtering helpers.
- Auth callback parsing, profile caching, and sign-out cleanup.
- Comment patch idempotency.
- Reminder scheduling and copy constraints.
- Theme contrast and rating accessibility labels.

### Highest-priority gaps

1. Onboarding and Terms acceptance.
2. Review upload, database insert, and post-review celebration flow.
3. Places map pins, clustering, and location sheets.
4. Profile editing and favorite-location navigation.
5. Feed loading, refresh, pagination, likes, comments, and reports.
6. Supabase migrations, triggers, RPCs, RLS, and Edge Functions.
7. Admin authentication and operations.
8. Real-device smoke coverage for camera, images, notifications, and deep links.

### Test layers

- **Unit:** pure formatting, ranking, rating, route, and selection logic.
- **Component:** controls, cards, sheets, validation states, accessibility, and
  interaction callbacks.
- **Screen integration:** mocked network boundaries with real screen state and
  navigation behavior.
- **Database integration:** disposable development data for RPCs, triggers, and
  RLS assertions.
- **End to end:** a small set of critical iOS flows run with Maestro or an
  equivalent Expo-compatible runner.
- **Manual release smoke:** camera, location permission, push notification,
  deep-link, dark mode, and small-screen checks on the release candidate.

Coverage percentages are a diagnostic, not the release goal. A phase is covered
when its critical user outcomes and failure modes are protected at the most
appropriate layer.

## Definition of done

Every user-facing update should include:

- Acceptance criteria before implementation.
- Unit coverage for new business logic.
- Component or integration coverage for changed interaction states.
- Analytics and error reporting where the outcome matters operationally.
- Accessibility labels and dynamic-text checks.
- Verification against development Supabase.
- `npm run verify` passing before merge.
- A TestFlight smoke test for changes involving native modules, permissions,
  deep links, camera, location, or notifications.

## Maintenance queue

- Complete the outstanding actions in `SECURITY_ACTIONS.md`.
- Replace client-side account soft deletion with a server-authorized deletion
  function.
- Restrict authenticated location updates after place-id backfill moves to a
  server-owned path.
- Keep development and production Supabase, EAS environments, analytics, and
  notification delivery isolated.
- Review dependencies and generated artifacts before each native version bump.
- Update this document after every release: mark shipped work, move deferred
  work, and add the next release's test obligations.
