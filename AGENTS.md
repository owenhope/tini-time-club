# Tini Time Club agent guide

## Project shape

- The repository root is an Expo Router app for iOS and web.
- For cross-layer changes, module seams, or system structure, read
  [`architecture.md`](architecture.md) before editing.
- For builds, channels, OTA updates, or environment promotion, read
  [`RELEASE.md`](RELEASE.md) before changing configuration or deploying.
- `app/` contains routes; reusable UI belongs in `components/`; domain and
  network logic belongs in `services/` or `hooks/`.
- `supabase/migrations/` is the database source of truth and
  `supabase/tests/` contains pgTAP database contract tests.
- `admin/` is a separate Next.js app. When changing it, read
  [`admin/AGENTS.md`](admin/AGENTS.md) first.

## Before changing code

- Check `git status --short --branch` and preserve unrelated user changes.
- Read the closest existing implementation and its tests before introducing a
  new pattern.
- Keep credentials in environment variables. Never print, commit, or copy
  Supabase keys, tokens, passwords, or private user data into source or logs.

## Code conventions

- Use strict TypeScript and the `@/*` path alias.
- Use theme tokens through `makeStyles` and semantic typography roles. Keep
  shared behavior in shared components instead of duplicating styles at call
  sites.
- Follow Expo Router conventions: routes stay in `app/`, reusable code stays
  outside it, and navigation uses the existing route helpers.
- Use `expo-image` for images and `react-native-safe-area-context` for safe
  areas. Prefer flexbox and theme spacing over screen-dimension calculations.
- For network requests or data fetching, read the `native-data-fetching` skill
  before changing the implementation.

## Validation

Run the narrowest relevant checks first, then expand as risk warrants:

```sh
npm run typecheck
npm test -- --runInBand path/to/relevant.test.ts
npm run lint
npm run verify
```

Database changes should include a focused pgTAP regression test. Local database
tests use:

```sh
supabase test db
```

The local Supabase container must be running for that command. If it is not
available, report that limitation and verify the affected RPC through the
development API when appropriate.

## Supabase environments

- Treat development, preview, and production as separate backends.
- Before `supabase db push`, verify the linked project in
  `supabase/.temp/linked-project.json` and compare it with the backend selected
  by the active EAS environment. A successful push to the wrong linked project
  is still the wrong deployment.
- Add a new timestamped migration for changes already applied remotely; do not
  rewrite an applied migration. Use `supabase db push --dry-run` before a real
  push, and run `supabase migration list` afterward.
- Database migrations should be reversible or safely idempotent where
  practical, avoid destructive data changes, and keep authorization/RLS
  behavior explicit.

## Git handoff

- Keep commits focused and describe the user-visible or data-contract change.
- Before handing work back, run `git diff --check`, report the validation
  performed, and state whether the working tree is clean.
