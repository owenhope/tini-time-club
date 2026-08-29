# Location claims, verification, and managers

Status: approved implementation specification  
Audience: implementation agent (Luna)  
Decision date: 2026-08-28

## Objective

Let a signed-in Tini Time Club member submit a short claim for an existing bar
or restaurant. The operator reviews the claim in the admin app. Approval makes
the location visibly verified, but it does **not** automatically give the
claimant management access. The operator can separately associate any existing
member account with a location as a manager.

This is the authorization foundation for future business offers. It does not
include offers or a business dashboard.

## Product contract

- Verification means Tini Time Club manually reviewed a business claim. It is
  not an endorsement, quality judgment, or statement that the location is open.
- A claim applies to one existing physical location. Claiming does not create a
  location and does not model chains or parent organizations.
- A claimant remains an ordinary member. There is no mutually exclusive
  `business` user type and no `business_accounts` table.
- A member can manage several locations, and a location can have several
  managers.
- Approval verifies the location. It does not automatically make the requester
  a manager.
- Location verification and manager authorization are independent, audited
  concepts.
- Manager relationships are private. The public sees only whether the location
  is verified.
- A location may be verified with no manager, or have a manager while not
  verified.
- Future offer publishing must require both an active manager relationship and
  active location verification.

## Vocabulary

Use these terms consistently in code, schema, copy, and tests:

- **Claim**: a member's request for Tini Time Club to verify a location.
- **Requester**: the member who submitted a claim. A requester is not
  necessarily a manager.
- **Location verification**: an operator-approved period during which a
  location displays the Verified Business mark.
- **Manager**: an existing member account privately associated with one
  location by the operator.
- **Verified Business mark**: the purple verified check shown beside a location
  identity.
- **Golden Glass**: an independent, earned community recognition. It can
  coexist with business verification.

Do not call the requester an owner unless that is the role they entered. Do not
reuse profile/admin verification language for locations.

## Non-goals

Do not build any of the following in this pass:

- offers, promotions, ads, redemption, or paid placement;
- a business dashboard;
- location editing by claimants or managers;
- self-service manager invitations or access requests;
- organizations, brands, or chain-level ownership;
- public manager lists;
- multiple manager roles or permission tiers;
- file or document uploads;
- CAPTCHA or a global claim quota;
- transactional email or an email provider;
- automatic verification from email domains, phone numbers, or Google data.

## Existing-system constraints

Read `AGENTS.md` and `architecture.md` before implementation. Read
`admin/AGENTS.md` before changing the Next.js admin app. This feature adds
network calls, so follow the `native-data-fetching` skill before changing the
member-app implementation.

Important existing facts:

- Supabase Auth identity maps to `profiles`; membership is not an exclusive
  role.
- `locations.created_by` records provenance, not ownership.
- `profiles.is_verified` means a verified Tini Time Club admin/profile and must
  not be reused for location verification.
- `location_ratings` is the central read projection for location identity and
  already propagates `is_golden_glass` through search, map, feed, discovery,
  and public-content seams.
- The current content `reports` queue is specialized to reviews/comments.
  Claims need their own table and admin queue.
- The admin app uses a server-only service-role client and a shared operator
  session. There is no individual admin-user identity to record as reviewer.
- There is no application email-delivery provider. Existing operator messages
  use in-app notifications and Expo push.
- Authenticated members currently have unrestricted direct `UPDATE` access to
  `locations`, and `createOrGetLocation()` relies on it. The migration plan
  below must remove this access without breaking older clients.

## Domain model and invariants

```text
profiles
   | 1
   | submits
   v many
location_claims --------> locations
                               |
                     +---------+----------+
                     |                    |
                     v                    v
          location_verifications   location_managers
              (public result)       (private authority)
```

The following invariants are mandatory:

1. Only an authenticated member with a completed profile and confirmed account
   email can submit a claim.
2. Claims can target only existing, currently unverified locations.
3. A requester can have at most one pending claim for a location.
4. Different requesters may have simultaneous pending claims for one location.
5. A rejected requester cannot submit another claim for the same location for
   seven days after the rejection decision.
