# Tini Time Club architecture

This is a living map of the system’s runtime boundaries and design decisions.
Use the code, `package.json`, `app.config.ts`, and Supabase migrations as the
authoritative sources when this document and the implementation disagree.
For product language, read [`CONTEXT.md`](CONTEXT.md).

## System shape

Tini Time Club has three cooperating surfaces:

```text
┌──────────────────────┐       ┌──────────────────────┐
│ Expo member app      │       │ Next.js admin app    │
│ app/, components/    │       │ admin/               │
└──────────┬───────────┘       └──────────┬───────────┘
           │                              │
           └──────────────┬───────────────┘
                          │
                 ┌────────▼────────┐
                 │ Supabase         │
                 │ Auth + Postgres  │
                 │ Storage + Realtime│
                 │ Edge Functions   │
                 └──────────────────┘
```

The member app is the primary product surface. The admin app is a separate
Next.js project with its own instructions and configuration. Supabase is the
system of record for identity, member data, reviews, social relationships,
notifications, analytics events, and server-side business rules.

For the step-by-step release runbook, versioning rules, environment variables,
TestFlight commands, and store checklist, read [`RELEASE.md`](RELEASE.md).

## Member app layers

The member app is organized as a one-way dependency flow:

```text
Routes (`app/`)
  → presentation (`components/`)
  → orchestration (`hooks/`, `context/`)
  → deep modules (`services/`)
  → adapters (`utils/supabase.ts`, storage, Edge Functions)
  → Supabase
```

### Routes

`app/` contains Expo Router screens and layouts. The root layout establishes
fonts, theme, gesture handling, authentication startup, and app-wide
providers. The tab layout owns the native tab bar, tab gating, push-token
registration, and notification-open routing.

Routes should coordinate presentation and navigation. New data access should
normally be placed behind a service module or hook rather than embedded in a
screen.

### Presentation

`components/` contains reusable UI. Shared controls use theme tokens from
`theme/` and semantic typography roles. Feature components own visual details
for their feature; shared components own behavior that must remain consistent
across screens.

### Orchestration

`context/` contains cross-screen state with lifecycle semantics:

- `profile-context` owns the signed-in profile, profile refresh, onboarding
  state, and sign-out invalidation.
- `membership-context` gates member-only actions and preserves the return path
  into membership.
- `activity-context` owns the Activity badge count, Realtime invalidation, and
  push-open receipt updates.

`hooks/` compose service calls into screen-friendly state, loading, refresh, and
mutation behavior. A hook is an orchestration module, not a second data layer.

### Deep modules and seams

The important seam is the service module interface. Services hide RPC names,
payload normalization, caching, error translation, and side effects from
callers. Keep these interfaces small and make them the test surface.

- `activityService` exposes page loading, unseen counts, receipt mutations, and
  Realtime subscription. It decodes untrusted JSON and hydrates review images.
- `reviewPublishingService` uploads the image, calls the transactional publish
  RPC, and compensates by deleting the uploaded object if the database stage
  fails.
- `databaseService` owns general cached reads and cache invalidation for
  profiles, reviews, and related data.
- `mentionService` owns mention candidate lookup, validation payloads, and
  server-backed mention metadata.
- `pushNotificationService` owns permission, token registration, and push
  routing concerns.

Pure transformations belong in `utils/` and should stay free of Supabase and
React state where possible. Examples include activity grouping, route parsing,
review validation, ranking, and share-card calculations.

`utils/supabase.ts` is the Supabase client adapter. It resolves runtime config,
persists auth through secure storage on native, and starts/stops token refresh
with app foreground state.

## Authentication and runtime environments

Authentication startup is centralized in `app/_layout.tsx`. It resolves the
stored Supabase session, handles auth callback deep links, loads the profile,
routes incomplete profiles to onboarding, and keeps the tab tree stable during
session transitions.

Environment selection has two independent axes:

- `APP_ENV` selects app configuration such as bundle identifier and EAS
  environment.
- `BACKEND_ENV` selects the Supabase backend the app talks to.

EAS profiles define the normal environment values. Before a database push,
verify `supabase/.temp/linked-project.json` against the backend selected by the
active EAS environment. Development, preview, and production are separate
backends and must be treated as separate deployment targets.

## Release topology: Supabase branches, EAS builds, and OTA

The release topology has two Supabase branches/backends and three app release
targets. Preview is a release build of the development backend; production is
always built from `main` against the production backend.

| Target                          | Git source                | Supabase branch | EAS environment | Channel / update branch | Native profile  |
| ------------------------------- | ------------------------- | --------------- | --------------- | ----------------------- | --------------- |
| Development simulator           | working branch            | development     | `development`   | `development`           | `ios-simulator` |
| Preview/TestFlight              | release branch under test | development     | `preview`       | `preview`               | `preview`       |
| Production/TestFlight/App Store | `main`                    | production      | `production`    | `production`            | `production`    |

The `development` and `ios-simulator` EAS profiles are internal development
clients. They use the `development` channel while JavaScript normally iterates
through Metro. The `preview` profile is a store-distributed build that still
uses development Supabase data. The `production` profile is the only release
target that uses production Supabase data and it must be built from `main`.

