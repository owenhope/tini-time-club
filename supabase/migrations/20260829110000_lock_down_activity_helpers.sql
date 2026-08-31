-- Second lockdown batch, same class as 20260829100000: SECURITY DEFINER
-- helpers that the baseline default privileges left callable by app roles.
--
--   * withdraw_activity_for_users / withdraw_activity_for_event have no
--     auth.uid() check — any client with the anon key could silently suppress
--     activity (follows, likes, comments, mentions) between arbitrary users.
--   * push_users_are_blocked is a block-relationship oracle over a table
--     whose RLS otherwise hides rows from non-participants.
--   * refresh_regular_memberships is an internal recompute hook.
--
-- All four are only invoked from SECURITY DEFINER trigger functions, which
-- execute privilege checks as the function owner, so revoking app roles
-- cannot break member flows.

BEGIN;

REVOKE ALL ON FUNCTION
  public.withdraw_activity_for_event(text, text),
  public.withdraw_activity_for_users(uuid, uuid, text),
  public.push_users_are_blocked(uuid, uuid),
  public.refresh_regular_memberships(bigint)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
  public.withdraw_activity_for_event(text, text),
  public.withdraw_activity_for_users(uuid, uuid, text),
  public.push_users_are_blocked(uuid, uuid),
  public.refresh_regular_memberships(bigint)
TO service_role;

-- Legacy policy from the baseline schema that let any member rewrite any
-- location's identity (name, address, place_id, region, geography). Location
-- creation moved to the resolve_or_create_location RPC and no client code
-- updates the table directly; with verified-business badges attaching trust
-- to these rows, the policy is pure attack surface.
DROP POLICY IF EXISTS "Allow authenticated users to update locations"
  ON public.locations;

COMMIT;