6. Approving a claim creates one active verification period and supersedes all
   other pending claims for that location in the same transaction.
7. At most one verification period can be active for a location.
8. Revocation ends a verification period; restoration creates a new period and
   preserves the earlier history.
9. Claim approval never creates a manager relationship.
10. At most one manager assignment period for a profile/location pair can be
    active at once.
11. Removing a manager preserves the assignment period for audit.
12. Neither a claim nor a manager relationship grants direct location-editing
    permission.
13. Public reads expose only a derived `is_location_verified` boolean, never
    claim contact information, manager identities, or admin notes.

## Database design

Create new timestamped migrations; do not rewrite applied migrations.

### `location_claims`

Recommended columns:

| Column                   | Contract                                                     |
| ------------------------ | ------------------------------------------------------------ |
| `id`                     | UUID primary key                                             |
| `location_id`            | Required FK to `locations`; indexed                          |
| `requester_profile_id`   | Nullable FK to `profiles` with `ON DELETE SET NULL`          |
| `contact_name`           | Server-derived profile-name snapshot; nullable for redaction |
| `account_email`          | Server-derived auth-email snapshot; nullable for redaction   |
| `business_email`         | Required at submission; nullable for redaction               |
| `business_role`          | Required short text                                          |
| `phone`                  | Optional; nullable                                           |
| `explanation`            | Required short text; nullable for redaction                  |
| `status`                 | `pending`, `approved`, `rejected`, or `superseded`           |
| `submitted_at`           | Required timestamp, default now                              |
| `decided_at`             | Required for every terminal status                           |
| `rejection_reason`       | Required only for `rejected`; claimant-visible               |
| `admin_notes`            | Optional and admin-only                                      |
| `superseded_by_claim_id` | Required for `superseded`; self-reference                    |
| `requester_redacted_at`  | Set when account deletion redacts the snapshot               |

Use check constraints for state-dependent fields and nonblank trimmed input.
Add a partial unique index preventing more than one pending claim for the same
non-null requester/location pair. Add indexes supporting the pending queue,
location history, requester history, and cooldown lookup.

Do not let authenticated clients select the table directly because the row
contains private `admin_notes` and contact snapshots. Expose a safe requester
projection through an RPC.

### `location_verifications`

Use one row per verification period rather than a boolean on `locations`.

| Column                          | Contract                                              |
| ------------------------------- | ----------------------------------------------------- |
| `id`                            | UUID primary key                                      |
| `location_id`                   | Required FK to `locations`; indexed                   |
| `source_claim_id`               | Required approved claim that established the evidence |
| `restored_from_verification_id` | Nullable self-reference for restoration               |
| `verified_at`                   | Required timestamp                                    |
| `verification_reason`           | Null for ordinary approval; required for restoration  |
| `revoked_at`                    | Null while active                                     |
| `revocation_reason`             | Required when `revoked_at` is set                     |

Add a partial unique index allowing only one row per `location_id` where
`revoked_at IS NULL`. Preserve every period. Do not overwrite a revoked row to
restore verification.

Provide a stable database helper such as
`is_location_verified(location_id uuid)` and project the result as the explicit
field `is_location_verified`. Do not use the ambiguous name `is_verified`.

### `location_managers`

Use one row per assignment period so reactivation retains history.

| Column           | Contract                                                        |
| ---------------- | --------------------------------------------------------------- |
| `id`             | UUID primary key                                                |
| `location_id`    | Required FK to `locations`; indexed                             |
| `profile_id`     | Nullable FK to `profiles` with `ON DELETE SET NULL`             |
| `status`         | `active` or `removed`                                           |
| `added_at`       | Required timestamp                                              |
| `removed_at`     | Required when removed                                           |
| `removal_reason` | Optional; use a stable account-deletion/merge reason internally |

Add a partial unique index preventing two active assignments for the same
non-null profile/location pair. Re-adding a removed manager creates a new
assignment period; it must not reactivate or erase the old period.

Do not add an owner/marketer/staff role column in v1. The relationship itself
means `manager`.

## RPC and transaction contracts

