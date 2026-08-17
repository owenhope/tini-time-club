# Tini Time Club — Admin

Operations dashboard for TTC. Next.js (App Router) + Supabase service role.
This is the web surface that grows into business operations (claiming,
offers, featured placement), public share pages, and the in-house analytics
platform — see GROWTH_PLAN.md at the repo root.

## Running

```bash
npm --prefix admin run dev
```

Opens on http://localhost:3000. Public pages live at `/` and `/r/<review-id>`;
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

- **Dashboard** — member/review/location totals, reviews-per-day (30d),
  top locations, newest signups (email + join date from `auth.users`).
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
