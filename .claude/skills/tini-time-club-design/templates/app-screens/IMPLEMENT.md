# App screens — implementation notes

`AppScreens.dc.html` draws the app's real routes against the brand. Everything here is domain-true: it follows the data the app actually stores, not a generic social feed.

## The three domain facts the design is built on

1. **A review has two scores, not one.** `reviews.taste` and `reviews.presentation`, 1–5 each, both rendered as olives (`RatingPips`). The blended TTC number is derived and shown in mono/display beside them — never instead of them. The `ratingAxes` tweak shows the blended-only alternative for comparison; the two-axis version is the default and the recommended one.
2. **A place carries server-side aggregates.** `location_ratings` gives `rating`, `taste_avg`, `presentation_avg`, `total_ratings`. The place header renders all four — the aggregate as a large chartreuse numeral on green, the two averages as meters.
3. **A member holds a shelf rank.** `getRankTier(profile.review_count)` → Well / Call / Premium / Top Shelf, each with a fixed hex (`utils/ranking.ts`). The ring around every avatar is that tier's gradient, and the profile shows progress to the next floor from `getRankProgress`.

## Screen → file

| Screen | Route file | Also touches |
|---|---|---|
| Feed | `app/(tabs)/(home)/home.tsx` | `components/ReviewItem.tsx` |
| Places | `app/(tabs)/(places)/places.tsx` | `components/map/ClusteredMap.tsx` |
| Place detail | `app/(tabs)/(home,discover,places,profile)/places/[place].tsx` | `location_ratings` view |
| Composer | `app/(tabs)/review.tsx` | `components/shared/VerdictBlock.tsx` |
| Profile | `app/(tabs)/(profile)/profile.tsx` | `utils/ranking.ts`, `components/shared/AvatarRing.tsx` |
| Discover | `app/(tabs)/(discover)/discover.tsx` | — |

## Order to build in

1. **Feed card** — the biggest visual delta. Photo goes full-bleed inside the card with the venue chip on a `scrimStrong` plate bottom-left and spirit/type pills bottom-right; ratings move below the photo as two labelled olive rows plus the aggregate. Replaces the current stacked header/photo/footer layout in `ReviewItem`.
2. **Place detail header** — green aggregate block with the two meters. New; today there is no aggregate treatment.
3. **Profile header** — deep-green block, tier ring, tier badge in the tier's own hex, progress bar to the next floor, three ink stat tiles.
4. **Places + Discover** — green header with the `onInk` search field, chip row, then paper content.
5. **Composer** — keep the existing purple `VerdictBlock` for taste; the presentation block is the paper variant so one screen never carries two full purple blocks.

## Rules the screens encode

- Max two brand colours per surface plus neutrals. The feed card is paper + green; the banner is deep green + chartreuse; the composer's taste block is the one purple surface.
- One flat-colour block per screen. Feed = the tini-time banner. Place = the aggregate block. Profile = the header.
- Controls are pill; surfaces are soft-square (cards 22, sheets 28, thumbs 16).
- Display headlines are lowercase, black weight, leading below 1, negative tracking. Eyebrows are uppercase and tracked. Numbers that are read as data (distance, ratings count, averages, handles) are DM Mono.
- Olives only. No stars anywhere.
- Every tap target ≥ 44px.

## Two substitutions still open

Same as `readme.md` §7 — Figtree stands in for the wordmark family, and Lucide stands in for an unspecified icon set. The map on the Places screen is a stub: no mapping provider is specified in the design system, and the app uses `ClusteredMap`.
