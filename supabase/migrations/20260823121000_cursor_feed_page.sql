-- A versioned keyset-paginated feed. Released offset functions remain in
-- place for older App Store and OTA clients.

BEGIN;

CREATE INDEX IF NOT EXISTS reviews_feed_cursor_idx
  ON public.reviews (state, inserted_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS reviews_user_feed_cursor_idx
  ON public.reviews (user_id, state, inserted_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS reviews_location_feed_cursor_idx
  ON public.reviews (location, state, inserted_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS comment_likes_comment_id_idx
  ON public.comment_likes (comment_id);

CREATE FUNCTION public.get_feed_page_v1(
  p_viewer uuid,
  p_limit integer DEFAULT 20,
  p_cursor_inserted_at timestamptz DEFAULT NULL,
  p_cursor_id bigint DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_location_id bigint DEFAULT NULL,
  p_exclude_blocked boolean DEFAULT true,
  p_followed_only boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  WITH request AS (
    SELECT greatest(1, least(COALESCE(p_limit, 20), 50)) AS page_size
  ),
  feed_rows AS (
    SELECT
      r.id,
      r.comment,
      r.image_url,
      r.inserted_at,
      r.taste,
      r.presentation,
      r.user_id,
      jsonb_build_object(
        'id', l.id,
        'name', l.name,
        'address', l.address,
        'rating', lr.rating,
        'total_ratings', COALESCE(lr.total_ratings, 0)
      ) AS location,
      jsonb_build_object('name', s.name) AS spirit,
      jsonb_build_object('name', t.name) AS type,
      jsonb_build_object(
        'id', p.id,
        'username', p.username,
        'avatar_url', p.avatar_url,
        'is_verified', p.is_verified,
        'review_count', p.review_count
      ) AS profile,
      COALESCE(lk.likes_count, 0) AS likes_count,
      COALESCE(cm.comments_count, 0) AS comments_count,
      (viewer_like.user_id IS NOT NULL) AS has_liked,
      COALESCE(recent.items, '[]'::jsonb) AS recent_comments
    FROM public.reviews r
    JOIN public.profiles p
      ON p.id = r.user_id
     AND p.deleted = false
    LEFT JOIN public.locations l ON l.id = r.location
    LEFT JOIN public.location_ratings lr ON lr.id = r.location
    LEFT JOIN public.spirits s ON s.id = r.spirit
    LEFT JOIN public.types t ON t.id = r.type
    LEFT JOIN LATERAL (
      SELECT count(*) AS comments_count
      FROM public.comments c
      WHERE c.review_id = r.id
    ) cm ON true
    LEFT JOIN LATERAL (
      SELECT count(*) AS likes_count
      FROM public.likes review_like
      WHERE review_like.review_id = r.id
    ) lk ON true
    LEFT JOIN public.likes viewer_like
      ON viewer_like.review_id = r.id
     AND viewer_like.user_id = p_viewer
    LEFT JOIN LATERAL (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', preview.id,
          'body', preview.body,
          'inserted_at', preview.inserted_at,
          'review_id', preview.review_id,
          'user_id', preview.user_id,
          'profile', jsonb_build_object(
            'id', preview.profile_id,
            'username', preview.username,
            'avatar_url', preview.avatar_url,
            'is_verified', preview.is_verified,
            'review_count', preview.profile_review_count
          ),
          'likes_count', preview.likes_count,
          'has_liked', preview.has_liked
        )
        ORDER BY preview.inserted_at DESC, preview.id DESC
      ) AS items
      FROM (
        SELECT
          c.id,
          c.body,
          c.inserted_at,
          c.review_id,
          c.user_id,
          cp.id AS profile_id,
          cp.username,
          cp.avatar_url,
          cp.is_verified,
          cp.review_count AS profile_review_count,
          (
            SELECT count(*)
            FROM public.comment_likes comment_like
            WHERE comment_like.comment_id = c.id
          ) AS likes_count,
          EXISTS (
            SELECT 1
            FROM public.comment_likes comment_like
            WHERE comment_like.comment_id = c.id
              AND comment_like.user_id = p_viewer
          ) AS has_liked
        FROM public.comments c
        JOIN public.profiles cp
          ON cp.id = c.user_id
         AND cp.deleted = false
        WHERE c.review_id = r.id
        ORDER BY c.inserted_at DESC, c.id DESC
        LIMIT 2
      ) preview
    ) recent ON true
    CROSS JOIN request
    WHERE p_viewer = auth.uid()
      AND r.state = 1
      AND (p_user_id IS NULL OR r.user_id = p_user_id)
      AND (p_location_id IS NULL OR r.location = p_location_id)
      AND (
        p_cursor_inserted_at IS NULL
        OR r.inserted_at < p_cursor_inserted_at
        OR (
          r.inserted_at = p_cursor_inserted_at
          AND r.id < p_cursor_id
        )
      )
      AND (
        NOT COALESCE(p_followed_only, false)
        OR EXISTS (
          SELECT 1
          FROM public.followers follower
          WHERE follower.follower_id = p_viewer
            AND follower.following_id = r.user_id
        )
      )
      AND (
        NOT COALESCE(p_exclude_blocked, true)
        OR NOT EXISTS (
          SELECT 1
          FROM public.blocks block
          WHERE (
            block.blocker_id = p_viewer
            AND block.blocked_id = r.user_id
          ) OR (
            block.blocker_id = r.user_id
            AND block.blocked_id = p_viewer
          )
        )
      )
    ORDER BY r.inserted_at DESC, r.id DESC
    LIMIT (SELECT page_size + 1 FROM request)
  ),
  numbered AS (
    SELECT
      feed_rows.*,
      row_number() OVER (
        ORDER BY feed_rows.inserted_at DESC, feed_rows.id DESC
      ) AS ordinal
    FROM feed_rows
  ),
  visible AS (
    SELECT numbered.*
    FROM numbered, request
    WHERE numbered.ordinal <= request.page_size
  )
  SELECT jsonb_build_object(
    'reviews', COALESCE(
      (
        SELECT jsonb_agg(
          to_jsonb(visible) - 'ordinal'
          ORDER BY visible.inserted_at DESC, visible.id DESC
        )
        FROM visible
      ),
      '[]'::jsonb
    ),
    'nextCursor', CASE
      WHEN EXISTS (
        SELECT 1
        FROM numbered, request
        WHERE numbered.ordinal > request.page_size
      ) THEN (
        SELECT jsonb_build_object(
          'insertedAt', visible.inserted_at,
          'id', visible.id
        )
        FROM visible
        ORDER BY visible.inserted_at ASC, visible.id ASC
        LIMIT 1
      )
      ELSE NULL
    END,
    'hasMore', EXISTS (
      SELECT 1
      FROM numbered, request
      WHERE numbered.ordinal > request.page_size
    )
  );
$$;

REVOKE ALL ON FUNCTION public.get_feed_page_v1(
  uuid,
  integer,
  timestamptz,
  bigint,
  uuid,
  bigint,
  boolean,
  boolean
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_feed_page_v1(
  uuid,
  integer,
  timestamptz,
  bigint,
  uuid,
  bigint,
  boolean,
  boolean
) TO authenticated, service_role;

COMMIT;
