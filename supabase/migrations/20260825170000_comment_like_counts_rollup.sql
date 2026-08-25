-- Return comment-like counts without downloading every like row for the
-- preview comments attached to a feed page.

CREATE OR REPLACE FUNCTION public.get_comment_like_counts_v1(
  p_comment_ids integer[]
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  WITH selected_comments AS (
    SELECT DISTINCT comment_id
    FROM unnest(COALESCE(p_comment_ids, '{}'::integer[])) AS comment_id
  ),
  counts AS (
    SELECT comment_id, count(*) AS count
    FROM public.comment_likes
    JOIN selected_comments USING (comment_id)
    GROUP BY comment_id
  ),
  viewer_likes AS (
    SELECT DISTINCT comment_id
    FROM public.comment_likes
    JOIN selected_comments USING (comment_id)
    WHERE auth.uid() IS NOT NULL AND user_id = auth.uid()
  )
  SELECT COALESCE(jsonb_object_agg(
    selected.comment_id::text,
    jsonb_build_object(
      'count', COALESCE(counts.count, 0),
      'has_liked', viewer_likes.comment_id IS NOT NULL
    )
  ), '{}'::jsonb)
  FROM selected_comments selected
  LEFT JOIN counts USING (comment_id)
  LEFT JOIN viewer_likes USING (comment_id);
$$;

GRANT EXECUTE ON FUNCTION public.get_comment_like_counts_v1(integer[])
  TO anon, authenticated;
