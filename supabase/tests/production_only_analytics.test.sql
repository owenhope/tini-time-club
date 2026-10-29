BEGIN;
SELECT plan(8);

SELECT ok(public.analytics_environment_matches('production', 'production'), 'Production rows count as production');
SELECT ok(public.analytics_environment_matches(NULL, 'production'), 'Untagged rows predate tagging and count as production');
SELECT ok(NOT public.analytics_environment_matches('development', 'production'), 'Development rows are not production');
SELECT ok(NOT public.analytics_environment_matches('preview', 'production'), 'Preview rows are not production');

-- One production visitor and one development visitor, both active now, plus
-- an auth-health event from each.
INSERT INTO public.app_usage_daily (usage_date, installation_id, audience, platform, app_environment)
VALUES
  ('2099-01-01', 'da100000-0000-4000-8000-000000000001', 'visitor', 'ios', 'production'),
  ('2099-01-01', 'da100000-0000-4000-8000-000000000002', 'visitor', 'ios', 'development');
INSERT INTO public.app_usage_presence (installation_id, audience, session_id, platform, app_environment, last_seen_at)
VALUES
  ('da100000-0000-4000-8000-000000000001', 'visitor', 'da200000-0000-4000-8000-000000000001', 'ios', 'production', '2099-01-01 12:00:00+00'),
  ('da100000-0000-4000-8000-000000000002', 'visitor', 'da200000-0000-4000-8000-000000000002', 'ios', 'development', '2099-01-01 12:00:00+00');
INSERT INTO public.app_analytics_events (id, installation_id, session_id, event_name, platform, app_environment, occurred_at)
VALUES
  ('da300000-0000-4000-8000-000000000001', 'da100000-0000-4000-8000-000000000001', 'da200000-0000-4000-8000-000000000001', 'auth_unexpected_sign_out', 'ios', 'production', '2099-01-01 12:00:00+00'),
  ('da300000-0000-4000-8000-000000000002', 'da100000-0000-4000-8000-000000000002', 'da200000-0000-4000-8000-000000000002', 'auth_unexpected_sign_out', 'ios', 'development', '2099-01-01 12:00:00+00');

SELECT is(
  (public.get_app_usage_summary('2099-01-01', '2099-01-01', '2099-01-01 00:00:00+00')->>'visitorInRange')::integer,
  1,
  'Usage summary ignores a development installation'
);
SELECT is(
  (public.get_app_usage_summary('2099-01-01', '2099-01-01', '2099-01-01 00:00:00+00')->>'visitorActiveNow')::integer,
  1,
  'Active-now ignores a development installation'
);
SELECT is(
  (public.get_product_analytics_summary('2099-01-01', '2099-01-01')->'authHealth'->>'unexpectedSignOuts')::integer,
  1,
  'Auth health ignores development events'
);
SELECT is(
  (public.get_app_usage_summary('2099-01-01', '2099-01-01', '2099-01-01 00:00:00+00', 'development')->>'visitorInRange')::integer,
  1,
  'A development admin can still see development usage'
);

SELECT * FROM finish();
ROLLBACK;
