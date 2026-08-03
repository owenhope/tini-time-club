# Implementing Tini Time Club in the app

Target: `owenhope/tini-time-club` (Expo / React Native, `main`).

The app already has the right *architecture* — `theme/tokens.ts` + `makeStyles` + a shared component layer. What it doesn't have is the brand: today's accent is **lavender `#7B60BC`**, green is demoted to "secondary", chartreuse and pimento don't exist, and the type scale is system-font UI type rather than the wordmark's black-weight lowercase voice.

So this is a token-layer swap, not a rewrite. Three files carry ~90% of it.

## What changes, in one line each

| Concern | Today | After |
|---|---|---|
| Primary | lavender `#7B60BC` | **green `#336654`** — the logo colour |
| Purple | button fill | **background only** (`surfaceBrand`), never a fill under text |
| Chartreuse | absent | `secondary` — the loud CTA, only on green/ink grounds |
| Pimento | absent | `ratingFill`, hot/trending flags |
| Neutrals | cool violet-tinted | warm paper greys headed by `#E5E6E8` / `#FAF9F6` |
| Type | system font, 15px body | Figtree, 16px body, black-weight lowercase display |
| Radius | cards 12–16 | cards **22**, sheets **28**, controls pill (already pill) |
| Shadows | `#1B1526` violet | green-tinted `#1C3A2E`, wider and softer |

## Steps

**1. Fonts.** `npx expo install @expo-google-fonts/figtree @expo-google-fonts/dm-mono expo-font`, then load in `app/_layout.tsx` alongside the existing splash gate:

```ts
import { Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold,
         Figtree_700Bold, Figtree_800ExtraBold, Figtree_900Black } from "@expo-google-fonts/figtree";
import { DMMono_400Regular } from "@expo-google-fonts/dm-mono";

const [fontsLoaded] = useFonts({
  Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold,
  Figtree_700Bold, Figtree_800ExtraBold, Figtree_900Black, DMMono_400Regular,
});
```

Don't hide the splash until `fontsLoaded`. Figtree is the flagged stand-in for the real wordmark family (readme §7) — when the licensed woff2/otf arrives, only `fontFamily` in `tokens.ts` changes.

**2. Replace `theme/tokens.ts`** with `templates/react-native-port/tokens.ts` from this design system. It exports the same names in the same shape, so `ThemeProvider.tsx` compiles untouched. Additions: `surfaceBrand` / `surfaceInk` / `surfaceHighlight` (+ their `on*` pairs), `glass`, `focusRing`, `fontFamily`, `motion`, `elevation.*.overlay`, `spacing.gutter` (20), `radius.card` / `radius.sheet`, and the `display`/`subheading`/`eyebrow`/`mono` type variants. `BRAND.lavender` and `BRAND.olive` are kept as deprecated aliases so nothing breaks on the first build.

**3. Widen `theme/ThemeProvider.tsx`'s `Theme` interface** by two lines so the new exports reach `makeStyles`:

```ts
export interface Theme {
  …
  fontFamily: typeof fontFamily;
  motion: typeof motion;
}
```

Add both to the `useMemo` value, and re-export `fontFamily` + `motion` from `theme/index.ts`.

**4. Replace `components/shared/AppText.tsx`** and **`components/shared/Button.tsx`** with `templates/react-native-port/AppText.tsx` and `Button.tsx`.

- `AppText` gains `onInk` / `onBrand` / `onHighlight` tones and auto-cases display (lowercase) and eyebrow/label (uppercase) — do not hand-case strings at call sites.
- `Button` gains a `highlight` variant (chartreuse), 2px outline borders, and a real `scale(0.97)` press at 120ms. `secondary` is aliased to `highlight`, so existing `variant="secondary"` call sites now render chartreuse — check each one is on a green ground; if it's on paper, switch it to `primary` or `tonal`.

**5. Sweep the hardcoded hex.** Only five files hold any:

- `app/_layout.tsx` — toast styles `#ffffff` / `#1a1a1a` / `#555555` / `#6c5ce7`. The `#6c5ce7` is an off-brand purple; toasts should be `colors.surfaceInk` ground with `onSurfaceInk` text, accent bar in `colors.secondary`.
- `app/index.tsx` — onboarding card pairs (`#D9CCEF`/`#614A96`, `#A7CCBC`/`#1F3E33`, `#F2A08E`/`#7B302A`) and `#141116`. Replace with three approved pairs: purple `#B6A3E2` ground / green `#336654` icon, green `#336654` / chartreuse `#F2FF71`, chartreuse `#F2FF71` / green `#336654`. Never chartreuse on purple.
- `components/map/ClusteredMap.tsx` — `clusterColor: "#00B386"` → `colors.accent`; `spiderLineColor: "#FF0000"` → `colors.ratingFill`.
- `assets/mapStyle.ts` — retint the map to paper: land `#FAF9F6`, roads `#F2F1EE`, water `#DCE9E3`, parks `#DCE9E3`. No blue.
- `utils/ranking.ts` — rank metals are intentional; leave the gold/silver/bronze, but move the top tier's `#8E7CE8` to `#336654`/`#F2FF71` so "Top Shelf" reads as brand rather than lavender.

`components/GoogleAuth.native.tsx` keeps its hex — Google's sign-in button is spec-locked. `services/pushNotificationService.ts` and `app.config.ts` are already on brand.

**6. Radius and gutter pass.** Search `borderRadius: t.radius.md` on card-like surfaces → `t.radius.card`; bottom sheets and modals → `t.radius.sheet`. Screen containers get `paddingHorizontal: t.spacing.gutter`. Controls stay `t.radius.pill`.

**7. Cards.** The DS card is white on paper with a **hairline `rgba(51,102,84,.14)` border *and* a low green shadow**; on coloured grounds it drops the shadow and keeps the hairline. Apply in `ReviewItem`, `ReviewGrid`, `Location`, `PlaceInfo`, `RegularPlaceRow`, `ProfileList`.

**8. Chrome.** Top bar and `CustomTabBar` go glass: `colors.glass` background + `expo-blur` `BlurView` (intensity ~28), hairline top border. Tab icons 28px, active `tabBarActive`, inactive `tabBarInactive`. Blur is functional only — never on a static panel.

**9. Ratings.** `RatingSlider` / `RatingSummary` / `RatingPips` move to the pimento (`colors.ratingFill`) on `ratingTrack`. The rating unit is the olive dot from the logo, not a star — use `assets/` cuts rather than redrawing.

**10. Motion.** Press 120ms, state 180ms, sheets and route transitions 280ms, all on `cubic-bezier(.2,.8,.3,1)`. `motion.spring` is reserved for two moments only — review posted, rank-up. Never on navigation. Honour `useReducedMotion()` by dropping transforms and keeping opacity.

## Verify

- `theme/__tests__/contrast.test.ts` already asserts AA on the token pairs — run it; every pair in the new `tokens.ts` is annotated with its measured ratio.
- Check both schemes. Dark mode is an **extension** — the brand sheets define none — so it's a "club after dark" register: deep-green grounds, chartreuse as the interactive colour (green-on-green is unreadable).

## Give Claude Code this prompt

> Our design system is Tini Time Club (in `.claude/skills/tini-time-club-design/`). Read its `readme.md` for brand rules, then follow `templates/react-native-port/IMPLEMENT.md` in that skill. Do step 2 first (replace `theme/tokens.ts` with the ported file), build, and stop — I want to see the app on the new tokens before we touch components.
