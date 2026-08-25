-- Search, filter, and page admin reviews in Postgres. Avoid transferring all
-- matching profile/location IDs through the Next.js process.

CREATE INDEX IF NOT EXISTS reviews_admin_state_date_idx
  ON public.reviews (state, inserted_at DESC, id DESC);

CREATE OR REPLACE FUNCTION public.get_admin_reviews_page(
  p_search text DEFAULT NULL,
  p_state text DEFAULT NULL,
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
      NULLIF(btrim(p_state), '') AS state_text,
      greatest(1, COALESCE(p_page, 1)) AS page_value,
      greatest(1, least(COALESCE(p_per_page, 50), 100)) AS per_page_value
  ),
  review_rows AS (
    SELECT review.id, review.comment, review.taste, review.presentation,
      review.inserted_at, review.state,
      CASE WHEN location.id IS NULL THEN NULL ELSE jsonb_build_object(
        'id', location.id,
        'name', location.name
      ) END AS location,
      CASE WHEN member.id IS NULL THEN NULL ELSE jsonb_build_object(
        'id', member.id,
        'username', member.username,
        'name', member.name,
        'avatar_url', member.avatar_url,
        'is_verified', member.is_verified,
        'deleted', member.deleted,
        'deleted_at', member.deleted_at,
        'review_count', member.review_count,
        'bio', member.bio
      ) END AS profile
    FROM public.reviews review
    LEFT JOIN public.locations location ON location.id = review.location
    LEFT JOIN public.profiles member ON member.id = review.user_id
    CROSS JOIN params
    WHERE (
      params.state_text IS NULL
      OR (params.state_text = 'active' AND review.state = 1)
      OR (params.state_text = 'inactive' AND review.state <> 1)
    )
      AND (
        params.search_text IS NULL
        OR concat_ws(
          ' ', review.comment, member.username, member.name,
          location.name, location.address
        ) ILIKE '%' || params.search_text || '%'
      )
  ),
  paged AS (
    SELECT review_rows.*
    FROM review_rows, params
    ORDER BY inserted_at DESC, id DESC
    LIMIT (SELECT per_page_value FROM params)
    OFFSET ((SELECT page_value FROM params) - 1) * (SELECT per_page_value FROM params)
  )
  SELECT jsonb_build_object(
    'total', (SELECT count(*) FROM review_rows),
    'reviews', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', id,
        'comment', comment,
        'taste', taste,
        'presentation', presentation,
        'inserted_at', inserted_at,
        'state', state,
        'location', location,
        'profile', profile
      ) ORDER BY inserted_at DESC, id DESC)
      FROM paged
    ), '[]'::jsonb)
  );
$$;

GRANT ALL ON FUNCTION public.get_admin_reviews_page(text, text, integer, integer)
  TO service_role;
