-- Display metadata is itself private: if the selected target is deleted or
-- blocked, return only the underlying plain-text body to the client.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_mention_spans_v1(
  p_review_ids bigint[] DEFAULT ARRAY[]::bigint[],
  p_comment_ids integer[] DEFAULT ARRAY[]::integer[]
) RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH request AS (SELECT auth.uid() AS viewer_id), mention_rows AS (
    SELECT
      'review'::text AS source_kind,
      mention.review_id::bigint AS source_id,
      mention.mentioned_profile_id AS profile_id,
      mention.username_snapshot AS username,
      mention.start_offset AS start,
      mention.token_length AS length
    FROM public.review_mentions mention
    JOIN public.reviews review ON review.id = mention.review_id AND review.state = 1
    JOIN public.profiles author ON author.id = review.user_id AND author.deleted = false
    JOIN public.profiles target
      ON target.id = mention.mentioned_profile_id
     AND target.deleted = false
    CROSS JOIN request
    WHERE mention.review_id = ANY(COALESCE(p_review_ids, ARRAY[]::bigint[]))
      AND request.viewer_id IS NOT NULL
      AND NOT public.push_users_are_blocked(request.viewer_id, review.user_id)
      AND NOT public.push_users_are_blocked(request.viewer_id, target.id)
    UNION ALL
    SELECT
      'comment'::text,
      mention.comment_id::bigint,
      mention.mentioned_profile_id,
      mention.username_snapshot,
      mention.start_offset,
      mention.token_length
    FROM public.comment_mentions mention
    JOIN public.comments comment ON comment.id = mention.comment_id
    JOIN public.reviews review ON review.id = comment.review_id AND review.state = 1
    JOIN public.profiles author ON author.id = comment.user_id AND author.deleted = false
    JOIN public.profiles target
      ON target.id = mention.mentioned_profile_id
     AND target.deleted = false
    CROSS JOIN request
    WHERE mention.comment_id = ANY(COALESCE(p_comment_ids, ARRAY[]::integer[]))
      AND request.viewer_id IS NOT NULL
      AND NOT public.push_users_are_blocked(request.viewer_id, comment.user_id)
      AND NOT public.push_users_are_blocked(request.viewer_id, target.id)
  )
  SELECT jsonb_build_object('mentions', COALESCE(jsonb_agg(jsonb_build_object(
    'sourceKind', source_kind,
    'sourceId', source_id,
    'profileId', profile_id,
    'username', username,
    'start', start,
    'length', length
  ) ORDER BY source_kind, source_id, start), '[]'::jsonb))
  FROM mention_rows;
$$;

REVOKE ALL ON FUNCTION public.get_mention_spans_v1(bigint[], integer[])
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_mention_spans_v1(bigint[], integer[])
  TO authenticated, service_role;

COMMIT;
