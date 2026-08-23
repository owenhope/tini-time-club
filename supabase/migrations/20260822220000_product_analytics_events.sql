-- Privacy-safe first-party product analytics. The mobile app sends only an
-- allowlisted event name plus its existing random installation/session IDs.
-- Member identity is derived by the Edge Function from Supabase Auth.

CREATE TABLE IF NOT EXISTS public.app_analytics_events (
  id uuid PRIMARY KEY,
  installation_id uuid NOT NULL,
  session_id uuid NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  event_name text NOT NULL CHECK (
    event_name IN (
      'login',
      'create_account',
      'shared_app',
      'share_review',
      'share_location',
      'new_review',
      'edit_review',
      'like_review',
      'like_comment',
      'view_location',
      'comment_on_review',
      'follow_user',
      'view_profile',
      'change_avatar',
      'report',
      'delete_review',
      'logout',
      'activity_open',
      'activity_notification_open',
      'activity_follow_back',
      'activity_page_load',
      'activity_load_error',
      'visitor_preview_started',
      'membership_gate_opened',
      'membership_gate_dismissed',
      'membership_auth_started',
      'onboarding_completed',
      'auth_unexpected_sign_out',
      'auth_session_missing_at_launch'
    )
  ),
  platform text NOT NULL CHECK (platform IN ('ios', 'android', 'web', 'unknown')),
  app_version text,
  app_environment text,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS app_analytics_events_name_time_idx
  ON public.app_analytics_events (event_name, occurred_at DESC);
CREATE INDEX IF NOT EXISTS app_analytics_events_user_time_idx
  ON public.app_analytics_events (user_id, occurred_at DESC)
  WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS app_analytics_events_installation_time_idx
  ON public.app_analytics_events (installation_id, occurred_at DESC);

ALTER TABLE public.app_analytics_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.app_analytics_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.app_analytics_events TO service_role;

CREATE OR REPLACE FUNCTION public.get_product_analytics_summary(
  p_since date,
  p_until date
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  WITH usage_in_range AS (
    SELECT
      installation_id,
      COALESCE(app_version, 'unknown') AS app_version,
      last_seen_at
    FROM public.app_usage_daily
    WHERE usage_date BETWEEN p_since AND p_until
  ),
  latest_installation_versions AS (
    SELECT DISTINCT ON (installation_id)
      installation_id,
      app_version
    FROM usage_in_range
    ORDER BY installation_id, last_seen_at DESC
  ),
  version_counts AS (
    SELECT app_version, count(*) AS installations
    FROM latest_installation_versions
    GROUP BY app_version
    ORDER BY installations DESC, app_version
  ),
  first_seen AS (
    SELECT installation_id, min(usage_date) AS first_seen_on
    FROM public.app_usage_daily
    GROUP BY installation_id
  ),
  eligible_cohorts AS (
    SELECT installation_id, first_seen_on
    FROM first_seen
    WHERE first_seen_on BETWEEN p_since AND (p_until - 7)
  ),
  retained_cohorts AS (
    SELECT cohort.installation_id
    FROM eligible_cohorts cohort
    WHERE EXISTS (
      SELECT 1
      FROM public.app_usage_daily returned
      WHERE returned.installation_id = cohort.installation_id
        AND returned.usage_date = cohort.first_seen_on + 7
    )
  ),
  auth_events AS (
    SELECT event_name, installation_id
    FROM public.app_analytics_events
    WHERE occurred_at >= p_since::timestamptz
      AND occurred_at < (p_until + 1)::timestamptz
      AND event_name IN (
        'auth_unexpected_sign_out',
        'auth_session_missing_at_launch'
      )
  )
  SELECT jsonb_build_object(
    'versions', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'version', app_version,
            'installations', installations
          )
          ORDER BY installations DESC, app_version
        )
        FROM version_counts
      ),
      '[]'::jsonb
    ),
    'retention', jsonb_build_object(
      'eligibleInstallations', (SELECT count(*) FROM eligible_cohorts),
      'returnedInstallations', (SELECT count(*) FROM retained_cohorts)
    ),
    'authHealth', jsonb_build_object(
      'unexpectedSignOuts', (
        SELECT count(*) FROM auth_events
        WHERE event_name = 'auth_unexpected_sign_out'
      ),
      'sessionMissingAtLaunch', (
        SELECT count(*) FROM auth_events
        WHERE event_name = 'auth_session_missing_at_launch'
      ),
      'affectedInstallations', (
        SELECT count(DISTINCT installation_id) FROM auth_events
      )
    )
  );
$$;

REVOKE ALL ON FUNCTION public.get_product_analytics_summary(date, date)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_product_analytics_summary(date, date)
  TO service_role;
