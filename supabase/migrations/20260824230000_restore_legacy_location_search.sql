-- Keep the location search RPCs available to clients that predate Golden
-- Glass. The current app queries location_ratings directly, but an older
-- 4.0.2 bundle may still call either legacy signature.

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
    lr.total_ratings DESC,
    lr.id ASC
  LIMIT greatest(1, least(COALESCE(p_limit, 20), 50));
$$;

CREATE OR REPLACE FUNCTION public.search_locations(
  p_query text,
  p_limit integer,
  p_offset integer
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
    lr.total_ratings DESC,
    lr.id ASC
  LIMIT greatest(1, least(COALESCE(p_limit, 20), 50))
  OFFSET greatest(COALESCE(p_offset, 0), 0);
$$;

REVOKE ALL ON FUNCTION public.search_locations(text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.search_locations(text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_locations(text, integer)
  TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.search_locations(text, integer, integer)
  TO anon, authenticated, service_role;
