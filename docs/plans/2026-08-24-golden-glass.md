# Golden Glass implementation brief

Status: confirmed product design; ready for implementation  
Audience: implementation agent (optimized for a fresh Luna context)  
Scope: Expo app, Supabase backend, and Next.js Admin

## Implementation directive

Implement this feature end to end in the current repository. Treat the product
contract below as locked. Inspect the current worktree and the files named in
the repository map before editing, preserve unrelated work, and follow every
applicable `AGENTS.md` instruction. Make small architectural decisions from the
existing conventions instead of reopening product decisions.

Deliver migration files, application code, Admin code, and automated tests.
Verify the changed surfaces locally. Leave production migration application,
deployment, commit, and push for a separately authorized launch step.

Completion means every acceptance criterion in this document is demonstrably
met; a UI-only mock or an unexercised database design is incomplete.

## Outcome

Replace Explore's **Top Places** view with **Golden Glass**: the current five
best community-rated Martini locations in the selected region. Golden Glass is
a live recognition state, not a contest with one winner and not a yearly
award. Current recipients receive a gold Martini-glass mark, gold location
treatment, and a distinctive gold map pin.

The region is shared across Explore's Map, Golden Glass, and Members views.
Explore starts from the member's geolocation when possible and lets the member
search for another enabled region at any time.

## Product contract

### Explore and regions

- Explore tabs are `Map | Golden Glass | Members`; remove the Top Places label
  and experience.
- Put a tappable region control in the shared Explore header, for example
  `Vancouver ⌄`.
- The region sheet contains `Use My Location` and searchable Admin-enabled
  regions.
- On each fresh Explore session, request geolocation and map it to an enabled
  region. A manual region selection wins for the remainder of that mounted
  Explore session.
- Persist the last manually or automatically resolved region. If geolocation
  is denied or unavailable, restore that selection. If neither exists, open a
  region-selection state rather than silently assigning a city.
- Selecting a region changes all Explore views:
  - Map recenters to the region and shows locations assigned to it.
  - Golden Glass shows that region's current recipients.
  - Members shows members who have published active reviews at locations in
    that region. A profile has no home-city field, so regional contribution is
    the authoritative, privacy-preserving membership rule.
- Seed enabled region records for Vancouver, Seattle, Los Angeles, New York,
  Paris, and Bangkok. Google mappings are Admin-managed data, not hard-coded
  inference from address text.
- An unmapped detected city shows that Golden Glass is not available there and
  offers region search. Never silently substitute the nearest supported city.

### Golden Glass recognition

- A Golden Glass location must be in the current computed Top 5 for exactly
  one enabled region.
- All ten recipients have equal public recognition. Keep their calculated
  order in the list but show no `#1` through `#5`, podium, winner copy, or
  tiered badge.
- Show fewer than five when fewer than five locations qualify.
- Recognition has no year, season, cutoff, archive, or former-recipient
  history. When a location leaves the Top 5, all gold treatment disappears.
- Use reviews from all time and refresh the current ranking automatically at
  least once per day. Store only the current snapshot; do not accumulate award
  history.
- Golden Glass has no Martini type or spirit filters. It is Overall only.

### Ranking contract

Only active/published reviews participate.

For each location:

1. Calculate each review's Overall as `(taste + presentation) / 2` using the
   stored half-point values.
2. Average all qualifying reviews from the same member at that location into
   one member contribution.
3. Let `R` be the mean of those member contributions and `v` be the number of
   distinct contributing members.
4. Require `v >= 3`.
5. Use the standard Bayesian weighted rating
   `adjusted = (v / (v + m)) * R + (m / (v + m)) * C`, where `m = 3` and `C`
   is the mean member contribution across the region. Use the global active
   contribution mean as a fallback only when a region cannot supply `C`.
6. Sort deterministically by:
   1. adjusted score descending;
   2. distinct reviewer count descending;
   3. raw Overall `R` descending;
   4. most recent qualifying review timestamp descending;
   5. location ID ascending.
7. Keep the first five per region.

The public app displays `R`, distinct reviewer count, and latest-review
recency. The adjusted score is internal and may be visible in Admin inspection,
but the consumer UI contains no ranking-formula explanation.

### Golden Glass list

Each recipient card shows:

- a venue image;
- venue name;
- neighborhood, falling back to the existing formatted city/region treatment;
- raw Overall score using the existing rating presentation;
- distinct reviewer count;
- relative recency of the latest qualifying review;
- the gold Martini-glass mark.

