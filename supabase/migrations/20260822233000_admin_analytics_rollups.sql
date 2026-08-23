-- Bounded, service-role-only analytics rollups for the split admin screens.
-- Aggregation stays in Postgres so the admin never downloads whole event or
-- member datasets to calculate charts in the Next.js process.

CREATE INDEX IF NOT EXISTS locations_inserted_at_idx
  ON public.locations (inserted_at DESC);
CREATE INDEX IF NOT EXISTS followers_followed_at_idx
  ON public.followers (followed_at DESC);
CREATE INDEX IF NOT EXISTS likes_liked_at_idx
  ON public.likes (liked_at DESC);
CREATE INDEX IF NOT EXISTS comments_inserted_at_idx
  ON public.comments (inserted_at DESC);
CREATE INDEX IF NOT EXISTS reviews_location_state_inserted_at_idx
  ON public.reviews (location, state, inserted_at DESC);

CREATE OR REPLACE FUNCTION public.get_admin_analytics_overview(
  p_since date,
  p_until date
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
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
    SELECT p.id, u.created_at
    FROM public.profiles p
    JOIN auth.users u ON u.id = p.id
    WHERE p.deleted = false
  ),
  active_locations AS (
    SELECT l.*
    FROM public.locations l
    JOIN active_members creator ON creator.id = l.created_by
  ),
  active_reviews AS (
    SELECT r.*
    FROM public.reviews r
    JOIN active_members member ON member.id = r.user_id
    JOIN active_locations location ON location.id = r.location
    WHERE r.state = 1
  ),
  days AS (
    SELECT day::date AS day
    FROM generate_series(
      p_since::timestamp,
      p_until::timestamp,
      interval '1 day'
    ) day
  ),
  member_days AS (
    SELECT created_at::date AS day, count(*) AS count
    FROM active_members
    WHERE created_at >= p_since::timestamptz
      AND created_at < (p_until + 1)::timestamptz
    GROUP BY created_at::date
  ),
  review_days AS (
    SELECT inserted_at::date AS day, count(*) AS count
    FROM active_reviews
    WHERE inserted_at >= p_since::timestamptz
      AND inserted_at < (p_until + 1)::timestamptz
    GROUP BY inserted_at::date
  ),
  place_days AS (
    SELECT inserted_at::date AS day, count(*) AS count
    FROM active_locations
    WHERE inserted_at >= p_since::timestamptz
      AND inserted_at < (p_until + 1)::timestamptz
    GROUP BY inserted_at::date
  )
  SELECT jsonb_build_object(
    'totals', jsonb_build_object(
      'members', (SELECT count(*) FROM active_members),
      'reviews', (SELECT count(*) FROM active_reviews),
      'places', (SELECT count(*) FROM active_locations)
    ),
    'current', jsonb_build_object(
      'members', (
        SELECT count(*) FROM active_members
        WHERE created_at >= p_since::timestamptz
          AND created_at < (p_until + 1)::timestamptz
      ),
      'reviews', (
        SELECT count(*) FROM active_reviews
        WHERE inserted_at >= p_since::timestamptz
          AND inserted_at < (p_until + 1)::timestamptz
      ),
      'places', (
        SELECT count(*) FROM active_locations
        WHERE inserted_at >= p_since::timestamptz
          AND inserted_at < (p_until + 1)::timestamptz
      ),
      'follows', (
        SELECT count(*) FROM public.followers f
        JOIN active_members member ON member.id = f.follower_id
        WHERE f.followed_at >= p_since::timestamptz
          AND f.followed_at < (p_until + 1)::timestamptz
      ),
      'likes', (
        SELECT count(*) FROM public.likes l
        JOIN active_members member ON member.id = l.user_id
        WHERE l.liked_at >= p_since::timestamptz
          AND l.liked_at < (p_until + 1)::timestamptz
      ),
      'comments', (
        SELECT count(*) FROM public.comments c
        JOIN active_members member ON member.id = c.user_id
        WHERE c.inserted_at >= p_since::timestamptz
          AND c.inserted_at < (p_until + 1)::timestamptz
      ),
      'shares', (
        SELECT count(*) FROM public.review_share_events s
        JOIN active_members member ON member.id = s.user_id
        WHERE s.shared_at >= p_since::timestamptz
          AND s.shared_at < (p_until + 1)::timestamptz
      ),
      'indexInteractions', (
        SELECT count(*) FROM public.martini_index_events e
        JOIN active_members member ON member.id = e.user_id
        WHERE e.created_at >= p_since::timestamptz
          AND e.created_at < (p_until + 1)::timestamptz
      )
    ),
    'previous', jsonb_build_object(
      'members', (
        SELECT count(*) FROM active_members
        WHERE created_at >= v_prior_since::timestamptz
          AND created_at < (v_prior_until + 1)::timestamptz
      ),
      'reviews', (
        SELECT count(*) FROM active_reviews
        WHERE inserted_at >= v_prior_since::timestamptz
          AND inserted_at < (v_prior_until + 1)::timestamptz
      ),
      'places', (
        SELECT count(*) FROM active_locations
        WHERE inserted_at >= v_prior_since::timestamptz
          AND inserted_at < (v_prior_until + 1)::timestamptz
      ),
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
      'indexInteractions', (
        SELECT count(*) FROM public.martini_index_events e
        JOIN active_members member ON member.id = e.user_id
        WHERE e.created_at >= v_prior_since::timestamptz
          AND e.created_at < (v_prior_until + 1)::timestamptz
      )
    ),
    'membersByDay', (
      SELECT jsonb_agg(jsonb_build_object(
        'day', days.day,
        'count', COALESCE(member_days.count, 0)
      ) ORDER BY days.day)
      FROM days LEFT JOIN member_days USING (day)
    ),
    'reviewsByDay', (
      SELECT jsonb_agg(jsonb_build_object(
        'day', days.day,
        'count', COALESCE(review_days.count, 0)
      ) ORDER BY days.day)
      FROM days LEFT JOIN review_days USING (day)
    ),
    'placesByDay', (
      SELECT jsonb_agg(jsonb_build_object(
        'day', days.day,
        'count', COALESCE(place_days.count, 0)
      ) ORDER BY days.day)
      FROM days LEFT JOIN place_days USING (day)
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_growth_analytics(
  p_since date,
  p_until date
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
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
    SELECT p.id, p.eula_accepted_at, u.created_at
    FROM public.profiles p
    JOIN auth.users u ON u.id = p.id
    WHERE p.deleted = false
  ),
  active_locations AS (
    SELECT location.id
    FROM public.locations location
    JOIN active_members creator ON creator.id = location.created_by
  ),
  member_reviews AS (
    SELECT r.user_id, r.location, r.inserted_at,
      row_number() OVER (
        PARTITION BY r.user_id ORDER BY r.inserted_at, r.id
      ) AS review_number
    FROM public.reviews r
    JOIN active_members member ON member.id = r.user_id
    WHERE r.state = 1
  ),
  range_reviews AS (
    SELECT review.*
    FROM member_reviews review
    JOIN active_locations location ON location.id = review.location
  ),
  first_reviews AS (
    SELECT reviews.user_id, reviews.inserted_at, member.created_at
    FROM member_reviews reviews
    JOIN active_members member ON member.id = reviews.user_id
    WHERE reviews.review_number = 1
  ),
  days AS (
    SELECT day::date AS day
    FROM generate_series(
      p_since::timestamp,
      p_until::timestamp,
      interval '1 day'
    ) day
  ),
  signup_days AS (
    SELECT created_at::date AS day, count(*) AS count
    FROM active_members
    WHERE created_at >= p_since::timestamptz
      AND created_at < (p_until + 1)::timestamptz
    GROUP BY created_at::date
  ),
  review_days AS (
    SELECT inserted_at::date AS day, count(*) AS count
    FROM range_reviews
    WHERE inserted_at >= p_since::timestamptz
      AND inserted_at < (p_until + 1)::timestamptz
    GROUP BY inserted_at::date
  )
  SELECT jsonb_build_object(
    'totalMembers', (SELECT count(*) FROM active_members),
    'signupsInRange', (
      SELECT count(*) FROM active_members
      WHERE created_at >= p_since::timestamptz
        AND created_at < (p_until + 1)::timestamptz
    ),
    'previousSignups', (
      SELECT count(*) FROM active_members
      WHERE created_at >= v_prior_since::timestamptz
        AND created_at < (v_prior_until + 1)::timestamptz
    ),
    'reviewsInRange', (
      SELECT count(*) FROM range_reviews
      WHERE inserted_at >= p_since::timestamptz
        AND inserted_at < (p_until + 1)::timestamptz
    ),
    'previousReviews', (
      SELECT count(*) FROM range_reviews
      WHERE inserted_at >= v_prior_since::timestamptz
        AND inserted_at < (v_prior_until + 1)::timestamptz
    ),
    'reviewedInRange', (
      SELECT count(DISTINCT user_id) FROM range_reviews
      WHERE inserted_at >= p_since::timestamptz
        AND inserted_at < (p_until + 1)::timestamptz
    ),
    'onboardingCompletedTotal', (
      SELECT count(*) FROM active_members WHERE eula_accepted_at IS NOT NULL
    ),
    'onboardingCompletedInRange', (
      SELECT count(*) FROM active_members
      WHERE eula_accepted_at >= p_since::timestamptz
        AND eula_accepted_at < (p_until + 1)::timestamptz
    ),
    'membersWithFirstReview', (
      SELECT count(*) FROM member_reviews WHERE review_number = 1
    ),
    'membersWithSecondReview', (
      SELECT count(*) FROM member_reviews WHERE review_number = 2
    ),
    'firstReviewsInRange', (
      SELECT count(*) FROM member_reviews
      WHERE review_number = 1
        AND inserted_at >= p_since::timestamptz
        AND inserted_at < (p_until + 1)::timestamptz
    ),
    'secondReviewsInRange', (
      SELECT count(*) FROM member_reviews
      WHERE review_number = 2
        AND inserted_at >= p_since::timestamptz
        AND inserted_at < (p_until + 1)::timestamptz
    ),
    'averageDaysToFirstReview', (
      SELECT avg(extract(epoch FROM (inserted_at - created_at)) / 86400.0)
      FROM first_reviews
      WHERE inserted_at >= created_at
    ),
    'signupsByDay', (
      SELECT jsonb_agg(jsonb_build_object(
        'day', days.day,
        'count', COALESCE(signup_days.count, 0)
      ) ORDER BY days.day)
      FROM days LEFT JOIN signup_days USING (day)
    ),
    'reviewsByDay', (
      SELECT jsonb_agg(jsonb_build_object(
        'day', days.day,
        'count', COALESCE(review_days.count, 0)
      ) ORDER BY days.day)
      FROM days LEFT JOIN review_days USING (day)
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_engagement_analytics(
  p_since date,
  p_until date,
  p_limit integer DEFAULT 20,
  p_cursor_at timestamptz DEFAULT NULL,
  p_cursor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
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
      p.deleted, p.deleted_at, p.review_count, p.bio
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
      member.review_count, member.bio
    ORDER BY share_count DESC, last_shared_at DESC, member.id
    LIMIT 10
  ),
  recent_candidates AS (
    SELECT share.id, share.user_id, share.review_id, share.channel,
      share.outcome, share.shared_at, location.name AS location_name,
      member.username, member.name, member.avatar_url, member.is_verified,
      member.deleted, member.deleted_at, member.review_count, member.bio
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
$$;

CREATE OR REPLACE FUNCTION public.get_admin_content_analytics(
  p_since date,
  p_until date
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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
    SELECT id FROM public.profiles WHERE deleted = false
  ),
  active_locations AS (
    SELECT location.*
    FROM public.locations location
    JOIN active_members creator ON creator.id = location.created_by
  ),
  range_reviews AS (
    SELECT review.*
    FROM public.reviews review
    JOIN active_members member ON member.id = review.user_id
    JOIN active_locations location ON location.id = review.location
    WHERE review.state = 1
      AND review.inserted_at >= p_since::timestamptz
      AND review.inserted_at < (p_until + 1)::timestamptz
  ),
  enabled_types AS (
    SELECT DISTINCT ON (lower(trim(name))) id, trim(name) AS name
    FROM public.types
    WHERE lower(trim(name)) IN ('classic', 'dry', '50/50', 'twist', 'dirty', 'filthy', 'espresso')
    ORDER BY lower(trim(name)), id
  ),
  type_counts AS (
    SELECT type.id, type.name, count(review.id) AS review_count
    FROM enabled_types type
    LEFT JOIN range_reviews review ON review.type = type.id
    GROUP BY type.id, type.name
  ),
  enabled_spirits AS (
    SELECT DISTINCT ON (lower(trim(name))) id, trim(name) AS name
    FROM public.spirits
    WHERE lower(trim(name)) IN ('vodka', 'gin', 'vesper')
    ORDER BY lower(trim(name)), id
  ),
  spirit_counts AS (
    SELECT spirit.id, spirit.name, count(review.id) AS review_count
    FROM enabled_spirits spirit
    LEFT JOIN range_reviews review ON review.spirit = spirit.id
    GROUP BY spirit.id, spirit.name
  ),
  place_counts AS (
    SELECT location.id, location.name, location.address,
      count(review.id) AS reviews_in_range
    FROM active_locations location
    JOIN range_reviews review ON review.location = location.id
    GROUP BY location.id, location.name, location.address
  ),
  top_places AS (
    SELECT place.*, ratings.rating, ratings.total_ratings
    FROM place_counts place
    LEFT JOIN public.location_ratings ratings ON ratings.id = place.id
    ORDER BY place.reviews_in_range DESC, place.id
    LIMIT 10
  ),
  days AS (
    SELECT day::date AS day
    FROM generate_series(
      p_since::timestamp,
      p_until::timestamp,
      interval '1 day'
    ) day
  ),
  place_days AS (
    SELECT inserted_at::date AS day, count(*) AS count
    FROM active_locations
    WHERE inserted_at >= p_since::timestamptz
      AND inserted_at < (p_until + 1)::timestamptz
    GROUP BY inserted_at::date
  )
  SELECT jsonb_build_object(
    'totalPlaces', (SELECT count(*) FROM active_locations),
    'placesInRange', (
      SELECT count(*) FROM active_locations
      WHERE inserted_at >= p_since::timestamptz
        AND inserted_at < (p_until + 1)::timestamptz
    ),
    'previousPlaces', (
      SELECT count(*) FROM active_locations
      WHERE inserted_at >= v_prior_since::timestamptz
        AND inserted_at < (v_prior_until + 1)::timestamptz
    ),
    'reviewedPlacesInRange', (SELECT count(*) FROM place_counts),
    'reviewsInRange', (SELECT count(*) FROM range_reviews),
    'martiniIndex', jsonb_build_object(
      'views', (
        SELECT count(*) FROM public.martini_index_events event
        JOIN active_members member ON member.id = event.user_id
        WHERE event.kind = 'view'
          AND event.created_at >= p_since::timestamptz
          AND event.created_at < (p_until + 1)::timestamptz
      ),
      'filters', (
        SELECT count(*) FROM public.martini_index_events event
        JOIN active_members member ON member.id = event.user_id
        WHERE event.kind = 'filter'
          AND event.created_at >= p_since::timestamptz
          AND event.created_at < (p_until + 1)::timestamptz
      ),
      'generations', (
        SELECT count(*) FROM public.martini_index_events event
        JOIN active_members member ON member.id = event.user_id
        WHERE event.kind = 'generate'
          AND event.created_at >= p_since::timestamptz
          AND event.created_at < (p_until + 1)::timestamptz
      )
    ),
    'previousMartiniIndex', jsonb_build_object(
      'views', (
        SELECT count(*) FROM public.martini_index_events event
        JOIN active_members member ON member.id = event.user_id
        WHERE event.kind = 'view'
          AND event.created_at >= v_prior_since::timestamptz
          AND event.created_at < (v_prior_until + 1)::timestamptz
      ),
      'filters', (
        SELECT count(*) FROM public.martini_index_events event
        JOIN active_members member ON member.id = event.user_id
        WHERE event.kind = 'filter'
          AND event.created_at >= v_prior_since::timestamptz
          AND event.created_at < (v_prior_until + 1)::timestamptz
      ),
      'generations', (
        SELECT count(*) FROM public.martini_index_events event
        JOIN active_members member ON member.id = event.user_id
        WHERE event.kind = 'generate'
          AND event.created_at >= v_prior_since::timestamptz
          AND event.created_at < (v_prior_until + 1)::timestamptz
      )
    ),
    'placesByDay', (
      SELECT jsonb_agg(jsonb_build_object('day', days.day, 'count', COALESCE(place_days.count, 0)) ORDER BY days.day)
      FROM days LEFT JOIN place_days USING (day)
    ),
    'typePopularity', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', id,
        'name', CASE WHEN name = '50/50' THEN name ELSE initcap(lower(name)) END,
        'reviewCount', review_count
      ) ORDER BY review_count DESC,
        array_position(ARRAY['classic','dry','50/50','twist','dirty','filthy','espresso'], lower(name)))
      FROM type_counts
    ), '[]'::jsonb),
    'spiritPopularity', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', id,
        'name', initcap(lower(name)),
        'reviewCount', review_count
      ) ORDER BY review_count DESC,
        array_position(ARRAY['vodka','gin','vesper'], lower(name)))
      FROM spirit_counts
    ), '[]'::jsonb),
    'topPlaces', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', id,
        'name', name,
        'address', address,
        'rating', rating,
        'totalRatings', COALESCE(total_ratings, 0),
        'reviewsInRange', reviews_in_range
      ) ORDER BY reviews_in_range DESC, id)
      FROM top_places
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_analytics_overview(date, date)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_admin_growth_analytics(date, date)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_admin_engagement_analytics(date, date, integer, timestamptz, uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_admin_content_analytics(date, date)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_admin_analytics_overview(date, date)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.get_admin_growth_analytics(date, date)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.get_admin_engagement_analytics(date, date, integer, timestamptz, uuid)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.get_admin_content_analytics(date, date)
  TO service_role;
