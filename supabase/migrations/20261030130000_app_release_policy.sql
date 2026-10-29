-- A server-controlled minimum app version per platform. App builds from
-- 4.9.2 read it at launch and on foreground, and show a blocking "Update
-- required" screen when they are older. Raising the floor later is a one-row
-- update; it lets fallbacks for old builds be retired on purpose instead of
-- waiting for stragglers.
--
-- Seeded at 4.8.0, the oldest version in active use, so nobody is blocked.
-- Reads go through get_app_release_policy_v1 so visitors (anon) can check
-- before signing in; the table itself stays private.

BEGIN;

CREATE TABLE IF NOT EXISTS public.app_release_policy (
  platform text PRIMARY KEY CHECK (platform IN ('ios', 'android')),
  min_supported_version text NOT NULL
    CHECK (min_supported_version ~ '^[0-9]+(\.[0-9]+){0,2}$'),
  store_url text NOT NULL CHECK (store_url ~ '^https://'),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_release_policy ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.app_release_policy FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.app_release_policy TO service_role;

INSERT INTO public.app_release_policy (platform, min_supported_version, store_url)
VALUES
  ('ios', '4.8.0', 'https://apps.apple.com/app/id6741620393'),
  ('android', '4.8.0', 'https://play.google.com/store/apps/details?id=com.ohope.tinitimeclub')
ON CONFLICT (platform) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_app_release_policy_v1(p_platform text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object(
    'minSupportedVersion', policy.min_supported_version,
    'storeUrl', policy.store_url
  )
  FROM public.app_release_policy policy
  WHERE policy.platform = p_platform;
$$;

REVOKE ALL ON FUNCTION public.get_app_release_policy_v1(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_app_release_policy_v1(text)
  TO anon, authenticated, service_role;

COMMIT;
