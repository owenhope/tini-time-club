# Phase 1 security status

## ✅ Done (applied to production on 2026-07-27)

- **Push edge function** deployed with service-role client, `x-webhook-secret`
  verification, crash fix, and batched Expo sends.
- **Database webhook trigger** on `public.notifications` updated to send
  `x-webhook-secret` (+ anon-key Authorization for the gateway JWT check). Its
  definition is intentionally excluded from the schema migration because it embeds
  secret headers.
- **Supabase function secrets**: `PUSH_WEBHOOK_SECRET` set; `EXPO_ACCESS_TOKEN`
  already existed (function code now prefers it over the legacy
  `EXPO_PUBLIC_ACCESS_TOKEN` name).
- **RLS migration applied** (`20260728000100_tighten_rls.sql`): RLS enabled on
  `comments` (was fully open), anon reads of profiles/followers/reviews removed,
  unauthenticated notification inserts blocked. Verified from the anon key:
  profiles/comments reads return empty, notification insert → 401, push function
  without secret → 401.
- **EAS env vars** (production/preview/development): `GOOGLE_MAPS_API_KEY_IOS` and
  `GOOGLE_MAPS_API_KEY_ANDROID` created; production
  `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` corrected to the Places key (it previously held
  the iOS native key, which would have broken Places search under the new code).
- Sessions now persisted encrypted (Keychain/Keystore-backed AES) instead of
  plaintext AsyncStorage.

## ⏳ Still needs you (Google/Expo account access)

1. **Google Cloud console** (https://console.cloud.google.com/apis/credentials):
   - **Rotate** the Places key (`AIzaSy...coH8`) — it lives in git history. After
     rotating, update `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` in `.env.local` and in all
     three EAS environments (`eas env:update`).
   - **Restrict** all three keys: Places key → Places API only; iOS key → Maps SDK
     for iOS + bundle IDs `com.ohope.tinitimeclub` / `.preview` / `.dev`; Android
     key → Maps SDK for Android + package + SHA-1.
   - Set billing quotas/alerts.
2. **Expo access token** (https://expo.dev/settings/access-tokens): rotate when
   convenient (it was only ever in gitignored/EAS config, so lower urgency), then
   `supabase secrets set EXPO_ACCESS_TOKEN=<new>` and update the EAS env var, and
   `supabase secrets unset EXPO_PUBLIC_ACCESS_TOKEN`.
3. After the next like/follow in the app, glance at the `push` function logs in the
   Supabase dashboard to confirm notifications still deliver end-to-end.

## Known follow-ups (Phase 2)

- Notification inserts are still open to any *authenticated* user (the app inserts
  like/follow notifications client-side). Move notification creation into a DB
  trigger, then drop the authenticated insert policy.
- `expo_push_token` is still readable by other authenticated users via
  `profiles.select("*")`. Move it to a private table once the service layer stops
  selecting `*`.
- `locations` UPDATE is open to any authenticated user (`USING (true)`) — needed
  today for the client-side `place_id` backfill; scope it once that moves
  server-side.
- Server-side account deletion (edge function with service role) to replace the
  client-only `deleted = true` soft delete.
