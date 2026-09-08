BEGIN;

-- Rank rings key off Passport points; three more surfaces still shipped only
-- review counts to the client: activity rows (actor), the Explore members
-- list, and mention suggestions. Each payload now carries passportPoints /
-- passport_points alongside the existing fields (live definitions, additive
-- only; existing grants retained by CREATE OR REPLACE).

-- get_activity_page
CREATE OR REPLACE FUNCTION public.get_activity_page(p_cursor_created_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_cursor_id uuid DEFAULT NULL::uuid, p_limit integer DEFAULT 30)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 30), 1), 50);
  v_snapshot_at timestamptz := now();
  v_result jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'events', '[]'::jsonb,
      'nextCursor', NULL,
      'hasMore', false,
      'snapshotAt', v_snapshot_at
    );
  END IF;

  WITH eligible AS (
    SELECT
      n.id,
      n.created_at,
      n.kind,
      n.body,
      n.actor_id,
      n.data,
      p.username AS actor_username,
      p.avatar_url AS actor_avatar_url,
      p.is_verified AS actor_is_verified,
      p.review_count AS actor_review_count,
      p.passport_points AS actor_passport_points,
      EXISTS (
        SELECT 1 FROM public.followers f
        WHERE f.follower_id = v_user_id AND f.following_id = n.actor_id
      ) AS is_following,
      r.id AS review_id,
      r.image_url AS review_image_path,
      r.location AS review_location_id,
      c.body AS comment_body,
      c.id AS comment_id,
      ar.seen_at,
      ar.read_at
    FROM public.notifications n
    LEFT JOIN public.profiles p ON p.id = n.actor_id
    LEFT JOIN public.reviews r ON r.id = CASE
      WHEN n.data->>'reviewId' ~ '^[0-9]+$'
        THEN (n.data->>'reviewId')::bigint ELSE NULL END
    LEFT JOIN public.comments c ON c.id = CASE
      WHEN n.data->>'commentId' ~ '^[0-9]+$'
        THEN (n.data->>'commentId')::integer ELSE NULL END
    LEFT JOIN public.activity_receipts ar
      ON ar.notification_id = n.id AND ar.user_id = v_user_id
    WHERE n.user_id = v_user_id
      AND n.type = 2
      AND public.activity_supported_notification(n.kind)
      AND n.created_at >= now() - interval '1 year'
      AND (n.kind IN ('admin_message', 'user_followed') OR n.actor_id IS NOT NULL)
      AND (p.id IS NULL OR p.deleted = false)
      AND NOT EXISTS (
        SELECT 1 FROM public.activity_withdrawals aw
        WHERE aw.notification_id = n.id
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.blocks b
        WHERE n.actor_id IS NOT NULL
          AND ((b.blocker_id = v_user_id AND b.blocked_id = n.actor_id)
            OR (b.blocker_id = n.actor_id AND b.blocked_id = v_user_id))
      )
      AND (
        n.kind IN ('admin_message', 'user_followed')
        OR (
          r.id IS NOT NULL AND r.state = 1
          AND (
            n.kind IN ('review_liked', 'mentioned_in_review')
            OR c.id IS NOT NULL
          )
        )
      )
      AND (
        p_cursor_created_at IS NULL
        OR n.created_at < p_cursor_created_at
        OR (n.created_at = p_cursor_created_at AND n.id < p_cursor_id)
      )
    ORDER BY n.created_at DESC, n.id DESC
    LIMIT v_limit + 1
  ), page AS (
    SELECT * FROM eligible ORDER BY created_at DESC, id DESC LIMIT v_limit
  ), payload AS (
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', id,
      'createdAt', created_at,
      'kind', kind,
      'body', body,
      'actor', CASE WHEN actor_id IS NULL THEN NULL ELSE jsonb_build_object(
        'id', actor_id,
        'username', actor_username,
        'avatarUrl', actor_avatar_url,
        'isVerified', COALESCE(actor_is_verified, false),
        'reviewCount', COALESCE(actor_review_count, 0),
        'passportPoints', COALESCE(actor_passport_points, 0)
      ) END,
      'isFollowing', COALESCE(is_following, false),
      'review', CASE WHEN review_id IS NULL THEN NULL ELSE jsonb_build_object(
        'id', review_id,
        'imagePath', review_image_path,
        'locationId', review_location_id
      ) END,
      'comment', CASE WHEN comment_id IS NULL THEN NULL ELSE jsonb_build_object(
        'id', comment_id,
        'body', comment_body
      ) END,
      'data', COALESCE(data, '{}'::jsonb),
      'seenAt', seen_at,
      'readAt', read_at
    ) ORDER BY created_at DESC, id DESC), '[]'::jsonb) AS events
    FROM page
  ), meta AS (
    SELECT count(*) > v_limit AS has_more FROM eligible
  ), cursor_row AS (
    SELECT created_at, id FROM eligible
    ORDER BY created_at DESC, id DESC
    OFFSET v_limit - 1 LIMIT 1
  )
  SELECT jsonb_build_object(
    'events', payload.events,
    'hasMore', meta.has_more,
    'snapshotAt', v_snapshot_at,
    'nextCursor', CASE WHEN meta.has_more THEN jsonb_build_object(
      'createdAt', cursor_row.created_at,
      'id', cursor_row.id
    ) ELSE NULL END
  ) INTO v_result
  FROM payload, meta LEFT JOIN cursor_row ON true;

  RETURN v_result;
