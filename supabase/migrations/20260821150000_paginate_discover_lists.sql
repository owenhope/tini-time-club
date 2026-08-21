-- Keep discovery lists bounded while allowing the client to request later
-- pages. Ordering remains deterministic so offset pages do not reshuffle.

DROP FUNCTION IF EXISTS public.top_profiles(integer, text);

CREATE FUNCTION public.top_profiles(
  p_limit integer DEFAULT 50,
  p_search text DEFAULT NULL,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  username text,
  avatar_url text,
  is_verified boolean,
  follower_count bigint,
  review_count bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.username,
    p.avatar_url,
    p.is_verified,
    COALESCE(f.follower_count, 0) AS follower_count,
    COALESCE(r.review_count, 0) AS review_count
  FROM public.profiles p
  LEFT JOIN (
    SELECT following_id, count(*) AS follower_count
    FROM public.followers
    GROUP BY following_id
  ) f ON f.following_id = p.id
  LEFT JOIN (
    SELECT user_id, count(*) AS review_count
    FROM public.reviews
    WHERE state = 1
    GROUP BY user_id
  ) r ON r.user_id = p.id
  WHERE p.deleted = false
    AND p.username IS NOT NULL
    AND (
      p_search IS NULL
      OR p_search = ''
      OR p.username ILIKE '%' || replace(replace(p_search, '%', '\%'), '_', '\_') || '%'
    )
  ORDER BY r.review_count DESC NULLS LAST,
           f.follower_count DESC NULLS LAST,
           p.username ASC
  LIMIT greatest(1, least(COALESCE(p_limit, 50), 50))
  OFFSET greatest(COALESCE(p_offset, 0), 0);
$$;

GRANT EXECUTE ON FUNCTION public.top_profiles(integer, text, integer)
  TO anon, authenticated, service_role;

DROP FUNCTION IF EXISTS public.search_locations(text, integer);

CREATE FUNCTION public.search_locations(
  p_query text,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
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

GRANT EXECUTE ON FUNCTION public.search_locations(text, integer, integer)
  TO anon, authenticated, service_role;
