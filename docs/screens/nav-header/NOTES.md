# Nav & header — what shipped

Built to `.claude/skills/tini-time-club-design/templates/nav-header/`
(`IMPLEMENT.md` + `NavHeader.dc.html`). Two new components, and the chrome on
every route now comes from them. Screen content was not touched.

## The components

| File | What it is |
|---|---|
| [`components/nav/TabBar.tsx`](../../../components/nav/TabBar.tsx) | Five slots, paper and ink tones, badges, the pour button |
| [`components/nav/AppHeader.tsx`](../../../components/nav/AppHeader.tsx) | Variants A/B/C/D, the scroll crossfade, the status bar |

`components/CustomTabBar.tsx` is gone.

## Which header where

| Variant | Where | Files |
|---|---|---|
| **A** large green | the four tab roots (the fifth slot is the pour button, not a route) | [home](<../../../app/(tabs)/(home)/home.tsx>), [places](<../../../app/(tabs)/(places)/places.tsx>), [DiscoverTabs](../../../components/DiscoverTabs.tsx), [ProfileHeader](../../../components/ProfileHeader.tsx) |
| **B** compact | every pushed list and settings screen, and the collapsed form of A and C | [shared stack layout](<../../../app/(tabs)/(home,discover,places,profile)/_layout.tsx>), [root layout](../../../app/_layout.tsx), [r/[review]](../../../app/r/[review].tsx) |
| **C** over media | place detail, a member's profile | [Location](../../../components/Location.tsx), [UserProfile](../../../components/UserProfile.tsx) |
| **D** modal | the composer, the grid's review sheet | [review](../../../app/review.tsx), [ReviewGrid](../../../components/ReviewGrid.tsx) |

B reaches every pushed screen through the stack's `header` renderer, so
Followers, Following, Settings, Edit Profile, Favorite Location, Information,
Notifications, Terms, Delete Account and Edit Caption all took it without a
line of their own. Terms and Delete Account had hand-rolled bars; those are
deleted.

## The crossfade

One `useCollapsibleHeader` value per screen, 0→1 over 120pt, drives both
halves: A or C fades out on it, and a `compact` header handed the same value
fades in over the top. Wired on place detail, your own profile, and a member's
profile — the three screens whose header scrolls with the content. Nothing
hides on scroll-down.

## Captures

Light and dark, iPhone 17. `header-b-collapsed-light.png` is the crossfade at
the far end.

## Judgement calls

**Green vs purple.** The drawing sets nav glyphs and the modal's primary action
in `#336654`. The palette was re-ranked after these sheets were drawn — purple
primary, green secondary, chartreuse tertiary — so interactive glyphs take
`colors.accent` (purple) to match the rest of the app, and green stays where
the drawing pairs it with chartreuse: the pour button's ring, the active dot's
hairline, variant A's chartreuse-on-green trailing glyph.

**A `+`, not the martini.** Both the nav and places-map drawings put a plus in
the pour button. The tab bar's martini PNG moved to the Feed slot, which is
where the drawing has it.

**The feed's header lost its wordmark and its two icons.** Variant A is a
title, one trailing circle, and either a search field or a chip row. The
greeting headline is the title; compose is the pour button and search is the
Discover tab, so neither needed a second home. (The trailing search circle was
built first and then removed at Owen's request.)

**Discover's segmented control moved out of the green.** The variant carries a
search field *or* a chip row, never both. The search field stayed in the green;
the Places/Profiles segment sits on the paper it filters.

**`r/[review]` takes B, not the C the brief lists for review detail.** That
screen is a deep-link landing page showing one card, and the photo it would put
in the header is the card's own — a media header would show it twice. Review
detail proper is the grid's page sheet, which is presented, so it takes D.

**A member's profile media block has no meta line.** Setting it to their name
printed the name twice, eight points apart, since the identity row below
already carries it.

**Variant C sizes to content when there's no photo.** `locations` has no image
column and a profile has no banner, so a fixed 210 would hold open a block of
empty green. With a photo it is 210 and the name sits at the bottom, as drawn.

## Not built, and why

- **The 14px blur, on both bars.** `expo-blur` is a native module and adding it
  needs a new dev client, which would break the running one mid-session. The
  compact bar is solid instead of paper-at-94%: the drawn translucency only
  works *with* the blur, and at 94% alone a whole identity block read through
  the title (caught in the simulator). The tab bar keeps a token of it. Both
  are one-line changes once `expo-blur` lands — the fill is already a separate
  layer behind the content for exactly that.
- **Long-press the pour button → quick-log sheet.** There is no quick-log
  sheet in the app; building one is a feature, not chrome.
- **The ink tab bar.** Implemented as a prop and left off. Driving it off the
  route put a dark green bar under the paper bottom half of place detail, which
  read as a bug. It turns on when a screen is genuinely full-bleed behind the
  chrome.
- **Tab badges.** Wired to `tabBarBadge`, so a count renders the moment
  something sets one. Nothing does yet.

## Token deltas

Every colour comes from `theme/tokens.ts`. Three of the drawing's values have
no exact token and took the nearest one: the trailing circle's
`rgba(250,249,246,.14)` uses `ratingTrackOnInk` (.18), circle outlines'
`rgba(51,102,84,.24)` use `border` (.18), and B's and D's 16px titles use
`typography.heading` (17px). The badge orange is `BRAND.pimento`, which is the
drawn `#E8763D` exactly.

The media scrim is an SVG gradient — `expo-linear-gradient` isn't a dependency
and `react-native-svg` already is — with `colors.overlay` as its one stop
colour.

## Checks

204 tests pass, `tsc` clean, 0 lint errors. All four variants walked in the
simulator in both schemes.