All `SECURITY DEFINER` functions must set an explicit `search_path`, validate
`auth.uid()`, and expose only the minimum data required. Revoke default execute
privileges and grant each function only to its intended role. Admin transaction
functions may instead be `SECURITY INVOKER` and executable only by
`service_role`.

### Harden location resolution before adding business authority

The existing authenticated policy permits any member to update any location.
It is currently used by `services/databaseService.ts#createOrGetLocation` for
favorite-place selection and edited-review location resolution.

Introduce one narrow authenticated RPC for resolving or creating a Google
location. Prefer extracting a shared database helper so this RPC and
`publish_review_v1` use the same canonical-location rules.

The narrow contract must:

- require an authenticated member;
- validate IDs, coordinate ranges, and bounded strings;
- match canonical Google `place_id` first and the existing normalized
  name/address fallback second;
- create a new location with `created_by = auth.uid()` when no match exists;
- backfill `place_id` only when the canonical row does not already have one;
- never overwrite an existing row's name, address, coordinates, region, or
  `created_by` merely because an upsert encountered a conflict;
- return the canonical location needed by current callers.

Refactor `createOrGetLocation()` to call the RPC, preserving its service-module
interface and existing callers.

This hardening requires two deployment-safe migrations:

1. **Additive migration:** add the RPC/helper while retaining existing direct
   permissions for older clients.
2. Deploy the updated app code to every supported environment/runtime and
   verify favorite-location selection plus edited-review location changes.
3. **Enforcement migration:** drop `"Allow authenticated users to update
locations"`, revoke unnecessary authenticated `INSERT`/`UPDATE` table
   privileges, and require member writes to use the narrow RPC.

Do not apply the enforcement migration before supported clients have moved to
the RPC. Local development may test the final locked-down state, but production
rollout must honor this compatibility gate.

### Member claim submission

Add a member RPC such as `submit_location_claim` accepting only:

- `location_id`;
- business role;
- business contact email;
- optional phone;
- short explanation.

The server derives `requester_profile_id`, contact name, and account email. It
must confirm the auth email, completed profile, location existence,
unverified-location state, pending uniqueness, and seven-day rejection
cooldown inside the transaction. Return a safe claim receipt.

Add a safe requester RPC such as `get_my_location_claim_status(location_id)`.
It may return status, submission/decision dates, claimant-visible rejection
reason, superseding state, and calculated resubmission date. It must never
return private admin notes or another requester's record.

### Admin claim decisions

Add transactional admin-only functions/actions for:

- approving a pending claim;
- rejecting a pending claim with a required claimant-visible reason;
- revoking an active verification with a required private reason;
- restoring a revoked verification with a required reason;
- adding an existing profile as a location manager;
- removing an active manager assignment.

Approval must lock the relevant claim/location rows and atomically:

1. confirm the claim is still pending and the location is not already verified;
2. mark the selected claim approved;
3. create the active verification period;
4. mark every other pending claim for the location `superseded`, linking it to
   the approved claim;
5. create supported in-app notification records for the approved and
   superseded requesters.

Rejection sets the decision timestamp, required reason, and optional admin
notes, then creates the supported notification. Approval needs no reason.

Restoration creates a new verification period tied to the original approved
claim and the prior verification. It does not rewrite the revoked period or
require a new external claim.

Manager lookup and mutation stay in the server-only admin boundary. Search by
exact account email or username, show an unambiguous profile result, and require
confirmation of both profile and location before adding or removing access.

### Account deletion

Extend the existing hard-delete transaction so it:

- redacts the requester's contact name, account email, business email, phone,
  and explanation;
- sets `requester_redacted_at` and allows the profile FK to become null;
- ends active manager assignments for that profile before the profile is
  removed;
- preserves claim status, location, decision timestamps, rejection reason,
  verification history, and the location's current verification.

The deletion path must remain atomic and covered by pgTAP.

### Duplicate-location merge

Any location-merge transaction must reconcile these new tables before deleting
the duplicate location:

- move every claim to the canonical location;
- if the move would create two pending claims for one requester, preserve the
  oldest pending claim and mark the other superseded;
- move all verification history;
- if both locations have active verification periods, keep one active and end
  the other with an internal merge reason without deleting history;
