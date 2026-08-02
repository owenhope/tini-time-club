# Tini Time Club — Design System

> It's tini time 🍸 — the design system for the social network for discovering, reviewing and sharing the world's best martinis.

## 1. Context

**Tini Time Club** is a consumer social app (with a marketing site) for martini lovers. Users discover martinis and bars near and far, post reviews with tasting notes and photos, keep a personal martini journal, earn status at bars they frequent ("Regulars", "Top Shelf"), and follow friends through a community feed.

Product pillars, taken from the client's own product copy:

1. **Discover, review & share** — trending martinis, classic recipes, local bar favourites; reviews with tasting notes + photos; save/organise favourites.
2. **Find the best martinis near you** — nearby lounges, cocktail bars, hidden gems; live ratings; search by flavour profile, ingredient or bar name.
3. **Connect with other martini lovers** — follow friends and mixologists, comment, community feed, profiles.
4. **Your personal martini journal** — every martini you've tried with ratings and notes.
5. **Join the global martini community** — recommendations from real people, worldwide.

### Surfaces represented here

| Surface | Where | Notes |
|---|---|---|
| Mobile app (iOS/Android, React Native — a React logo shipped with the assets) | `ui_kits/mobile_app/` | Feed, Discover/Map, Bar detail, Review composer, Profile |
| Marketing site | `ui_kits/marketing_site/` | Hero, pillars, community proof, download CTA |

### Sources we were given

- `uploads/r1-TiniTime-Logo-wk-07.jpg` — chartreuse wordmark over duotone green coupe photography (poster / social lockup).
- `uploads/r1-TiniTime-Logo-wk-08.jpg` — primary lockup sheet: green wordmark on light grey `#E5E6E8`; "MAKE IT DIRTY" arched badge in green on chartreuse; martini photography.
- `uploads/r1-TiniTime-Logo-wk-09.jpg` — merch application (green wordmark on white long-sleeve tee).
- `uploads/_Icon-1024px-A/B/C.png` — the three approved app-icon colourways (chartreuse-on-green, green-on-chartreuse, green-on-purple).
- `uploads/_Adaptive-Icon-1024px.png` — wordmark on transparent (source of our clean logo cuts).
- `uploads/_Favicon.png`, `uploads/_React-Logo.png`.
- `uploads/stanislav-ivanitskiy-VIYPN3KykEU-unsplash.jpg` — reference photography (dim bar, dirty martini). Credit: Stanislav Ivanitskiy / Unsplash.
- Written brief: company description + a 46-line notification copy bank (the single best source for brand voice — quoted throughout §2).

**No codebase, Figma file or slide template was provided.** Everything visual here is derived from the eight brand images plus the written brief. Component inventory, screen composition and interaction detail are therefore *proposals built to the brand*, not recreations of shipped UI — treat the tokens and brand rules as ground truth and the UI kits as high-fidelity but reviewable.

---

## 2. Content fundamentals

The voice is the strongest asset the brand has. It is **playful, complicit, and slightly bossy** — a friend who has already ordered you a drink.

**Person and stance.** Second person, always. The brand talks *to* you ("Clock out, coupe up", "Your palate has opinions. Publish them."), never about itself. First-person plural appears only as a knowing wink from the club ("We're not saying skip dinner. We're saying gin is botanical.", "Don't make us send this notification twice."). Never "users", never "we at Tini Time Club believe".

**Casing.** Sentence case everywhere in body and UI. The wordmark and display headlines are **lowercase** — that's the logo's own voice ("tini time club."). Uppercase is reserved for tiny utility type: eyebrows, labels, badge lockups ("MAKE IT DIRTY"), and rank names in caps-tracking ("TOP SHELF"). Never all-caps a sentence.

**Rhythm.** Short. Punchy. Sentence fragments are the default. Most lines are one clause plus a turn: setup then payoff, separated by an em dash — "The weekend starts wet 🍸 — find a coupe with your name on it." Two-beat structures do most of the work ("Ice cold, dead classy", "Dirty martini, clean conscience", "Shaken, stirred, or both").

**Emoji — yes, but rationed.** Three glyphs only: 🍸 (martini), 🫒 (olive), and occasionally 👀 / 📈 for social/status nudges. One per line, at the end of a clause, never mid-sentence and never two in a row. In-product they belong in notifications, empty states and celebratory toasts — not in navigation, buttons or form labels.

