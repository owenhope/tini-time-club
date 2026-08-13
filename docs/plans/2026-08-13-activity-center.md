# Activity Center implementation plan

Status: confirmed product design; ready for implementation
Audience: implementation agent
Scope: Expo mobile app and Supabase backend

## Outcome

Add an Instagram-style Activity center at `/activity`. The feed header has a
heart action with an unseen-event count capped visually at `99+`. The screen
shows the signed-in member's follows, review likes, review comments, and admin
messages in reverse chronological order. `comment_replied` is part of the
typed contract but remains dormant until threaded replies are built.

The initial experience prioritizes recent activity, paginates backward for up
to one year, groups review likes, synchronizes seen/read state across devices,
updates in real time, and serves the latest cached page read-only while
offline.

## Non-goals

- Do not add threaded comments or a reply composer.
- Do not show `comment_liked`, `review_created`, `regular_joined`, or
  `regular_left` rows.
- Do not merge the Activity center with the existing `/notifications` push
  preferences screen.
- Do not let Activity preferences suppress event creation. Push preferences
  control delivery only.
- Do not add manual row deletion, swipe actions, or Clear all.
- Do not build a new push pipeline. Reuse the existing notification ledger and
  push-tap handling.
- Do not physically delete delivery records for Activity retention or undo.

## Confirmed product contract

### Placement and navigation

- Route: `/activity`.
- Screen title: `Activity`.
- Entry point: heart-outline action at the top right of the feed's large
  `AppHeader`.
- Badge: exact number of underlying unseen supported events, visually capped
  at `99+`; accessibility text announces the uncapped count.
- Keep `/notifications` named and routed as the notification-preferences
  screen.

### Supported rows

| Kind               | Copy                                                      | Leading         | Trailing                               | Row destination                              |
| ------------------ | --------------------------------------------------------- | --------------- | -------------------------------------- | -------------------------------------------- |
| `user_followed`    | **username** started following you                        | Actor avatar    | `Follow back` / `Following`            | Current actor profile                        |
| `review_liked`     | **username** liked your review                            | Actor avatar(s) | Review thumbnail                       | Exact review                                 |
| `review_commented` | **username** commented on your review: _one-line snippet_ | Actor avatar    | Review thumbnail                       | Exact review with comments open              |
| `comment_replied`  | **username** replied to your comment: _one-line snippet_  | Actor avatar    | Review thumbnail                       | Exact review with comments open              |
| `admin_message`    | Stored admin body verbatim                                | App/system mark | App/system mark or no trailing control | Allowlisted internal route, or no navigation |

Use the actor's current username and profile presentation. Do not style the
frozen notification `body` for social rows. Continue using the stored body for
admin messages.

`comment_replied` must exist in the TypeScript discriminated union, copy/route
formatter, and tests. The database must not emit it until a future reply model
can supply `commentId`, `parentCommentId`, and `reviewId`.

### Time, grouping, and history

- Order newest first.
- Use cursor pagination by `(created_at, id)`; never use offset pagination.
- The server caps page size at 50; the client requests 30 raw events.
- Query only events less than one year old. Keep older delivery rows stored for
  push/admin analytics.
- Group only `review_liked` events that share a review, Activity section, and a
  rolling 24-hour window.
- A grouped row shows up to three actor avatars, names the newest actor, and
  summarizes the rest as `and N others`.
- Grouping happens over the loaded raw-event set and merges correctly when a
  subsequent page extends a group at the page boundary.
- The badge counts raw unseen events, not rendered groups.
- Tapping a grouped row marks every underlying notification ID read.

### Seen and read semantics

`seen` drives the header badge and the session's `New` section. `read` drives
row styling. They are intentionally different.

1. The initial successful page response includes a server `snapshotAt`.
2. Capture the IDs that were unseen at that snapshot as the screen session's
   `New` set.
3. Mark eligible events through `snapshotAt` seen. A racing insert after the
   snapshot remains unseen.
4. Keep that session's IDs under `New` until the screen unmounts, even after
   the receipt write succeeds.
5. On the next visit, those rows appear under `Earlier`. Untapped rows may
   still carry unread styling.
6. Tapping a row marks its underlying IDs seen and read before routing.
7. Tapping an existing push marks the corresponding row seen and read before
   routing.
8. An event arriving while Activity is visible enters `New`, is marked seen,
   retains unread styling, and does not leave the feed badge incremented.

