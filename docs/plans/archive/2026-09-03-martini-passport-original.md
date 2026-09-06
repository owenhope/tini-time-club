# Martini Passport original proposal — superseded

Preserved for reference. See `../2026-09-03-martini-passport.md` for the simplified
4.2.0 proposal. The scope and implementation assumptions below are not approved.

Status: product and technical plan; ready for implementation review  
Audience: product, design, and implementation agents  
Scope: Expo member app, Supabase, analytics, and a small Admin catalog surface

## Outcome

Add a region-aware **Martini Passport** that turns each published review into
durable collection progress. Members earn stamps for meaningful breadth—new
venues, regions, neighbourhoods, spirits, Martini types, and Golden Glass
locations—and receive a clear suggestion for what to explore next.

The Passport should create this return loop:

```text
publish a review
  → advance several challenges
  → earn at most one primary stamp celebration
  → see the next closest challenge
  → find a qualifying venue or Martini type
  → publish another review
```

This is an extension of reviews, regions, Golden Glass, profiles, and the
existing celebration system. It is not a parallel points economy.

## Product principles

1. Reward breadth, discovery, and knowledge—not alcohol volume or speed.
2. A published review is the evidence for Passport progress.
3. Unique venue, type, spirit, and region counts matter more than raw reviews.
4. The Passport is permanent history; a Challenge explains what is next; a
   Stamp records a completed milestone.
5. Region Pages are first-class. Every region uses the same standard series
   and can add curated regional collections later.
6. One review may advance many Challenges, but the UI shows one primary
   celebration and summarizes the rest.
7. No global points leaderboard, daily drinking streak, or time-boxed quantity
   target.

## Canonical language

- **Martini Passport**: a member's permanent collection and achievement
  history across all supported regions.
- **Region Page**: the Passport view for one enabled region, derived from the
  region assigned to reviewed locations.
- **Challenge**: a measurable goal and its current progress. A Challenge may
  be permanent or seasonal.
- **Stamp**: the durable achievement awarded when a Challenge tier is first
  completed.
- **Stamp Series**: ordered achievement tiers sharing one theme, such as Venue
  Journey `1 → 5 → 10 → 25 → 50`.
- **Passport Progress**: current counts derived from active reviews.
- **Passport Award**: the server record proving that a Stamp was earned.

Do not use `badge` as the Passport term; that word already describes Martini
Index metadata and verification/status marks elsewhere in the app.

## Locked MVP rules

### What counts

- Only active/published reviews count toward current progress.
- A venue counts once per member, regardless of how many times it is reviewed.
- A Martini type counts once per member for global diversity and once per
  region for regional diversity.
- A spirit counts once per member for global diversity and once per region for
  regional diversity.
- A neighbourhood counts once after the member reviews any assigned venue in
  it.
- A region counts once after the member reviews any venue assigned to it.
- One review may advance multiple Challenges.
- A review update recomputes progress but cannot award the same Stamp twice.
- A location without `region_id` contributes to global venue/type/spirit
  progress but not to a Region Page.

### Golden Glass history

Golden Glass is currently a live snapshot with no award history. Passport
progress therefore has two distinct meanings:

- **Current Golden Glass progress**: how many venues in the region's current
  top ten the member has reviewed. This is computed live and may change.
- **Golden Glass discovery Stamp**: whether the triggering venue was recognized
  at the time of the review. That fact is stored in the Passport Award's
  metadata and remains part of the member's history.

The UI must label these clearly. Never imply that a venue is still recognized
when only its historical Stamp remains.

### Deletion and moderation

- Current progress is recomputed from active reviews and can decrease when a
  review is deleted or moderated.
- Earned Stamps remain as historical achievements after an ordinary member
  deletion; the member did complete the experience at the time.
- Fraud/moderation tooling may revoke an Award with a reason.
- Account deletion cascades through all Passport data.
- A revoked Award is unavailable publicly and does not count toward totals.

### Safety

- Permanent milestones have no deadlines.
- Seasonal Challenges reward variety across a generous window, never a number
  of drinks per day or week.