- move manager history;
- if the same manager is active on both locations, preserve one active period
  and end the duplicate with an internal merge reason.

Make the reconciliation deterministic and test it. A raw foreign-key update is
not sufficient.

## Authorization and privacy

Required behavior:

| Actor         | Public verification | Own safe claim status | Claim PII/admin notes  | Decide verification | Manager records       | Location edits           |
| ------------- | ------------------- | --------------------- | ---------------------- | ------------------- | --------------------- | ------------------------ |
| Anonymous     | Read                | No                    | No                     | No                  | No                    | No                       |
| Member        | Read                | Read own via safe RPC | No direct table access | No                  | No                    | Narrow resolver RPC only |
| Manager       | Read                | Same as member        | No                     | No                  | No additional v1 read | Same as member           |
| Admin service | Read                | Read all              | Read all               | Yes                 | Add/remove/read       | Existing admin controls  |

Enable RLS on all new tables. Do not rely on UI hiding. Do not expose auth email
search or claim contact fields from a client-callable endpoint. Keep credentials
and service-role clients server-only.

## Claim lifecycle

```text
                    admin approves
pending ---------------------------------> approved
   |                                          |
   | admin rejects                            +--> active verification
   v
rejected -- after seven days --> new pending claim

When one claim is approved:
other pending claims for that location --> superseded
```

Terminal claim rows remain immutable audit records except for account-deletion
redaction. Revoking location verification does not change an approved claim
back to pending or rejected.

## Member-app experience

### Entry and membership return

Place the entry point in the location-information area currently implemented by
`components/PlaceInfo.tsx`.

- Unverified location, no current claim: show **Own or manage this place?**
- Signed-out visitor: use the existing membership-intent and safe-return-path
  flow, then return to the same location claim after authentication.
- Signed-in eligible member: open the short claim form.
- Pending requester: show **Claim under review** instead of another submit
  action.
- Rejected requester inside the cooldown: show the rejection reason and the
  exact date they may submit again.
- Rejected requester after the cooldown: allow a new submission.
- Verified location: hide claim submission and show **Verified business**.

The form should prefill member name/account email for display and collect:

- role at the business, required;
- business contact email, required;
- phone number, optional;
- short explanation, required.

Keep the interaction short. Do not add proof uploads or verification claims to
the UI copy. On success, show an immediate in-app receipt; do not send a push for
submission.

Put data access behind a dedicated service/hook seam. Routes coordinate
navigation and presentation; they must not contain raw Supabase queries.

## Verified Business mark

### Shared semantics

Create a location-specific shared badge/identity component. It may reuse the
purple `MaterialIcons` `verified` glyph and web SVG geometry, but it must not
reuse `VerifiedName`'s profile/admin accessibility meaning.

Required accessible text: **Verified business**.

Pressing/clicking the mark must show a short explanation equivalent to:

> Tini Time Club manually reviewed this business claim. Verification is not an
> endorsement.

The component must support simultaneous Verified Business and Golden Glass
marks without allowing either to replace the other.

### Data propagation

Add `is_location_verified` to `location_ratings` and every member/public/admin
read contract that presents a location identity. At compatibility boundaries,
decode a missing field as `false`; normalized domain types should use a required
boolean so UI code does not repeatedly interpret `undefined`.

Update direct RPC payloads where practical instead of creating another layer of
per-screen repair queries. Where legacy feeds still omit recognition fields,
extend the existing location-rating hydration seam once so both
`is_golden_glass` and `is_location_verified` are normalized together.

At minimum, inspect and update these native contracts/surfaces:

- `types/types.ts` (`LocationRating`, `ReviewLocation`);
- `services/discoveryService.ts`;
- `services/reviewFeedService.ts`;
- `services/databaseService.ts` location-rating hydration;
- `services/regularsService.ts`;
- `services/favoriteLocationSelection.ts`;
- `components/Location.tsx`, including media and collapsed headers;
- `components/PlaceInfo.tsx`;
- `components/explore/ExploreLists.tsx`;
- `components/explore/GoldenGlassList.tsx`;
- `components/map/locationDetails.tsx`;
- `components/ReviewItem.tsx`;
- `components/ReviewGrid.tsx` where the tile represents a location;
- `components/RegularPlaceRow.tsx`;
- `components/profile/FavoriteLocationLink.tsx`;
- `components/FavoriteLocationPicker.tsx`;
- `components/review-share/ReviewShareCard.tsx`.

