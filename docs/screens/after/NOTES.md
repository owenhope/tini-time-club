# Second-pass review — as-built after the fixes

Captures in this folder were taken on iPhone 17 (iOS 26.5) against the
development backend, on `new-design-system`, after all eight items in
`REVIEW.md`'s table. Light and dark for every affected screen; two captures
have no counterpart and say so below.

One commit per item, in the table's order:

| Commit | Item |
|---|---|
| `9c82ceb` | 1 — segment contrast |
| `a23d80c` | 2 — rank preview |
| `8bcf9ee` | 3 — feed photo to 4:3 |
| `d21c3b9` | 4 — meter fill |
| `29833fa` | 5 — bar header restack |
| `1b6ea02` | 6 — typographic hero |
| `ba5ad32` | 6 follow-up — scroll runway |
| `e2b2970` | 6 follow-up — nav title |
| `8a15f34` | 7 — name normalisation |
| `03636eb` | 8 — disabled button |

---

## 1 — Segment contrast

**Files:** `components/DiscoverTabs.tsx`

Both halves now take the system's selected Chip: `highlight` fill, 2px
`accent` border, `onHighlight` ink. The unselected half is `textSecondary` on
paper rather than `textMuted`, and reserves the 2px border so selection
doesn't nudge the labels. The old pairing filled the pill with
`secondarySubtle` and set the label in `secondary` — chartreuse on
chartreuse.

**Captures:** `02-discover-*`, `03-discover-profiles-*`.

## 2 — Rank preview

**Files:** `app/(tabs)/(profile)/profile.tsx`, `components/ProfileHeader.tsx`

The swatch row was already behind `__DEV__`, so it was never in a store
build — but it was in every dev build and in the captures the review was
written from. It now needs a long-press on the avatar as well
(`ProfileHeader` gained `onAvatarLongPress`), so the shipped layout runs
identity → tabs in both cases.

**Captures:** `04-profile-*`; `05-profile-dev-longpress.png` shows the tool
still reachable (light only — it is a dev affordance, not a shipped screen).

## 3 — Feed photo to 4:3

**Files:** `components/ReviewItem.tsx`

The card was at 1:1, not the 4:5 the review measured — either way it ran past
the fold. Now `PHOTO_HEIGHT = CARD_WIDTH * 3/4`. Like / comment / share and
the caption clear the tab bar on first paint on a 6.1".

**Flagged:** the drawing's "crop to 4:3 centre on upload" is *not* done. The
composer stores the capture uncropped (`review.tsx` only compresses), and
display centre-crops via `contentFit="cover"`, which covers old and new
uploads identically. Cropping on upload would mean touching the composer,
which item 3 doesn't name; worth doing separately if the stored bytes matter.

**Captures:** `01-feed-*`.

## 4 — Meter fill

**Files:** `theme/tokens.ts`, `components/shared/RatingSummary.tsx`

Two new tokens: `ratingFillOnInk` (chartreuse, fixed in both schemes) and
`ratingTrackOnInk` (18% paper ink, replacing a hardcoded
`rgba(255,255,255,0.25)`). The meter is the rating accent on both grounds —
chartreuse on green and on photo scrims, pimento on paper.

`ratingFill` on paper is unchanged. The prose says "pimento-500 on paper",
but the drawing's paper column is identical in as-built and proposed, and
`ratingFill` is deliberately pimento-**600** in `tokens.ts` because 500 misses
3:1 against the paper-200 track. Drawing wins, token stays.

**Captures:** `06-bar-detail-*` (on green), `07-map-pin-sheet-*` (on paper),
`01-feed-*` (on the photo scrim).

## 5 — Bar header restack

**Files:** `components/shared/RatingSummary.tsx` (new `headline` variant),
`components/Regulars.tsx` (new `rail` variant + `RegularsRailSkeleton`),
`components/shared/Avatar.tsx` (new `onInk`), `components/Location.tsx`,
`components/map/locationDetails.tsx`

Score and each meter take a full-width row; "Presentation" sets at eyebrow
size and no longer truncates at any width. Regulars became a horizontal rail
of 42pt ringed avatars under a divider. The sheet keeps the first two rows and
drops the rail, as drawn.