### Visual behavior

- Use a flat, edge-to-edge list with subtle dividers, not cards.
- Base row layout on `components/RegularPlaceRow.tsx` and the avatar/name/time
  anatomy in `components/CommentsSlider.tsx`.
- Use a 44-point minimum target for every pressable control.
- Unread rows use a subtle semantic surface tint, stronger text weight, and a
  small pimento unread dot.
- Social rows show a current actor avatar and verification state.
- Review activity shows a review thumbnail; fall back to an existing neutral
  place/image treatment when the review has no image.
- Comment/reply snippets are one line with an ellipsis.
- Use `utils/helpers.ts` relative-date formatting unless tests expose a missing
  case.
- Loading uses row-shaped instances of `components/shared/Skeleton.tsx`.
- Empty state: a friendly heart/system mark, `No activity yet`, and a short
  sentence explaining that follows, likes, and comments will appear here.
- Cached offline data remains visible with a quiet offline indicator. Disable
  follow mutations and receipt writes while offline. A no-cache failure shows
  an inline retry state; a cached failure shows a non-blocking retry banner.

## Architecture

Treat `public.notifications` as the immutable event/delivery ledger. Activity
is a read projection over supported direct-user rows (`type = 2`), not a second
event system.

The deep Activity module owns these implementation details behind its
interface:

- secure pagination and hydration;
- supported-kind decoding;
- privacy filtering;
- event withdrawal;
- seen/read receipts;
- like grouping and sectioning;
- realtime reconciliation;
- badge count;
- cache fallback;
- route resolution and analytics.

Screens and `AppHeader` must consume display models and commands from the
module. They must not issue Supabase queries, decode JSON payloads, group rows,
or calculate receipt state.

### Database model

Add these projection tables in one new ordered migration.

```sql
activity_receipts (
  user_id uuid not null references auth.users(id) on delete cascade,
  notification_id uuid not null references public.notifications(id) on delete cascade,
  seen_at timestamptz,
  read_at timestamptz,
  primary key (user_id, notification_id)
)

activity_withdrawals (
  notification_id uuid primary key references public.notifications(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  withdrawn_at timestamptz not null default now(),
  reason text not null
)
```

Valid withdrawal reasons are `source_deleted`, `action_undone`, `blocked`, and
`account_deleted`. Keep the set constrained in SQL.

Required database changes:

- Index direct notifications by `(user_id, created_at DESC, id DESC)` where
  `type = 2`.
- Index receipt queries needed by unseen/read counting.
- Enable RLS on both projection tables.
- Authenticated clients may select only their own direct notification rows,
  receipts, and withdrawals. Keep notification INSERT/UPDATE/DELETE and all
  projection writes unavailable to clients.
- Expose receipt writes only through narrow `SECURITY DEFINER` functions that
  derive `auth.uid()`, validate ownership, set a fixed `search_path`, cap input
  sizes, and revoke PUBLIC execution before granting authenticated execution.
- Add `notifications`, `activity_receipts`, and `activity_withdrawals` to the
  `supabase_realtime` publication idempotently.
- Verify the production database webhook is INSERT-only. Receipt/withdrawal
  writes must never invoke push delivery.

### Database interfaces

Use narrow RPC interfaces; keep joins and privacy rules in their
implementations.

#### `get_activity_page`

Inputs:

- nullable cursor timestamp;
- nullable cursor UUID;
- requested limit, clamped to `1..50`.

Output:

- display-ready raw events;
- stable `nextCursor` or null;
- server `snapshotAt` shared by the page;
- whether more data exists.

Each raw event includes notification ID, kind, created time, actor display
fields, current follow relationship, review ID/thumbnail when relevant,
comment snippet when relevant, sanitized route data, and receipt timestamps.

Implementation invariants:

- Derive recipient from `auth.uid()`.
- Require `type = 2` and the supported-kind allowlist.
- Require `created_at >= now() - interval '1 year'`.
- Exclude withdrawn events.
- Exclude both directions of an active block.
- Exclude actors whose profiles are deleted/deactivated.
- Exclude events whose required review/comment source is unavailable.
- Permit actorless `admin_message` rows.
- Resolve review IDs stored in JSON inside the RPC instead of creating a
  client-side query waterfall.
