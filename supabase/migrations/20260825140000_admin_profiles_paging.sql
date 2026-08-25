-- Keep the Members table bounded. Auth metadata and last-review dates are
-- joined and sorted in Postgres instead of loading every account into Next.js.

CREATE INDEX IF NOT EXISTS profiles_username_search_idx
  ON public.profiles (username);

CREATE INDEX IF NOT EXISTS reviews_admin_profile_date_idx
  ON public.reviews (user_id, inserted_at DESC)
  WHERE state = 1;

CREATE OR REPLACE FUNCTION public.get_admin_profiles_page(
  p_search text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_sort text DEFAULT 'review_count',
  p_direction text DEFAULT 'desc',
  p_page integer DEFAULT 1,
  p_per_page integer DEFAULT 50
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
  WITH params AS (
    SELECT
      NULLIF(btrim(p_search), '') AS search_text,
      NULLIF(btrim(p_status), '') AS status_text,
      CASE
        WHEN p_sort IN ('username', 'rank', 'review_count', 'deleted', 'created_at', 'last_review_at')
          THEN p_sort
        ELSE 'review_count'
      END AS sort_column,
      CASE WHEN lower(p_direction) = 'asc' THEN 'asc' ELSE 'desc' END AS sort_direction,
      greatest(1, COALESCE(p_page, 1)) AS page_value,
      greatest(1, least(COALESCE(p_per_page, 50), 100)) AS per_page_value
  ),
  profile_rows AS (
    SELECT p.id, p.username, p.name, p.avatar_url, p.is_verified,
      p.deleted, p.deleted_at, p.review_count, p.bio,
      u.email, u.created_at, u.last_sign_in_at,
      max(review.inserted_at) AS last_review_at
    FROM public.profiles p
    JOIN auth.users u ON u.id = p.id
    LEFT JOIN public.reviews review
      ON review.user_id = p.id AND review.state = 1
    CROSS JOIN params
    WHERE (params.search_text IS NULL OR p.username ILIKE '%' || params.search_text || '%')
      AND (
        params.status_text IS NULL
        OR (params.status_text = 'active' AND p.deleted = false)
        OR (params.status_text = 'deleted' AND p.deleted = true)
        OR (params.status_text = 'verified' AND p.is_verified = true)
      )
    GROUP BY p.id, p.username, p.name, p.avatar_url, p.is_verified,
      p.deleted, p.deleted_at, p.review_count, p.bio,
      u.email, u.created_at, u.last_sign_in_at
  ),
  paged AS (
    SELECT profile_rows.*
    FROM profile_rows
    CROSS JOIN params
    ORDER BY
      CASE WHEN params.sort_column IN ('review_count', 'rank') AND params.sort_direction = 'asc' THEN review_count END ASC NULLS LAST,
      CASE WHEN params.sort_column IN ('review_count', 'rank') AND params.sort_direction = 'desc' THEN review_count END DESC NULLS LAST,
      CASE WHEN params.sort_column = 'username' AND params.sort_direction = 'asc' THEN username END ASC NULLS LAST,
      CASE WHEN params.sort_column = 'username' AND params.sort_direction = 'desc' THEN username END DESC NULLS LAST,
      CASE WHEN params.sort_column = 'deleted' AND params.sort_direction = 'asc' THEN deleted END ASC NULLS LAST,
      CASE WHEN params.sort_column = 'deleted' AND params.sort_direction = 'desc' THEN deleted END DESC NULLS LAST,
      CASE WHEN params.sort_column = 'created_at' AND params.sort_direction = 'asc' THEN created_at END ASC NULLS LAST,
      CASE WHEN params.sort_column = 'created_at' AND params.sort_direction = 'desc' THEN created_at END DESC NULLS LAST,
      CASE WHEN params.sort_column = 'last_review_at' AND params.sort_direction = 'asc' THEN last_review_at END ASC NULLS LAST,
      CASE WHEN params.sort_column = 'last_review_at' AND params.sort_direction = 'desc' THEN last_review_at END DESC NULLS LAST,
      id ASC
    LIMIT (SELECT per_page_value FROM params)
    OFFSET ((SELECT page_value FROM params) - 1) * (SELECT per_page_value FROM params)
  )
  SELECT jsonb_build_object(
    'total', (SELECT count(*) FROM profile_rows),
    'profiles', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', id,
        'username', username,
        'name', name,
        'avatar_url', avatar_url,
        'is_verified', is_verified,
        'deleted', deleted,
        'deleted_at', deleted_at,
        'review_count', review_count,
        'bio', bio,
        'email', email,
        'created_at', created_at,
        'last_sign_in_at', last_sign_in_at,
        'last_review_at', last_review_at
      ))
      FROM paged
    ), '[]'::jsonb)
  );
$$;

GRANT ALL ON FUNCTION public.get_admin_profiles_page(text, text, text, text, integer, integer)
  TO service_role;
