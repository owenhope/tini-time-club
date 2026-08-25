-- Aggregate notification analytics in Postgres. The admin previously
-- downloaded every send, open, and review in the selected window and joined
-- them in the Next.js process.

CREATE INDEX IF NOT EXISTS notifications_analytics_created_at_idx
  ON public.notifications (created_at DESC, kind);

CREATE INDEX IF NOT EXISTS notification_opens_analytics_opened_at_idx
  ON public.notification_opens (opened_at DESC, kind, user_id);

CREATE INDEX IF NOT EXISTS reviews_analytics_user_inserted_at_idx
  ON public.reviews (user_id, inserted_at DESC)
  WHERE state = 1;

CREATE OR REPLACE FUNCTION public.get_admin_notification_analytics(
  p_since timestamptz
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
  WITH sent AS (
    SELECT kind
    FROM public.notifications
    WHERE created_at >= p_since
      AND kind IS NOT NULL
      AND kind <> 'unknown'
      AND kind NOT IN ('admin_message', 'test_push')
  ),
  opened AS (
    SELECT kind, user_id, opened_at
    FROM public.notification_opens
    WHERE opened_at >= p_since
      AND kind IS NOT NULL
      AND kind <> 'unknown'
      AND kind NOT IN ('admin_message', 'test_push')
  ),
  review_conversions AS (
    SELECT count(*) AS converted
    FROM opened notification_open
    WHERE EXISTS (
      SELECT 1
      FROM public.reviews review
      WHERE review.user_id = notification_open.user_id
        AND review.state = 1
        AND review.inserted_at >= notification_open.opened_at
        AND review.inserted_at <= notification_open.opened_at + interval '24 hours'
    )
  ),
  sent_by_kind AS (
    SELECT kind, count(*) AS sent
    FROM sent
    GROUP BY kind
  ),
  opened_by_kind AS (
    SELECT kind, count(*) AS opened
    FROM opened
    GROUP BY kind
  ),
  by_kind AS (
    SELECT kinds.kind,
      COALESCE(sent_by_kind.sent, 0) AS sent,
      COALESCE(opened_by_kind.opened, 0) AS opened
    FROM (
      SELECT kind FROM sent_by_kind
      UNION
      SELECT kind FROM opened_by_kind
    ) kinds
    LEFT JOIN sent_by_kind USING (kind)
    LEFT JOIN opened_by_kind USING (kind)
  )
  SELECT jsonb_build_object(
    'totalSent', (SELECT count(*) FROM sent),
    'totalOpened', (SELECT count(*) FROM opened),
    'openToReviewRate', CASE
      WHEN (SELECT count(*) FROM opened) > 0 THEN
        (SELECT converted FROM review_conversions)::numeric /
          (SELECT count(*) FROM opened)
      ELSE NULL
    END,
    'byKind', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'kind', kind,
        'sent', sent,
        'opened', opened,
        'openRate', CASE WHEN sent > 0 THEN opened::numeric / sent ELSE NULL END
      ) ORDER BY sent DESC, opened DESC)
      FROM by_kind
    ), '[]'::jsonb)
  );
$$;

GRANT ALL ON FUNCTION public.get_admin_notification_analytics(timestamptz)
  TO service_role;