- Order by `created_at DESC, id DESC`, with a matching two-column cursor.
- Return compatible existing rows; skip malformed legacy rows without failing
  the page.

#### `get_activity_unseen_count`

Return the exact raw count under the same user, kind, age, withdrawal, content,
and privacy filters as `get_activity_page`. A receipt is unseen when missing or
when `seen_at` is null.

#### `mark_activity_seen_through`

Accept `snapshotAt`. Upsert receipts for eligible events owned by the caller
with `created_at <= snapshotAt`. Preserve any existing `read_at`. This
watermark operation is what prevents a newly inserted event from being cleared
by an older screen snapshot.

#### `mark_activity_read`

Accept at most 50 notification IDs. Upsert `seen_at` and `read_at` for eligible
events owned by the caller. A grouped like row passes every underlying ID.

### Event lifecycle

Update event triggers so every new action lifecycle can produce a fresh event:

- Like keys include `liked_at` in addition to actor and review.
- Follow keys include `followed_at` in addition to follower and followed user.
- Comment keys continue using the immutable comment ID.
- Admin keys remain broadcast-ID plus recipient.

Add server-owned withdrawal behavior:

- Deleting a like withdraws its matching like event as `action_undone`.
- Unfollowing withdraws its matching follow event as `action_undone`.
- Deleting a comment withdraws its comment event as `source_deleted`.
- Deleting/unpublishing a review withdraws related like/comment events as
  `source_deleted`.
- Blocking either direction withdraws existing social activity for both
  recipients as `blocked`. Unblocking does not restore historical rows.
- Deactivating an actor hides their events immediately; use a withdrawal
  trigger if the profile mutation has a reliable database path, and retain the
  runtime RPC filter as defense in depth.
- A later re-like or refollow inserts a new notification with a new timestamp
  and lifecycle key. It does not reactivate the old row.

Store source IDs required for deterministic withdrawal in `data`: `reviewId`,
`commentId` where applicable, and the involved user IDs. Preserve existing
payload keys needed by push clients.

### TypeScript module interface

Add `types/activity.ts` with a discriminated `ActivityEvent` union and separate
`ActivityDisplayRow` union. Decode every RPC result at the Activity seam;
unknown or malformed kinds are dropped and reported, never allowed to crash a
page.

Implement the module in `services/activityService.ts` and
`hooks/useActivityFeed.ts`. Keep the screen-facing interface compact:

```ts
type ActivityFeed = {
  sections: ActivitySection[];
  initialState: "loading" | "ready" | "empty" | "offline" | "error";
  refreshing: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  refresh(): Promise<void>;
  loadMore(): Promise<void>;
  activate(row: ActivityDisplayRow): Promise<void>;
  followBack(row: FollowActivityRow): Promise<void>;
};
```

The hook owns session-New IDs, merging/deduplicating pages, grouping,
optimistic receipt state, cache fallback, and visible-screen realtime behavior.
Keep pure grouping/sectioning logic in `utils/activityGrouping.ts` so its table
tests need no React or Supabase setup.

Add `context/activity-context.tsx` above the tab stacks. Its small interface is
only the cross-screen state needed by the header and push handler:

```ts
type ActivityContextValue = {
  unseenCount: number;
  refreshUnseenCount(): Promise<void>;
  markPushOpened(notificationId: string): Promise<void>;
};
```

The provider:

- starts only for a signed-in, non-deleted profile;
- loads unseen count on sign-in, app foreground, and feed focus;
- subscribes to own notification, receipt, and withdrawal changes;
- treats realtime messages as invalidation signals and refetches through RPCs
  rather than rendering raw payloads;
- debounces bursts;
- updates optimistically after local seen/read actions;
- removes subscriptions and user-scoped cache on sign-out/profile change.

### Offline cache

Add a user-scoped Activity cache using the installed AsyncStorage dependency.
Cache only the newest successfully decoded page and its display dependencies;
do not cache arbitrary RPC errors or another member's data. Version the cache
key so a future schema change can invalidate it safely.

The cache is a fallback, not a second source of truth:

- network success replaces it;
- malformed cache is deleted and ignored;
- offline rows are read-only;
- sign-out/profile change removes the previous user's cache;
- returning online triggers a refresh and reconciles by notification ID.

## Implementation sequence

### 1. Lock the contracts with database tests

Files:

- new `supabase/tests/activity_center.test.sql`;
- new ordered `supabase/migrations/*_activity_center.sql`.

