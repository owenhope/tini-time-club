# Phase 1 security follow-ups (manual steps)

Code changes are done; these steps need your accounts. Do them in order.

## 1. Google Cloud console — rotate & restrict Maps keys
- **Rotate** the Places key `AIzaSy...coH8` (it was committed to git history). Put the
  new value in `.env.local` as `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` and restrict it to the
  **Places API** only.
- Restrict the iOS key (`GOOGLE_MAPS_API_KEY_IOS`) to the **Maps SDK for iOS** +
  bundle IDs `com.ohope.tinitimeclub`, `.preview`, `.dev`.
- Restrict the Android key (`GOOGLE_MAPS_API_KEY_ANDROID`) to the **Maps SDK for
  Android** + package + SHA-1 fingerprints.
- Set billing quotas/alerts on all three.

## 2. EAS environment variables (for CI builds)
Local builds read `.env.local`; EAS builds need the same values per environment:

```bash
eas env:create --name EXPO_PUBLIC_GOOGLE_MAPS_API_KEY --value <new-places-key> --environment production
eas env:create --name GOOGLE_MAPS_API_KEY_IOS --value <ios-key> --environment production
eas env:create --name GOOGLE_MAPS_API_KEY_ANDROID --value <android-key> --environment production
```

Repeat for `preview`/`development` as needed (`eas env:list` to check what exists).

## 3. Supabase — push function secrets
The Expo push access token was previously named `EXPO_PUBLIC_ACCESS_TOKEN` (one import
away from being inlined into the client bundle). Rotate it at
https://expo.dev/settings/access-tokens, then:

```bash
supabase secrets set EXPO_ACCESS_TOKEN=<new-expo-access-token>
supabase secrets set PUSH_WEBHOOK_SECRET=$(openssl rand -hex 32)
supabase secrets unset EXPO_PUBLIC_ACCESS_TOKEN
```

## 4. Supabase — update the database webhook, then deploy
In Dashboard → Database → Webhooks, edit the webhook that calls the `push` function and
add an HTTP header `x-webhook-secret: <the PUSH_WEBHOOK_SECRET value>`.

Then deploy the hardened function (do this AFTER setting the secrets above, or pushes
will stop):

```bash
supabase functions deploy push
```

## 5. Supabase — apply the RLS migration
`supabase/migrations/20260728000100_tighten_rls.sql` enables RLS on `comments`
(it was fully open to anyone with the anon key), removes anon reads of
profiles/followers/reviews, and blocks unauthenticated notification inserts.

```bash
supabase db push
```

## Known follow-ups (Phase 2)
- Notification inserts are still open to any *authenticated* user (the app inserts
  like/follow notifications client-side). Move notification creation into a DB trigger,
  then drop the authenticated insert policy.
- `expo_push_token` is still readable by other authenticated users via
  `profiles.select("*")`. Move it to a private table (or column privileges) once the
  service layer stops selecting `*`.
- `locations` UPDATE is open to any authenticated user (`USING (true)`) — needed today
  for the client-side `place_id` backfill; scope it once that moves server-side.
- Server-side account deletion (edge function with service role) to replace the
  client-only `deleted = true` soft delete.