END;
$function$;

-- get_discover_profiles_page_v1
CREATE OR REPLACE FUNCTION public.get_discover_profiles_page_v1(p_limit integer DEFAULT 25, p_search text DEFAULT NULL::text, p_cursor jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH request AS (
    SELECT greatest(1, least(COALESCE(p_limit, 25), 50)) AS page_size
  ),
  ranked AS (
    SELECT
      profile.id,
      profile.username,
      profile.avatar_url,
      profile.is_verified,
      profile.follower_count,
      profile.review_count,
      profile.passport_points
    FROM public.profiles profile
    WHERE profile.deleted = false
      AND profile.username IS NOT NULL
      AND (
        NULLIF(trim(p_search), '') IS NULL
        OR profile.username ILIKE
          '%' || replace(replace(trim(p_search), '%', '\%'), '_', '\_') || '%'
      )
      AND (
        p_cursor IS NULL
        OR profile.review_count < (p_cursor->>'reviewCount')::integer
        OR (
          profile.review_count = (p_cursor->>'reviewCount')::integer
          AND profile.follower_count < (p_cursor->>'followerCount')::integer
        )
        OR (
          profile.review_count = (p_cursor->>'reviewCount')::integer
          AND profile.follower_count = (p_cursor->>'followerCount')::integer
          AND profile.username > p_cursor->>'username'
        )
        OR (
          profile.review_count = (p_cursor->>'reviewCount')::integer
          AND profile.follower_count = (p_cursor->>'followerCount')::integer
          AND profile.username = p_cursor->>'username'
          AND profile.id > (p_cursor->>'id')::uuid
        )
      )
    ORDER BY
      profile.review_count DESC,
      profile.follower_count DESC,
      profile.username ASC,
      profile.id ASC
    LIMIT (SELECT page_size + 1 FROM request)
  ),
  numbered AS (
    SELECT
      ranked.*,
      row_number() OVER (
        ORDER BY
          ranked.review_count DESC,
          ranked.follower_count DESC,
          ranked.username ASC,
          ranked.id ASC
      ) AS ordinal
    FROM ranked
  ),
  visible AS (
    SELECT numbered.*
    FROM numbered, request
    WHERE numbered.ordinal <= request.page_size
  )
  SELECT jsonb_build_object(
    'items', COALESCE(
      (
        SELECT jsonb_agg(
          to_jsonb(visible) - 'ordinal'
          ORDER BY
            visible.review_count DESC,
            visible.follower_count DESC,
            visible.username ASC,
            visible.id ASC
        )
        FROM visible
      ),
      '[]'::jsonb
    ),
    'nextCursor', CASE
      WHEN EXISTS (
        SELECT 1 FROM numbered, request
        WHERE numbered.ordinal > request.page_size
      ) THEN (
        SELECT jsonb_build_object(
          'reviewCount', visible.review_count,
          'followerCount', visible.follower_count,
          'username', visible.username,
          'id', visible.id
        )
        FROM visible
        ORDER BY
          visible.review_count ASC,
          visible.follower_count ASC,
          visible.username DESC,
          visible.id DESC
        LIMIT 1
      )
      ELSE NULL
    END,
    'hasMore', EXISTS (
      SELECT 1 FROM numbered, request
      WHERE numbered.ordinal > request.page_size
    )
  );
$function$;

-- search_mention_candidates_v1
CREATE OR REPLACE FUNCTION public.search_mention_candidates_v1(p_query text DEFAULT ''::text, p_limit integer DEFAULT 5)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH request AS (
    SELECT
      auth.uid() AS viewer_id,
      lower(trim(COALESCE(p_query, ''))) AS query,
      least(greatest(COALESCE(p_limit, 5), 1), 10) AS result_limit
  ), interaction_rows AS (
    -- Other members commenting on the viewer's reviews.
    SELECT
      comment.user_id AS profile_id,
      max(comment.inserted_at) AS last_interaction_at
    FROM request
    JOIN public.reviews review
      ON review.user_id = request.viewer_id
     AND review.state = 1
    JOIN public.comments comment
      ON comment.review_id = review.id
     AND comment.user_id <> request.viewer_id
    GROUP BY comment.user_id
    UNION ALL
    -- Review authors the viewer has commented to.
    SELECT
      review.user_id AS profile_id,
      max(comment.inserted_at) AS last_interaction_at
    FROM request
    JOIN public.comments comment
      ON comment.user_id = request.viewer_id
    JOIN public.reviews review
      ON review.id = comment.review_id
     AND review.user_id <> request.viewer_id
    GROUP BY review.user_id
  ), recent AS (
    SELECT profile_id, max(last_interaction_at) AS last_interaction_at
    FROM interaction_rows
    GROUP BY profile_id
  ), candidates AS (
    SELECT
      candidate.id,
      candidate.username,
      candidate.name,
      candidate.avatar_url,
      candidate.is_verified,
      candidate.review_count,
      candidate.passport_points,
      recent.last_interaction_at,
      CASE
        WHEN viewer_follows.follower_id IS NOT NULL
         AND follows_viewer.follower_id IS NOT NULL THEN 0
        WHEN viewer_follows.follower_id IS NOT NULL THEN 1
        WHEN follows_viewer.follower_id IS NOT NULL THEN 2
        WHEN recent.last_interaction_at IS NOT NULL THEN 3
        ELSE 4
      END AS relationship_rank,
      CASE
        WHEN request.query = '' THEN 0
        WHEN lower(candidate.username) = request.query
          OR lower(COALESCE(candidate.name, '')) = request.query THEN 0
        WHEN left(lower(candidate.username), char_length(request.query)) = request.query
          OR left(lower(COALESCE(candidate.name, '')), char_length(request.query)) = request.query THEN 1
        ELSE 2
      END AS match_rank
    FROM request
    JOIN public.profiles candidate
      ON request.viewer_id IS NOT NULL
     AND candidate.id <> request.viewer_id
     AND candidate.deleted = false
     AND NULLIF(trim(candidate.username), '') IS NOT NULL
    LEFT JOIN public.followers viewer_follows
      ON viewer_follows.follower_id = request.viewer_id
     AND viewer_follows.following_id = candidate.id
    LEFT JOIN public.followers follows_viewer
      ON follows_viewer.follower_id = candidate.id
     AND follows_viewer.following_id = request.viewer_id
    LEFT JOIN recent ON recent.profile_id = candidate.id
    WHERE NOT EXISTS (
      SELECT 1 FROM public.blocks block
      WHERE (block.blocker_id = request.viewer_id AND block.blocked_id = candidate.id)
         OR (block.blocker_id = candidate.id AND block.blocked_id = request.viewer_id)
    )
      AND (
        request.query = ''
        OR strpos(lower(candidate.username), request.query) > 0
        OR strpos(lower(COALESCE(candidate.name, '')), request.query) > 0
      )
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', ranked.id,
    'username', ranked.username,
    'name', ranked.name,
    'avatarUrl', ranked.avatar_url,
    'isVerified', COALESCE(ranked.is_verified, false),
    'reviewCount', COALESCE(ranked.review_count, 0),
    'passportPoints', COALESCE(ranked.passport_points, 0),
    'relationship', CASE ranked.relationship_rank
      WHEN 0 THEN 'mutual'
      WHEN 1 THEN 'following'
      WHEN 2 THEN 'follows_you'
      WHEN 3 THEN 'recent'
      ELSE 'everyone'
    END
  ) ORDER BY
    ranked.relationship_rank,
    ranked.match_rank,
    ranked.last_interaction_at DESC NULLS LAST,
    lower(ranked.username),
    ranked.id), '[]'::jsonb)
  FROM (
    SELECT candidates.*
    FROM candidates, request
    ORDER BY
      relationship_rank,
      match_rank,
      last_interaction_at DESC NULLS LAST,
      lower(username),
      id
    LIMIT (SELECT result_limit FROM request)
  ) ranked;
$function$;

NOTIFY pgrst, 'reload schema';
COMMIT;
