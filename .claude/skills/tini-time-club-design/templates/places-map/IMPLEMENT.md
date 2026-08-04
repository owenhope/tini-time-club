# Places map — implementation notes

Fills the map stub in `components/map/ClusteredMap.tsx`. Four artefacts: map style, pin family, tapped state, cluster tap.

## Map style
Custom style JSON — no default provider styling.
- Land `#F4F1EA`, parks `#E2EDE1`, water `#D7E6E3`, roads pure white (`#FFFFFF`, no casing).
- Labels: street + park names only, DM Mono 9px uppercase, `.14em` tracking, `#8A938F`. Turn OFF all POI icons, business labels, and transit.
- No terrain, no 3D buildings. The map is a background; the pins are the content.

## Pin family (`components/map/Pin.tsx`)
One shape — circle + 9px triangle tail, martini glyph inside.

| State | Size | Fill | Border | Tail |
|---|---|---|---|---|
| Place (default) | 38 | `#336654` | 2.5px `#FAF9F6` | `#FAF9F6` |
| Reviewed by you | 38 | `#F2FF71` | 2.5px `#336654` | `#336654` |
| Unrated | 38 | `#FFFFFF` | 2.5px `rgba(51,102,84,.45)` | same |
| Selected | 52 | `#1C3A2E` | 3px `#F2FF71` | `#F2FF71` |
| User location | 20 dot | `#E8763D` | 3px `#FFFFFF` | none, 42px halo |

Selected pin carries a score chip: chartreuse pill, 2px ink border, DM Mono 10px, offset top-right.
Clusters: solid green circle, chartreuse count, 2–3px paper border. 30px (<10), 40px (<25), 52px + `#1C3A2E` fill (25+). Clusters never show a score.
Tap target is always ≥44px regardless of visual size.

## Tap a pin
1. Pin 38→52 over 180ms, spring (damping .7).
2. Sibling pins fade to 55% opacity.
3. Map pans so the pin sits at 38% of the viewport height.
4. List sheet collapses; peek card springs up over 240ms, 16px inset, radius 26, shadow `0 16px 40px rgba(28,58,46,.26)`.

Peek card = 76px thumb, name + Regular badge, `neighbourhood · distance · hours`, aggregate numeral + olives + pour count, three stat tiles (taste / presentation / friends), then primary "Log a martini" plus 46px bookmark and directions circles.

Dismiss: tap map or swipe card down. Tap card body → `places/[place]`.

## Tap a cluster
Zoom 2 levels over 320ms ease-out and re-cluster. Toast `Zoomed to N bars` for 1.6s. At max zoom, don't zoom — expand the sheet to a list of the cluster's members instead.

## Rules
- Olives, never stars.
- `#E8763D` is reserved for the user dot; nothing else on the map may use it.
- Max two brand colours on the map surface plus neutrals.
