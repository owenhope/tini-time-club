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

## ✅ Google Cloud (done via API Keys API, 2026-07-27)

- New `places-web-service-key` created, restricted to the Places API; deployed to
  `.env.local` and all three EAS environments. Verified working.
- Old exposed key ("API key 1", `AIzaSy...coH8`) clamped from **unrestricted** to
  Places-API-only so shipped app binaries keep working but the key can't be abused
  for other Google APIs. Verified: Places OK, Geocoding REQUEST_DENIED.
- iOS key: added the missing `com.ohope.tinitimeclub.preview` bundle ID (it only
  allowed a stale `com.hopemediahouse.tinitimeclub.preview`).
- Android key was already correctly restricted.

## ⏳ Still needs you

1. **Delete the old Places key** ("API key 1" in the console) — but only AFTER an
   EAS update/build containing the new env-based key has rolled out to users, since
   v2.2.7 binaries have the old key hardcoded in their JS bundle:
   ```bash
   gcloud services api-keys delete projects/732397011472/locations/global/keys/3fd6ec03-30ea-474c-8918-0dd9349ecbcf
   ```
2. **Billing alerts** in Google Cloud console (Billing → Budgets) — no API for
   creating budgets without extra setup; a $10–50/mo budget alert is sensible.
3. **Expo access token** (https://expo.dev/settings/access-tokens): rotate when
   convenient (it was only ever in gitignored/EAS config, so lower urgency), then
   `supabase secrets set EXPO_ACCESS_TOKEN=<new>` and update the EAS env var, and
   `supabase secrets unset EXPO_PUBLIC_ACCESS_TOKEN`.
4. After the next like/follow in the app, glance at the `push` function logs in the
   Supabase dashboard to confirm notifications still deliver end-to-end.

## Known follow-ups (Phase 2)

- Notification inserts are still open to any _authenticated_ user (the app inserts
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