Also update:

- the public-content Edge Function's location/search/map/review projections;
- public web location/review types and cards in `admin/lib/publicLocation.ts`,
  `admin/lib/publicReview.ts`, `admin/components/LocationShareCard.tsx`, and
  `admin/components/ReviewShareCard.tsx`;
- admin place list, place detail, and map DTOs/data/rendering.

This list is a minimum trace, not permission to omit another surface that
renders a location identity. Search for `is_golden_glass` and follow the same
propagation paths.

### Map-pin matrix

The existing ordinary pin is already purple, so color alone cannot distinguish
verification.

| Golden Glass | Verified | Required pin                                                 |
| ------------ | -------- | ------------------------------------------------------------ |
| No           | No       | Existing ordinary purple pin                                 |
| No           | Yes      | Ordinary purple pin plus small purple verified-check overlay |
| Yes          | No       | Existing gold pin                                            |
| Yes          | Yes      | Existing gold pin plus purple verified-check overlay         |

Rated/unrated content and selected/unselected sizing remain independent of
these states. Clusters stay neutral and do not aggregate verification.

Update the `LocationPin` memo comparator to include
`is_location_verified`; otherwise a live status change may not rerender. Ensure
the flag survives viewport normalization, focused-location fetching, Regulars
enrichment, and `mergeMapLocations`.

## Notifications

Reuse the existing supported operator-to-member notification path rather than
adding transactional email or an unsupported Activity kind. Prefer the existing
`admin_message` contract with structured routing data when it can represent the
claim destination safely.

Required outcomes:

- Submission: immediate on-screen receipt; no push.
- Approved: in-app plus push saying the location is now verified. Do not imply
  that manager access was granted.
- Rejected: in-app plus generic push. The in-app detail includes the rejection
  reason and resubmission date; avoid putting sensitive detail on a lock screen.
- Superseded: in-app plus push saying the location was already verified and the
  request did not grant management access.

Use existing push delivery behavior and preserve account-deletion/privacy
filters.

## Admin experience

Add a dedicated **Claims** navigation item; do not overload content reports.

### Queue

- Show a pending count in admin navigation.
- Default to pending claims.
- Filter by all four statuses.
- Support paging and practical search by location/requester/contact data.
- Show location, requester, business role, submission time, and status.

### Claim detail

Show:

- canonical location identity and link to its admin place detail;
- requester profile/account details when the account still exists;
- submitted contact fields;
- current claim status and claimant-visible reason;
- optional private admin notes;
- previous claims for the location;
- current verification period/history;
- active and removed manager assignments.

Actions:

- Approve, with confirmation and no required reason.
- Reject, with required claimant-visible reason and optional private note.
- Revoke verification, with required private reason.
- Restore verification, with required reason.
- Add manager by exact email or username after confirming profile and location.
- Remove manager with confirmation.

Share the manager/verification control implementation between claim detail and
admin place detail rather than duplicating server actions and validation.
Revalidate the affected queue, claim, and place pages after mutations.

Because admin auth currently represents one shared operator, record decision
timestamps and notes but do not invent a reviewer profile ID.

## Delivery sequence

Implement in narrow, verifiable slices.

### Slice 1: additive database contracts

- Add the narrow canonical-location resolver RPC/helper.
- Add claim, verification, and manager tables, constraints, indexes, RLS, and
  safe RPCs.
- Add account-deletion and duplicate-merge handling.
- Add `is_location_verified` to database read projections.
- Add focused pgTAP tests.
- Keep the legacy authenticated location-update policy temporarily for older
  clients.

### Slice 2: member app

- Move `createOrGetLocation()` to the narrow RPC.
- Add claim service/hook, form, membership return, and status UI.
- Add safe notification routing.
- Normalize the verification field throughout member/public data seams.

### Slice 3: admin app

- Add the Claims queue/detail pages and pending count.
- Add approval/rejection/revoke/restore actions.
- Add manager search/add/remove controls.
- Add verification status to admin place list/detail/map.

