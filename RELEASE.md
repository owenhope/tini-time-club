# Release process

Three environments, each with its own bundle identifier, URL scheme, icon,
Supabase project, EAS environment and EAS update channel. They install
side-by-side on one device.

| Environment | Bundle id                        | Scheme                | EAS env / channel | Branch         |
| ----------- | -------------------------------- | --------------------- | ----------------- | -------------- |
| development | `com.ohope.tinitimeclub.dev`     | `tini-time-club-dev`  | `development`     | working branch |
| preview     | `com.ohope.tinitimeclub.preview` | `tini-time-club-prev` | `preview`         | release branch |
| production  | `com.ohope.tinitimeclub`         | `tini-time-club`      | `production`      | `main`         |

## Branch flow

```
working branch ──manual development/preview testing──▶ merge to main
                                                        │
                                                   main audit
                                                        │
                                          production build or OTA
```

There is no shared `development` release branch and there are no automated EAS
release integrations. Development happens on working branches and preview
builds are created directly from the branch under test. `main` is always the
latest live source, including production OTA fixes.

GitHub Actions runs the repository audit only after a push reaches `main`.
Branch and preview validation is manual: run `npm run verify` before building.

## Test policy

Automated tests protect behavior that can break accounts, releases, or stored
data: authentication and startup routing, Supabase boundaries, upload/write
orchestration, permissions, deep links, membership gates, calculations, and
accessibility contracts. Pure presentation belongs in simulator and preview
build review. Do not add mock-heavy renderer tests whose only assertion is an
exact color, spacing value, font token, or other implementation detail.

## Versioning

`version` in `app.config.ts` is the single source of truth for the marketing
version. `package.json` mirrors it for tidiness; nothing reads it.

Build numbers are **not** in the repo. `eas.json` sets
`appVersionSource: "remote"`, so EAS owns `buildNumber` / `versionCode` per
platform and `autoIncrement` bumps it on every `preview` and `production`
build. Never hand-edit a build number.

**Bump `version` for every native release**, using semver against user-visible
change:

- **patch** (3.0.1) — bug fixes only
- **minor** (3.1.0) — new features and backward-compatible data additions
- **major** (4.0.0) — Expo SDK upgrade or a breaking route, deep-link, stored-data, or data-model change

This matters beyond bookkeeping: `runtimeVersion.policy` is `appVersion`, so
the version string is what pairs an OTA update with a native binary. Two
native builds sharing one version can be served each other's JS. That is
exactly the trap 3.0.0 avoids — 2.2.7 already shipped as production build 58
on SDK 52, and this tree is SDK 57.

Rule of thumb: **changed anything native (SDK, plugin, permission, native
dep)? bump at least the minor and never reuse a shipped version.**

## Building

```bash
# Build the dev client once for the simulator (JS iterates over Metro afterwards)
npx eas build --profile ios-simulator --platform ios

# Use the installed dev client against development Supabase
npm run start:dev

# Use that same dev client against production Supabase
npm run start:prod

# Branch preview → TestFlight, points at the dev Supabase project
npx eas build --profile preview --platform ios
npx eas submit --profile preview --platform ios --latest

# Production → TestFlight → App Store
npx eas build --profile production --platform ios
npx eas submit --profile production --platform ios --latest

# Or build and submit the production TestFlight build in one command
npm run release:testflight
```

`preview-adhoc` exists for the occasional ad-hoc install on a registered
device without going through TestFlight review.

### 4.0 visitor preview backend

The signed-out **Discover Martinis** path requires the `is_public` profile
migration and sanitized `public-content` Edge Function in every backend serving
a 4.0 build. Their production rollout is additive: the migration leaves the
legacy six-argument `feed_reviews` RPC in place for the currently live app, and
the new Edge Function is read-only.

The privacy-safe app-usage tables and `app-usage` heartbeat remain
development-only. The production client deliberately does not call that
endpoint.

```bash
supabase db push
supabase functions deploy public-content
supabase functions deploy app-usage --no-verify-jwt
```

The shared migration directory contains two independently deployed versions:

- `20260820120000_public_profile_visibility.sql` — required in development and
  production before distributing 4.0.
- `20260820143000_app_usage_presence.sql` — development-only.

Never run an unreviewed bare `supabase db push` against production while those
versions are pending. Stage only reviewed production migrations in an isolated
workdir, run `supabase db push --dry-run` there, and confirm the exact allowlist
before applying it. Production Edge Functions are deployed by explicit name:
deploy `public-content` for 4.0, but never deploy `app-usage` there.

