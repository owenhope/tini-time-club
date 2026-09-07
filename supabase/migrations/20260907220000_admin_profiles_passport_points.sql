BEGIN;

-- Admin avatar rings mirror the app: since 4.2.0 rank rings key off Passport
-- points (utils/ranking.ts), so every admin RPC that emits a profile now
-- carries passport_points alongside review_count. get_admin_profiles_page's
-- "rank" sort follows the points too; its "review_count" sort is unchanged.
-- Bodies are the live definitions with only the profile columns added
-- (existing grants are retained by CREATE OR REPLACE).

-- get_admin_dashboard_activity
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_activity(p_limit integer DEFAULT 10)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
  WITH params AS (
    SELECT greatest(1, least(COALESCE(p_limit, 10), 50)) AS limit_value
  ),
  active_members AS (
    SELECT p.id, p.username, p.name, p.avatar_url, p.is_verified,
      p.deleted, p.deleted_at, p.review_count, p.bio, p.passport_points, u.created_at
    FROM public.profiles p
    JOIN auth.users u ON u.id = p.id
    WHERE p.deleted = false
  ),
  active_locations AS (
    SELECT l.id, l.name, l.address, l.inserted_at
    FROM public.locations l
    JOIN active_members member ON member.id = l.created_by
  ),
  active_reviews AS (
    SELECT r.id, r.comment, r.taste, r.presentation, r.inserted_at, r.state,
      r.user_id, r.location
    FROM public.reviews r
    JOIN active_members member ON member.id = r.user_id
    JOIN active_locations location ON location.id = r.location
    WHERE r.state = 1
  ),
  like_counts AS (
    SELECT review_id, count(*) AS likes
    FROM public.likes
    GROUP BY review_id
  ),
  comment_counts AS (
    SELECT review_id, count(*) AS comments
    FROM public.comments
    GROUP BY review_id
  ),
  review_cards AS (
    SELECT review.id, review.inserted_at,
      COALESCE(likes.likes, 0) AS likes,
      COALESCE(comments.comments, 0) AS comments,
      jsonb_build_object(
        'id', review.id,
        'comment', review.comment,
        'taste', review.taste,
        'presentation', review.presentation,
        'inserted_at', review.inserted_at,
        'state', review.state,
        'location', jsonb_build_object(
          'id', location.id,
          'name', location.name
        ),
        'profile', jsonb_build_object(
          'id', member.id,
          'username', member.username,
          'name', member.name,
          'avatar_url', member.avatar_url,
          'is_verified', member.is_verified,
          'deleted', member.deleted,
          'deleted_at', member.deleted_at,
          'review_count', member.review_count,
          'passport_points', member.passport_points,
          'bio', member.bio
        ),
        'engagement', jsonb_build_object(
          'likes', COALESCE(likes.likes, 0),
          'comments', COALESCE(comments.comments, 0),
          'shares', 0
        ),
        'likes', COALESCE(likes.likes, 0),
        'comments', COALESCE(comments.comments, 0)
      ) AS card
    FROM active_reviews review
    JOIN active_members member ON member.id = review.user_id
    JOIN active_locations location ON location.id = review.location
    LEFT JOIN like_counts likes ON likes.review_id = review.id
    LEFT JOIN comment_counts comments ON comments.review_id = review.id
  ),
  location_rankings AS (
    SELECT location.id, location.name,
      count(review.id) AS total_ratings,
      round(
        avg((review.taste + review.presentation)::numeric / 2)
          FILTER (WHERE review.taste IS NOT NULL AND review.presentation IS NOT NULL),
        1
      ) AS rating
    FROM active_locations location
    JOIN active_reviews review ON review.location = location.id
    GROUP BY location.id, location.name
  )
  SELECT jsonb_build_object(
    'latest', jsonb_build_object(
      'members', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', member.id,
          'username', member.username,
          'name', member.name,
          'avatar_url', member.avatar_url,
          'is_verified', member.is_verified,
          'deleted', member.deleted,
          'deleted_at', member.deleted_at,
          'review_count', member.review_count,
          'passport_points', member.passport_points,
          'bio', member.bio,
          'created_at', member.created_at
        ) ORDER BY member.created_at DESC, member.id DESC)
        FROM (
          SELECT * FROM active_members
          ORDER BY created_at DESC, id DESC
          LIMIT (SELECT limit_value FROM params)
        ) member
      ), '[]'::jsonb),
      'reviews', COALESCE((
        SELECT jsonb_agg(card ORDER BY inserted_at DESC, id DESC)
        FROM (
          SELECT card, inserted_at, id FROM review_cards
          ORDER BY inserted_at DESC, id DESC
          LIMIT (SELECT limit_value FROM params)
        ) latest_reviews
      ), '[]'::jsonb),
      'locations', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', location.id,
          'name', location.name,
          'address', location.address,
          'inserted_at', location.inserted_at
        ) ORDER BY location.inserted_at DESC NULLS LAST, location.id DESC)
        FROM (
          SELECT * FROM active_locations
          ORDER BY inserted_at DESC NULLS LAST, id DESC
          LIMIT (SELECT limit_value FROM params)
        ) location
      ), '[]'::jsonb)
    ),
    'top', jsonb_build_object(
      'members', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', member.id,
          'username', member.username,
          'name', member.name,
          'avatar_url', member.avatar_url,
          'is_verified', member.is_verified,
          'deleted', member.deleted,
          'deleted_at', member.deleted_at,
          'review_count', member.review_count,
          'passport_points', member.passport_points,
          'bio', member.bio
        ) ORDER BY member.review_count DESC NULLS LAST, member.id)
        FROM (
          SELECT * FROM active_members
          ORDER BY review_count DESC NULLS LAST, id
          LIMIT (SELECT limit_value FROM params)
        ) member
      ), '[]'::jsonb),
      'reviews', COALESCE((
        SELECT jsonb_agg(card ORDER BY likes DESC, comments DESC, id DESC)
        FROM (
          SELECT card, likes, comments, id FROM review_cards
          ORDER BY likes DESC, comments DESC, id DESC
          LIMIT (SELECT limit_value FROM params)
        ) top_reviews
      ), '[]'::jsonb),
      'locations', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', location.id,
          'name', location.name,
          'rating', location.rating,
          'total_ratings', location.total_ratings
        ) ORDER BY location.rating DESC, location.total_ratings DESC, location.id)
        FROM (
          SELECT * FROM location_rankings
          WHERE total_ratings >= 2 AND rating IS NOT NULL
          ORDER BY rating DESC, total_ratings DESC, id
          LIMIT (SELECT limit_value FROM params)
        ) location
      ), '[]'::jsonb)
    )
  );