- Copy uses `review`, `visit`, `discover`, and `explore`; avoid copy that urges
  members to drink more or faster.

## MVP Stamp catalog

Definitions live in the database so new thresholds and copy can ship without
duplicating rules across clients. Initial definitions are seeded by migration.

| Series                    | Scope  | Thresholds       | Metric                             |
| ------------------------- | ------ | ---------------- | ---------------------------------- |
| Venue Journey             | Global | 1, 5, 10, 25, 50 | Unique reviewed venues             |
| Regional Journey          | Region | 1, 5, 10, 25     | Unique reviewed venues in region   |
| Martini Explorer          | Global | 2, 3, 5, 10      | Unique Martini types               |
| Regional Martini Explorer | Region | 3, 5             | Unique Martini types in region     |
| Spirit Explorer           | Global | 2, 3, 5          | Unique spirits                     |
| Neighbourhood Explorer    | Region | 1, 3, 5, 10      | Unique neighbourhoods              |
| Golden Glass Explorer     | Region | 1, 3, 5, 10      | Current recognized venues reviewed |
| Region Explorer           | Global | 1, 2, 3, 5       | Unique regions                     |

The catalog should use stable keys such as:

```text
venue.global.001
venue.global.005
type.global.003
venue.region.010
golden_glass.region.005
region.global.003
```

Names and artwork can change; keys and earned Awards cannot.

Garnish and preparation achievements are explicitly deferred. The current
review model stores spirit and Martini type but does not capture garnish,
shaken/stirred, or serving style as structured data. Do not infer these from
captions.

## Information architecture

Do not add a sixth native tab. Passport belongs to member identity and should
be reachable from Profile, post-review celebrations, and shared Passport
links.

### Routes

Add typed route builders and routes inside the existing shared tab stack:

```text
/passport                         own Passport overview
/passport/regions/[region]        own Region Page
/passport/stamps/[award]          own Stamp detail
/members/[username]/passport      public member Passport
```

If the existing shared user route convention makes the final public path
different, preserve its compatibility aliases and expose one canonical route
builder.

### Passport overview

Show:

1. identity summary and total Stamps;
2. closest-to-completion Challenge;
3. region cards ordered by member activity, then region display order;
4. recently earned Stamps;
5. global Stamp Series progress;
6. a share action.

Each region card shows unique venues, types, neighbourhoods, earned Stamps,
and a progress summary. Do not fabricate a percentage against all venues in a
region—the location catalog is open-ended. Percentages are allowed only for a
finite collection such as the current Golden Glass ten.

### Region Page

Show:

1. region name and member totals;
2. current Golden Glass completion;
3. closest regional Challenge;
4. regional Stamp Series;
5. neighbourhood progress;
6. recently reviewed venues;
7. `Find a qualifying place` actions that open Explore with the region set.

### Profile integration

- Add a compact Passport row below Taste Profile and above Reviews/Regulars.
- Show total Stamps, regions started, and the three pinned/recent Stamps.
- Own profile action: `Open my Passport`.
- Public profile action: `View Passport`, subject to the existing public
  profile visibility and blocking rules.
- Pinned Stamp selection is deferred; MVP shows the three most recently earned
  non-revoked Stamps.

### Post-review celebration

Extend the existing `CelebrationModal` rather than adding another modal stack.
Priority for the primary celebration:

1. Passport Stamp;
2. member rank-up;
3. new Regular status.

If multiple Stamps unlock, show the rarest/highest-threshold Stamp first and
copy such as `Passport updated · 3 challenges advanced`. The detail sheet can
list all unlocks. Dismissing the celebration must always complete navigation
to the posted review/feed.

## System design

### Deep module seam

Create `services/passportService.ts` as the app's small Passport interface:

```ts
getMyPassport(): Promise<PassportOverview>
getMemberPassport(username: string): Promise<PassportOverview>
getPassportRegion(username: string, regionId: number): Promise<PassportRegion>
```

The module hides RPC names, untrusted payload decoding, display-model
normalization, locked/earned status, progress ordering, and error translation.
Screens do not query Passport tables or calculate achievement thresholds.

