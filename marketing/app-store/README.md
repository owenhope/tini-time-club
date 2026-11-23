# Discovery artwork

Headline: **Find your next great Martini**.

Final exports use original seeded app screenshots, with deterministic text and
layout. No generated UI is used. All exports are opaque RGB PNGs.

| Placement | Export | Apple art safe area (top-left origin) |
| --- | --- | --- |
| Header | header-3840x1646.png | x1097, y493, 1646 × 661 |
| Search | search-3840x2560.png | x836, y765, 2168 × 1030 |
| Universal | universal-5244x2950.png | x1921, y660, 1402 × 962 |
| Social | ../../admin/public/tini-time-discover-share-v2.png | 1200 × 630 canvas |
| Google Play feature | ../google-play/feature-graphic-1024x500.png | 1024 × 500 canvas |

The complete headline and main Martini glass sit within Apple's safe areas.
Peripheral phone chrome can crop on smaller placements. The `*-safe-area.jpg`
files are review proofs, not upload files.

Regenerate with `python3 scripts/export_discovery_artwork.py` after installing
Pillow and the admin npm dependencies. Source screens in `source/` contain seed
data. Google Play's feature graphic uses the Android screen.

Specs checked 23 November 2026:
https://developer.apple.com/help/app-store-connect/reference/app-information/creative-assets-specifications