$function$;

-- get_admin_moderation_reports
CREATE OR REPLACE FUNCTION public.get_admin_moderation_reports(p_query text DEFAULT NULL::text, p_status text DEFAULT NULL::text, p_content_type text DEFAULT NULL::text, p_page integer DEFAULT 1, p_per_page integer DEFAULT 50)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
  WITH params AS (
    SELECT
      NULLIF(btrim(p_query), '') AS query_text,
      NULLIF(btrim(p_status), '') AS status_text,
      NULLIF(btrim(p_content_type), '') AS content_type_text,
      greatest(1, COALESCE(p_page, 1)) AS page_value,
      greatest(1, least(COALESCE(p_per_page, 50), 100)) AS per_page_value
  ),
  filtered AS (
    SELECT report.id, report.created_at, report.reason, report.status,
      COALESCE(
        report.content_type,
        CASE WHEN report.comment_id IS NOT NULL THEN 'comment' ELSE 'review' END
      ) AS normalized_content_type,
      report.review_id, report.comment_id,
      COALESCE(report.content_snapshot, '{}'::jsonb) AS content_snapshot,
      CASE WHEN reporter.id IS NULL THEN NULL ELSE jsonb_build_object(
        'id', reporter.id,
        'username', reporter.username,
        'name', reporter.name,
        'avatar_url', reporter.avatar_url,
        'is_verified', reporter.is_verified,
        'deleted', reporter.deleted,
        'deleted_at', reporter.deleted_at,
        'review_count', reporter.review_count,
          'passport_points', reporter.passport_points,
        'bio', reporter.bio
      ) END AS reporter,
      CASE WHEN creator.id IS NULL THEN NULL ELSE jsonb_build_object(
        'id', creator.id,
        'username', creator.username,
        'name', creator.name,
        'avatar_url', creator.avatar_url,
        'is_verified', creator.is_verified,
        'deleted', creator.deleted,
        'deleted_at', creator.deleted_at,
        'review_count', creator.review_count,
          'passport_points', creator.passport_points,
        'bio', creator.bio
      ) END AS creator,
      CASE WHEN review.id IS NULL THEN NULL ELSE jsonb_build_object(
        'id', review.id,
        'comment', review.comment,
        'state', review.state,
        'location', CASE WHEN location.id IS NULL THEN NULL ELSE jsonb_build_object(
          'name', location.name
        ) END
      ) END AS review,
      CASE WHEN comment.id IS NULL THEN NULL ELSE jsonb_build_object(
        'id', comment.id,
        'body', comment.body
      ) END AS comment
    FROM public.reports report
    LEFT JOIN public.profiles reporter ON reporter.id = report.reporter_id
    LEFT JOIN public.profiles creator ON creator.id = report.creator_id
    LEFT JOIN public.reviews review ON review.id = report.review_id
    LEFT JOIN public.locations location ON location.id = review.location
    LEFT JOIN public.comments comment ON comment.id = report.comment_id
    CROSS JOIN params
    WHERE (params.status_text IS NULL OR report.status = params.status_text)
      AND (
        params.content_type_text IS NULL
        OR COALESCE(
          report.content_type,
          CASE WHEN report.comment_id IS NOT NULL THEN 'comment' ELSE 'review' END
        ) = params.content_type_text
      )
      AND (
        params.query_text IS NULL
        OR concat_ws(
          ' ',
          report.reason,
          reporter.username,
          reporter.name,
          creator.username,
          creator.name,
          comment.body,
          review.comment,
          location.name,
          report.content_snapshot::text
        ) ILIKE '%' || params.query_text || '%'
      )
  ),
  counted AS (
    SELECT filtered.*, count(*) OVER () AS total_count
    FROM filtered
  ),
  paged AS (
    SELECT *
    FROM counted, params
    ORDER BY (status = 'pending') DESC, created_at DESC, id DESC
    LIMIT (SELECT per_page_value FROM params)
    OFFSET ((SELECT page_value FROM params) - 1) * (SELECT per_page_value FROM params)
  ),
  counts AS (
    SELECT
      count(*) AS total,
      count(*) FILTER (WHERE status = 'pending') AS pending,
      count(*) FILTER (WHERE normalized_content_type = 'review') AS reviews,
      count(*) FILTER (WHERE normalized_content_type = 'comment') AS comments
    FROM filtered
  )
  SELECT jsonb_build_object(
    'reports', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', id,
        'created_at', created_at,
        'reason', reason,
        'status', COALESCE(status, 'pending'),
        'content_type', normalized_content_type,
        'review_id', review_id,
        'comment_id', comment_id,
        'content_snapshot', content_snapshot,
        'reporter', reporter,
        'creator', creator,
        'review', review,
        'comment', comment
      ) ORDER BY (status = 'pending') DESC, created_at DESC, id DESC)
      FROM paged
    ), '[]'::jsonb),
    'total', (SELECT total FROM counts),
    'counts', jsonb_build_object(
      'total', (SELECT total FROM counts),
      'pending', (SELECT pending FROM counts),
      'reviews', (SELECT reviews FROM counts),
      'comments', (SELECT comments FROM counts)
    )
  );
