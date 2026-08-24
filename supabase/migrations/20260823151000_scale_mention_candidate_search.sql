-- Keep mention search bounded to the viewer's interaction graph. The first
-- version used one lateral interaction lookup per candidate, which would
-- become expensive as the member table grows.

BEGIN;

CREATE INDEX IF NOT EXISTS comments_author_recent_idx
  ON public.comments (user_id, inserted_at DESC);
CREATE INDEX IF NOT EXISTS profiles_name_mentions_trgm_idx
  ON public.profiles USING gin ((lower(name)) gin_trgm_ops)
  WHERE deleted = false AND name IS NOT NULL;

CREATE OR REPLACE FUNCTION public.search_mention_candidates_v1(
  p_query text DEFAULT '',
  p_limit integer DEFAULT 5
) RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
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
$$;

REVOKE ALL ON FUNCTION public.search_mention_candidates_v1(text, integer)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_mention_candidates_v1(text, integer)
  TO authenticated, service_role;

COMMIT;
