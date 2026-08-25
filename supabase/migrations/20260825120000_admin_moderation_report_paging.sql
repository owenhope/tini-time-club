-- Filter, enrich, sort, and page moderation reports in Postgres. The admin
-- previously downloaded up to 2,000 reports and all referenced content before
-- searching and paginating in the Next.js process.

CREATE INDEX IF NOT EXISTS reports_moderation_cursor_idx
  ON public.reports (status, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS reports_content_type_idx
  ON public.reports (content_type, created_at DESC, id DESC);

CREATE OR REPLACE FUNCTION public.get_admin_moderation_reports(
  p_query text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_content_type text DEFAULT NULL,
  p_page integer DEFAULT 1,
  p_per_page integer DEFAULT 50
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
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
$$;

GRANT ALL ON FUNCTION public.get_admin_moderation_reports(text, text, text, integer, integer)
  TO service_role;