### Slice 4: universal presentation

- Add the shared Verified Business mark.
- Render it across native, share artwork, public web, and admin location
  identities.
- Implement and test all map-pin combinations.

### Slice 5: enforce location-write security

- Confirm every supported client/runtime uses the resolver RPC.
- Apply the follow-up migration removing broad authenticated location updates.
- Verify favorite-place selection, edited-review location changes, review
  publishing, and admin place editing in the intended environments.

Do not use a runtime feature flag. Empty verification tables naturally produce
no badges. Database additions must precede code that consumes them, and missing
fields must decode to `false` during mixed-version rollout.

## Required tests

### pgTAP/database contracts

Cover at least:

- anonymous, incomplete-profile, and unconfirmed-email claim rejection;
- valid member claim creation with server-derived identity fields;
- rejection of claims for verified or nonexistent locations;
- one pending claim per requester/location;
- simultaneous claims from different requesters;
- seven-day rejection cooldown boundaries;
- requester-safe reads and cross-member/private-field isolation;
- admin-only claim decisions and manager mutations;
- atomic approval, verification creation, and superseding behavior;
- required rejection/revocation/restoration reasons;
- one active verification per location;
- manager active-period uniqueness and removal history;
- no manager authority leaking across locations;
- account-deletion redaction and manager deactivation;
- deterministic location-merge reconciliation;
- canonical-location RPC validation and non-destructive conflict behavior;
- authenticated direct location update denial after the enforcement migration;
- service-role admin location editing remaining functional.

### Member app

Cover at least:

- claim form validation and mutation states;
- signed-out membership round-trip back to the intended location;
- pending, rejected/cooldown, resubmittable, and verified location states;
- missing `is_location_verified` decoding to `false`;
- verification hydration in feed/discovery/regular/favorite/map seams;
- Verified Business explanation and accessibility label;
- simultaneous Verified Business and Golden Glass rendering;
- all four map-pin combinations, selected/unselected behavior, and rerender when
  verification changes;
- approved/rejected/superseded notification copy and routing.

### Admin and public web

Cover at least:

- queue paging/filtering/normalization and pending counts;
- reason validation and action error handling;
- exact manager lookup and duplicate prevention;
- claim, verification, and manager history rendering;
- public location and review cards displaying the mark;
- public queries exposing the boolean but no claim/manager PII.

Run the narrowest relevant tests first, then:

```sh
npm run typecheck
npm run lint
npm run verify
git diff --check
```

Run `supabase test db` when the local Supabase container is available. If it is
not, report the limitation rather than silently omitting database verification.

## Acceptance criteria

The feature is complete only when all of the following are true:

- An eligible signed-in member can submit the minimal claim exactly once while
  it is pending.
- Another member cannot see the claim or its contact information.
- The admin can review and approve/reject claims from a dedicated queue.
- Approval verifies the location, supersedes competing pending claims, and does
  not create a manager.
- The admin can independently revoke/restore verification and add/remove
  managers with history preserved.
- A verified location shows the purple mark everywhere its identity is
  presented, including public share surfaces.
- Map pins distinguish ordinary, verified, Golden Glass, and combined states.
- Badge copy and accessibility communicate manual verification without
  endorsement.
- Account deletion and duplicate-location merge preserve the agreed audit and
  privacy invariants.
- Ordinary members and managers cannot directly edit arbitrary locations.
- Existing favorite-location, review-publishing, edited-review, Golden Glass,
  public-content, and admin-place flows continue to work.
- Older supported clients remain functional through the staged permission
  rollout.
- No offer, dashboard, location-editing, email, or organization features leak
  into scope.

## Implementation handoff

Before editing, inspect the closest existing implementation and tests for each
surface. Keep database logic transactional, service interfaces narrow, and UI
identity rendering shared. Preserve unrelated working-tree changes.

When handing the work back, report:

- migrations and rollout stage completed;
- validation commands and results;
- any environment-dependent tests not run;
- whether the broad location-update enforcement migration is safe to deploy;
- whether the working tree is clean.

There are no unresolved product decisions in this specification.
