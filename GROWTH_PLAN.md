# Tini Time Club — Growth & Feature Plan

_Last updated: 2026-07-31 (day of the Rank Rings / Regulars TestFlight build, v3.0.1)_

The club's flywheel: **users review → status (rings/regulars) → status unlocks real-world perks → perks attract users and businesses → more reviews.** Every feature below should strengthen a loop in that flywheel, not just add surface area.

## Priorities (in order)

1. Get new users
2. Get more reviews
3. Get users to invite friends / share their experiences
4. Get businesses into the app
5. Users get discounts for visiting locations through the app
6. Turn TTC status into swag/rewards — membership in the club means something

---

## P1 — Get new users

The app is invite-shaped already (a "club"). Lean into scarcity + shareability rather than paid acquisition.

- **Public share pages** — a review or profile generates a beautiful web preview (OG image with the drink photo, rating, and the reviewer's ring). Anyone tapping a shared link hits an install page. This is the single highest-leverage acquisition feature because it makes P3 produce P1.
- **App Store optimization** — screenshots showing rings/regulars status, promotional text rotated per feature launch (already doing this).
- **Local-first launches** — TTC works city by city. Seed one city's map with great data (P4 claiming helps), then launch the next.
- Later: referral rewards (see P3), press-worthy moments ("Top Shelf" members, city launch parties).

## P2 — Get more reviews

Status mechanics shipped 2026-07-31 are the engine here; keep tuning them.

- ✅ **Rank Rings** — Well (0) → Call (10) → Premium (50) → Top Shelf (150). Progress bar on own profile.
- ✅ **Regulars** — top 3 reviewers per location, featured on the place page and profile.
- **Rank-up moments** — full-screen celebration + share card when crossing a tier or becoming a Regular (feeds P3). Currently a rank-up is silent.
- **Streaks / prompts** — gentle nudge when at a favorited location ("At The Mosser? Rate tonight's tini"), weekly recap notification ("2 more reviews to Call").
- **Lower friction** — review flow is camera-first; keep a no-photo quick-rate path in mind if data shows drop-off at the camera step.
- **Defend review quality** — as incentives grow (P5/P6), expect junk reviews; plan rate limits and a report flow before offers launch.

## P3 — Invites & sharing

Give status something to be shown off outside the app.

- **Share cards** — every review, rank-up, and Regular placement renders a branded, photo-forward card for IG stories / iMessage. The ring visual is the brand.
- **Invite your drinking buddy** — contact-picker invite with a personal hook: "Join me on Tini Time Club — I'm a Regular at John's Grill." Deep link lands them on the inviter's profile after signup.
- **Referral loop (later, once P5 exists)** — invitee and inviter both get an offer/discount credit; referral count could feed a special ring accent or badge.
- **Taggable friends** — tag who you drank with on a review; tagged non-users get an invite, tagged users get a notification (social pull-back into the app).

## P4 — Businesses in the app

Gateway: **claiming.** Everything else hangs off a verified owner. Full brainstorm from 2026-07-31:

- **Claim flow** — "Own this place?" on the place page → business account signup → verification → business dashboard for that location. Schema: `business_accounts` + `location_claims` (location_id, owner, status pending/verified/rejected).
- **Verify manually at first** — right at current scale, and forces conversations with the first ten claimed bars. Phone-match against Google Places or email-domain checks later.
- **Free tier** (the sales pipeline): respond to reviews, fix hours/details, see views + reviews + their Regulars.
- **Paid: Featured locations on the map** — distinct pin (gold/olive badge), visibility priority at low zoom, and a Featured carousel above the map. Label paid placement "Featured" and keep an algorithmic "Top Rated" label separate — mixing them unlabeled erodes the trust that makes featuring worth paying for.
- **Sell with data** — offer redemptions (P5) are the conversion metric that justifies the featuring price: "X TTC members redeemed at bars like yours last month."

## P5 — Discounts for using the app

- **MVP redemption is deliberately dumb** — offer card on the place page → "Redeem" → full-screen branded coupon with a slow pulsing animation (hard to screenshot-fake) → show the bartender. No POS, no codes.
- **Anti-abuse v2** — server-side redemption log, one per user/offer/day, optional 4-digit staff PIN. Skip QR/POS integration unless a chain demands it.
- **Status-gated offers (the differentiator)** — "Top Shelf members: $2 off," "Regulars drink happy-hour prices all night." This is the flywheel move: offers give rings/regulars real-world value → people review more → bars get more reviews → more bars claim. Nobody can copy this without the review graph.
- Offers gated to claimed businesses only (P4 dependency).

## P6 — Status → swag & club rewards

The long game: TTC membership as identity.

- **Tier rewards from TTC itself** — hit Premium: sticker pack / coaster set; Top Shelf: enamel pin, embroidered hat, annual "Top Shelf card" (metal card energy). Physical goods that photograph well feed P3.
- **Club perks** — Top Shelf early access to features, city launch party invites, an annual "best tini in [city]" award voted by high-tier members.
- **Merch drops** — limited TTC merch purchasable by anyone but with tier-exclusive colorways; ring colors (bronze/silver/gold/violet) are a ready-made merch palette.
- Needs: an address-collection flow, fulfillment partner, and the in-house analytics/admin platform (already planned) to manage it.

---

## Sequencing

| Phase | Ship | Serves | Why now |
|---|---|---|---|
| 1 | Rank-up/Regular celebration moments + share cards | P2, P3 | Cheapest multiplier on features that just shipped |
| 2 | Public web share pages + invite flow | P1, P3 | Makes every share an acquisition channel |
| 3 | Business claiming (manual verify) + free dashboard | P4 | No revenue yet, but builds relationships and cleans map data |
| 4 | Offers with dumb redemption, incl. status-gated offers | P5, P2 | The feature bars actually want; gives rings real-world value |
| 5 | Paid featured locations on the map | P4 ($) | Sell once redemption data proves value |
| 6 | Referral rewards, swag tiers, club perks | P1, P6 | Needs P5's offer plumbing + analytics platform |

## Status notes

- ✅ 2026-08-01: the web surface exists — `admin/` (Next.js + Supabase service
  role) with a metrics dashboard and user management (verify, soft-delete).
  Business claiming dashboards, share pages, and the analytics platform build
  on this app rather than starting new ones. See admin/README.md.
- ✅ 2026-08-01: public review sharing is wired: app share actions create
  `ttc.hopemediahouse.com/r/<review-id>` links, public web pages render the
  review, `/admin` is the protected operator URL, and share analytics track
  member/channel usage.
- ✅ 2026-08-01: public profile sharing is wired: app profile share actions
  create `ttc.hopemediahouse.com/u/<username>` links, public profile pages
  render recent reviews with app deep links, and admin analytics track profile
  share usage alongside review sharing.
- ✅ 2026-08-01: rank-up and Regular celebration moments are analytics-aware:
  celebration views and shares are logged server-side, share sheets include
  public profile links, and admin analytics shows celebration usage by kind.
- ✅ 2026-08-01: the first invite loop is in place: Settings includes an
  invite share-sheet action, invite links point at the member's public profile,
  and admin analytics tracks invite volume/channel usage.

## Guardrails

- Never mix paid "Featured" with earned "Top Rated" without labels.
- Watch review quality once anything is incentivized — rate limits + reporting before offers go live.
- Redemption logs are the first real conversion metric; design the offers schema so the future in-house analytics platform can read it.
