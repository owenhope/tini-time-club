-- Keep development and preview builds out of production analytics.
--
-- A development client can run against the production backend (the
-- start:prod script), and its usage rows and events land here tagged
-- 'development'. Only the feature-usage ranking filtered on that tag; the
-- usage and product summaries counted every row. Both now take the
-- environment to report (default 'production') and count only its rows, so
-- the production dashboard never shows development or preview activity while
-- a local admin on the dev backend still sees dev data. Untagged rows predate
-- environment tagging, when only production builds existed, so they count as
-- production.
--
-- The function bodies are otherwise unchanged from
-- 20260820143000_app_usage_presence and
-- 20260822220000_product_analytics_events. The old signatures are dropped so
-- no ambiguous overloads remain.

BEGIN;

CREATE OR REPLACE FUNCTION public.analytics_environment_matches(
  p_row_environment text,
  p_environment text
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = pg_temp
AS $$
  SELECT COALESCE(p_row_environment, 'production') = p_environment;
$$;

REVOKE ALL ON FUNCTION public.analytics_environment_matches(text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_environment_matches(text, text)
  TO service_role;

DROP FUNCTION IF EXISTS public.get_app_usage_summary(date, date, timestamptz);
DROP FUNCTION IF EXISTS public.get_product_analytics_summary(date, date);

CREATE FUNCTION public.get_app_usage_summary(
  p_since date,
  p_until date,
  p_active_since timestamptz,
  p_environment text DEFAULT 'production'
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  WITH range_rows AS (
    SELECT usage_date, installation_id, audience, user_id
    FROM public.app_usage_daily
    WHERE usage_date BETWEEN p_since AND p_until
      AND public.analytics_environment_matches(app_environment, p_environment)
  ),
  daily_rollup AS (
    SELECT
      usage_date,
      count(DISTINCT installation_id) FILTER (
        WHERE audience = 'visitor'
      ) AS visitors,
      count(DISTINCT user_id) FILTER (
        WHERE audience = 'member'
      ) AS members
    FROM range_rows
    GROUP BY usage_date
  ),
  daily_counts AS (
    SELECT
      day::date AS usage_date,
      COALESCE(daily_rollup.visitors, 0) AS visitors,
      COALESCE(daily_rollup.members, 0) AS members
    FROM generate_series(
      p_since::timestamp,
      p_until::timestamp,
      interval '1 day'
    ) day
    LEFT JOIN daily_rollup ON daily_rollup.usage_date = day::date
    ORDER BY day
  ),
  converted AS (
    SELECT count(*) AS count
    FROM (
      SELECT installation_id
      FROM range_rows
      GROUP BY installation_id
      HAVING bool_or(audience = 'visitor') AND bool_or(audience = 'member')
    ) installations
  )
  SELECT jsonb_build_object(
    'visitorActiveNow', (
      SELECT count(DISTINCT installation_id)
      FROM public.app_usage_presence
      WHERE audience = 'visitor' AND last_seen_at >= p_active_since
        AND public.analytics_environment_matches(app_environment, p_environment)
    ),
    'memberActiveNow', (
      SELECT count(DISTINCT user_id)
      FROM public.app_usage_presence
      WHERE audience = 'member' AND last_seen_at >= p_active_since
        AND public.analytics_environment_matches(app_environment, p_environment)
    ),
    'visitorInRange', (
      SELECT count(DISTINCT installation_id)
      FROM range_rows
      WHERE audience = 'visitor'
    ),
    'memberInRange', (
      SELECT count(DISTINCT user_id)
      FROM range_rows
      WHERE audience = 'member'
    ),
    'convertedInRange', (SELECT count FROM converted),
    'byDay', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'day', usage_date,
            'visitors', visitors,
            'members', members
          )
          ORDER BY usage_date
        )
        FROM daily_counts
      ),
      '[]'::jsonb
    )
  );
$$;

REVOKE ALL ON FUNCTION public.get_app_usage_summary(date, date, timestamptz, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_app_usage_summary(date, date, timestamptz, text)
  TO service_role;

CREATE FUNCTION public.get_product_analytics_summary(
  p_since date,
  p_until date,
  p_environment text DEFAULT 'production'
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
      AND public.analytics_environment_matches(app_environment, p_environment)
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
    WHERE public.analytics_environment_matches(app_environment, p_environment)
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
        AND public.analytics_environment_matches(returned.app_environment, p_environment)
    )
  ),
  auth_events AS (
    SELECT event_name, installation_id
    FROM public.app_analytics_events
    WHERE occurred_at >= p_since::timestamptz
      AND public.analytics_environment_matches(app_environment, p_environment)
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

REVOKE ALL ON FUNCTION public.get_product_analytics_summary(date, date, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_product_analytics_summary(date, date, text)
  TO service_role;

COMMIT;
