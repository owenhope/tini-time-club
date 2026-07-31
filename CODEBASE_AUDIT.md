# Codebase Audit — 2026-07-31

Four-lens audit (rendering performance, data layer, duplication/dead code, startup/DX)
of ~21k lines across app/, components/, services/, utils/, hooks/, context/, theme/.
Every finding below was verified against the actual code (file:line included).

---

## P0 — Real bugs found by the audit (fix before the next feature)

### 1. Pull-to-refresh is a silent no-op for 15 minutes
`databaseService.getReviews` caches under `reviews_${JSON.stringify(options)}` for 15 min
(`services/databaseService.ts:164-186`, `:42`) and offers no bypass. The refresh handlers on
Location (`components/Location.tsx:507-512`), UserProfile (`components/UserProfile.tsx:706`),
and own profile (`app/(tabs)/(profile)/profile.tsx:576`) all hit the cache — the spinner spins,
nothing updates. Only home.tsx works around it by nuking caches first.
**Fix:** add `forceRefresh?: boolean` to `getReviews` options; pass it from every `isRefresh`
path; delete home.tsx's `clearReviewCaches()` workaround.

### 2. Wrong viewer id → like hearts render the wrong state
`components/UserProfile.tsx:350-354` passes `currentUserId: userId` (the *viewed* user) into
`getReviews`, so `has_liked` is computed for the wrong person; `profile.tsx:153` omits it
entirely so hearts are always unlit on your own profile. Location.tsx gets it right.
**Fix:** pass the signed-in `profile?.id` in both. Also fixes cache-key pollution.

### 3. Duplicate-comment bug on row remount
`home.tsx:637-651` stamps `_commentPatch` onto the review object and never clears it;
`ReviewItem.tsx:686-695` applies it in an effect keyed on object identity, and `addComment`
doesn't dedupe by id. FlatList recycling or navigating away/back re-applies the same patch.
**Fix:** seq-stamp the patch and track last-applied seq in a ref (or clear after apply);
dedupe by comment id. Add a test (render → unmount → remount with same object).

### 4. Splash screen can hang forever
The only paths that set `isReady=true` are the auth callback and the deep-link error handler
(`app/_layout.tsx:130`, `:120`, `:87`). If `getSession()` rejects (the AES-decrypt storage
adapter in `utils/supabase.ts:66-84` can throw on corrupt payloads), the user is stuck on
splash with no recovery.
**Fix:** 5s watchdog that forces `isReady` + `hideAsync`; try/catch in the storage adapter
returning `null` (forces re-login instead of hanging).

### 5. Deep-link cold start can strand a signed-in user on the welcome screen
`app/_layout.tsx:141-143` skips *all* initial navigation if any launch URL is present, not
just auth callbacks.
**Fix:** narrow the guard to `isAuthCallbackUrl(url) || recovery`, else fall through to the
session redirect.

### 6. Analytics are anonymous and cross-contaminate users
`AnalyticService.identify`/`reset` exist but are never called (verified repo-wide). After
logout the next user's events merge into the previous user's PostHog profile. Key is
hard-coded so dev events pollute prod.
**Fix:** identify on `SIGNED_IN`, reset on `SIGNED_OUT` in `_layout.tsx:158-168`; add an
`environment` super-property from `app.config.ts` extra.

---

## P1 — Quick wins (each ≤ ~1 hour, high payoff)

### Startup
- **Remove 600 ms of hard-coded sleeps** — `_layout.tsx:137` (200 ms) and `:154` (400 ms)
  run on every cold start. Replace with router-ready gating + `hideAsync` in first screen's
  `onLayout`.
- **Delete the redundant cold-start cache sweep** — `_layout.tsx:70` `clearExpiredCache()`
  does a *sequential* `AsyncStorage.getItem` per cached key (`utils/imageCache.ts:461-501`)
  racing `loadFromStorage()` (`:69`), which already prunes expired entries via one
  `multiGet`/`multiRemove`.

### Feed rendering
- **Hoist `new Filter()`** — `home.tsx:327` constructs the whole bad-words list on *every*
  render. Move to module scope.
- **Prefetch into the right cache** — `home.tsx:319` uses RN `Image.prefetch` but the feed
  renders with `expo-image`; every feed image downloads twice. Use
  `ExpoImage.prefetch(urls, { cachePolicy: "memory-disk" })`.
