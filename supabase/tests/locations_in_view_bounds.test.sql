BEGIN;
SELECT plan(9);

INSERT INTO auth.users (id, aud, role, email, raw_app_meta_data, raw_user_meta_data)
VALUES ('63000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'map-bounds@example.test', '{"provider":"email"}', '{}');
INSERT INTO public.profiles (id)
VALUES ('63000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;
INSERT INTO public.locations (id, name, location, created_by)
VALUES
  (963001, 'Bounds test Vancouver', 'SRID=4326;POINT(-123.1 49.28)', '63000000-0000-0000-0000-000000000001'),
  (963002, 'Bounds test Fiji east', 'SRID=4326;POINT(178.4 -18.1)', '63000000-0000-0000-0000-000000000001'),
  (963003, 'Bounds test Fiji west', 'SRID=4326;POINT(-179.9 -16.5)', '63000000-0000-0000-0000-000000000001');
INSERT INTO public.reviews (id, user_id, location, taste, presentation, state, comment)
VALUES
  (963101, '63000000-0000-0000-0000-000000000001', 963001, 4, 4, 1, ''),
  (963102, '63000000-0000-0000-0000-000000000001', 963002, 4, 4, 1, ''),
  (963103, '63000000-0000-0000-0000-000000000001', 963003, 4, 4, 1, '');

CREATE TEMP TABLE bounds_results AS
SELECT 'city' AS view_name, id FROM public.locations_in_view(49.2, -123.2, 49.4, -123.0)
UNION ALL
SELECT 'world', id FROM public.locations_in_view(-90, -180, 90, 180)
UNION ALL
SELECT 'padded world', id FROM public.locations_in_view(-150, -400, 150, 400)
UNION ALL
SELECT 'exactly 180 wide', id FROM public.locations_in_view(0, -180, 80, 0)
UNION ALL
SELECT 'wider than 180', id FROM public.locations_in_view(0, -200, 80, 0)
UNION ALL
SELECT 'across antimeridian', id FROM public.locations_in_view(-20, 170, -15, 190)
UNION ALL
SELECT 'inverted latitude', id FROM public.locations_in_view(50, -124, 49, -122);

CREATE TEMP VIEW bounds_ids AS
SELECT view_name, array_agg(id ORDER BY id) FILTER (WHERE id BETWEEN 963001 AND 963003) AS ids
FROM bounds_results
GROUP BY view_name;

SELECT is((SELECT ids FROM bounds_ids WHERE view_name = 'city'), ARRAY[963001]::bigint[], 'A city view still returns its own places only');
SELECT is((SELECT ids FROM bounds_ids WHERE view_name = 'world'), ARRAY[963001, 963002, 963003]::bigint[], 'A pole-to-pole world view no longer raises an antipodal-edge error');
SELECT is((SELECT ids FROM bounds_ids WHERE view_name = 'padded world'), ARRAY[963001, 963002, 963003]::bigint[], 'Padded bounds past the poles and past ±180° still find every place');
SELECT is((SELECT ids FROM bounds_ids WHERE view_name = 'exactly 180 wide'), ARRAY[963001]::bigint[], 'A view exactly 180° wide is answered');
SELECT is((SELECT ids FROM bounds_ids WHERE view_name = 'wider than 180'), ARRAY[963001]::bigint[], 'A view wider than 180° does not flip to the far side of the world');
SELECT is((SELECT ids FROM bounds_ids WHERE view_name = 'across antimeridian'), ARRAY[963002, 963003]::bigint[], 'A view across the antimeridian finds places on both sides of it');
SELECT is((SELECT count(*) FROM bounds_results WHERE view_name = 'inverted latitude'), 0::bigint, 'Inverted bounds return nothing instead of failing');
SELECT is(
  (SELECT total_ratings FROM public.locations_in_view(-90, -180, 90, 180) WHERE id = 963001),
  1,
  'A place on a slice edge is counted once'
);
SELECT ok(
  has_function_privilege('authenticated', 'public.locations_in_view(double precision,double precision,double precision,double precision)', 'EXECUTE'),
  'Members keep access to the map query'
);

SELECT * FROM finish();
ROLLBACK;