Use the most recent active Tini Time review image for the venue image. Fall
back to an existing branded neutral/Martini treatment. Do not introduce Google
Place Photos solely for this feature.

Tapping a card opens the existing native location detail.

### Gold treatment

- Add semantic theme tokens for award gold, readable foreground on gold, and a
  subtle gold surface in both themes. Add them to theme contrast coverage.
- Extend the existing shared `MartiniIcon`; do not introduce a second unrelated
  award glyph.
- Current recipients receive:
  - a gold Martini-glass icon and `Golden Glass` label on native location
    detail;
  - a gold-accented location-detail header treatment;
  - a gold map pin that remains distinguishable when selected;
  - the mark on Golden Glass cards.
- Status is derived from the current snapshot everywhere. Do not persist a
  badge on a location or profile after it leaves the Top 5.

### Membership and public access

- Golden Glass list data is member-only. A visitor tapping the Golden Glass tab
  sees the existing membership flow, and the list component must not mount or
  fetch behind that flow.
- Visitors may see map pins, including the distinct gold pin.
- Pressing **any** map pin as a visitor immediately opens the join/sign-in CTA
  and reveals no location sheet, venue name, address, rating, regulars, or
  other location information. Gate the pin interaction before selecting the
  location or rendering `LocationDetails`.
- Signed-in members retain the current map detail and navigation behavior.
- Existing public web location pages and direct shared/deep-linked location
  pages remain available. The in-app visitor pin boundary must not remove or
  globally privatize those public routes.
- Add a `golden-glass` membership intent and purpose-written CTA copy; migrate
  callers away from the old `top-places` intent.

### Admin

Admin owns the canonical region model and current eligibility controls.

- Add region management under Admin Places:
  - create/edit name and slug;
  - enable/disable availability;
  - set display order;
  - store the region center and automatic catchment radius used when Explore
    switches regions;
  - attach one or more Google city Place IDs to the canonical region.
- Add to each Admin place detail:
  - exactly one nullable region assignment;
  - optional neighborhood;
  - Golden Glass eligible toggle;
  - required reason when made ineligible.
- Add a Golden Glass inspection view grouped by region. Show the current five
  plus enough candidate metrics to audit the result: raw Overall, adjusted
  score, distinct reviewers, latest review, eligibility, and refresh time.
- Admin may change a region's center/catchment or eligibility and then
  refresh/inspect the computed result. Location assignment remains automatic;
  Admin cannot drag, reorder, or directly appoint a recipient.
- Keep Admin mutations server-side through the existing action/data modules
  and service-role client conventions.

## Google-assisted region resolution

Use Google to identify a city, while Admin remains the authority on which
cities belong to a supported canonical region.

- Extend the existing Places API (New) client with city autocomplete using the
  `(cities)` primary-type collection and a session token.
- Resolve a selected city to its Google Place ID, display label, center, and
  viewport.
- Reverse-geocode geolocation coordinates to a locality/city and its Google
  Place ID, then look up that Place ID in the Admin mapping table.
- Treat a Google viewport as external city metadata, not as the region's legal
  or physical boundary. Venue membership is automatically derived from the
  location coordinates and the Admin-configured catchment circle, then stored
  in `locations.region_id`.
- Reuse the current Google request/error conventions and appropriately
  restricted keys. Document the additional Google Cloud prerequisite if the
  Geocoding API is not enabled for the current project/key; this external
  console step is a launch dependency, not a reason to omit the app behavior.
- Never invent production Google Place IDs in a migration. The Admin city
  search/selection flow should populate mappings with verified API results.

## Database contract

Implement the schema in a new ordered migration, following the repository's
RLS and narrow-RPC patterns. Exact names may follow established conventions,
but the resulting model must have these capabilities.

### Canonical data

- `regions`: unique slug, display name, enabled state, display order, map center,
  catchment radius, timestamps.
- `region_google_places`: unique Google city Place ID mapped to one region,
  plus a human-readable Google label.
- `locations.region_id`: nullable foreign key to one region. A single column,
  rather than a join table, enforces one-location-to-one-region.
- `locations.neighborhood`: optional display text.
- `locations.golden_glass_eligible`: non-null boolean defaulting true.
- `locations.golden_glass_ineligibility_reason`: nullable text constrained so
  an ineligible location has a nonblank reason and an eligible one has none.

