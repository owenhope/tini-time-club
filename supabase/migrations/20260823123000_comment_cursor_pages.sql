-- Additive comment pagination for the 4.0.2 OTA. The released all-comments
-- function remains available to older clients.

BEGIN;

CREATE INDEX IF NOT EXISTS comments_review_cursor_idx
  ON public.comments (review_id, inserted_at DESC, id DESC);

CREATE FUNCTION public.get_comment_page_v1(
  p_review_id bigint,
  p_viewer uuid,
  p_limit integer DEFAULT 20,
  p_cursor_inserted_at timestamptz DEFAULT NULL,
  p_cursor_id bigint DEFAULT NULL
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
  eligible AS (
    SELECT
      c.id,
      c.user_id,
      c.review_id,
      c.body,
      c.inserted_at,
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
      ) AS has_liked,
      jsonb_build_object(
        'id', profile.id,
        'username', profile.username,
        'avatar_url', profile.avatar_url,
        'is_verified', profile.is_verified,
        'review_count', profile.review_count
      ) AS profile
    FROM public.comments c
    JOIN public.profiles profile
      ON profile.id = c.user_id
     AND profile.deleted = false
    JOIN public.reviews review
      ON review.id = c.review_id
     AND review.state = 1
    JOIN public.profiles review_author
      ON review_author.id = review.user_id
     AND review_author.deleted = false
    WHERE p_viewer = auth.uid()
      AND c.review_id = p_review_id
      AND NOT EXISTS (
        SELECT 1
        FROM public.blocks block
        WHERE (
          block.blocker_id = p_viewer
          AND block.blocked_id IN (c.user_id, review.user_id)
        ) OR (
          block.blocked_id = p_viewer
          AND block.blocker_id IN (c.user_id, review.user_id)
        )
      )
  ),
  page_rows AS (
    SELECT eligible.*
    FROM eligible, request
    WHERE p_cursor_inserted_at IS NULL
       OR eligible.inserted_at < p_cursor_inserted_at
       OR (
         eligible.inserted_at = p_cursor_inserted_at
         AND eligible.id < p_cursor_id
       )
    ORDER BY eligible.inserted_at DESC, eligible.id DESC
    LIMIT (SELECT page_size + 1 FROM request)
  ),
  numbered AS (
    SELECT
      page_rows.*,
      row_number() OVER (
        ORDER BY page_rows.inserted_at DESC, page_rows.id DESC
      ) AS ordinal
    FROM page_rows
  ),
  visible AS (
    SELECT numbered.*
    FROM numbered, request
    WHERE numbered.ordinal <= request.page_size
  )
  SELECT jsonb_build_object(
    -- Comments render oldest-to-newest even though pages are selected from the
    -- latest backwards. A caller prepends each older page.
    'comments', COALESCE(
      (
        SELECT jsonb_agg(
          to_jsonb(visible) - 'ordinal'
          ORDER BY visible.inserted_at ASC, visible.id ASC
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
    ),
    'totalCount', (SELECT count(*) FROM eligible)
  );
$$;

REVOKE ALL ON FUNCTION public.get_comment_page_v1(
  bigint,
  uuid,
  integer,
  timestamptz,
  bigint
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_comment_page_v1(
  bigint,
  uuid,
  integer,
  timestamptz,
  bigint
) TO authenticated, service_role;

COMMIT;