`publishReview` remains the write seam. Its existing result gains an optional,
backward-compatible `passport` payload:

```ts
interface PassportPublishResult {
  unlocked: PassportUnlock[];
  advancedCount: number;
  closestChallenge?: PassportChallengeSummary;
}
```

Older app versions ignore the additional JSON fields. Passport evaluation is
best-effort for celebration delivery but atomic for Award integrity: the review
must never fail merely because the client cannot render a celebration.

### Database tables

Add these structures in a new additive migration.

#### `passport_achievement_definitions`

- `key text primary key`
- `series_key text not null`
- `scope text check ('global', 'region')`
- `metric text not null`
- `threshold integer not null check (threshold > 0)`
- `title text not null`
- `description text not null`
- `art_key text not null`
- `tier_order integer not null`
- `rarity_weight integer not null default 0`
- `enabled boolean not null default true`
- timestamps
- unique `(series_key, scope, threshold)`

Definitions are operator-owned. Client roles receive them only through narrow
Passport read RPCs.

#### `passport_awards`

- `id uuid primary key default gen_random_uuid()`
- `profile_id uuid not null references profiles(id) on delete cascade`
- `achievement_key text not null references passport_achievement_definitions`
- `region_id bigint null references regions(id) on delete set null`
- `trigger_review_id bigint null references reviews(id) on delete set null`
- `progress_value integer not null`
- `metadata jsonb not null default '{}'`
- `awarded_at timestamptz not null default now()`
- `revoked_at timestamptz null`
- `revoked_reason text null`

Enforce one Award per member, definition, and applicable scope. Use separate
partial unique indexes for global (`region_id is null`) and regional
(`region_id is not null`) Awards so null semantics cannot permit duplicates.

Raw tables use RLS with no direct client writes. Grants go to service role;
authenticated reads and writes go through security-definer functions that
derive the caller from `auth.uid()`.

### Progress calculation

Use active reviews joined to `locations`, `regions`, `types`, and `spirits`.
Create one internal SQL projection/function that returns normalized metric
rows:

```text
profile_id | scope | region_id | metric | value
```

Supported MVP metrics:

- `unique_venues`
- `unique_types`
- `unique_spirits`
- `unique_neighborhoods`
- `unique_regions`
- `current_golden_glass_venues`

All award evaluation and Passport reads consume this projection. Do not
duplicate `count(distinct ...)` logic across RPCs.

### Award evaluation

Create an internal `evaluate_passport_awards(profile_id, review_id)` function:

1. Lock on the profile ID with a transaction advisory lock.
2. Resolve the review's location and region.
3. calculate current global and affected-region metrics;
4. find enabled definitions whose thresholds are satisfied;
5. insert missing Awards with `on conflict do nothing`;
6. capture immutable trigger metadata, including whether the location was
   Golden Glass-recognized at award time;
7. return newly inserted Awards ordered by rarity, threshold, and key.

Call it inside the existing transactional `publish_review_v2` function after
the review, mention, rank, and Regular effects succeed. Extend the returned
JSON rather than introducing a second client write.

Edits call the evaluator only when type, spirit, or location changes. Deletes
need no Award mutation; read-time progress reflects the active-review set.

### Read RPCs

Expose small, privacy-aware interfaces:

- `get_my_passport()` returns overview, regions, recent Awards, series, and
  closest Challenges.
- `get_member_passport(username)` returns the same public projection only when
  the profile is visible to the caller and neither member has blocked the
  other.
- `get_passport_region(username, region_id)` returns one Region Page and obeys
  the same visibility rules.

Return stable JSON shapes and decode them defensively in `passportService`.
Limit recent awards/reviews server-side. Do not expose revocation notes,
internal metric rows, or other members' review IDs through public Passport
interfaces.

### Challenge recommendations

For MVP, `closest challenge` is deterministic:

1. enabled and not yet earned;
2. progress greater than zero before zero-progress Challenges;
3. smallest positive `threshold - progress`;
4. lower tier first within a Series;
5. stable key as final tie-break.

Return a typed action with the Challenge rather than making the screen infer
navigation:

