# Tini Time Club — Admin

Operations dashboard for TTC. Next.js (App Router) + Supabase service role.
This is the web surface that grows into business operations (claiming,
offers, featured placement), public share pages, and the in-house analytics
platform — see GROWTH_PLAN.md at the repo root.

## Running

```bash
npm --prefix admin run dev
```

Opens on http://localhost:3001. Public pages live at `/` and `/r/<review-id>`;
the operator dashboard lives under `/admin` and `/admin/login`. Requires
`admin/.env.local`:

| var                         | what                                         |
| --------------------------- | -------------------------------------------- |
| `SUPABASE_URL`              | project URL (currently the dev project)      |
| `SUPABASE_SERVICE_ROLE_KEY` | service-role key — server-only, bypasses RLS |
| `ADMIN_PASSWORD`            | the sign-in password                         |
| `SESSION_SECRET`            | HMAC secret for the session cookie           |

Keys can be fetched with `npx supabase projects api-keys --project-ref <ref>`.
Point at production by swapping `SUPABASE_URL` + service key.

## Auth model (deliberately minimal)

One shared password (`ADMIN_PASSWORD`) exchanged for a 7-day HMAC-signed
httpOnly cookie; `proxy.ts` gates `/admin` and `/admin/*` except
`/admin/login`. Single-operator tool for now — swap for Supabase Auth with an
email allowlist when a second admin exists. The service-role key never leaves
the server (`server-only` imports make client-side use a build error).

## What exists

- **Dashboard** — member/review/location totals, top locations, and newest
  signups (email + join date from `auth.users`).
- **Live** — automatically refreshed anonymous/member audience, seven-day
  traffic, visitor-to-member installations, and the latest privacy-safe app
  actions. Anonymous figures are distinct random installations, not inferred
  people; installation and session IDs never reach the rendered feed.
- **Health** — a range-aware operational readout with growth wins and losses,
  auth and retention detail, moderation status, transparent definitions, and
  direct links to investigate each signal.
- **Product analytics** — onboarding and first/second-review funnels from
  authoritative rows; follows, likes, comments, shares, and invites from their
  source tables; plus D7 installation retention, auth-session health, and app
  version adoption from privacy-safe mobile telemetry.
- **Users** — searchable list (rank tier, review count, email, join/last
  sign-in), detail view with the member's reviews, verify/unverify, and
  soft-delete/restore (`profiles.deleted` — same flag the app respects).
- **Public review links** — `/r/<review-id>` renders a public, photo-forward
  review page and attempts the native app deep link.
- **Share analytics** — review share events are written through
  `log_review_share(...)` into `review_share_events`; the analytics page shows
  share volume, channel split, and top sharers.

## Deploying

Built with Vercel in mind: set the four env vars, root directory `admin/`.
Do not deploy pointed at prod until the auth story is upgraded past a shared
password, or at minimum the deployment is IP-restricted / behind Vercel
authentication.

## Member emails

`/admin/emails` supports one member, selected members (up to 500), or all
eligible members. Apply `20260915180000_admin_email_campaigns.sql` and
`20260915190000_admin_email_audience_exclusions.sql` to the admin's backend first. Drafts freeze the message, sender, unsubscribe origin,
and deduplicated recipient list. Accounts must be active with confirmed email;
opt-outs are checked when drafting and again before delivery.

Choosing all eligible members loads a complete list of usernames and email
addresses beside the composer. Remove individual recipients with × or use
Restore all. These exclusions apply only to that email and are enforced when
the draft recipient list is saved; they do not unsubscribe the member.

Add these server-only variables to `admin/.env.local` and deployment settings:

- `RESEND_API_KEY`: Resend sending API key.
- `RESEND_FROM_EMAIL`: verified sender, e.g. `hello@tinitimeclub.com`.
- `EMAIL_PUBLIC_URL`: public HTTPS origin serving this app's unsubscribe routes.

Deploy the public `/email/unsubscribe` page and `/api/email/unsubscribe` POST
handler against the same database before setting `EMAIL_PUBLIC_URL`. Leaving
it unset permits composing and reviewing drafts but disables sending. Create
a fresh draft after changing sender settings. Never point development email
links at a production app backed by a different database.

Sending advances in chunks of ten while the page is open. History allows
resuming after a reload. Each recipient has a stable Resend idempotency key;
interrupted attempts wait five minutes before retry. After 23 hours, uncertain
attempts require checking Resend manually rather than risking duplicates.
"Accepted" means Resend accepted the email, not that it reached the inbox.
Resend's dashboard contains delivery and bounce details. This UI does not
override Resend quotas; a rate/quota error pauses the campaign.

Member broadcasts include opt-out links and RFC 8058 one-click unsubscribe.
Use an appropriately subscribed audience for promotional content; account
creation alone is not recorded as marketing consent by this feature.

Validation: `npm --prefix admin test`, `npm --prefix admin run typecheck`,
and `supabase test db supabase/tests/admin_email_campaigns.test.sql`.