The function accepts the app's project-scoped anonymous JWT, then exposes only
its explicit public projection. The Edge gateway rejects requests without a
valid project JWT. Raw profile/review/comment tables and the private review
image bucket remain unavailable to anonymous clients. Existing and new profiles
default to visitor-visible; members can opt out in Edit Profile.
The usage endpoint stores a random per-installation UUID and app metadata, but
no IP address, advertising identifier, or device fingerprint. It derives
visitor/member status from Supabase Auth on the server. The admin dashboard
labels anonymous totals as installations rather than people and treats a
heartbeat within 15 minutes as active now.

## OTA updates

Channels map 1:1 to environments. An update only reaches builds whose
`runtimeVersion` matches, so JS-only fixes can ship without a store review:

```bash
npx eas update --branch preview     --message "fix: ..."
npx eas update --branch production  --message "fix: ..."
```

Anything touching native code needs a new build, not an update.

## Environment variables

Managed in EAS (`npx eas env:list <env>`), not in the repo. `.env.local` is
for local Metro only and is gitignored. The `start:dev` and `start:prod`
scripts execute Metro with the selected EAS environment, so those values take
precedence over `.env.local`.

`APP_ENV` controls the native app identity. `BACKEND_ENV` records which backend
that app instance is using. `start:prod` deliberately keeps `APP_ENV=development`
so the installed development client still opens through its `.dev` URL scheme,
while its Supabase URL and anon key come from the production EAS environment.

Each environment must define:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_META_APP_ID`
- `EXPO_PUBLIC_SENTRY_DSN`
- `SENTRY_ORG`
- `SENTRY_PROJECT`
- `SENTRY_AUTH_TOKEN` (secret)

The Supabase URL and anon key must **match** — the anon key is a JWT signed for
one project ref, so a key from another project is rejected. The Meta app ID is
required for the Instagram Stories handoff. Preview and production config
generation fails when any of these variables is missing. Verify every EAS
environment with:

```bash
npx eas env:list development
npx eas env:list preview
npx eas env:list production
```

Sentry's Metro and native config plugins upload release source maps during
preview and production builds. Development and simulator profiles disable the
upload; release profiles require the Sentry organization, project, and secret
auth token above so stack traces resolve to the checked-in TypeScript source.

Push events are generated by database triggers, so notification behavior is
consistent across app builds. Use a separate Supabase project when development
activity must not notify production users.

### Sign in with Apple account deletion

The `delete-account` Edge Function exchanges a fresh Apple authorization code
and revokes the resulting token before deleting an Apple-linked account. It
requires these function secrets in every Supabase project used by the app:

- `APPLE_TEAM_ID` — Apple Developer team identifier
- `APPLE_KEY_ID` — identifier of a Sign in with Apple `.p8` key
- `APPLE_PRIVATE_KEY` — the complete private `.p8` key contents

These values are server-only and must never use an `EXPO_PUBLIC_` prefix or be
committed to the repository. Do not deploy the updated deletion function until
all three are configured in both the development and production Supabase
projects. The function creates a five-minute client secret for each deletion;
the private key itself does not leave Supabase. Builds before 3.2 do not send
the fresh Apple authorization payload, so the Edge Function temporarily keeps
their previous deletion path working during rollout. Remove that compatibility
branch after pre-3.2 builds are retired.

## Release checklist

1. Develop on a working branch with `npm run start:dev`.
2. Confirm the required variables above exist in the target EAS environment.
3. Run `npm run verify` and test against development Supabase.
4. Create and test a preview build directly from the working branch when needed.
5. Merge the tested branch into `main`; the main-only audit runs after the push.
6. Stage the reviewed Supabase production allowlist in an isolated workdir;
   dry-run it, apply it, and verify the live app remains compatible.
7. Run `npm run start:prod` and test the same dev client against production.
8. Bump `version` in `app.config.ts` (and `package.json`) when the release has
   native changes.
9. From `main`, run `npm run release:testflight` for a native production build,
   or publish an OTA update for a compatible JS-only fix.
10. Verify the TestFlight build or OTA update, then tag the release.

## App privacy answers

Tini Time Club collects account, profile, review, comment, photo, favorite
place, notification, nearby-discovery, and first-party app-usage data to
operate the app and measure product usage. Anonymous app usage is represented
by a random installation UUID rather than contact details or a device
fingerprint. Public profiles and their published reviews may also be shown to
signed-out visitors unless the member disables visitor visibility. If App
Store Connect marks any collected data type as being used to track users, the
iOS app must include App Tracking Transparency and must request permission
before that tracking use.

The ATT prompt is configured through `expo-tracking-transparency` in
`app.config.ts` and requested once from the root layout. If App Review rejects
a build under Guideline 5.1.2(i), confirm App Privacy is current, submit a new
iOS build, and note that the tracking permission prompt appears at app launch.