$function$;

-- get_admin_reviews_page
CREATE OR REPLACE FUNCTION public.get_admin_reviews_page(p_search text DEFAULT NULL::text, p_state text DEFAULT NULL::text, p_page integer DEFAULT 1, p_per_page integer DEFAULT 50)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
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
          'passport_points', member.passport_points,
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
$function$;

-- get_admin_profiles_page
CREATE OR REPLACE FUNCTION public.get_admin_profiles_page(p_search text DEFAULT NULL::text, p_status text DEFAULT NULL::text, p_sort text DEFAULT 'review_count'::text, p_direction text DEFAULT 'desc'::text, p_page integer DEFAULT 1, p_per_page integer DEFAULT 50)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
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
      p.deleted, p.deleted_at, p.review_count, p.bio, p.passport_points,
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
      p.deleted, p.deleted_at, p.review_count, p.bio, p.passport_points,
      u.email, u.created_at, u.last_sign_in_at
  ),
  paged AS (
    SELECT profile_rows.*
    FROM profile_rows
    CROSS JOIN params
    ORDER BY
      CASE WHEN params.sort_column = 'review_count' AND params.sort_direction = 'asc' THEN review_count END ASC NULLS LAST,
      CASE WHEN params.sort_column = 'rank' AND params.sort_direction = 'asc' THEN passport_points END ASC NULLS LAST,
      CASE WHEN params.sort_column = 'review_count' AND params.sort_direction = 'desc' THEN review_count END DESC NULLS LAST,
      CASE WHEN params.sort_column = 'rank' AND params.sort_direction = 'desc' THEN passport_points END DESC NULLS LAST,
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
        'passport_points', passport_points,
        'bio', bio,
        'email', email,
        'created_at', created_at,
        'last_sign_in_at', last_sign_in_at,
        'last_review_at', last_review_at
      ))
      FROM paged
    ), '[]'::jsonb)
  );
