BEGIN;
SELECT plan(10);

INSERT INTO auth.users (id, aud, role, email, raw_app_meta_data, raw_user_meta_data)
VALUES
  ('61000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'views-one@example.test', '{"provider":"email"}', '{}'),
  ('61000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'views-two@example.test', '{"provider":"email"}', '{}');
INSERT INTO public.locations (id, name, location, created_by)
VALUES (961001, 'View counter test', 'SRID=4326;POINT(-123.1 49.28)', '61000000-0000-0000-0000-000000000001');

SELECT ok(NOT has_function_privilege('anon', 'public.record_location_view(bigint)', 'EXECUTE'), 'Visitors cannot record member views');
SELECT ok(NOT has_table_privilege('authenticated', 'public.location_view_totals', 'UPDATE'), 'Members cannot inflate totals directly');
SELECT ok(NOT has_table_privilege('authenticated', 'public.location_view_receipts', 'SELECT'), 'Member viewing receipts are private');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '61000000-0000-0000-0000-000000000001', true);
SELECT is(public.record_location_view(961001), 1::bigint, 'First opening counts');
SELECT is(public.record_location_view(961001), 1::bigint, 'Sheet to page and repeated opens count once');
SELECT is(public.record_location_view(-1), NULL::bigint, 'Unknown locations do not acquire views');
SELECT set_config('request.jwt.claim.sub', '61000000-0000-0000-0000-000000000002', true);
SELECT is(public.record_location_view(961001), 2::bigint, 'Another member counts separately');
RESET ROLE;

UPDATE public.location_view_receipts SET last_counted_at = now() - interval '31 minutes'
WHERE member_id = '61000000-0000-0000-0000-000000000001';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '61000000-0000-0000-0000-000000000001', true);
SELECT is(public.record_location_view(961001), 3::bigint, 'A later visit counts again');
RESET ROLE;
UPDATE public.profiles SET deleted = true WHERE id = '61000000-0000-0000-0000-000000000001';
SET LOCAL ROLE authenticated;
SELECT throws_ok('SELECT public.record_location_view(961001)', '42501', 'Authentication required', 'Deleted accounts cannot record views');
RESET ROLE;
SELECT is((SELECT view_count FROM public.location_view_totals WHERE location_id = 961001), 3::bigint, 'Rejected views leave the total unchanged');

SELECT * FROM finish();
ROLLBACK;
