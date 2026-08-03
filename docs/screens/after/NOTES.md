# The screens, after

Captures taken on iPhone 17 (iOS 26.5) against the development backend, on
`new-design-system`. Light and dark for every screen the work touched.

Two passes are recorded here:

1. **The review's eight table items** (`templates/screen-fixes/REVIEW.md`).
2. **The screens themselves** (`templates/app-screens/AppScreens.dc.html`),
   which the first pass hadn't been measured against — that is where most of
   what follows came from.

---

# Pass 2 — the screens against `AppScreens.dc.html`

## Feed card — `2560f38`

**Files:** `components/ReviewItem.tsx`

The card was still the pre-system layout: every score stacked on the photo
under a scrim. As drawn, it is now

- a 46pt ringed avatar, the handle, a **mono timestamp**, the tier badge, then
  the overflow control;
- a photo carrying **only** the venue on a `scrimStrong` plate (bottom-left)
  and the spirit/type pills — chartreuse and scrim — bottom-right;
- **taste and presentation as olives** below the photo under eyebrow labels,
  with the blended TTC numeral at the right;
- the caption, then the actions under a hairline at the foot.

The two axes had been drawn as *bars*, which is the place aggregate's
treatment. A review is olives. This is the single biggest correction in the
pass.

The photo takes the drawn **16:11**, not the 4:3 of pass-1 item 3 — with the
scores now below the image, 16:11 is what keeps like/comment/share above the
tab bar. The eye toggle went with the overlay it existed to hide.

**Captures:** `01-feed-*`, `08-composer-preview-light` (same card, composer).

## Place detail — `b8c50e7`

**Files:** `components/Location.tsx`, `components/ReviewGrid.tsx` (reused)

- The aggregates are a **soft-square green card inset on paper**, not a
  full-bleed band. That is the screen's one flat-colour block.
- A primary **"Rate the martini here"** under it, as drawn.
- Reviews are the **three-up grid** the profile uses, under a section header —
  your call, and it also matches how the rest of the app shows a body of work.
- The header scrolls away with the grid instead of collapsing in place, which
  retired the measured-height animation and its scroll-runway workaround. The
  nav bar still picks up the venue name once the hero has gone.

**Captures:** `07-bar-detail-*`.

## Profile — `278f437`

**Files:** `components/ProfileHeader.tsx`, `components/ProfileContentTabs.tsx`,
`components/shared/StatCard.tsx`, `components/shared/AppText.tsx`

Reviews / followers / following looked nothing like the drawing because the
whole header was arranged differently. Top to bottom now:

- 84pt avatar beside the name (24/900), the **handle in mono**, and the tier
  as a badge **in that tier's own colour**;
- a **full-width progress bar labelled at both ends** — "1 review" / "9 to
  Call" — replacing the unlabelled 4px sliver under the avatar;
- the three stats as **tiles across the full width**, values in metric and
  labels as sage eyebrows.

The content tabs became the system's **pill segmented control** (they were
underlined tabs, which is a different system's idea), and the Regulars tab is
finally plural.

**Captures:** `04-profile-*`.

## Places and Discover headers — `08d2ee3`

**Files:** `app/(tabs)/(places)/places.tsx`, `components/DiscoverTabs.tsx`,
`components/map/search.tsx`

Places opened straight onto a full-bleed map — no name, no search, pins under
the status bar. Discover had a segmented control and never said what screen it
was. Both now carry the drawn green header: the screen's name in the lowercase
display cut, search beneath. Places mounts `components/map/search.tsx`, which
was already written and imported by nothing.

**Captures:** `05-places-*`, `02-discover-places-*`, `03-discover-profiles-*`.

## Tab bar and Discover rows — `a2a7d2a`

**Files:** `components/CustomTabBar.tsx`, `components/DiscoverTabs.tsx`

The centre tab is the drawn **chartreuse circle**, raised proud of the bar.
Discover's rows take the drawn line: larger avatar, and one mono line carrying
the data — "1 review · Well", **pluralised** (pass-1 §6) and with the tier
named. Place rows show olives and the aggregate inline instead of a second
score column competing with the name.

## Type fixes — `7971e36`, `e2b2970`, `ba5ad32`

- **The aggregate numeral was clipped at the top.** Leading below the point
  size doesn't tighten type in React Native, it crops the line box. Leading
  now matches the point size; the tightness comes from negative margin. Same
  fix on the venue name.
- The sticker's curved text is sized to the arc, so "North Vancouver" fits.

---

# Pass 1 — the review's table

| Commit | Item | Files |
|---|---|---|
| `9c82ceb` | 1 — segment contrast | `DiscoverTabs.tsx` |
| `a23d80c` | 2 — rank preview behind a long-press | `profile.tsx`, `ProfileHeader.tsx` |
| `8bcf9ee` | 3 — feed photo aspect | `ReviewItem.tsx` (since superseded by 16:11) |
| `d21c3b9` | 4 — meter fill | `theme/tokens.ts`, `RatingSummary.tsx` |
| `29833fa` | 5 — header restack | `RatingSummary.tsx`, `Regulars.tsx`, `Avatar.tsx`, `Location.tsx`, `locationDetails.tsx` |
| `1b6ea02` | 6 — typographic hero | `Location.tsx`, `StickerBadge.tsx` |
| `8a15f34` | 7 — name normalisation | `utils/venueName.ts`, `placesService.ts` |
| `03636eb` | 8 — disabled button | `Button.tsx`, `review.tsx` |

Both halves of the Discover segment take the selected Chip's chartreuse fill,
2px green border and green ink; the meter is `ratingFillOnInk` (chartreuse) on
green and photo scrims and the pimento on paper; the venue header stacks
full-width rows so "Presentation" can't truncate; venue names are title-cased
at the Places boundary with `raw_name` kept for search; disabled controls take
`disabledSurface` + `disabledText` and state their reason.

---

## Flagged

- **The white circle on the profile is data, not a bug.** Pass-1 §6 called it a
  "bio glyph"; it is the member's own `name` field, which contains a
  white-circle character. Nothing to fix in the app.
- **Upload-side cropping still isn't done.** The composer stores the capture
  uncropped and the card centre-crops on display, which covers old and new
  uploads identically.
- **The map sheet has no Regulars.** Dropping the rail there is what the
  screen-fixes drawing says, but it removed a feature rather than relaying it.
- **Not built:** the place page's Reviews / Info segmented control (the info
  screen already has a nav button), the Places screen's filter icon and chip
  row (no filter feature exists to wire them to), and review item 5's
  `scrimStrong` plate — which the feed card's rebuild makes moot, since no
  copy sits on the photo any more except the two chips, both of which carry
  their own plate.
- **The composer is still a five-step wizard**, where the design draws one
  page. That is a product decision older than this pass; the purple taste
  block and paper presentation block inside it do follow the system.

## Checks

`npm test` — 197 passed, 15 suites. `npx tsc --noEmit` — clean. `npx eslint` on
the touched files — 0 errors.