$function$;

-- get_admin_profile_detail
CREATE OR REPLACE FUNCTION public.get_admin_profile_detail(p_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
  SELECT CASE WHEN profile.id IS NULL THEN NULL ELSE jsonb_build_object(
    'id', profile.id,
    'username', profile.username,
    'name', profile.name,
    'avatar_url', profile.avatar_url,
    'is_verified', profile.is_verified,
    'deleted', profile.deleted,
    'deleted_at', profile.deleted_at,
    'review_count', profile.review_count,
    'passport_points', profile.passport_points,
    'bio', profile.bio,
    'email', auth_user.email,
    'created_at', auth_user.created_at,
    'last_sign_in_at', auth_user.last_sign_in_at
  ) END
  FROM public.profiles profile
  JOIN auth.users auth_user ON auth_user.id = profile.id
  WHERE profile.id = p_id;
$function$;

-- get_admin_engagement_analytics
CREATE OR REPLACE FUNCTION public.get_admin_engagement_analytics(p_since date, p_until date, p_limit integer DEFAULT 20, p_cursor_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_cursor_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
DECLARE
  v_days integer := (p_until - p_since) + 1;
  v_prior_since date := p_since - ((p_until - p_since) + 1);
  v_prior_until date := p_since - 1;
  v_limit integer := greatest(1, least(COALESCE(p_limit, 20), 50));
  v_result jsonb;
BEGIN
  IF p_since IS NULL OR p_until IS NULL OR p_since > p_until OR v_days > 366 THEN
    RAISE EXCEPTION 'Analytics range must contain between 1 and 366 days';
  END IF;
  IF (p_cursor_at IS NULL) <> (p_cursor_id IS NULL) THEN
    RAISE EXCEPTION 'Both engagement cursor fields must be provided together';
  END IF;

  WITH active_members AS (
    SELECT p.id, p.username, p.name, p.avatar_url, p.is_verified,
      p.deleted, p.deleted_at, p.review_count, p.bio, p.passport_points
    FROM public.profiles p
    WHERE p.deleted = false
  ),
  likes_current AS (
    SELECT l.liked_at
    FROM public.likes l
    JOIN active_members member ON member.id = l.user_id
    WHERE l.liked_at >= p_since::timestamptz
      AND l.liked_at < (p_until + 1)::timestamptz
  ),
  comment_likes_current AS (
    SELECT l.liked_at
    FROM public.comment_likes l
    JOIN active_members member ON member.id = l.user_id
    WHERE l.liked_at >= p_since::timestamptz
      AND l.liked_at < (p_until + 1)::timestamptz
  ),
  comments_current AS (
    SELECT c.inserted_at
    FROM public.comments c
    JOIN active_members member ON member.id = c.user_id
    WHERE c.inserted_at >= p_since::timestamptz
      AND c.inserted_at < (p_until + 1)::timestamptz
  ),
  follows_current AS (
    SELECT f.followed_at
    FROM public.followers f
    JOIN active_members member ON member.id = f.follower_id
    WHERE f.followed_at >= p_since::timestamptz
      AND f.followed_at < (p_until + 1)::timestamptz
  ),
  shares_current AS (
    SELECT s.*
    FROM public.review_share_events s
    JOIN active_members member ON member.id = s.user_id
    WHERE s.shared_at >= p_since::timestamptz
      AND s.shared_at < (p_until + 1)::timestamptz
  ),
  invites_current AS (
    SELECT i.*
    FROM public.invite_share_events i
    JOIN active_members member ON member.id = i.user_id
    WHERE i.created_at >= p_since::timestamptz
      AND i.created_at < (p_until + 1)::timestamptz
  ),
  days AS (
    SELECT day::date AS day
    FROM generate_series(
      p_since::timestamp,
      p_until::timestamp,
      interval '1 day'
    ) day
  ),
  like_days AS (
    SELECT liked_at::date AS day, count(*) AS count
    FROM likes_current GROUP BY liked_at::date
  ),
  comment_like_days AS (
    SELECT liked_at::date AS day, count(*) AS count
    FROM comment_likes_current GROUP BY liked_at::date
  ),
  comment_days AS (
    SELECT inserted_at::date AS day, count(*) AS count
    FROM comments_current GROUP BY inserted_at::date
  ),
  follow_days AS (
    SELECT followed_at::date AS day, count(*) AS count
    FROM follows_current GROUP BY followed_at::date
  ),
  share_days AS (
    SELECT shared_at::date AS day, count(*) AS count
    FROM shares_current GROUP BY shared_at::date
  ),
  invite_days AS (
    SELECT created_at::date AS day, count(*) AS count
    FROM invites_current GROUP BY created_at::date
  ),
  sharer_events AS (
    SELECT user_id, shared_at AS occurred_at FROM shares_current
    UNION ALL
    SELECT event.user_id, event.created_at
    FROM public.celebration_events event
    JOIN active_members member ON member.id = event.user_id
    WHERE event.created_at >= p_since::timestamptz
      AND event.created_at < (p_until + 1)::timestamptz
      AND event.channel = 'sheet'
      AND event.outcome = 'shared'
    UNION ALL
    SELECT user_id, created_at FROM invites_current WHERE outcome = 'shared'
  ),
  top_sharers AS (
    SELECT member.*, count(*) AS share_count, max(event.occurred_at) AS last_shared_at
    FROM sharer_events event
    JOIN active_members member ON member.id = event.user_id
    GROUP BY member.id, member.username, member.name, member.avatar_url,
      member.is_verified, member.deleted, member.deleted_at,
      member.review_count, member.bio, member.passport_points
    ORDER BY share_count DESC, last_shared_at DESC, member.id
    LIMIT 10
  ),
  recent_candidates AS (
    SELECT share.id, share.user_id, share.review_id, share.channel,
      share.outcome, share.shared_at, location.name AS location_name,
      member.username, member.name, member.avatar_url, member.is_verified,
      member.deleted, member.deleted_at, member.review_count, member.bio,
      member.passport_points
    FROM shares_current share
    JOIN active_members member ON member.id = share.user_id
    JOIN public.reviews review ON review.id = share.review_id
    LEFT JOIN public.locations location ON location.id = review.location
    WHERE p_cursor_at IS NULL
      OR (share.shared_at, share.id) < (p_cursor_at, p_cursor_id)
    ORDER BY share.shared_at DESC, share.id DESC
    LIMIT v_limit + 1
  ),
  recent_visible AS (
    SELECT * FROM recent_candidates
    ORDER BY shared_at DESC, id DESC
    LIMIT v_limit
  ),
  next_cursor AS (
    SELECT shared_at, id FROM recent_visible
    ORDER BY shared_at ASC, id ASC
    LIMIT 1
  )
  SELECT jsonb_build_object(
    'current', jsonb_build_object(
      'follows', (SELECT count(*) FROM follows_current),
      'likes', (SELECT count(*) FROM likes_current),
      'commentLikes', (SELECT count(*) FROM comment_likes_current),
      'comments', (SELECT count(*) FROM comments_current),
      'shares', (SELECT count(*) FROM shares_current),
      'invites', (SELECT count(*) FROM invites_current)
    ),
    'previous', jsonb_build_object(
      'follows', (
        SELECT count(*) FROM public.followers f
        JOIN active_members member ON member.id = f.follower_id
        WHERE f.followed_at >= v_prior_since::timestamptz
          AND f.followed_at < (v_prior_until + 1)::timestamptz
      ),
      'likes', (
        SELECT count(*) FROM public.likes l
        JOIN active_members member ON member.id = l.user_id
        WHERE l.liked_at >= v_prior_since::timestamptz
          AND l.liked_at < (v_prior_until + 1)::timestamptz
      ),
      'commentLikes', (
        SELECT count(*) FROM public.comment_likes l
        JOIN active_members member ON member.id = l.user_id
        WHERE l.liked_at >= v_prior_since::timestamptz
          AND l.liked_at < (v_prior_until + 1)::timestamptz
      ),
      'comments', (
        SELECT count(*) FROM public.comments c
        JOIN active_members member ON member.id = c.user_id
        WHERE c.inserted_at >= v_prior_since::timestamptz
          AND c.inserted_at < (v_prior_until + 1)::timestamptz
      ),
      'shares', (
        SELECT count(*) FROM public.review_share_events s
        JOIN active_members member ON member.id = s.user_id
        WHERE s.shared_at >= v_prior_since::timestamptz
          AND s.shared_at < (v_prior_until + 1)::timestamptz
      ),
      'invites', (
        SELECT count(*) FROM public.invite_share_events i
        JOIN active_members member ON member.id = i.user_id
        WHERE i.created_at >= v_prior_since::timestamptz
          AND i.created_at < (v_prior_until + 1)::timestamptz
      )
    ),
    'followsByDay', (
      SELECT jsonb_agg(jsonb_build_object('day', days.day, 'count', COALESCE(follow_days.count, 0)) ORDER BY days.day)
      FROM days LEFT JOIN follow_days USING (day)
    ),
    'likesByDay', (
      SELECT jsonb_agg(jsonb_build_object('day', days.day, 'count', COALESCE(like_days.count, 0)) ORDER BY days.day)
      FROM days LEFT JOIN like_days USING (day)
    ),
    'commentLikesByDay', (
      SELECT jsonb_agg(jsonb_build_object('day', days.day, 'count', COALESCE(comment_like_days.count, 0)) ORDER BY days.day)
      FROM days LEFT JOIN comment_like_days USING (day)
    ),
    'commentsByDay', (
      SELECT jsonb_agg(jsonb_build_object('day', days.day, 'count', COALESCE(comment_days.count, 0)) ORDER BY days.day)
      FROM days LEFT JOIN comment_days USING (day)
    ),
    'sharesByDay', (
      SELECT jsonb_agg(jsonb_build_object('day', days.day, 'count', COALESCE(share_days.count, 0)) ORDER BY days.day)
      FROM days LEFT JOIN share_days USING (day)
    ),
    'invitesByDay', (
      SELECT jsonb_agg(jsonb_build_object('day', days.day, 'count', COALESCE(invite_days.count, 0)) ORDER BY days.day)
      FROM days LEFT JOIN invite_days USING (day)
    ),
    'shareChannels', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('channel', channel, 'count', count) ORDER BY count DESC, channel)
      FROM (SELECT channel, count(*) AS count FROM shares_current GROUP BY channel) channels
    ), '[]'::jsonb),
    'inviteChannels', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('channel', channel, 'count', count) ORDER BY count DESC, channel)
      FROM (SELECT channel, count(*) AS count FROM invites_current GROUP BY channel) channels
    ), '[]'::jsonb),
    'topSharers', COALESCE((
      SELECT jsonb_agg(to_jsonb(top_sharers) ORDER BY share_count DESC, last_shared_at DESC, id)
      FROM top_sharers
    ), '[]'::jsonb),
    'recentReviewShares', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', id,
        'reviewId', review_id,
        'locationName', location_name,
        'channel', channel,
        'outcome', outcome,
        'sharedAt', shared_at,
        'profile', jsonb_build_object(
          'id', user_id,
          'username', username,
          'name', name,
          'avatar_url', avatar_url,
          'is_verified', is_verified,
          'deleted', deleted,
          'deleted_at', deleted_at,
          'review_count', review_count,
          'passport_points', passport_points,
          'bio', bio
        )
      ) ORDER BY shared_at DESC, id DESC)
      FROM recent_visible
    ), '[]'::jsonb),
    'hasMore', (SELECT count(*) > v_limit FROM recent_candidates),
    'nextCursorAt', (SELECT shared_at FROM next_cursor),
    'nextCursorId', (SELECT id FROM next_cursor)
  ) INTO v_result;

  RETURN v_result;