`Avatar` gained `onInk` because the initials disc is `accent` — green-700 on
the green header, a ring around nothing. On ink it takes the sage fill with
near-black-green initials, the pairing the REVIEW calls for.

**Flagged:** dropping the rail from the map sheet also drops Regulars from
that sheet entirely — the sheet used to carry a dense Regulars column. That is
what the drawing says ("drop the rail and keep the first two rows"), but it is
a feature removal, not just a relayout. Easy to put back as a rail if you
disagree.

**Captures:** `06-bar-detail-*`, `07-map-pin-sheet-*`.

## 6 — Typographic hero

**Files:** `components/Location.tsx`, new
`components/shared/StickerBadge.tsx`, `components/shared/index.ts`

Fixed 230pt `surfaceInkDeep` block: name in the display cut (lowercase,
dropping a step past 22 characters), street line in mono sage, and the brand
sticker at −9°, its bottom text set to the city. `StickerBadge` is new —
`react-native-svg` `TextPath` around the same arcs the web component uses,
with the olive in the middle. The nav bar takes the same deep green and stops
repeating the name while the hero is on screen.

Two follow-up commits, both caused by the hero's height:

- `ba5ad32` — the header grew by 230pt, and the review list gains all of that
  back as viewport when the header collapses, so a short list ran out of
  scroll and the header rested half-faded. The runway now covers the header's
  own shrink. Cost: a short list has visible blank space at the end.
- `e2b2970` — returning nothing for `headerTitle` made react-navigation fall
  back to the route name, so the page opened with "places/[place]" over the
  hero. The title is rendered and held at zero opacity instead.

**Captures:** `06-bar-detail-*`.

## 7 — Venue name normalisation

**Files:** new `utils/venueName.ts` (+ `utils/__tests__/venueName.test.ts`),
`services/placesService.ts`

Above 80% upper-case letters, a name is title-cased at the service boundary —
both `mapNewPlace` and the autocomplete mapper. Digit-bearing tokens survive
as typed, a name made entirely of short/numeric tokens is left alone
("ONE65 SF"), joiners drop to lowercase unless they lead. `PlaceResult` now
carries `raw_name` for search matching.

**Flagged:** the prose lists `le, la, de` among the joiners, but the drawing
renders "O' by Claude **Le** Tohic" — capitalised. The joiner list is
`and, at, by, of, on, the`, which reproduces all three drawn examples exactly.
Add the French articles if the prose was the intent.

**Captures:** `08-venue-names-normalised.png` — the live nearby list showing
"O' by Claude Le Tohic" and "ONE65 San Francisco" (light only; this is a list
of strings, not a treatment).

## 8 — Disabled button

**Files:** `components/shared/Button.tsx`, `app/(tabs)/review.tsx`

`Button` was already filling with `disabledSurface` but kept the variant's
own text colour, so a disabled primary set paper-050 on paper-100. Disabled
now pairs `disabledSurface` with `disabledText` in every variant, and takes a
`disabledReason` rendered under the control (and used as the accessibility
hint). The composer's Save caption button came off its own half-opacity pill
onto the shared `Button`, label sentence-cased as drawn.

**Captures:** `09-disabled-save-caption-*`.

---

## Not in the table, seen while capturing

Review §6 and review item 5 are not rows in the implementation table, so they
were not built. All still reproduce:

- **Review item 5** — overlay copy still floats on a gradient rather than a
  solid `scrimStrong` plate (`01-feed-*`). This is the one "Decided" item with
  no table row.
- **Bio glyph** — the filled white circle above the bio is still there
  (`04-profile-*`).
- **"1 reviews"** — Discover's profile rows still don't pluralise
  (`03-discover-profiles-*`).
- **"Regular" tab** — still singular on the profile (`04-profile-*`).
- **Follow button** — not re-checked; it needs another member's profile.

## Checks

`npm test` — 197 passed, 15 suites. `npx tsc --noEmit` — clean.
`npx eslint` on the touched files — 0 errors (warnings are the pre-existing
`fontSize`/`react-hooks` ones).