Existing and new locations are automatically assigned to the nearest matching
region catchment. Locations outside every catchment remain unassigned;
disabled-region and ineligible locations cannot qualify.

### Current ranking projection

Create a current-snapshot table keyed by region and location containing rank,
raw Overall, adjusted score, distinct reviewer count, latest review timestamp,
and refreshed timestamp. Replace each region's snapshot transactionally so
readers never see a partially refreshed Top 5. The table contains current rows
only.

Put calculation in a server-owned SQL function and schedule its refresh daily
using the deployment-supported Supabase scheduling mechanism. Make the refresh
function idempotent and separately callable by service-role/Admin so the Admin
inspection screen can validate changes without manually editing ranks.

### Read interfaces

Expose narrow interfaces rather than making screens rebuild rankings:

- authenticated Golden Glass results for one enabled region, including the
  card fields and current status;
- enabled regions and their map presentation data for region selection;
- Google Place ID to canonical-region resolution without exposing Admin-only
  controls;
- region-scoped member discovery using active reviews at locations in that
  region;
- map/location reads extended with current Golden Glass status.

The Golden Glass result interface must derive the caller from auth, return at
most five rows, and deny anonymous execution. Region-list and map interfaces
may remain visitor-readable with their existing sanitized data boundaries.
Raw snapshot/calculation tables and adjusted scores are unavailable to client
roles. Admin reads them through the service-role server.

Update generated/manual TypeScript types and every affected DTO. Preserve
current blocking, deleted-profile, unpublished-review, and public-content
visibility rules.

## App architecture

Keep region selection and Golden Glass data behind focused modules. The shared
Explore controller owns the selected region and passes it to Map, Golden Glass,
and Members. Screens render display models and issue commands; they do not
calculate awards or call Google/Supabase ad hoc.

Recommended module split:

- a region service for enabled regions, Google resolution, and persisted last
  selection;
- a `useExploreRegion` controller for geolocation/manual-selection state;
- a Golden Glass service for the member-only RPC;
- a dedicated Golden Glass list/card component;
- existing discovery service extended with explicit region input for Members;
- existing map/location DTOs extended with `is_golden_glass`.

Keep Map mounted across tab switches as it is today. Avoid loading member-only
Golden Glass results while Map or Members is active.

## Repository map

Start with these current seams; search again before editing because the
worktree may move:

- Explore controller and existing membership interception:
  `components/explore/ExploreScreen.tsx`
- Current Top Places/Members list implementation:
  `components/explore/ExploreLists.tsx`
- Explore route values and legacy parameter compatibility:
  `components/explore/exploreView.ts`
- Shared geolocation request:
  `components/explore/useExploreLocation.ts`
- Map lifecycle and location fetching:
  `components/explore/ExploreMap.tsx`
- Map selection, pin rendering, and visitor detail surface:
  `components/map/ClusteredMap.tsx`, `components/map/locationPin.tsx`, and
  `components/map/locationDetails.tsx`
- Native location detail: `components/Location.tsx`
- Existing Google Places (New) client: `services/placesService.ts`
- Discovery client and RPC:
  `services/discoveryService.ts` and
  `supabase/migrations/20260823122000_cursor_discovery_pages.sql`
- Membership intent/copy: `utils/membership.ts`
- Theme semantics and contrast tests: `theme/tokens.ts` and
  `theme/__tests__/contrast.test.ts`
- Admin place list/detail and mutations:
  `admin/app/admin/places/`, `admin/lib/data.ts`, and `admin/lib/actions.ts`
- Admin navigation conventions: `admin/components/AdminShell.tsx`
- Current rating-view evolution:
  `supabase/migrations/20260808103000_enable_half_ratings.sql` and later
  location-rating security migrations
- Database contract tests: `supabase/tests/`

## Implementation sequence and completion gates

### 1. Establish the database model

Add canonical region, location-assignment, eligibility, ranking projection,
refresh function, read interfaces, indexes, grants, and RLS. Add pgTAP coverage
for contribution averaging, three-reviewer qualification, Bayesian ordering,
every tie breaker, five-row cap, exclusions, one-region assignment, refresh
replacement, and anonymous denial.

**Complete when:** the migration applies to a fresh/local database and every
ranking/security database test passes.

### 2. Build Admin authority

Add region management, Google city mapping, place assignment/neighborhood/
eligibility editing, validation, and the ranking inspection view. Reuse Admin
primitives and follow `admin/AGENTS.md`.