END;
$function$;

-- get_admin_passport_analytics
CREATE OR REPLACE FUNCTION public.get_admin_passport_analytics(p_since date, p_until date)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
DECLARE
  v_days integer := (p_until - p_since) + 1;
  v_prior_since date := p_since - ((p_until - p_since) + 1);
  v_prior_until date := p_since - 1;
  v_result jsonb;
BEGIN
  IF p_since IS NULL OR p_until IS NULL OR p_since > p_until OR v_days > 366 THEN
    RAISE EXCEPTION 'Analytics range must contain between 1 and 366 days';
  END IF;

  WITH active_members AS (
    SELECT p.id, p.username, p.name, p.avatar_url, p.is_verified,
      p.deleted, p.deleted_at, p.review_count, p.bio, p.passport_points
    FROM public.profiles p
    WHERE p.deleted = false
  ),
  awards AS (
    SELECT a.id, a.profile_id, a.definition_id, a.awarded_at,
      d.key, d.series, d.metric, d.threshold, d.points, d.title, d.unit,
      d.subject_a, d.subject_b
    FROM public.passport_awards a
    JOIN public.passport_definitions d ON d.id = a.definition_id
    JOIN active_members member ON member.id = a.profile_id
    WHERE a.revoked_at IS NULL
  ),
  awards_current AS (
    SELECT * FROM awards
    WHERE awarded_at >= p_since::timestamptz
      AND awarded_at < (p_until + 1)::timestamptz
  ),
  awards_previous AS (
    SELECT * FROM awards
    WHERE awarded_at >= v_prior_since::timestamptz
      AND awarded_at < (v_prior_until + 1)::timestamptz
  ),
  labelled AS (
    SELECT awards.*,
      CASE WHEN awards.metric = 'combination'
        THEN concat_ws(' · ', s.name, t.name)
        ELSE awards.threshold::text || ' ' ||
          CASE WHEN awards.threshold = 1
            THEN regexp_replace(awards.unit, 's$', '')
            ELSE awards.unit END
      END AS label
    FROM awards
    LEFT JOIN public.spirits s
      ON awards.metric = 'combination' AND s.id = awards.subject_a
    LEFT JOIN public.types t
      ON awards.metric = 'combination' AND t.id = awards.subject_b
  ),
  top_stamps AS (
    SELECT key, series, title, label, points,
      count(*) AS award_count,
      max(awarded_at) AS last_awarded_at
    FROM labelled
    WHERE awarded_at >= p_since::timestamptz
      AND awarded_at < (p_until + 1)::timestamptz
    GROUP BY key, series, title, label, points
    ORDER BY award_count DESC, last_awarded_at DESC, key
    LIMIT 10
  ),
  top_members AS (
    SELECT member.*,
      COALESCE(stats.stamp_count, 0) AS stamp_count,
      stats.last_award_at
    FROM active_members member
    LEFT JOIN (
      SELECT profile_id, count(*) AS stamp_count, max(awarded_at) AS last_award_at
      FROM awards GROUP BY profile_id
    ) stats ON stats.profile_id = member.id
    WHERE member.passport_points > 0
    ORDER BY member.passport_points DESC, stats.last_award_at DESC NULLS LAST,
      member.id
    LIMIT 10
  ),
  recent_awards AS (
    SELECT labelled.*, member.username, member.name AS member_name,
      member.avatar_url, member.is_verified, member.deleted,
      member.deleted_at, member.review_count, member.bio,
      member.passport_points
    FROM labelled
    JOIN active_members member ON member.id = labelled.profile_id
    WHERE labelled.awarded_at >= p_since::timestamptz
      AND labelled.awarded_at < (p_until + 1)::timestamptz
    ORDER BY labelled.awarded_at DESC, labelled.id DESC
    LIMIT 20
  )
  SELECT jsonb_build_object(
    'totals', jsonb_build_object(
      'stampsAwarded', (SELECT count(*) FROM awards),
      'membersWithStamps', (SELECT count(DISTINCT profile_id) FROM awards),
      'pointsInCirculation',
        (SELECT COALESCE(sum(passport_points), 0) FROM active_members)
    ),
    'current', jsonb_build_object(
      'stamps', (SELECT count(*) FROM awards_current),
      'points', (SELECT COALESCE(sum(points), 0) FROM awards_current),
      'earningMembers',
        (SELECT count(DISTINCT profile_id) FROM awards_current)
    ),
    'previous', jsonb_build_object(
      'stamps', (SELECT count(*) FROM awards_previous),
      'points', (SELECT COALESCE(sum(points), 0) FROM awards_previous),
      'earningMembers',
        (SELECT count(DISTINCT profile_id) FROM awards_previous)
    ),
    'stampsByDay', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('day', day, 'count', count)
        ORDER BY day)
      FROM (
        SELECT awarded_at::date AS day, count(*) AS count
        FROM awards_current GROUP BY awarded_at::date
      ) days
    ), '[]'::jsonb),
    'pointsDistribution', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'points', passport_points, 'count', count) ORDER BY passport_points)
      FROM (
        SELECT passport_points, count(*) AS count
        FROM active_members
        GROUP BY passport_points
      ) buckets
    ), '[]'::jsonb),
    'topStamps', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'key', key, 'series', series, 'title', title, 'label', label,
        'points', points, 'awardCount', award_count,
        'lastAwardedAt', last_awarded_at
      ) ORDER BY award_count DESC, last_awarded_at DESC, key)
      FROM top_stamps
    ), '[]'::jsonb),
    'topMembers', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', id, 'username', username, 'name', name,
        'avatar_url', avatar_url, 'is_verified', is_verified,
        'deleted', deleted, 'deleted_at', deleted_at,
        'review_count', review_count, 'bio', bio,
        'passport_points', passport_points,
        'stamp_count', stamp_count, 'last_award_at', last_award_at
      ) ORDER BY passport_points DESC, last_award_at DESC NULLS LAST, id)
      FROM top_members
    ), '[]'::jsonb),
    'recentAwards', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', id,
        'awardedAt', awarded_at,
        'title', title,
        'label', label,
        'series', series,
        'points', points,
        'profile', jsonb_build_object(
          'id', profile_id,
          'username', username,
          'name', member_name,
          'avatar_url', avatar_url,
          'is_verified', is_verified,
          'deleted', deleted,
          'deleted_at', deleted_at,
          'review_count', review_count,
          'passport_points', passport_points,
          'bio', bio
        )
      ) ORDER BY awarded_at DESC, id DESC)
      FROM recent_awards
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$function$;

NOTIFY pgrst, 'reload schema';
COMMIT;
