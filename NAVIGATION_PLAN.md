# Navigation restructure — handoff

Status as of the end of the 2026-07-27 session. Branch: `upgrade/expo-latest`
(18 commits, **not pushed**, `main` untouched). Typecheck, lint and 102 tests
all pass.

Work through these **one at a time**, verifying each in the simulator before
moving on. That was the working rhythm and it caught several regressions.

---

## 1. Password reset is broken in dev and preview builds

`app/index.tsx:284` hardcodes:

```ts
redirectTo: "tini-time-club://reset-password";
```

`app.config.ts` registers three environment-specific schemes —
`tini-time-club` (prod), `tini-time-club-prev`, `tini-time-club-dev`. So the
reset email opens nothing in dev/preview, or opens a production install.

**Fix:** `redirectTo: Linking.createURL("/reset-password")` (`expo-linking`).
Verify the generated URL in each APP_ENV.

---

## 2. Cross-tab teleporting

Two faults that compound.

**(a) Shared components hardcode the Feed stack.** These render in _every_
tab but always push into `/home/...`:

| File                            | Line | Target                    |
| ------------------------------- | ---- | ------------------------- |
| `components/ReviewItem.tsx`     | 263  | `/home/users/${username}` |
| `components/ReviewItem.tsx`     | 363  | `/home/locations/${id}`   |
| `components/CommentsSlider.tsx` | 152  | `/home/users/${username}` |
| `components/ProfileList.tsx`    | 121  | `/home/users/${username}` |

**(b) `popToTopOnBlur` is asymmetric.** Set on `locations`, `discover`,
`profile` (`app/(tabs)/_layout.tsx:125,166,177`) but **not** `home`. So
tapping a venue from Discover jumps to Home _and_ resets Discover behind
you. Back never returns you; search state is gone.

**Fix:** make those pushes relative to the current stack (the pattern used
in `components/UserProfile.tsx` after the fix in `b3f1019` — build from
`usePathname()`), then make `popToTopOnBlur` consistent across tabs.

Also cross-tab, same class of bug:

- `components/Location.tsx:366`, `components/UserProfile.tsx:638`,
  `app/(tabs)/home/index.tsx:645` all push `/profile/edit-caption`, so
  `router.back()` returns to the Profile tab, not the origin.
- `components/Location.tsx:164` pushes `/(tabs)/locations` — a tab _root_,
  which has no back button. One-way door.
- `app/(tabs)/review.tsx:580` lands on `/profile` regardless of origin.

---

## 3. Route restructure + `locations` → `places`

Nine one-line wrapper files duplicate three screens:

```
(tabs)/{locations,home,discover}/locations/[location].tsx   -> <Location/>
(tabs)/{home,discover}/users/[username].tsx                 -> <UserProfile/>
(tabs)/{home,discover}/users/[username]/{followers,following}.tsx
```

Consequences: duplicate Supabase fetches, **duplicate billed Google Places
lookups**, and divergent follow state between tabs (follow in Home, the
Discover copy still says Follow).

**Fix:** expo-router's array syntax — one file serving several stacks:

```
(tabs)/(home,discover,places)/places/[place].tsx
```

Docs: https://docs.expo.dev/router/advanced/shared-routes/
Verified current: `expo-router@57.0.8` is the latest for SDK 57 — no upgrade
needed. Native tabs exist but are **alpha** with a known SDK 57 issue around
classic Tabs + nested Stacks; leave alone.

Rename `locations` → `places` in the same pass (the tab is already _labelled_
Places, so the URL/display mismatch already exists). Breaks
`tini-time-club://locations/<id>` deep links — add a redirect.

Touch points for the rename: the three route dirs,
`components/map/locationDetails.tsx:29`, `components/Location.tsx:165`,
`components/ReviewItem.tsx:363`, `components/DiscoverTabs.tsx:374`,
`app/(tabs)/home/index.tsx:463`, `app/(tabs)/_layout.tsx:118`,
`components/CustomTabBar.tsx:91`.

While in here:

- `app/(tabs)/profile/follow-list.tsx` is a **third** implementation of the
  follow list (`?type=` instead of a path segment, its own inline query).
  Unify on `components/UserFollowList.tsx`.
- Manual `headerLeft` overrides in `components/UserProfile.tsx:192` and
  `components/Location.tsx:145` duplicate what the stack gives for free and
  vanish while data is loading.
- `home/_layout.tsx` and `discover/_layout.tsx` have drifted
  (`headerTitleStyle`, explicit `headerShown`), so the same screen renders
  differently depending on the tab it was reached from.
- Add a `+not-found.tsx` — there is none, which is why the broken followers
  route showed Expo's raw unmatched screen.
- `components/CustomTabBar.tsx:71` reads `route.state?.key`, undefined until
  a tab has been focused once, so the first re-tap misfires.

---

## 4. Map bottom sheet

`app/(tabs)/locations/index.tsx` hand-rolls it with `PanResponder` +
`Animated`: fixed 340px, no snap points, no backdrop, no velocity handling,
can't scroll its content.

**Fix:** `@gorhom/bottom-sheet`. `react-native-reanimated@4.5.0` and
`react-native-gesture-handler@~2.32.0` are already installed, so it is a
drop-in.

---

## Other open items

- **SDK 57 expo-router breaking changes** not yet audited against this code:
  history API is immutable (`navigation.getState().history` gone, use
  `useNavigationHistory`), and search params no longer auto-stringify
  objects. Codemod: `npx expo-codemod sdk-57-expo-router-migration src`.
  (Modal defaults changed too, but our modals set `presentationStyle`
  explicitly.)
- **~138 ESLint warnings**, mostly the React Compiler family
  (`react-hooks/refs`, `set-state-in-effect`). Set to warn deliberately in
  `eslint.config.js`; tighten to error as they're cleared.
- **CI has never run on GitHub.** `.github/workflows/ci.yml` exists and
  passes locally; the first push will be its real test.
- **Google Places photos** for place profiles — discussed, deferred. Billed
  SKU (~$7/1000), Google forbids storing the photos, and the client key
  can't be app-restricted. Recommended approach is a Supabase edge-function
  proxy; the free alternative is falling back to the most recent review
  photo for that venue.
- **Test account `qa2@hopemediahouse.com` still exists in production.**
  Delete it when convenient.
