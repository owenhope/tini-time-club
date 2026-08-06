# App Store Screenshot Staging

Development-only seed data for raw iPhone App Store screenshots.

## Seed

Required environment variables:

```sh
BACKEND_ENV=development
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
SCREENSHOT_USER_EMAIL=...
SCREENSHOT_USER_PASSWORD=...
```

Dry-run static checks:

```sh
BACKEND_ENV=development npm run screenshots:seed -- --dry-run --confirm-development
```

Seed development Supabase:

```sh
BACKEND_ENV=development npm run screenshots:seed -- --confirm-development
```

The live seed preserves deterministic screenshot auth users, updates the main
screenshot user's password from `SCREENSHOT_USER_PASSWORD`, resets prior
seeded screenshot rows, uploads checked-in image assets, and validates the
staged screenshot moments. The internal seed marker is never used as a visible
handle.

## Login

Sign into the development app with:

```sh
SCREENSHOT_USER_EMAIL
SCREENSHOT_USER_PASSWORD
```

The visible profile is `stellavale`.

## Screenshot Links

Use the development scheme from `app.config.ts`: `tini-time-club-dev://`.

1. Home feed:
   `tini-time-club-dev://home?screenshotSeed=feed`

2. Hero review detail:
   `tini-time-club-dev://r/91000001?screenshotSeed=review`

3. Hero review comments:
   `tini-time-club-dev://r/91000001?screenshotSeed=comments`

4. Places map:
   `tini-time-club-dev://places?screenshotSeed=map&lat=49.3109&lon=-123.0812&locationId=910001`

5. Featured place detail:
   `tini-time-club-dev://places/910001?screenshotSeed=place`

6. Profile:
   `tini-time-club-dev://profile?screenshotSeed=profile&tab=reviews`

## Deterministic Anchors

- Hero review: `91000001`
- Featured place: `910001`
- Featured place rating: `4.7` from `10` reviews
- Seed size: `12` venues, `72` reviews
- Region: Lower Lonsdale / North Vancouver