**Wordplay is on-brand.** Puns are welcome ("Olive you a lot 🫒", "the weekend starts wet"). Innuendo stays PG-13 and self-aware.

**Club framing.** Members are addressed as insiders — "the club runs on reviews. Do your part, agent 🍸". Status is social, not gamified-corporate: Regulars, Top Shelf, "the stool, the bartender nod, the usual". Prefer "the club" over "the community" in-app.

**Responsible-drinking guardrail.** The voice encourages going out, never volume. Keep to one drink per line; never imply intoxication, driving, or "keep going".

### Copy patterns to reuse

| Slot | Pattern | Example |
|---|---|---|
| Push notification | Hook — imperative, ≤12 words, optional 🍸 | "It's tini time 🍸 — Friday night and the shaker's calling." |
| Review nudge | Verdict framing | "Tonight's pour deserves a verdict — rate your tini 🍸" |
| Status / rank | Threat-with-a-smile | "Defend your Regular spot tonight — someone's coming for it 👀" |
| Invite | Conspiratorial | "Recruit for the club tonight — first round's their initiation 🍸" |
| Empty state | Nudge, never apology | "Your journal's dry. Fix that." |
| Primary button | Verb + object, 1–3 words, sentence case | "Rate this tini", "Save to journal", "Find a coupe" |
| Section eyebrow | 1–3 words, uppercase, tracked | "NEAR YOU", "THE CLUB", "TRENDING TONIGHT" |
| Error | Plain, no jokes | "That photo didn't upload. Try again." |

Jokes never appear in errors, legal, permissions or age-gate copy. Be funny where it costs the user nothing.

---

## 3. Visual foundations

### Colour

Four brand colours, taken by pixel-sample from the supplied artwork. There is no fifth.

| Token | Hex | Role |
|---|---|---|
| `--green-700` | `#336654` | **The brand.** The logo colour. Ink for headings and body, primary button fill, map pins, icon strokes. |
| `--purple-500` | `#B6A3E2` | **Primary background.** Full-bleed brand surface (icon colourway C, marketing hero, section blocks). |
| `--chartreuse-500` | `#F2FF71` | Highlight / CTA. Sings on green; used as the button fill on dark green surfaces, rating fills, badge grounds. |
| `--pimento-500` | `#E8763D` | The pimento in the olive — the wordmark's full-stop. Tiny-dose accent only: ratings, hot/trending flags, notification dots. `--pimento-pink-500` `#EA6360` is the alternate pimento used in badge lockups. |

Neutrals are warm-to-cool paper greys, headed by `#E5E6E8` (the grey of the master lockup sheet) and `#FAF9F6`. `#141A17` is the near-black for photo scrims — never pure `#000`.

**Pairing rules.** Green on chartreuse and chartreuse on green are both approved (icons A and B). Green on purple is approved (icon C) and is the default marketing pair. **Never chartreuse on purple** (fails contrast and muddies), never purple text on green. Orange never sits on chartreuse. Max two brand colours per surface plus neutrals; a screen picks one background colour and stays there.

### Typography

Single family, worked hard. The wordmark is a heavy geometric grotesque with rectangular tittles, angled terminals and very tight round bowls; **we were not given font files, so the system ships Figtree (Google Fonts, variable 300–900) as the nearest match** — see the caveat in §7.

- **Display** (`--type-display-1/2/3`) — weight 900, lowercase, leading below 1 (`0.86`), tracking `-0.03em`. This is the wordmark's stacked, tightly-set energy. Display headlines are lowercase, no terminal period unless mimicking the logo's dot.
- **Headings** — 800/700, sentence case, tracking `-0.015em`.
- **Body** — 400, 1.55 line-height, max `64ch`.
- **Eyebrow / label** — 800 / 700 at 11–12px, uppercase, tracking `+0.10–0.16em`.
- **Mono** (DM Mono) — measurements, ABV, prices, coordinates, timestamps in the journal.

### Spacing & layout

4px base; the working scale is 4/8/12/16/20/24/32/40/48/64/80/96. Mobile screens use a 20px side gutter, web a 32px gutter inside a 1180px max width. Tap targets never below 44px. Mobile app chrome is fixed: a top bar that turns translucent-glass on scroll, and a bottom tab bar (5 tabs) that stays pinned with `--glass-bg` + blur over content. Web nav is sticky and opaque.

### Backgrounds

