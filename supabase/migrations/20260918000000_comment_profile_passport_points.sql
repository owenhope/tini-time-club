-- Loaded and newly posted comment avatars rank by Passport points; keep the legacy review count
-- while exposing the same points used by profiles and feed previews.
BEGIN;

CREATE OR REPLACE FUNCTION public.get_comment_page_v1(
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
        'review_count', profile.review_count,
        'passport_points', profile.passport_points
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

CREATE OR REPLACE FUNCTION public.create_comment_v2(
  p_review_id bigint,
  p_body text,
  p_mentions jsonb DEFAULT '[]'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_comment public.comments;
  v_mentions jsonb;
  v_owner_id uuid;
  v_actor_name text;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required' USING ERRCODE = '42501';
  END IF;
  IF NULLIF(trim(p_body), '') IS NULL OR char_length(trim(p_body)) > 500 THEN
    RAISE EXCEPTION 'Comments must contain 1 to 500 characters'
      USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.reviews review
    JOIN public.profiles author ON author.id = review.user_id
    WHERE review.id = p_review_id AND review.state = 1
      AND author.deleted = false
      AND NOT public.push_users_are_blocked(v_actor_id, review.user_id)
  ) THEN
    RAISE EXCEPTION 'The review is unavailable' USING ERRCODE = '42501';
  END IF;

  PERFORM set_config('ttc.suppress_comment_notification', 'true', true);
  INSERT INTO public.comments (user_id, review_id, body)
  VALUES (v_actor_id, p_review_id, trim(p_body))
  RETURNING * INTO v_comment;

  v_mentions := public.replace_comment_mentions_v1(
    v_comment.id, v_comment.body, p_mentions
  );

  SELECT review.user_id INTO v_owner_id
  FROM public.reviews review WHERE review.id = p_review_id;

  IF v_owner_id IS NOT NULL
     AND v_owner_id <> v_actor_id
     AND NOT public.push_users_are_blocked(v_actor_id, v_owner_id)
     AND NOT EXISTS (
       SELECT 1 FROM public.comment_mentions mention
       WHERE mention.comment_id = v_comment.id
         AND mention.mentioned_profile_id = v_owner_id
     ) THEN
    SELECT COALESCE(username, 'Someone') INTO v_actor_name
    FROM public.profiles WHERE id = v_actor_id;
    INSERT INTO public.notifications (
      user_id, actor_id, body, type, kind, data, event_key
    ) VALUES (
      v_owner_id, v_actor_id,
      concat(v_actor_name, ' commented on your review.'),
      2, 'review_commented',
      jsonb_build_object(
        'kind', 'review_commented', 'reviewId', p_review_id,
        'commentId', v_comment.id,
        'url', concat('/r/', p_review_id, '?comments=1')
      ),
      concat('comment:', v_comment.id)
    ) ON CONFLICT (event_key) WHERE event_key IS NOT NULL DO NOTHING;
  END IF;

  RETURN to_jsonb(v_comment) || jsonb_build_object(
    'profile', (
      SELECT jsonb_build_object(
        'id', profile.id,
        'username', profile.username,
        'avatar_url', profile.avatar_url,
        'is_verified', profile.is_verified,
        'review_count', profile.review_count,
        'passport_points', profile.passport_points
      ) FROM public.profiles profile WHERE profile.id = v_actor_id
    ),
    'likes_count', 0,
    'has_liked', false,
    'mentions', v_mentions
  );
END;
$$;

COMMIT;
