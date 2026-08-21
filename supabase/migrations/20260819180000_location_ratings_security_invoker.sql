-- Supabase linter: location_ratings was SECURITY DEFINER (the Postgres
-- default for views), so it read locations/reviews with the view owner's
-- privileges and skipped the querying member's RLS. Invoker semantics match
-- the locations_in_view RPC, which already runs as the caller: published
-- reviews only, mutual blocking respected. locations stays world-readable by
-- policy, so anon simply sees zeroed aggregates instead of leaked ones.
ALTER VIEW public.location_ratings SET (security_invoker = on);

-- Hygiene while here: the view only ever needed reads.
REVOKE ALL ON public.location_ratings FROM anon, authenticated;
GRANT SELECT ON public.location_ratings TO anon, authenticated, service_role;
