# Release process

Three environments, each with its own bundle identifier, URL scheme, icon,
Supabase project, EAS environment and EAS update channel. They install
side-by-side on one device.

| Environment | Bundle id                        | Scheme                | EAS env / channel | Branch        |
| ----------- | -------------------------------- | --------------------- | ----------------- | ------------- |
| development | `com.ohope.tinitimeclub.dev`     | `tini-time-club-dev`  | `development`     | feature works |
| preview     | `com.ohope.tinitimeclub.preview` | `tini-time-club-prev` | `preview`         | `development` |
| production  | `com.ohope.tinitimeclub`         | `tini-time-club`      | `production`      | `main`        |

## Branch flow

```
feature branch  ──PR──▶  development  ──PR──▶  main
                          │                     │
                     preview build          production build
                     (TestFlight)          (TestFlight → App Store)
```

CI (`.github/workflows/ci.yml`) runs on every pull request and on pushes to
`main` and `development`, so both merges are gated by typecheck, lint and tests.

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

# Preview → TestFlight, points at the dev Supabase project
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

1. Develop with `npm run start:dev`.
2. Confirm the required variables above exist in the target EAS environment.
3. Run `npm run verify` and test against development Supabase.
4. Merge `development` into `main`; let CI pass.
5. Run `npm run start:prod` and test the same dev client against production.
6. Bump `version` in `app.config.ts` (and `package.json`) when the release has
   native changes.
7. Run `npm run release:testflight` to build and submit the production app.
8. Verify the TestFlight build, then tag the release.

## App privacy answers

Tini Time Club collects account, profile, review, comment, photo, favorite
place, notification, and nearby-discovery data to operate the app and measure
product usage. If App Store Connect marks any collected data type as being
used to track users, the iOS app must include App Tracking Transparency and
must request permission before that tracking use.

The ATT prompt is configured through `expo-tracking-transparency` in
`app.config.ts` and requested once from the root layout. If App Review rejects
a build under Guideline 5.1.2(i), confirm App Privacy is current, submit a new
iOS build, and note that the tracking permission prompt appears at app launch.