Write pgTAP coverage before completing the migration implementation:

- a member sees only their own direct supported rows;
- type-1 broadcasts and unsupported kinds are absent;
- actorless admin messages remain visible;
- both block directions, deleted actors, deleted source content, withdrawals,
  malformed legacy rows, and events older than one year are absent;
- same-timestamp cursor pagination has neither gaps nor duplicates;
- unseen count uses the exact feed predicate;
- receipt RPCs cannot mutate another user's state;
- marking through a snapshot leaves a later insert unseen;
- grouped-ID read calls mark every owned ID and ignore/reject foreign IDs;
- unlike/unfollow/comment deletion creates withdrawals;
- re-like/refollow creates a fresh event;
- anon/authenticated roles cannot fabricate or mutate ledger/projection rows.

Completion criterion: `supabase db reset` and `supabase test db` pass locally,
and manual inspection confirms the push webhook is scoped to INSERT events.

### 2. Add typed decoding and pure presentation rules

Files:

- new `types/activity.ts`;
- new `utils/activityGrouping.ts`;
- new `utils/__tests__/activityGrouping.test.ts`;
- extend `utils/notificationRoutes.ts` and its tests only where the exact review
  route requires it.

Test malformed rows, all supported kinds, current-username copy, comment
truncation, relative ordering, 24-hour grouping, section separation, page-edge
group merging, and grouped unread/ID semantics. Reuse the strict internal-route
allowlist; never navigate directly from arbitrary admin `data.url`.

Completion criterion: every supported row can be derived from decoded fixtures
without React or network access, and unknown input fails closed.

### 3. Build the Activity data module

Files:

- new `services/activityService.ts`;
- new `services/__tests__/activityService.test.ts`;
- new `hooks/useActivityFeed.ts`;
- new `utils/activityCache.ts` and focused cache tests;
- new `context/activity-context.tsx`.

Use the existing Supabase singleton and the repository's fluent-client mocking
style. Report unexpected failures through `utils/log.ts`. Keep refresh,
pagination, race suppression, realtime invalidation, receipt optimism, and
cache fallback behind the module interface.

Completion criterion: module tests cover initial load, refresh, pagination,
realtime insertion, withdrawal, cross-device receipt updates, snapshot races,
offline cache, retry, and profile/sign-out cleanup.

### 4. Extract reusable follow behavior

Files:

- new shared follow-state hook/module under `hooks/` or `services/`;
- new `components/shared/FollowButton.tsx`;
- update `components/ProfileList.tsx` to consume the same interface;
- add focused tests for optimistic follow/unfollow and rollback.

The follow module owns current-state loading, optimistic mutation, rollback,
and analytics. Activity must not duplicate the direct Supabase mutation logic
currently embedded in `ProfileList`.

Completion criterion: ProfileList behavior remains unchanged, and Activity can
render `Follow back`/`Following` from the same tested module.

### 5. Extend the header action without adding a header variant

Files:

- `components/nav/AppHeader.tsx`;
- `components/nav/__tests__/AppHeader.test.tsx`;
- `theme/tokens.ts` and contrast tests if new semantic colors are needed.

Add an optional count adornment to `HeaderAction`. Render nothing at zero,
`1..99`, then `99+`. Preserve the icon's hit target, layout, light/dark
contrast, and accessibility label. Use a semantic pimento unread token; do not
hard-code a raw color in the header.

Completion criterion: all four existing header variants render unchanged when
no count is supplied, and count/accessibility tests pass at 0, 1, 99, and 100.

### 6. Build and route the Activity screen

Files:

- new `app/(tabs)/(home,discover,places,profile)/activity.tsx`;
- new `components/activity/ActivityRow.tsx`;
- new `components/activity/ActivityList.tsx`;
- new `components/activity/ActivitySkeleton.tsx`;
- new `components/activity/ActivityEmptyState.tsx`;
- focused component tests;
- `app/(tabs)/(home,discover,places,profile)/_layout.tsx`;
- `utils/routes.ts`;
- `app/(tabs)/(home)/home.tsx`.

Register `Activity` in the shared stack title map, add `routes.activity()`, and
pass the provider's unseen count to the feed header action. The screen renders
only module display models and commands. Use pull-to-refresh and near-end
pagination guards so repeated `onEndReached` calls cannot overlap.