- **List tuning** — feed `initialNumToRender={10}` (`home.tsx:784`) renders ~13 screens of
  full-bleed cards before first paint; use 2–3, `windowSize` ~5. Location's review list
  (`Location.tsx:630-644`) has zero windowing config — mirror the same tuning.
  ReviewGrid: add `getItemLayout` (tile size is deterministic) + `initialNumToRender={12}`.

### Data layer
- **Batch signed URLs** — `imageCache.getReviewImageUrls` (`utils/imageCache.ts:267-307`)
  issues one `createSignedUrl` HTTP call *per image* (~20 per feed page). supabase-js ships
  `createSignedUrls(paths, expiresIn)` — one POST — plus persist with one `multiSet`.
  This is the dominant first-paint blocker on every review surface.
- **Stop double-fetching on profile entry** — `profile.tsx` has three overlapping effects
  (`:86-104`, `:374-381`, `:416-443`) that fire the same five queries twice on mount, counts
  sequentially, then everything again on every tab focus with no staleness guard. Delete the
  superseded effect, `Promise.all` the counts, add a `lastRefreshTime` gate like home.tsx.
- **Avatar URL is sync pretending to be async** — `getAvatarUrl` only does local string
  construction, but `Avatar.tsx`/`useAvatar` await it in an effect, so every avatar mounts
  blank then re-renders. Export a sync version + `useMemo`.

### Dependencies & hygiene
- **Remove 6 unused deps** (2 carry native code into every build):
  `@react-native-community/blur`, `react-native-google-places-autocomplete`,
  `expo-application`, `expo-media-library`, `expo-web-browser`, `expo-font`; drop direct
  `expo-modules-core`; run `npx expo install --check` (17 version mismatches, and
  `@types/jest@30` vs jest 29); pin `@types/jest@^29`.
- **`eslint --fix`** clears 25 unused-vars + 4 duplicate-imports of the 86 warnings; then add
  `--max-warnings` ratchet to the lint script.

---

## P2 — Pre-feature refactors (do the ones touching the code your feature will touch)

### Profile screens are the same screen, forked (~420 duplicated lines)
`app/(tabs)/(profile)/profile.tsx` (783 lines) and `components/UserProfile.tsx` (942 lines)
duplicate: reviews/regulars/favorite-location/spirits-types loading, follow-count fetch
(3 copies), favorite-tags JSX, favorite-location JSX, and 13+ byte-identical style keys —
already drifting (different loading UI, different fetch limits, focus-refresh only on one).
**Plan (staged):**
1. `hooks/useProfileScreenData.ts` owning all fetches (~250 lines killed, no UI risk)
2. `components/profile/FavoriteTags.tsx` + `FavoriteLocationLink.tsx` (shared JSX + styles)
3. (Later) full `ProfileScreen` merge with `isOwnProfile` gating

### Review image hydration copy-pasted 4×
Identical 6-line block in home.tsx:210, profile.tsx:160, UserProfile.tsx:357,
Location.tsx:492 — and it's where `Review` becomes `any`.
**Fix:** move into `databaseService.getReviews` (or `hydrateReviewImages`) returning a real
`Review[]`. Cheapest fix with the widest reach; unblocks typing.

### Type the data layer
14 of ~20 `databaseService` methods return `Promise<any>`; 107 `: any` annotations in the
audited dirs; no canonical `Profile` type (3 competing shapes); `Review` is missing the
engagement fields the code reads via `(review as any)`. Start with
`getReviews(): Promise<Review[]>` and a canonical `Profile`.

### ReviewItem.tsx split (1,192 lines: 8 components + 3 hooks + 46-key stylesheet)
Extract `useLikes`/`useComments`/`useReviewAvatar` hooks, then `ReviewFooter`/
`ReviewOverlay`/`ReviewActions` with colocated styles. The hooks are immediately reusable
by LikeSlider/CommentsSlider. Fold in theme-token adoption for this file while at it.