An EAS environment is not a Supabase branch. The preview EAS environment must
contain development backend values even though its EAS environment name is
`preview`; `BACKEND_ENV` records that distinction in the runtime config.

### Native builds

A native build produces the binary, bundle identifier, URL scheme, native
permissions, embedded runtime configuration, and the channel that receives
updates. Use a new build for Expo SDK upgrades, native dependencies, config
plugins, permissions, bundle identity, or any other native change:

```sh
npx eas build --profile ios-simulator --platform ios
npx eas build --profile preview --platform ios
npx eas build --profile production --platform ios
```

EAS owns platform build numbers because `eas.json` uses
`appVersionSource: "remote"`. The marketing version in `app.config.ts` is also
the `runtimeVersion` because the app uses `runtimeVersion.policy: "appVersion"`.
Never reuse a shipped version for a binary with incompatible native code.

### OTA updates

An OTA update publishes JavaScript and assets to an EAS update branch. The
channel on an installed build points it at that branch:

```sh
npx eas update --branch preview --platform ios --environment preview --message "fix: ..."
npx eas update --branch production --platform ios --environment production --message "fix: ..."
```

In this project, channels and update branches are named `development`,
`preview`, and `production`. An update reaches only builds whose
`runtimeVersion` matches, so a JS-only fix can ship without a store review
while remaining isolated to its target. The update environment must match the
target channel’s EAS variables.

An OTA update cannot change native code, native configuration, permissions,
bundle identity, or the runtime version. Database changes sent with an OTA
must already be deployed compatibly; use additive migrations and preserve
older-client behavior until the new binary/update is available.

The practical flow is:

```text
working branch → development simulator / Metro
      ↓
release branch → preview build → development Supabase
      ↓ merge
main → production build or production OTA → production Supabase
```

There are no automated EAS release integrations in the repository. The exact
manual commands, required EAS variables, and production safety checklist live
in [`RELEASE.md`](RELEASE.md).

## Supabase architecture

### Postgres is the business-rule layer

Complex writes and privacy-sensitive reads belong in Postgres functions and
are exposed through small RPC interfaces. Migrations define tables, indexes,
RLS, triggers, functions, grants, and Realtime publication membership.

Use `SECURITY DEFINER` only where the function intentionally mediates access;
set an explicit `search_path`, validate the authenticated user, and keep the
function’s allowed input and output narrow.

### Activity is a projection

Activity uses `notifications` as an immutable delivery ledger and derives the
member-visible projection through RPCs:

```text
social event
  → notifications ledger
  → activity_supported_notification + source/privacy filters
  → get_activity_page / get_activity_unseen_count
  → Activity service decoder/grouping
  → Activity UI
```

`activity_receipts` tracks seen/read state per member and notification.
`activity_withdrawals` hides reversible, blocked, deleted, or otherwise
invalidated events without deleting the delivery ledger. Realtime changes to
the ledger, receipts, and withdrawals invalidate the app’s Activity cache.

When adding an Activity kind, update the complete contract together:

1. notification producer and event data;
2. supported-kind helper and all Activity RPC eligibility rules;
3. TypeScript kind/decoder/grouping/UI behavior;
4. withdrawal/privacy behavior;
5. pgTAP and focused app tests.

### Storage and media

Storage paths are not presentation URLs. Services hydrate paths into signed or
public delivery URLs at the appropriate seam. Keep that conversion out of
individual screens so caching and expiration behavior stay consistent.

### Edge Functions

Edge Functions handle server-only integrations and controlled gateways,
including public content delivery, app events, app usage, push delivery, and
account deletion. They are not a substitute for a Postgres transaction when
the operation changes relational application state.

## Testing strategy

- Pure rules and decoders: Jest tests beside the relevant utility or service.
- Hook and component orchestration: Jest tests with mocked service seams.
- Database contracts and RLS/RPC behavior: pgTAP files in `supabase/tests/`.
- Edge Function behavior: tests in the function directory where provided.
- End-to-end/manual checks: use the development EAS environment and confirm
  the runtime Supabase project before testing data-dependent behavior.

For a feature that crosses layers, test at the deepest correct seam first,
then add a UI test only for presentation behavior. For network or data-fetching
changes, read the `native-data-fetching` skill before implementation.

## Change recipes

### Add a data-backed feature

Define the domain output first, add the migration/RPC and its database test,
then expose a small service interface, compose it in a hook/context, and add
the route/component behavior. Keep authorization and privacy checks server-side
and make the client decoder defensive.

### Change an existing database contract

Add a new timestamped migration; do not rewrite an applied migration. Run
`supabase db push --dry-run`, verify the linked project, push to the intended
environment, and confirm with `supabase migration list`. Add or update pgTAP
coverage before treating the change as complete.

### Change shared UI

Prefer a semantic prop or variant on the shared component when behavior or
geometry is intentionally shared. Use a feature-local variant when only one
surface needs a different density or layout. Validate with typecheck, focused
tests, lint, and a simulator check when native layout is involved.

## Operational guardrails

- Preserve unrelated working-tree changes.
- Keep secrets in environment variables and redact them from logs and reports.
- Use `git diff --check` before handoff.
- Report which environment was changed when a Supabase migration or EAS
  configuration was involved.
