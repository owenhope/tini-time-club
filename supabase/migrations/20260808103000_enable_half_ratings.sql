-- Store taste and presentation at half-point precision. Rebuild the view and
-- RPCs whose row types depend on the old bigint columns.

BEGIN;

DROP FUNCTION IF EXISTS public.feed_reviews(
  uuid,
  integer,
  integer,
  uuid,
  bigint,
  boolean
);
DROP FUNCTION IF EXISTS public.search_locations(text, integer);
DROP VIEW IF EXISTS public.location_ratings;

ALTER TABLE public.reviews
  ALTER COLUMN taste TYPE numeric(2, 1)
    USING taste::numeric(2, 1),
  ALTER COLUMN taste SET NOT NULL,
  ALTER COLUMN presentation TYPE numeric(2, 1)
    USING presentation::numeric(2, 1),
  ALTER COLUMN presentation SET NOT NULL;

ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_taste_half_step_check
    CHECK (
      taste BETWEEN 0.5 AND 5.0
      AND mod(taste * 2, 1) = 0
    ),
  ADD CONSTRAINT reviews_presentation_half_step_check
    CHECK (
      presentation BETWEEN 0.5 AND 5.0
      AND mod(presentation * 2, 1) = 0
    );

CREATE VIEW public.location_ratings AS
 SELECT l.id,
    l.name,
    l.address,
    gis.st_y((l.location)::gis.geometry) AS lat,
    gis.st_x((l.location)::gis.geometry) AS lon,
    COALESCE(round(avg(((r.taste + r.presentation) / 2.0)), 1), 0::numeric) AS rating,
    COALESCE(round(avg(r.taste), 1), 0::numeric) AS taste_avg,
    COALESCE(round(avg(r.presentation), 1), 0::numeric) AS presentation_avg,
    count(r.id) AS total_ratings
   FROM public.locations l
     LEFT JOIN public.reviews r
       ON l.id = r.location AND r.state = 1
  GROUP BY l.id, l.name, l.address, l.location;

GRANT ALL ON TABLE public.location_ratings TO anon;
GRANT ALL ON TABLE public.location_ratings TO authenticated;
GRANT ALL ON TABLE public.location_ratings TO service_role;

CREATE FUNCTION public.search_locations(
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

CREATE FUNCTION public.feed_reviews(
  p_viewer uuid,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0,
  p_user_id uuid DEFAULT NULL,
  p_location_id bigint DEFAULT NULL,
  p_exclude_blocked boolean DEFAULT true
)
RETURNS TABLE (
  id bigint,
  comment text,
  image_url text,
  inserted_at timestamp with time zone,
  taste numeric(2, 1),
  presentation numeric(2, 1),
  user_id uuid,
  location jsonb,
  spirit jsonb,
  type jsonb,
  profile jsonb,
  likes_count bigint,
  comments_count bigint,
  has_liked boolean,
  recent_comments jsonb
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    r.id,
    r.comment,
    r.image_url,
    r.inserted_at,
    r.taste,
    r.presentation,
    r.user_id,
    to_jsonb(json_build_object(
      'id', l.id,
      'name', l.name,
      'address', l.address,
      'rating', lr.rating,
      'total_ratings', COALESCE(lr.total_ratings, 0)
    )),
    to_jsonb(json_build_object('name', s.name)),
    to_jsonb(json_build_object('name', t.name)),
    to_jsonb(json_build_object(
      'id', p.id,
      'username', p.username,
      'avatar_url', p.avatar_url,
      'is_verified', p.is_verified,
      'review_count', p.review_count
    )),
    COALESCE(lk.cnt, 0) AS likes_count,
    COALESCE(cm.cnt, 0) AS comments_count,
    (ul.user_id IS NOT NULL) AS has_liked,
    COALESCE(rc.items, '[]'::jsonb) AS recent_comments
  FROM public.reviews r
  JOIN public.profiles p
    ON p.id = r.user_id AND p.deleted = false
  LEFT JOIN public.locations l ON l.id = r.location
  LEFT JOIN public.location_ratings lr ON lr.id = r.location
  LEFT JOIN public.spirits s ON s.id = r.spirit
  LEFT JOIN public.types t ON t.id = r.type
  LEFT JOIN LATERAL (
    SELECT count(*) AS cnt FROM public.comments WHERE review_id = r.id
  ) cm ON true
  LEFT JOIN LATERAL (
    SELECT count(*) AS cnt FROM public.likes WHERE review_id = r.id
  ) lk ON true
  LEFT JOIN public.likes ul
    ON ul.review_id = r.id AND ul.user_id = p_viewer
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(
             jsonb_build_object(
               'id', c.id,
               'body', c.body,
               'inserted_at', c.inserted_at,
               'profile', jsonb_build_object(
                 'id', cp.id,
                 'username', cp.username,
                 'avatar_url', cp.avatar_url,
                 'is_verified', cp.is_verified,
                 'review_count', cp.review_count
               )
             )
             ORDER BY c.inserted_at DESC
           ) AS items
    FROM (
      SELECT * FROM public.comments
      WHERE review_id = r.id
      ORDER BY inserted_at DESC
      LIMIT 2
    ) c
    JOIN public.profiles cp ON cp.id = c.user_id
  ) rc ON true
  WHERE r.state = 1
    AND (p_user_id IS NULL OR r.user_id = p_user_id)
    AND (p_location_id IS NULL OR r.location = p_location_id)
    AND (
      NOT p_exclude_blocked
      OR NOT EXISTS (
        SELECT 1 FROM public.blocks b
        WHERE (b.blocker_id = p_viewer AND b.blocked_id = r.user_id)
           OR (b.blocker_id = r.user_id AND b.blocked_id = p_viewer)
      )
    )
  ORDER BY r.inserted_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

GRANT ALL ON FUNCTION public.feed_reviews(
  uuid,
  integer,
  integer,
  uuid,
  bigint,
  boolean
) TO authenticated;
GRANT ALL ON FUNCTION public.feed_reviews(
  uuid,
  integer,
  integer,
  uuid,
  bigint,
  boolean
) TO service_role;

COMMIT;
