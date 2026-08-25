-- Aggregate engagement for the small set of review IDs visible on an admin
-- page. This avoids downloading every active member ID into Next.js.

CREATE OR REPLACE FUNCTION public.get_admin_review_engagement(
  p_review_ids bigint[]
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
  WITH selected_reviews AS (
    SELECT DISTINCT review_id
    FROM unnest(COALESCE(p_review_ids, '{}'::bigint[])) AS review_id
  ),
  like_counts AS (
    SELECT like_row.review_id, count(*) AS count
    FROM public.likes like_row
    JOIN public.profiles member ON member.id = like_row.user_id
    JOIN selected_reviews selected ON selected.review_id = like_row.review_id
    WHERE member.deleted = false
    GROUP BY like_row.review_id
  ),
  comment_counts AS (
    SELECT comment.review_id, count(*) AS count
    FROM public.comments comment
    JOIN public.profiles member ON member.id = comment.user_id
    JOIN selected_reviews selected ON selected.review_id = comment.review_id
    WHERE member.deleted = false
    GROUP BY comment.review_id
  ),
  share_counts AS (
    SELECT share.review_id, count(*) AS count
    FROM public.review_share_events share
    JOIN public.profiles member ON member.id = share.user_id
    JOIN selected_reviews selected ON selected.review_id = share.review_id
    WHERE member.deleted = false
    GROUP BY share.review_id
  )
  SELECT COALESCE(jsonb_object_agg(
    selected.review_id::text,
    jsonb_build_object(
      'likes', COALESCE(likes.count, 0),
      'comments', COALESCE(comments.count, 0),
      'shares', COALESCE(shares.count, 0)
    )
  ), '{}'::jsonb)
  FROM selected_reviews selected
  LEFT JOIN like_counts likes USING (review_id)
  LEFT JOIN comment_counts comments USING (review_id)
  LEFT JOIN share_counts shares USING (review_id);
$$;

GRANT ALL ON FUNCTION public.get_admin_review_engagement(bigint[])
  TO service_role;
