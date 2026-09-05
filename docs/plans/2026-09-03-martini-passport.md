# Martini Passport — simplified 4.2.0 proposal

Status: reviewed against repository contracts; proposed scope, not implementation-ready approval.
Branch: `codex/4.2.0-passport`. Delivery: new **4.2.0 binary**, not a 4.1.0 OTA.
Scope: Expo app and additive Supabase changes. No Next.js admin work.

The [original proposal](archive/2026-09-03-martini-passport-original.md) is retained
for reference. This revision separates confirmed technical constraints from
product decisions. It does not claim that migrations or live data were tested.

## 1. The smallest useful Passport

A member opens Passport from Profile, sees progress from their published reviews,
and collects stamps for exploring different venues, Martini types and regions.
No points, streaks, drinking deadlines or sixth tab.

Proposed 4.2.0 scope:

- Own Passport overview and a Region Page.
- Four stamp series, using existing structured review fields.
- A compact Profile entry with stamp total and three recent stamps.
- A non-blocking stamp celebration after publishing a review.
- One next milestone with a relevant Explore or Martini Index action.

Defer public/member Passports, sharing, stamp-detail routes, pinned stamps,
seasonal challenges, reminders, admin editors, rarity scores and cohort tooling.
These are product scope recommendations, not already-approved removals.

## 2. Language and counting rules

- **Passport:** the member's collection of stamps and current progress.
- **Region Page:** the regional portion of that Passport.
- **Challenge:** the next milestone in a stamp series.
- **Stamp:** an earned milestone; **Award:** its authoritative server record.
- **Progress:** current eligible counts, not an immutable historical total.

Use existing IDs, never names or captions, to count distinct venues and types.
Eligible reviews have `reviews.state = 1` and belong to the member. Reviews use
`location`, `type`, and `spirit` foreign keys, not inferred Martini Index entries.
Missing IDs contribute nothing to that metric. A venue counts once regardless
of duplicate reviews; different types at one venue may advance type diversity.

| Series           | Scope  | Thresholds       | Count                                          |
| ---------------- | ------ | ---------------- | ---------------------------------------------- |
| Venue Journey    | Global | 1, 5, 10, 25, 50 | Distinct reviewed location IDs                 |
| Regional Journey | Region | 1, 5, 10, 25     | Distinct locations assigned to that region     |
| Martini Explorer | Global | 2, 3, 5, 10      | Distinct reviewed type IDs                     |
| Region Explorer  | Global | 1, 2, 3, 5       | Distinct enabled regions of reviewed locations |

Thresholds are provisional until a read-only catalog/data check confirms they
are attainable. Global venue/type counts include unassigned locations. Regional
counts use current `locations.region_id`; disabling/reassigning a region can
change current progress. Preserve already-earned regional stamps and their
region identity. No percentage against an open-ended venue catalog.

Proposed permanence rule: ordinary review deletion lowers progress but does not
remove earned stamps. Moderation may revoke awards; account deletion removes
all Passport data. A revoked award remains unique and cannot be automatically
re-earned; only an authorized restore may reverse revocation. Profile soft
deletion must hide Passport immediately; FK cascades cover physical deletion.

These rules can reward a milestone later followed by deleted reviews. That is
an explicit product tradeoff, not an anti-fraud guarantee.

## 3. Why the other series wait

- **Neighbourhoods:** `locations.neighborhood` is free text. Spelling, missing
  values and aliases would produce inconsistent distinct counts. Normalize
  geography before awarding permanent neighbourhood stamps.
- **Golden Glass:** current recognition is a refreshed snapshot. Current top-ten
  completion and recognition at review time are different facts. The old plan
  counted one but claimed the other. Do not backfill historical recognition
  from today's list. Add a separate, evidenced historical model later.
- **Spirit / regional type series:** structured IDs exist, but they duplicate
  much of the first four series. Defer for scope, not because they are impossible.
- **Garnish/preparation:** structured review evidence does not exist.

## 4. Screens and navigation

Profile entry → Passport overview → Region Page. Keep existing profile tabs.

Overview: total stamps, next milestone, started regions, and global series.
Region Page: venue count, Regional Journey tiers and recently reviewed venues.
Use existing card/row, typography, loading and error patterns in both themes.
Earned/locked states must work without color alone. Preserve readable Dynamic
Type layouts and tab-bar clearance.