Three registers, in order of frequency: (1) **flat brand colour**, full-bleed — purple most often, green for "club/insider" moments, chartreuse for one loud block per page; (2) **duotone photography** — bar and coupe photos flooded with `--green-700` at ~85% (see `assets/brand-sheet-green-coupes.jpg`), wordmark or headline in chartreuse over it; (3) **plain paper** `--paper-050`/`--paper-200` for content-dense app screens. No gradients as decoration — the only gradient in the system is the bottom protection scrim over photos (`--scrim-bottom`). No noise, no patterns, no hand-drawn illustration. The olive/pimento dot is the one graphic device, borrowed from the logo's full stop, used as a bullet, list marker and rating pip.

### Poster motifs (from the supplied inspiration board)

Four devices, taken from the reference board (`assets/inspiration/`) and translated into brand colour:

1. **Tilted lozenge stacks** — heavy black-weight labels in pill capsules, stacked with alternating ±3° tilt and an indent on every other row, on a deep-green ground. Marketing and social only; never a tappable control. `TiltPill` / `TiltPillStack`.
2. **Bento blocks** — 28px-radius tiles in alternating deep green / brand green / chartreuse / one full-bleed photo, no borders and no shadows, gap 14px. `BentoGrid` / `BentoTile`.
3. **Circular stickers** — arched uppercase text around a centred olive, pinned at −8°, overlapping a photo or tile corner. One per view. `StickerBadge`, or the supplied `assets/badge-make-it-dirty.png` lockup.
4. **Oversized stat numerals** — a small label above a display-weight number in chartreuse on green ("Trusted by / 99.9K"). Use `StatCard` at display sizes inside a bento tile.

The board also shows a two-tone split composition (photo top / flat colour bottom, headline straddling the seam) — allowed for social and campaign work, using green and chartreuse as the two halves.

### Photography direction

Dim, moody, warm-lamp interiors and cold glassware; shallow depth of field; teal-and-amber cast (see `assets/photo-martini-lamp.jpg`). Slight grain is fine, filters are not. When brand colour is needed over a photo, duotone it in `--green-700` rather than tinting lightly. Always full-bleed and always with a scrim under type — never type on raw photo.

### Corners, borders, cards

Controls are **pill** (`--radius-pill`) — buttons, chips, tabs, search, avatars. Surfaces are **soft-square**: cards `22px`, sheets/modals `28px`, thumbnails `16px`, inputs `10px` when rectangular. Cards are white on paper with a hairline `rgba(51,102,84,.14)` border **and** a low green-tinted shadow (`--shadow-card`); on coloured backgrounds cards drop the shadow and keep the hairline only. Borders are 1px hairline by default; 2px solid green marks selection. No coloured left-border accent cards.

### Shadows, transparency, blur

Shadows are green-tinted, low, and two-layered (tight contact + wide soft). Nothing floats more than `--shadow-raised` except overlays. Blur is functional only: fixed app bars, bottom sheets over content, and the glass chip that sits over hero photography. Never blur a static decorative panel.

### Motion

Fast and confident: `120ms` for hover/press, `180ms` for state changes, `280ms` for sheets and route transitions, all on `--ease-out`. Sheets slide up, lists cross-fade with a 6px rise, tabs move a pill indicator. `--ease-spring` is reserved for two celebratory moments — a review posting successfully and a rank-up — and never applies to navigation. No looping ambient animation. Respect `prefers-reduced-motion` by dropping transforms and keeping opacity.

### Interaction states

- **Hover** — surfaces lift by shadow one step and warm 4% (`--green-700` → `--green-800`); text links go green → pimento; ghost buttons pick up a `--green-100` wash.
- **Press** — colour darkens one step, `scale(0.97)`, plus `--shadow-inset-press` on filled buttons. No ripple.
- **Focus** — `--focus-ring`: 3px chartreuse halo with a 2px green outer line. Always visible, never removed.
- **Selected** — 2px green border plus chartreuse fill for chips/tabs.
- **Disabled** — 38% opacity, no colour change, cursor default.

---

## 4. Iconography

**No icon set was supplied.** The only vector marks in the sources are the wordmark and the olive/pimento dot.