Row activation order is: optimistic read state, awaited/best-effort receipt
write, analytics, then safe route. A receipt failure must not trap the user on
the screen. Follow-button presses stop row navigation and use the shared follow
module.

Completion criterion: loading, New/Earlier, grouped likes, admin, empty,
offline, retry, refreshing, loading-more, and follow-back states render in
light and dark themes with accessible labels and targets.

### 7. Synchronize push entry and analytics

Files:

- `app/(tabs)/_layout.tsx`;
- `utils/notificationOpens.ts` or a new narrow Activity helper if separation is
  clearer;
- `services/analyticsService.ts` call sites and tests.

When a push payload includes a notification ID for a supported direct event,
mark it seen/read best-effort before using the existing allowlisted router.
Preserve current push-open analytics.

Capture:

- `activity_open`;
- `activity_notification_open` with supported `kind`;
- `activity_follow_back` with success/failure;
- `activity_page_load` with page number/count/cache flag;
- `activity_load_error` with phase, without bodies/usernames.

Completion criterion: push taps, row taps, and follow actions retain navigation
when analytics or receipt logging fails.

### 8. Verify and release backend-first

Run:

```sh
supabase db reset
supabase test db
npm run verify
```

Then perform device QA with two normal accounts and one admin sender:

1. Follow, like, comment, grouped likes, admin message, unlike, refollow, block,
   deleted comment, and deleted review all produce the expected list state.
2. Badge count, `New` snapshot, `Earlier`, unread styling, grouped reads, and
   cross-device receipt sync match the contract.
3. Exact review, open-comments, actor-profile, and allowlisted admin routes
   work; invalid routes remain informational.
4. Activity updates while open, while backgrounded, and after reconnecting.
5. Cached data is scoped to the signed-in member and disappears on sign-out.
6. Light mode, dark mode, large text, VoiceOver/TalkBack labels, reduced
   connectivity, empty history, and `99+` badge are usable.
7. Existing push delivery, notification preferences, ProfileList follows,
   and admin delivery analytics do not regress.

Deploy the migration first. Verify RPC authorization, RLS, realtime
publication, webhook scope, and push delivery in the target environment. Only
then release the app build that exposes the heart action.

Completion criterion: all automated checks and the device matrix pass against
the migrated backend, with no client release depending on an undeployed RPC.

## Acceptance criteria

The feature is complete only when all of these are observable:

- The feed header shows an accessible heart/count action and opens Activity.
- A member cannot read or mutate another member's Activity state.
- Supported activity appears in real time and survives app restarts.
- The initial successful open clears the seen badge without erasing unread row
  styling.
- Grouping, pagination, and same-timestamp cursors produce no duplicates or
  missing events.
- Undo, deletion, block, and deactivation remove affected rows without
  deleting delivery analytics.
- Re-like/refollow creates a fresh event.
- Push taps and in-app taps converge on the same receipt and route behavior.
- Offline cache never crosses accounts and never accepts mutations.
- Unsupported or malformed notification kinds fail closed.
- Existing notification preferences, push delivery, admin analytics, and
  follow UI still work.
- Database tests, TypeScript, lint, Jest, and the manual release matrix pass.

## Existing code to preserve and reuse

- Feed header call site: `app/(tabs)/(home)/home.tsx`.
- Shared pushed-screen header: `app/(tabs)/(home,discover,places,profile)/_layout.tsx`.
- Header action interface: `components/nav/AppHeader.tsx`.
- Existing preference route: `app/(tabs)/(profile)/notifications.tsx`.
- Existing route builders: `utils/routes.ts`.
- Safe notification routes: `utils/notificationRoutes.ts`.
- Push tap/open handling: `app/(tabs)/_layout.tsx` and
  `utils/notificationOpens.ts`.
- Event triggers and ledger hardening:
  `supabase/migrations/20260730120000_secure_push_notifications.sql`.
- Comment source identifiers:
  `supabase/migrations/20260808120000_comment_likes_and_reports.sql`.
- Admin delivery rows: `admin/lib/actions.ts`.
- Theme and typography: `theme/tokens.ts`.
- UI precedents: `components/RegularPlaceRow.tsx`,
  `components/CommentsSlider.tsx`, and `components/shared/Skeleton.tsx`.
- Existing follow implementation to deepen: `components/ProfileList.tsx`.
- Verification command: `npm run verify`.