### Location screen data
- `fetchSelectedLocation` (`Location.tsx:264-361`) downloads **every review row** to compute
  two averages client-side. The `location_ratings` view already computes them, and
  `databaseService.getLocation()` already wraps it with caching — but has zero callers
  (blocked only by the view's `HAVING count > 0`). Relax the view, use the service, delete
  the PostGIS regex parsing.
- Location reviews truncate at the default limit 20 with no pagination — lift home.tsx's
  pagination into a shared `useReviewFeed` hook (UserProfile has the same issue).
- DiscoverTabs search repeats the all-reviews over-fetch across up to 20 locations per
  keystroke (`DiscoverTabs.tsx:238-320`); the "nearby" ranking filters *after* a global
  top-50, so nearby bars can never appear. Push filters/ordering into the query.

### Scroll-driven animation offload
- Collapsible header (`hooks/useCollapsibleHeader.ts` + home/Location) animates `height` on
  the JS thread every scroll frame. Move to `Animated.event(..., {useNativeDriver: true})`
  + transform-based collapse.
- RatingSummary bars animate `width` with `useNativeDriver: false`, restarting on every
  viewability flip in the feed (`RatingSummary.tsx:355-364`). Animate `scaleX` natively;
  skip restart when pct unchanged.
- Feed `extraData={visibleReviewIds}` + per-event `Set` allocation re-renders all mounted
  cells on every viewability change (`home.tsx:670-700`, `:786`).

### Observability
- **No crash reporting, no error boundary** — add `@sentry/react-native` (config plugin),
  export `ErrorBoundary` from `_layout.tsx`, route the 128 ungated `console.error` calls
  through a `__DEV__`-gated `utils/log.ts` with `reportError` → Sentry.
- Error swallowing: Location review-fetch failure leaves the *previous* location's list on
  screen; `getRegularsByLocation` returns empty Map on error (indistinguishable from "no
  regulars"); profile count queries discard `error` and render 0.

### Service-layer discipline
37 raw `supabase.from(...)` calls in UI components (vs 22 in the service) — these opt out
of the service's dedupe/caching. Add `followService`/`profileService`/`locationService`
wrappers; ESLint rule banning `supabase.from` outside services/. Also scope
`invalidateUserCaches` (currently any write nukes every cached feed page).

### Regulars service
No cache, no in-flight dedupe; the map re-fetches regulars for all visible locations on
every pan (`places.tsx:262-297`), and `locations_in_view` has no LIMIT. Memoize per
location id, subtract cached ids from the RPC call, add a LIMIT.

---

## P3 — Cleanups (mechanical, anytime)

- **Dead code:** `ExpandableText` (ReviewItem.tsx:78-120), 6 dead ProfileHeader props
  (doesFollow/followPending/isBlocked/onFollow/onBlock/onUnblock + stale doc comment),
  `components/Tag.tsx` (0 importers; or make it the shared chip), shared
  `ProfileIdentity`/`SectionCard`/`ActionBar` (344 lines, 0 consumers),
  `imageCache.fetchAvatarUrl` + the 4 avatar-cache clearers (cache never read),
  `databaseService.getLocationsWithReviews`/`clearAllCaches` phantom-cache code,
  `imageCache.isUrlValid`, duplicate `HIT_SLOP` in ReviewItem.
- **53 dead style keys** (Location.tsx 22, ReviewItem.tsx 10, UserProfile.tsx 8,
  profile.tsx 6, home.tsx 7, DiscoverTabs.tsx 4).
- **Theme adoption:** 136 raw `fontSize` + 94 raw padding/margin literals bypassing
  `theme/tokens.ts` scales (worst: ReviewItem 22, home 13). Convert file-by-file; add
  `no-restricted-syntax` lint rule to stop the bleed.
- **Navigation consistency:** router.push/replace/navigate + navigation.navigate mixed
  within single files; two different ways to reach the followers screen. Add typed
  `utils/routes.ts` builders; drop the `as never` casts.
- **Empty-string sentinel leak:** `imageCache` caches missing images as `""`, which flows
  through `imageUrls[path] || path` into `<Image>` as a bare storage path.
- **Unbounded queries:** `getComments` (`select("*")`, no limit), `UserFollowList` and
  `LikeSlider` (sequential waterfalls, no `.range()`), `getSpirits`/`getTypes`
  (`select("*")` for id+name).

## Testing (current: 6 suites / 48 assertions, pure functions only)
Highest-value next tests:
1. `_commentPatch` round-trip (pins P0 #3)
2. `utils/authDeepLink.ts` (`createSessionFromAuthUrl`, `isAuthCallbackUrl`) — gates all
   magic-link/recovery entry, zero tests
3. `authCache.getProfile` validity matrix (version bump / verified flag / user mismatch /
   in-flight dedupe)

## Verified healthy (no action)
- Theme system: `makeStyles` WeakMap cache, memoized ThemeProvider, WCAG-checked pairs
- expo-image call sites (contentFit/cachePolicy/recyclingKey all present)
- Map markers memoized with `tracksViewChanges={false}`
- ReviewItem `areEqual` memoization; overlay animations native-driven
- All keyExtractors stable; no index keys
- Skeleton pulse loops are native-driven and bounded — not a cost
- tsconfig strict: true; metro/babel clean
