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
- **minor** (3.1.0) — new features, no breaking change to stored data or routes
- **major** (4.0.0) — Expo SDK upgrade, route/deep-link restructure, data model change

This matters beyond bookkeeping: `runtimeVersion.policy` is `appVersion`, so
the version string is what pairs an OTA update with a native binary. Two
native builds sharing one version can be served each other's JS. That is
exactly the trap 3.0.0 avoids — 2.2.7 already shipped as production build 58
on SDK 52, and this tree is SDK 57.

Rule of thumb: **changed anything native (SDK, plugin, permission, native
dep)? bump at least the minor and never reuse a shipped version.**

## Building

```bash
# Dev client for the simulator (JS iterates over Metro afterwards)
npx eas build --profile ios-simulator --platform ios

# Preview → TestFlight, points at the dev Supabase project
npx eas build --profile preview --platform ios
npx eas submit --profile preview --platform ios --latest

# Production → TestFlight → App Store
npx eas build --profile production --platform ios
npx eas submit --profile production --platform ios --latest
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
for local Metro only and is gitignored.

Each environment must have a **matching** `EXPO_PUBLIC_SUPABASE_URL` and
`EXPO_PUBLIC_SUPABASE_ANON_KEY` — the anon key is a JWT signed for one
project ref, so a key from another project is rejected. Verify with:

```bash
npx eas env:list development
```

`EXPO_PUBLIC_DEVELOPMENT=true` suppresses push notifications on writes; it
should be `true` for development and preview, `false` for production.

## Release checklist

1. Bump `version` in `app.config.ts` (and `package.json`) per the rules above.
2. Merge to `development`; let CI pass.
3. `eas build --profile preview` → `eas submit --profile preview`.
4. Verify on TestFlight against the dev Supabase project.
5. Merge `development` → `main`; let CI pass.
6. `eas build --profile production` → `eas submit --profile production`.
7. Tag the release: `git tag v3.0.0 && git push --tags`.
