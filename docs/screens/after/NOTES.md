# The screens, after

Captures taken on iPhone 17 (iOS 26.5) against the development backend, on
`new-design-system`. Light and dark for every screen the work touched.

Three passes are recorded here, newest first.

---

# Pass 3 — the brand's own colour order, and the composer

## The palette is re-ranked — `e502977`

**Purple is primary** (buttons, links, active states, the tab bar), green is
the secondary that owns the club's ground surfaces, chartreuse is the loud
third for CTAs on green, selected pills and the compose button. The design
system's sheets rank these the other way round; `theme/tokens.ts` documents
this as a deliberate departure rather than letting it read as drift.

Four things stay green on purpose: the **olives** (a purple olive is not an
olive), the verified marks, the avatar initials disc, and the selected
chip/segment edge — a chartreuse fill carries green ink, so a purple border
would put a third colour on one 34pt control.

Light mode's interactive purple is **purple-700**, not the brand tint: raw
#B6A3E2 is 2.06:1 on white. Dark mode uses the tint, which clears 7:1 on the
dark ground.

## The composer is one page — `0324a84`

The five-step wizard is gone. Photo with a Retake chip, a Where row, Spirit
and Type cards, the purple taste block, the presentation block on paper, the
caption — with Cancel and Post in the bar. Picking a bar, spirit or type
opens a page sheet over the page, so you return to the row you tapped. Post
names what's still missing instead of sitting greyed out.

The presentation block takes the paper tone so the screen carries one purple
surface, not two.

**Captures:** `07-composer-*`.

## The rest

- **Overall, not TTC** — jargon on the one number a member reads first.
- **A greeting for each day** (`utils/tiniTime.ts`), in the club's voice, with
  a test pinning the rules: second person, fragments, one emoji at the end.
- **City and country** wherever a location appears — "North Vancouver, Canada"
  rather than a region code only locals read. A venue only shows its country
  if the stored address has one; rows saved before this show the city alone
  until they're re-resolved.
- **The review card** carries the venue's own score (a plate top-left with its
  overall and review count, kept apart from the review's two scores) and the
  venue chip carries the name over its city.
- **The venue hero** lost its sticker and is 148pt, so the aggregates are on
  screen with the name. The "Rate the martini here" CTA came out.
- **Follow moved into the profile block.** iOS 26 wraps adjacent header items
  in one grey glass capsule, so a chartreuse button in the nav bar read as
  disabled chrome — the review flagged exactly this.

---

# Pass 2 — the screens against `AppScreens.dc.html`

## Feed card — `2560f38`

The card was still the pre-system layout, with every score stacked on the
photo under a scrim. As drawn: a 46pt ringed avatar, the handle, a mono
timestamp, the tier badge; a photo carrying only the venue on a `scrimStrong`
plate and the spirit/type pills; **taste and presentation as olives** below it
under eyebrow labels with the blended score beside them; the caption; the
actions under a hairline.

Bars were the place aggregate's treatment. A review is olives. The photo takes
the drawn 16:11, which is what keeps the actions above the tab bar now that
the scores sit below the image.

## Place detail — `b8c50e7`

The aggregates are a soft-square green card inset on paper — the screen's one
flat-colour block — and reviews are the same three-up grid the profile uses.
The header scrolls away with the grid rather than collapsing in place.

## Profile — `278f437`

84pt avatar beside the name, the handle in mono, the tier as a badge in that
tier's own colour; a full-width progress bar labelled at both ends; the three
stats as tiles across the width. The content tabs became the system's pill
segmented control, and Regulars is plural.

## Places, Discover, tab bar — `08d2ee3`, `a2a7d2a`

Both tab roots gained the drawn green header — the screen's name in the
lowercase display cut with search beneath. Places mounts the place search that
was already written and imported by nothing. The centre tab is the raised
chartreuse compose button, and Discover's rows carry one mono data line with
the counts correctly plural.

---

# Pass 1 — the review's table

| Commit | Item |
|---|---|
| `9c82ceb` | 1 — segment contrast |
| `a23d80c` | 2 — rank preview behind a long-press |
| `8bcf9ee` | 3 — feed photo aspect (since superseded by 16:11) |
| `d21c3b9` | 4 — meter fill |
| `29833fa` | 5 — header restack |
| `1b6ea02` | 6 — typographic hero |
| `8a15f34` | 7 — name normalisation |
| `03636eb` | 8 — disabled button |

The meter is `ratingFillOnInk` (chartreuse) on green and photo scrims and the
pimento on paper; the venue header stacks full-width rows so "Presentation"
can't truncate; venue names are title-cased at the Places boundary with
`raw_name` kept for search; disabled controls take `disabledSurface` +
`disabledText` and state their reason.

---

# The cleanup pass

An audit of the whole app followed the redesign. What it found, and what was
done about it:

- **Blocking was implemented twice** (`f81409e`), and the app used the copy
  that skipped the cache invalidation — so the person you just blocked kept
  appearing in your feed until the 15-minute cache expired. Both blocking and
  reporting now go through the service that owns those caches.
- **Sign-out cleared one cache of three** (`2328af3`). A second account on the
  same device could be served the previous member's feed pages, profiles,
  blocked list and avatar URLs. `clearUserCaches()` empties all three.
- **The two profile screens each had their own body** (`76f9b93`), and the
  copies had drifted: the own-profile one never wired comment handling up, so
  opening one of your own reviews gave you a comment button that did nothing.
- **~1,500 lines of dead code** (`ca95026`): RatingSummary went 828 → 282 (two
  variants and 14 props nothing rendered), plus EmptyState, ListRow,
  MetricRow, RatingSlider, StickerBadge, blockUtils and Regulars' dense
  column.
- **The core state was untyped** (`57a9ebd`). profile-context is .tsx now, and
  typing it caught a missing null guard on the composer's upload path.
  avatar-refresh-context went too — it wrapped the whole tab tree with no
  consumers.
- **`withRegulars()`** (`ba0808f`) replaces the same map-and-merge written out
  at four call sites.

## Still outstanding

- **`AppText` is used by nobody who needs it** — 54 raw `<Text>` across the
  four big screens, which is what the ~110 raw-`fontSize` lint warnings
  actually are. A mass rewrite is higher risk than value right now.
- **14 `react-hooks/exhaustive-deps` warnings**, several on the feed's
  loaders. These want fixing one at a time — adding a dep to the wrong effect
  turns a stale read into a loop.
- **`@react-native-picker/picker`** is unused but autolinked, so removing it
  needs a dev-client rebuild.
- **`CODEBASE_AUDIT.md` and `NAVIGATION_PLAN.md`** both describe finished work
  and read as current.

## Checks

`npm test` — 204 passed, 17 suites. `npx tsc --noEmit` — clean. `npx eslint`
over app/components/utils/services/hooks/theme/context — 0 errors.
