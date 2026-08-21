-- Privacy-safe audience measurement for the 4.0 visitor preview. A random
-- installation UUID is the only anonymous identifier; no IP address,
-- advertising identifier, or device fingerprint is persisted.

CREATE TABLE public.app_usage_presence (
  installation_id uuid PRIMARY KEY,
  audience text NOT NULL CHECK (audience IN ('visitor', 'member')),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id uuid NOT NULL,
  platform text NOT NULL CHECK (platform IN ('ios', 'android', 'web', 'unknown')),
  app_version text,
  app_environment text,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (audience = 'visitor' AND user_id IS NULL)
    OR (audience = 'member' AND user_id IS NOT NULL)
  )
);

CREATE INDEX app_usage_presence_last_seen_idx
  ON public.app_usage_presence (last_seen_at DESC);
CREATE INDEX app_usage_presence_audience_last_seen_idx
  ON public.app_usage_presence (audience, last_seen_at DESC);

CREATE TABLE public.app_usage_daily (
  usage_date date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  installation_id uuid NOT NULL,
  audience text NOT NULL CHECK (audience IN ('visitor', 'member')),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('ios', 'android', 'web', 'unknown')),
  app_version text,
  app_environment text,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (usage_date, installation_id, audience),
  CHECK (
    (audience = 'visitor' AND user_id IS NULL)
    OR (audience = 'member' AND user_id IS NOT NULL)
  )
);

CREATE INDEX app_usage_daily_audience_date_idx
  ON public.app_usage_daily (audience, usage_date DESC);
CREATE INDEX app_usage_daily_user_date_idx
  ON public.app_usage_daily (user_id, usage_date DESC)
  WHERE user_id IS NOT NULL;

ALTER TABLE public.app_usage_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_usage_daily ENABLE ROW LEVEL SECURITY;

-- Mobile clients submit through the app-usage Edge Function. Raw identifiers
-- are visible only to the service role used by that function and the admin.
REVOKE ALL ON public.app_usage_presence FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.app_usage_daily FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.app_usage_presence TO service_role;
GRANT ALL ON public.app_usage_daily TO service_role;

CREATE OR REPLACE FUNCTION public.get_app_usage_summary(
  p_since date,
  p_until date,
  p_active_since timestamptz
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
    ),
    'memberActiveNow', (
      SELECT count(DISTINCT user_id)
      FROM public.app_usage_presence
      WHERE audience = 'member' AND last_seen_at >= p_active_since
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

REVOKE ALL ON FUNCTION public.get_app_usage_summary(date, date, timestamptz)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_app_usage_summary(date, date, timestamptz)
  TO service_role;