Proposed own routes: `/passport` and `/passport/regions/[region]`, registered in
the existing shared tab-stack mechanism with typed helpers in `utils/routes.ts`.
Do not introduce `/members/...` routes: existing member routing conventions must
be preserved if public Passport is added later.

Use the stable next unearned tier per series. Among those, prefer started series,
then highest completion ratio, then a fixed series order and stable key. Do not
compare raw deficits of unrelated metrics or call highest threshold “rarest.”
Hide suggestions when everything eligible is earned. Explore actions select an
enabled region; Index actions help browsing but cannot promise an unreviewed
type unless the action actually applies that filter.

## 5. App interface and review safety

One `passportService` module exposes `getMyPassport()`,
`getMyPassportRegion(regionId)` and `refreshMyPassport()` for reconciliation.
The interface hides RPC names, decoding, errors and ordering. No generic rules
engine, extra global-state library or duplicate profile cache.

`publish_review_v2` currently wraps `publish_review_v1` and mention replacement.
`update_review_v2` is a separate write path and must be handled explicitly.
Keep both signatures, existing response fields, permissions and review behavior
compatible with 4.0.2/4.1.0 callers. Do not rewrite applied migrations.

Optional publish metadata can be:

```ts
type PassportPublishResult = {
  status: "ready" | "pending" | "disabled";
  unlocked: PassportUnlock[];
};
```

Do not add `advancedCount`: that requires a before/after comparison the original
evaluator did not provide. Refresh the overview for progress and suggestions.
Unknown/malformed optional Passport metadata means no Passport celebration, not
a failed review. In particular, `reviewPublishingService` currently catches
decoder errors in the same block as RPC errors and compensates by removing the
uploaded image. Passport decoding must never enter that cleanup path after a
successful write. The core publish-result ambiguity deserves its own regression
test and focused fix; do not broaden this into a new upload framework.

Reuse `CelebrationModal` and the existing completion flow. Proposed priority:
one new Passport stamp, then existing rank/Regular moments. Use a fixed display
priority, not invented rarity. Celebration dismissal and optional fetch failures
must always let normal post-review navigation finish. No polling loop or extra
modal stack. Do not replay every backfilled stamp as a new celebration.

## 6. Minimal database design

Two persistent tables are sufficient for the proposed scope:

- **Definitions:** stable key, series, scope, fixed metric, positive threshold,
  title, artwork key and enabled flag. Migration-seeded; no dynamic expression
  language. Freeze key/metric/scope/threshold after awards exist. Changes to
  earned rules require a new definition key, not reinterpretation of old awards.
- **Awards:** UUID, profile FK, definition FK, applicable region, awarded time,
  optional triggering review, progress at award, source (`review` or `backfill`),
  revoked time/reason. No generic metadata bag until a concrete field needs it.

Enforce scope, not just uniqueness: global definitions require no region;
regional definitions require one. A plain CHECK cannot validate another table's
definition scope; use a composite FK plus local CHECKs or a constrained trigger.
Use separate global/regional partial unique indexes to handle NULL correctly.
Retain revoked rows in those indexes. Never use `ON DELETE SET NULL` for region:
restrict physical deletion of referenced regions and disable them instead.
The triggering review may safely become NULL on physical deletion.

Raw tables have RLS and no direct client grants. Narrow authenticated RPCs derive
the owner from `auth.uid()`, reject missing/deleted owners, use a fixed safe
search path and revoke default PUBLIC execution. Internal evaluators cannot be
called with arbitrary profile IDs by clients. Own reads only for this MVP.

Future public reads must reuse actual viewer rules. `profiles.is_public` governs
visitor visibility; signed-in access uses `is_member_visible`, including blocks.
Do not replace those with a blanket `is_public = true` rule for all viewers.
Never expose revocation reasons or trigger-review IDs publicly.

One SQL metric projection feeds reads and evaluation. Count from active reviews;
do not maintain a second counter table yet. Index and measure on realistic data.
Serialize per-member award evaluation with a transaction advisory lock and enforce
uniqueness independently. Use a consistent lock order on publish/edit/reconcile.
An evaluator scans all eligible series/regions, not only the triggering region,
so older history and reassignment do not leave permanent gaps.

## 7. Failure, backfill and reconciliation — approval required

Recommended small design: attempt award evaluation in the publish/edit transaction
inside a contained exception block. If the evaluator fails, roll back that block's
award inserts only, return `pending` with no unlocks, and preserve the saved review.
Log the failure without private payloads. Lock timeout/cancellation handling must
be tested explicitly; do not assume every PostgreSQL error is caught by OTHERS.
General database outages can still fail a review; only Passport failures are isolated.

