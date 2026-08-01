-- Fuzzy location search for Discover. The old client query was a bare
-- ilike('name', '%q%'): no address matching, no typo tolerance, and a
-- leading-wildcard scan the planner can't index. pg_trgm GIN indexes
-- accelerate both ILIKE and similarity(), and the RPC ranks name matches
-- above address matches, then by similarity, then by review count.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS locations_name_trgm_idx
  ON public.locations USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS locations_address_trgm_idx
  ON public.locations USING gin (address gin_trgm_ops);

CREATE OR REPLACE FUNCTION public.search_locations(
  p_query text,
  p_limit integer DEFAULT 20
)
RETURNS SETOF public.location_ratings
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT lr.*
  FROM public.location_ratings lr
  WHERE p_query IS NOT NULL
    AND length(trim(p_query)) >= 2
    AND (
      lr.name ILIKE '%' || trim(p_query) || '%'
      OR lr.address ILIKE '%' || trim(p_query) || '%'
      OR similarity(lr.name, trim(p_query)) > 0.25
    )
  ORDER BY
    (lr.name ILIKE '%' || trim(p_query) || '%') DESC,
    GREATEST(
      similarity(lr.name, trim(p_query)),
      similarity(COALESCE(lr.address, ''), trim(p_query))
    ) DESC,
    lr.total_ratings DESC
  LIMIT greatest(1, least(COALESCE(p_limit, 20), 50));
$$;

REVOKE ALL ON FUNCTION public.search_locations(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_locations(text, integer)
  TO anon, authenticated;