- **Substitution (flagged):** the system uses **Lucide** (2px stroke, round caps, 24px grid) via CDN, wrapped in the `Icon` component (`components/core/Icon.jsx`), rendered with `mask-image` so glyphs inherit `currentColor`. Lucide's round, geometric stroke sits closest to the wordmark's geometry. **Please confirm or replace with the real set.**
- **Stroke and size.** 2px stroke at 24px; 20px in dense rows; 28px in the tab bar. Icons take `--green-700`, or `--chartreuse-500` on green surfaces. Never two-tone, never filled-and-stroked in the same glyph.
- **The olive dot** is the brand's own icon: an olive-green ellipse with an off-centre pimento circle. Use it for ratings (five pips), list bullets, unread dots and loading states. It is the logo's full stop and should never be redrawn at a different proportion — use `assets/*` cuts.
- **Emoji as icon:** 🍸 and 🫒 appear in *copy* (notifications, empty states, toasts), never as UI iconography — no emoji in tab bars, buttons or menus.
- **App icons** ship as the three approved colourways in `assets/app-icon-{green,chartreuse,purple}.png`, plus `adaptive-icon.png` (transparent) and `favicon.png`.

---

## 5. Assets

| File | What |
|---|---|
| `assets/logo-wordmark-green.png` | Primary wordmark, `#336654`, transparent — cut from the adaptive icon |
| `assets/logo-wordmark-chartreuse.png` | Wordmark for green/photo grounds |
| `assets/logo-wordmark-cream.png` | Wordmark for dark photography |
| `assets/app-icon-green/chartreuse/purple.png` | The three approved icon colourways |
| `assets/adaptive-icon.png`, `assets/favicon.png` | Platform icons as supplied |
| `assets/badge-make-it-dirty.png` | "MAKE IT DIRTY" arched badge lockup |
| `assets/photo-martini-lamp.jpg` | Hero photography (Unsplash, Stanislav Ivanitskiy) |
| `assets/brand-sheet-*.jpg` | The three supplied brand sheets, kept for reference |
| `assets/inspiration/*.jpg` | Reference board supplied as design inspiration (third-party work — motif reference only, never reproduce) |

Wordmark rules: clear space equals the height of the "t" on all sides; minimum width 96px digital; never outline, rotate, stretch, re-space the three stacked lines, or recolour the pimento dot.

---

## 6. Index

- `styles.css` — the single entry point consumers link. `@import`s only.
- `tokens/` — `fonts.css`, `colors.css`, `typography.css`, `spacing.css`, `effects.css`, `base.css`.
- `guidelines/` — foundation specimen cards (Colours, Type, Spacing, Effects, Brand).
- `ui_kits/mobile_app/` — Feed, Discover, Bar detail, Review composer, Profile.
- `ui_kits/marketing_site/` — landing page.

### Components

| Directory | Components |
|---|---|
| `components/core/` | **Button**, **IconButton**, **Icon**, **Logo**, **AppIcon** |
| `components/forms/` | **Input**, **SearchField**, **Select**, **Checkbox**, **Radio**, **Switch** |
| `components/display/` | **Card**, **Badge**, **Chip**, **RatingPips**, **Avatar**, **SectionHeader**, **StatCard**, **ListRow** |
| `components/navigation/` | **AppBar**, **TabBar**, **Tabs**, **BottomSheet**, **SiteHeader** |
| `components/feedback/` | **Toast**, **EmptyState**, **Tooltip**, **Dialog** |
| `components/domain/` | **MartiniCard**, **BarCard**, **ReviewCard** |
| `components/brand/` | **TiltPill**, **TiltPillStack**, **StickerBadge**, **BentoGrid**, **BentoTile** |

Each directory carries a `@dsCard` HTML showing its states, and every component has a sibling `.d.ts` props contract and `.prompt.md` usage note.
- `SKILL.md` — Agent-Skills entry point.
- `thumbnail.html` — homepage tile.

## 7. Caveats

1. **Font substitution.** Figtree stands in for the real wordmark family. Please send the licensed font files (woff2) and we'll swap `tokens/fonts.css`.
2. **Icon substitution.** Lucide via CDN stands in for an unspecified icon set.
3. **No product source.** No codebase, Figma or screenshots of the shipped app were provided, so the UI kits are brand-faithful proposals, not recreations. Feature names (Regulars, Top Shelf, journal) come from the written brief.
4. **Photography** is a single Unsplash reference, not licensed brand photography.

### Intentional additions

Since no source defined a component inventory, this system authors a standard consumer-social set. Beyond the usual primitives it adds: `Logo` (approved lockups so nobody re-types the wordmark), `Icon` (wrapper for the substituted glyph set), `RatingPips` (the olive/pimento dot as a rating scale — the brand's own graphic device), and the domain cards `MartiniCard` / `BarCard` / `ReviewCard`, which are the three repeating objects in every screen of the brief.
