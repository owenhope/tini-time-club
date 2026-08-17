BEGIN;

DROP FUNCTION IF EXISTS public.feed_reviews(
  uuid,
  integer,
  integer,
  uuid,
  bigint,
  boolean
);

CREATE FUNCTION public.feed_reviews(
  p_viewer uuid,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0,
  p_user_id uuid DEFAULT NULL,
  p_location_id bigint DEFAULT NULL,
  p_exclude_blocked boolean DEFAULT true,
  p_followed_only boolean DEFAULT false
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
SET search_path = public, pg_temp
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
    SELECT count(*) AS cnt
    FROM public.comments
    WHERE review_id = r.id
  ) cm ON true
  LEFT JOIN LATERAL (
    SELECT count(*) AS cnt
    FROM public.likes
    WHERE review_id = r.id
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
      SELECT *
      FROM public.comments
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
      NOT COALESCE(p_followed_only, false)
      OR (
        p_viewer = auth.uid()
        AND EXISTS (
          SELECT 1
          FROM public.followers f
          WHERE f.follower_id = p_viewer
            AND f.following_id = r.user_id
        )
      )
    )
    AND (
      NOT p_exclude_blocked
      OR NOT EXISTS (
        SELECT 1
        FROM public.blocks b
        WHERE (b.blocker_id = p_viewer AND b.blocked_id = r.user_id)
           OR (b.blocker_id = r.user_id AND b.blocked_id = p_viewer)
      )
    )
  ORDER BY r.inserted_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

REVOKE ALL ON FUNCTION public.feed_reviews(
  uuid,
  integer,
  integer,
  uuid,
  bigint,
  boolean,
  boolean
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.feed_reviews(
  uuid,
  integer,
  integer,
  uuid,
  bigint,
  boolean,
  boolean
) TO authenticated, service_role;

COMMIT;
