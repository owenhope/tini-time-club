-- Keep the admin dashboard's activity panels bounded as the source tables grow.
-- The previous implementation downloaded auth users, likes, comments, and all
-- eligible reviews before sorting them in the Next.js process.

CREATE INDEX IF NOT EXISTS reviews_dashboard_activity_idx
  ON public.reviews (state, inserted_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS reviews_dashboard_location_idx
  ON public.reviews (location, state, taste, presentation);

CREATE OR REPLACE FUNCTION public.get_admin_dashboard_activity(
  p_limit integer DEFAULT 10
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
  WITH params AS (
    SELECT greatest(1, least(COALESCE(p_limit, 10), 50)) AS limit_value
  ),
  active_members AS (
    SELECT p.id, p.username, p.name, p.avatar_url, p.is_verified,
      p.deleted, p.deleted_at, p.review_count, p.bio, u.created_at
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
$$;

GRANT ALL ON FUNCTION public.get_admin_dashboard_activity(integer)
  TO service_role;