```ts
type PassportChallengeAction =
  | { kind: "explore-region"; regionId: number }
  | { kind: "open-index" }
  | { kind: "open-golden-glass"; regionId: number };
```

## Presentation modules

Create a focused feature folder:

```text
components/passport/
  PassportOverview.tsx
  PassportRegion.tsx
  PassportRegionCard.tsx
  PassportSeriesCard.tsx
  PassportStamp.tsx
  PassportChallengeCard.tsx
  PassportEmptyState.tsx
```

Shared stamp artwork should be code-native/vector where possible and addressed
by `art_key`. Use theme tokens and semantic typography. Every Stamp exposes an
accessible earned/locked state and progress such as `3 of 5 Martini types`.

Use a restrained physical-passport visual language—ink, embossing, region
marks—without sacrificing the existing dark/light themes or legibility.
Locked Stamps must not rely on opacity alone.

## Analytics

Add allowlisted product events through the existing analytics module:

- `passport_viewed` (`surface`, optional `regionId`)
- `passport_region_viewed` (`regionId`)
- `passport_stamp_unlocked` (`achievementKey`, optional `regionId`)
- `passport_challenge_opened` (`achievementKey`, `actionKind`)
- `passport_shared` (`scope`, optional `regionId`)

Continue logging celebration delivery through `celebration_events` with
`kind = 'passport'` and the stable achievement key. Do not send usernames,
captions, venue names, or precise location in analytics properties.

Primary success metric:

> Members earning three Passport Stamps who publish another review within 30
> days, compared with activated members who have not earned three Stamps.

Supporting metrics:

- Passport open rate after first review;
- Challenge-to-Explore conversion;
- percentage earning a second and third Stamp;
- unique Martini types per activated member;
- unique venues per activated member;
- 7-day and 30-day retention by Stamp cohort.

## Admin scope

MVP Admin work is deliberately small:

- list achievement definitions and enabled state;
- edit title, description, art key, order, and enabled state;
- do not permit changing the key, metric, scope, or threshold after any Award
  exists;
- inspect Awards for moderation and revoke/restore with an audit reason.

Seasonal Challenge scheduling and a full no-code rule builder are deferred.
Initial definitions remain migration-seeded and structural changes require code
review.

## Delivery sequence

### Phase 0 — product contract and visual language

1. Approve canonical terms and MVP series.
2. Approve permanence/deletion rules and safety copy.
3. Design earned, locked, progress, and celebration states in both themes.
4. Confirm the three initial region-card states: active, not started, and
   unsupported/unassigned history.

Exit: product contract is locked; no unresolved rule changes can invalidate
the schema.

### Phase 1 — database foundation

1. Add definitions and Awards tables, constraints, indexes, RLS, and grants.
2. Seed the MVP definition catalog.
3. Implement the normalized progress function.
4. Implement idempotent award evaluation.
5. Add narrow own/public Passport read RPCs.
6. Extend `publish_review_v2` return JSON compatibly.
7. Add focused pgTAP tests.

Exit: database tests prove progress, award idempotency, region scoping,
visibility, blocking, and concurrent evaluation.

### Phase 2 — app data module and screens

1. Add Passport DTOs and defensive decoders.
2. Add `passportService` and focused module tests.
3. Add typed routes and shared-stack registration.
4. Build Passport overview and Region Page.
5. Add loading, empty, offline/error, locked, and partial-progress states.
6. Add Profile entry points for own and public profiles.

Exit: a member can inspect accurate global and regional progress before any
celebration work is enabled.

### Phase 3 — review loop and celebrations

1. Decode Passport results from review publishing.
2. Extend the achievement union and existing Celebration modal.
3. Prioritize one primary Stamp and summarize additional unlocks.
4. Refresh Passport/profile data after publish.
5. Add closest-Challenge actions into Explore, Index, and Golden Glass.
6. Add analytics events and celebration outcome logging.

Exit: publishing one qualifying review updates progress, awards each Stamp once,
shows a non-blocking celebration, and routes to a useful next action.

### Phase 4 — sharing and retention experiment

