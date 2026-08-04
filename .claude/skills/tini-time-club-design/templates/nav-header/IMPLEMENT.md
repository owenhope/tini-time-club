# Nav & header — implementation notes

Covers `app/(tabs)/_layout.tsx` and every screen's top bar. Two components: `components/nav/TabBar.tsx`, `components/nav/AppHeader.tsx`.

## Tab bar

Five slots: Feed · Places · **pour** · Discover · Profile. Row height 56 + bottom safe-area inset, padding `8px 4px`.

| Token | Value |
|---|---|
| Surface (paper) | `rgba(255,255,255,.94)` + 14px blur, 1px top border `rgba(51,102,84,.16)` |
| Surface (over media) | `rgba(28,58,46,.88)` + 16px blur, no border |
| Icon | 25px |
| Label | Figtree 10px, 500 rest / 700 active |
| Active | `#336654` on paper, `#F2FF71` on ink |
| Rest | `#6E7472` on paper, `rgba(250,249,246,.62)` on ink |
| Active dot | 5px chartreuse, 1px green border on paper |
| Badge | `#E8763D`, 16px min, 1.5px white border, 9px/700 white |
| Pour button | 52px circle, `#F2FF71`, 2px `#336654` border on paper (borderless on ink), `margin-top:-10px`, shadow `0 6px 16px rgba(28,58,46,.22)` |

Behaviour: tap active tab → scroll that stack to top. Long-press pour → quick-log sheet. The tab bar never auto-hides.

## Headers — four variants, no fifth

**A · Large (green)** — the five tab roots. `#336654` block, `52px 20px 20px`, title lowercase Figtree 900/30px, `-.035em`, `#FAF9F6`. Trailing action is a 40px `rgba(250,249,246,.14)` circle with a chartreuse glyph. Search field (`tone="onInk"`) or a chip row may sit inside the green — never both.

**B · Compact (scrolled)** — pushed lists, settings, and the collapsed form of A and C. `rgba(250,249,246,.94)` + 14px blur, 1px bottom hairline. Title Figtree 800/16px sentence case, centred. Leading/trailing 40px circles, 1.5px `rgba(51,102,84,.24)` outline, `#336654` glyph.

**C · Over media (detail)** — only where a photo owns the top. 210px image, gradient scrim `rgba(20,26,23,.55) → 0 at 45% → .5`. Controls are 40px `rgba(20,26,23,.55)` + 8px blur circles — never bare icons on the photo. Title Figtree 900/27px paper, meta line DM Mono 12px at 82%.

**D · Modal (composer)** — 42×5 grabber, then `Cancel` (600/14 `#6E7472`) · title (800/16 `#1C3A2E`) · primary action (700/14 `#336654`), 1px bottom hairline. No back chevron. The action greys to `#6E7472` until the form is valid.

## Scroll
One shared scroll value drives 0→120px: large title fades out, compact bar crossfades in. Apply the blur only once the compact bar is opaque enough to read behind. Headers never hide on scroll-down.

## Rules
- One chartreuse element per bar — the pour button, or the active tab on ink, never both.
- Orange is badges and the map user dot only.
- Circle buttons are 40px visual, 44px tap.
- Titles: lowercase black only at variant A's size; every smaller title is sentence case.