**Complete when:** an Admin can create an enabled region, map a verified Google
city, assign a place, exclude it with a reason, refresh, and inspect the exact
computed Top 5 without directly changing order.

### 3. Build shared Explore region state

Add geolocation-to-region resolution, last-selection persistence, searchable
region sheet, `Use My Location`, unsupported-region state, and map recentering.
Thread one selected region through all Explore modes.

**Complete when:** geolocation success, denial with saved fallback, first-run
denial without fallback, unsupported city, manual switching, and remount
behavior are covered by tests and match the contract.

### 4. Replace Top Places with Golden Glass

Update route/view types compatibly, add the member-only service and list, render
the five unnumbered cards, and add loading/error/empty states. Existing legacy
`view=places` or `tab=places` links should resolve safely to Golden Glass during
the transition; newly generated routes should use the canonical new value.

**Complete when:** a member sees the correct region's zero-to-five cards and a
visitor cannot mount or fetch the Golden Glass list.

### 5. Apply gold status everywhere

Add semantic gold tokens and accessible treatments to cards, map pins, and
native location detail. Extend map and location reads from the same current
snapshot.

**Complete when:** current recipients have consistent gold status everywhere,
nonrecipients do not, dark/light contrast tests pass, and a refreshed ranking
removes stale treatment.

### 6. Harden visitor pin gating

Move membership enforcement to the map-pin interaction boundary before any
selection/detail rendering. Preserve member navigation and public web/deep-link
routes.

**Complete when:** automated tests prove a visitor pin press triggers the CTA
without rendering or announcing any location information, for gold and normal
pins, while members retain current behavior.

### 7. Verify the integrated feature

Run focused tests while developing, then the repository's available full
checks. At minimum cover:

- root Expo typecheck, formatting check, lint, and Jest suite;
- Admin typecheck, lint, tests, and production build where environment permits;
- Supabase database tests;
- manual light/dark mobile checks for Map, Golden Glass, region sheet, and
  location detail;
- visitor and member paths;
- zero, fewer-than-five, exactly-five, and more-than-five qualifying locations;
- Google errors, denied location, unsupported regions, and stale saved region;
- accessibility labels that do not expose visitor-gated location data.

**Complete when:** all relevant automated checks pass, manual checks show no
contract violations, and any environment-only skipped check is named with the
exact reason and follow-up command.

## Acceptance checklist

- [ ] Explore reads `Map | Golden Glass | Members`.
- [ ] One shared, searchable region selector controls all Explore views.
- [ ] Geolocation resolves through Google city Place ID mappings; saved fallback
      and unsupported states work.
- [ ] Vancouver, Seattle, Los Angeles, New York, Paris, and Bangkok exist as
      enabled canonical regions ready for Admin Google mapping.
- [ ] Each location belongs to at most one region and Admin can manage it.
- [ ] Ranking uses all-time active reviews, one averaged contribution per member,
      at least three distinct reviewers, the specified Bayesian adjustment, and
      deterministic recency-aware ties.
- [ ] Current snapshots refresh automatically daily and retain no award history.
- [ ] Golden Glass returns no more than five equal, unnumbered recipients.
- [ ] Cards show image, venue, neighborhood/fallback, raw Overall, distinct
      reviewers, latest-review recency, and gold Martini mark.
- [ ] Current recipients have a gold card mark, location-detail treatment, and
      map pin; stale recipients lose all three after refresh.
- [ ] No spirit/type filter, annual language, year, past-winner badge, podium, or
      ranking-formula explanation appears.
- [ ] Golden Glass list is member-only and never fetched behind the visitor CTA.
- [ ] Every visitor map pin press shows only the membership CTA and no location
      information.
- [ ] Public web/shared location routes remain functional.
- [ ] Admin can manage regions, mappings, assignment, neighborhood, eligibility,
      reason, refresh, and inspection, but cannot manually order recipients.
- [ ] Database security, app, and Admin tests cover the new behavior and pass.

## Explicit non-goals

- Martini type or spirit rankings and filters.
- Annual, seasonal, or 2026-specific awards.
- Historical recipient records or profile badges for former recipients.
- A single winner, visible numeric ranks, tiers, or categories.
- User notifications, announcement campaigns, or award share cards.
- Google-derived physical region boundaries.
- Admin appointment or manual ordering of Golden Glass recipients.