On Passport open, run an owner-scoped reconciliation RPC, then read the overview.
Also support an operator-run, bounded reconciliation for existing accounts. This
avoids a background queue/worker in the first release, but has an important limit:
**a temporary threshold reached and then deleted before successful evaluation may
never earn a stamp.** Awards record evaluated milestones, not guaranteed historical
crossings. If that is unacceptable, approve a durable event/outbox design before
implementation; do not silently promise both simplicity and guaranteed history.

Backfill recommendation: count existing active reviews, award all satisfied tiers
at reconciliation time, record source `backfill`, and never invent earned dates.
Existing members should not need to publish again merely to import their history.
Award persistence and celebration delivery are separate: awards are idempotent;
modal delivery is best effort, not guaranteed exactly-once.

Use one server-owned Passport enable flag checked by reads and evaluation. Disabled
means no entry point, no evaluation and no effect on old review behavior. Do not
reuse definition.enabled as the feature flag. Roll out to internal users before
general availability; define the server cohort rule if staged access is retained.

## 8. Implementation order and release gates

1. Approve the decisions below and inspect production data read-only for threshold
   attainability, location/region coverage and likely query cost.
2. Complete focused profile ownership and review image-handling refactors in
   separate commits; preserve existing upload/edit compensation and navigation.
3. Add new migrations, four-series seed catalog, metrics, award reconciliation,
   permissions and failure isolation. Test against development Supabase first.
4. Implement the Passport module, own screens and Profile entry. Then add optional
   publish decoding and celebration integration. No new native dependencies needed.
5. Bump `app.config.ts` and the package version mirror to **4.2.0** on this release
   branch before creating the new binary. Keep runtime policy `appVersion`.
6. Validate the preview binary against development, then deploy reviewed additive
   backend changes to production with Passport disabled. Verify old clients still
   publish/edit/delete normally before TestFlight and feature enablement.
7. Ship 4.2.0 through TestFlight/App Store. Do not publish Passport to runtime 4.1.0.
   Disable Passport on regression; retain earned records and forward-fix the backend.

Required tests: distinct counts, null IDs, inactive reviews, edits/deletes, region
reassignment/disable, existing-history backfill, concurrent/repeated evaluation,
revocation and restore, owner isolation, soft/hard account deletion, evaluator
failure without review loss, and both legacy RPC response contracts. Specifically
test malformed optional Passport data cannot delete a published review image.

App tests cover decoders, empty/error/disabled states, deterministic suggestions
and celebration completion. Database authorization needs pgTAP, not only mocked
Jest tests. Device checks cover Dynamic Type, VoiceOver, both themes, long region
names, offline recovery and repeated review submissions. Run typecheck, lint,
formatting, Jest, database tests and an iOS export before release.

Minimal analytics: views and challenge actions through existing allowlists;
awards are counted from the server ledger, not client unlock events. Extend both
client and Edge Function validators before adding event names/properties. Existing
`log_celebration_event` accepts text kinds, but achievement key generation needs
a Passport branch. Defer retention experiments; the original three-stamp cohort
comparison was observational and cannot establish that Passport caused retention.

## Decisions needed before schema implementation

1. Approve four series and own-only Passport for 4.2.0, with the deferred scope above.
2. Approve stamp permanence after ordinary deletion, with explicit revocation.
3. Approve importing existing active history without retroactive earned dates.
4. Choose evaluated milestones with reconciliation (recommended above), or durable
   historical crossings with the additional event/outbox infrastructure.

## Evidence checked

- `services/reviewPublishingService.ts`: optional decoding/cleanup risk and current result.
- `utils/reviewSubmission.ts`, `utils/celebrations.ts`: completion ordering and achievement union.
- `supabase/migrations/20260823150000_identity_bound_mentions.sql`: separate publish/edit RPCs.
- `supabase/migrations/20260824090000_golden_glass.sql`: region IDs, free-text neighbourhoods,
  active-review predicate and snapshot-based Golden Glass.
- `supabase/migrations/20260824140000_regions_use_explicit_catchment_radius.sql`:
  location-region reassignment.
- `supabase/migrations/20260820120000_public_profile_visibility.sql`: viewer-dependent privacy.
- `supabase/functions/app-events/index.ts`, `utils/routes.ts`, `RELEASE.md`: integrations.
