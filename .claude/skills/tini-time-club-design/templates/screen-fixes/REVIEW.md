# Second-pass review — as-built screens

## Decided (2026-08-02)

These are approved and are now the spec, not options. Every item below is now
drawn in `ScreenFixes.dc.html` — build them as drawn:

- **Bar header** — full-width stacked rows, not three columns. Applies to the bar
  page and the map sheet.
- **Bar hero** — no venue graphic for now; ship the typographic hero.
- **Venue names** — normalise on the way in.
- **Disabled buttons** — `disabledSurface` + `disabledText`, with the reason below.
- **Rank preview** — cut from the shipped profile; `__DEV__` long-press only (item 2).
- **Feed card** — photo to 4:3 so the action row clears the tab bar (item 3).
- **Meter fill** — chartreuse on green surfaces, pimento-500 on paper (item 4).
- **Overlay copy** — solid `scrimStrong` plate under the photo, not a gradient (item 5).

**Olives on green surfaces.** The web `RatingPips` filled the olive body with
`--accent` and had no way to override it, so on a green header the olive was
byte-identical to its own background. It now takes `onDark` / `bodyColor` /
`emptyColor`, matching the props the React Native version already had. It also
coerces `size` — passed as a string it emitted a unitless CSS height and every
olive collapsed to 0px. **Check the RN side for the same trap:** any
`RatingPips` rendered on `surfaceInk` or a photo scrim needs `bodyColor`, or it
disappears. On the bar header itself the rating is carried by the numeral, not
pips — five olives beside a 46px numeral was redundant anyway.

Also fixed here: the ringed avatars in these mockups were rendering dark-on-dark.
The ring's inner disc is a sage fill with near-black-green initials — the same
pairing the app already uses on green surfaces. Match that anywhere an avatar sits
inside a tier ring.


Read after `IMPLEMENT.md`. These came out of the light/dark captures in
`uploads/tini-time-club-screens/`, not the README's own list. Ordered by severity.
Items 1–5 are drawn in `ScreenFixes.dc.html` alongside the four questions; the
small things in item 6 are described precisely enough to build from.

## 1. Selected segment is unreadable — Discover

`04-discover-profiles`, both schemes. The selected pill takes the chartreuse fill
but keeps a pale label: roughly **1.3:1**. Fix drawn in `ScreenFixes.dc.html` —
chartreuse fill, 2px green-700 border, green-700 ink, matching the system's
selected Chip. Dark mode uses the same pairing; chartreuse is a fixed brand fill
in both schemes.

## 2. Rank preview / Actual row is shipping to users

`05-profile`, `06-profile-regulars`. A row labelled "Rank preview" with
Live / Well / Call / Premium / Top swatches and an "Actual" toggle sits between
the identity block and the tabs. That's a developer tool for checking ring
colours, and it currently reads as a feature nobody can use. Fix drawn in
`ScreenFixes.dc.html` — identity block runs straight into the tabs; the swatches
live behind `__DEV__`, reachable by long-pressing the avatar.

## 3. The feed card never fits

`01-feed`, both schemes. The card is taller than the viewport, so the like /
comment / share row is sliced by the tab bar on first paint — the primary
engagement affordance is the one thing always half-hidden. The photo is running
at roughly 4:5. Fix drawn in `ScreenFixes.dc.html` — 4:3 gives back ~78pt, exactly
the footer plus its padding, and the fold clears on a 6.1". Crop centre on upload;
existing 4:5 uploads centre-crop on display.

## 4. Meter fill disagrees with itself

The bar page (`15-bar-detail`) draws the taste/presentation meters in white on
green; the map sheet (`28-map-pin-sheet`) draws the same two values in pimento
on white. Same data, two colours. Fix drawn in `ScreenFixes.dc.html` — `ratingFill` is
**chartreuse on green surfaces, pimento-500 on paper**, track at 18% ink. The
meter then reads as the rating accent in both places.

## 5. Overlay text needs the heavier plate

`01-feed`, `26-review-preview`. Venue name, spirit/type and both meters sit
directly on the photo under a gradient. On a bright photo the labels land near
2:1. The system has `scrimStrong` for exactly this — anything readable on a
photo gets the plate, not just the gradient. Fix drawn in `ScreenFixes.dc.html` — the bottom
block runs on a solid `scrimStrong` panel with the photo above it, rather than
floating type over the image. Contrast becomes a constant instead of a property
of the picture, and the meter picks up the on-green rule from item 4.

## 6. Small things

- **Bio glyph** (`05-profile`, `08-edit-profile`): a filled white circle sits
  above the bio text — looks like a failed icon load. If it's the olive mark,
  it needs the pimento; if it's decorative, drop it.
- **Follow button** (`12-user-profile`): chartreuse pill inside a grey
  translucent capsule alongside the overflow dots. The grey reads as disabled
  chrome. Give the pair the same `scrimStrong` treatment as the back button.
- **"1 reviews"** (`04-discover-profiles`): needs pluralisation.
- **Regular tab** (`06-profile-regulars`) labelled singular where the rest of
  the app says "Regulars".

## 7. Dark mode holds up

Worth saying: the dark palette reads as the same brand rather than an inversion,
the tier rings keep their medal colours in both schemes as intended, and the
green-on-near-black surfaces keep elevation legible. No changes needed beyond
the items above, which affect both schemes equally.

---

# Implementing this in Claude Code

Everything below assumes you're on `new-design-system`, where the skill is already
vendored at `.claude/skills/`.

**1. Pull this project's templates into the repo.** Download this design system
and copy the two template folders next to the skill so Claude Code can read them:

```
.claude/skills/tini-time-club-design/templates/app-screens/
.claude/skills/tini-time-club-design/templates/screen-fixes/
```

The `.dc.html` files open in a browser — keep one on a second monitor while it
works.

**2. Drop the captures in too**, at `docs/screens/light/` and `docs/screens/dark/`.
Claude Code reads PNGs; being able to see the before is most of the value.

**3. Open a session and paste this:**

> Read `.claude/skills/tini-time-club-design/templates/screen-fixes/REVIEW.md`.
> Work items 1–4 in order, one commit each. Tokens come from `theme/tokens.ts`
> via `useTheme()` — never hardcode hex. Ratings are olives, controls are pill,
> surfaces soft-square. After each item, tell me which files you touched.

**4. Do them one at a time, in this order** — they get progressively less
mechanical:

| Order | Item | Files |
|---|---|---|
| 1 | Segment contrast | the Discover segmented control in `app/(tabs)/(discover)/` |
| 2 | Hide the rank preview | `app/(tabs)/(profile)/profile.tsx` |
| 3 | Feed photo to 4:3 | `components/ReviewItem.tsx` |
| 4 | Meter fill consistency | `components/shared/` + the map sheet |
| 5 | Bar header restack (Q2) | the bar page header + `28-map-pin-sheet`'s sheet |
| 6 | Typographic hero (Q1) | the bar page header |
| 7 | Name normalisation (Q3) | wherever Places results are mapped, in `services/` |
| 8 | Disabled button (Q4) | `components/shared/Button.tsx` |

Items 5 and 6 touch the same header — do 5 first, then 6 on top of it.

**5. Re-capture and compare.** After each batch, take the same screenshot in both
schemes and drop it beside the old one. That's the check that matters; a diff of
the code won't tell you whether the label still truncates.

**When the design system changes here**, re-download and re-copy the skill folder,
then tell Claude Code: *"the tini-time-club skill was updated — re-read it before
the next change."* Nothing in the app imports from it at runtime, so a refresh is
always safe.