1. Add shareable Passport and Stamp artwork using existing share conventions.
2. Add canonical public deep links with signed-out membership return paths.
3. Add the Passport module to the weekly reminder only after measuring organic
   usage; notification copy must be personalized and optional.
4. Run the three-Stamp/30-day retention cohort experiment.

Exit: Passport activity creates a measurable acquisition and return loop.

### Phase 5 — post-MVP expansion

Only after retention evidence:

- pinned Stamps;
- seasonal regional Challenges;
- shared friend Challenges;
- region-specific curated collections;
- garnish/preparation series after structured review fields exist;
- physical venue QR stamps;
- rare event Stamps;
- Admin scheduling tools.

## Test plan

### Database contract tests

- duplicate reviews at one venue count as one unique venue;
- different types at one venue advance type but not venue diversity;
- the same type in two regions counts globally once and regionally once each;
- unassigned locations contribute only to global eligible metrics;
- inactive/deleted reviews do not count toward current progress;
- each eligible Award is inserted once under repeated and concurrent calls;
- one review can unlock multiple definitions;
- Golden Glass-at-award metadata is immutable when rankings later change;
- current Golden Glass progress follows the live top ten;
- public Passport reads respect visibility, authentication, and blocks;
- revoked Awards disappear from public and aggregate results;
- account deletion cascades Awards;
- clients cannot insert or edit Awards directly.

### Module tests

- malformed RPC payloads fail with one translated Passport error;
- definitions and progress are sorted deterministically;
- closest-Challenge selection follows the documented order;
- action payloads map to typed route builders;
- older `publish_review_v2` results without Passport fields still decode.

### UI and interaction tests

- overview renders active and not-started regions;
- Region Page distinguishes current Golden Glass progress from historical
  Stamps;
- locked and earned states are accessible without color alone;
- post-review flow displays one primary celebration for multiple unlocks;
- dismissing a celebration completes normal post flow;
- visitor/public Passport behavior returns through membership correctly;
- Dynamic Type, VoiceOver, dark/light mode, small/large iPhones, offline, and
  empty states receive simulator coverage.

## Rollout and compatibility

1. Implement on a working branch and validate against development Supabase.
2. Deploy the additive migration to development with pgTAP coverage.
3. Seed definitions but keep Passport entry points behind a server-readable
   feature flag or disabled catalog state.
4. Test migration backfill/progress performance using realistic review volume.
5. Release a preview build and exercise new, established, private, blocked,
   and deleted-review accounts.
6. Deploy the reviewed additive migration to production before the app code.
7. Enable Passport reads for internal accounts, then a small member cohort.
8. Publish the compatible app update and monitor RPC latency, errors,
   celebration completion, and review-publish success.
9. Enable for all members only after confirming review publishing has no
   regression.

This feature requires database deployment before its JavaScript release. Keep
all existing review-publish result fields and RPC behavior compatible with the
currently installed app during rollout.

## Acceptance criteria

- A member has one Passport spanning all regions.
- Passport overview and Region Pages are derived from published reviews.
- The initial eight Stamp Series calculate according to the locked rules.
- Unique venue/type/spirit/region logic cannot be farmed by duplicate reviews.
- Publishing a qualifying review atomically records missing Awards and returns
  unlocks without breaking older clients.
- A post-review celebration shows one primary Stamp and summarizes additional
  progress.
- Every active Challenge offers a relevant next action.
- Golden Glass current progress and historical recognition are visually and
  semantically distinct.
- Public Passport reads obey existing profile visibility and blocking.
- No client can forge an Award.
- Analytics contain no review text, venue name, username, or precise location.
- Full typecheck, lint, formatting, Jest, pgTAP, and simulator validation pass.

## Decisions to approve before implementation

The plan uses these defaults unless product review changes them:

1. Earned Stamps survive ordinary review deletion but not account deletion or
   moderation revocation.
2. Passport is reached from Profile, not a sixth tab.
3. MVP shows three recent Stamps; manual pinning follows later.
4. Region completion percentages exist only for finite collections such as
   Golden Glass, not the open venue catalog.
5. Seasonal Challenges and garnish/preparation achievements are post-MVP.
6. No points total or global leaderboard.
