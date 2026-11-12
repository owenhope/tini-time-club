BEGIN;
SELECT plan(11);

-- The list RPCs carry the award flags so the app does not have to follow
-- each of them with a second request to location_ratings.
SELECT matches(
  pg_get_function_result('public.locations_in_view(double precision,double precision,double precision,double precision)'::regprocedure),
  'is_golden_glass boolean, is_location_verified boolean',
  'Map pins carry the award flags'
);
SELECT matches(
  pg_get_function_result('public.get_profile_regular_places(uuid)'::regprocedure),
  'is_golden_glass boolean, is_location_verified boolean',
  'Regular places carry the award flags'
);
SELECT matches(
  pg_get_function_result('public.get_golden_glass_v1(bigint)'::regprocedure),
  'is_location_verified boolean',
  'Golden Glass rows carry the verified flag'
);

-- Recreating a function resets its privileges; these must match what the
-- functions had before.
SELECT ok(
  has_function_privilege('anon', 'public.locations_in_view(double precision,double precision,double precision,double precision)', 'EXECUTE')
  AND has_function_privilege('authenticated', 'public.locations_in_view(double precision,double precision,double precision,double precision)', 'EXECUTE'),
  'Visitors and members can still load map pins'
);
SELECT ok(
  has_function_privilege('anon', 'public.get_profile_regular_places(uuid)', 'EXECUTE')
  AND has_function_privilege('authenticated', 'public.get_profile_regular_places(uuid)', 'EXECUTE'),
  'Visitors and members can still load regular places'
);
SELECT ok(
  NOT has_function_privilege('anon', 'public.get_golden_glass_v1(bigint)', 'EXECUTE'),
  'Visitors still cannot call the Golden Glass RPC'
);
SELECT ok(
  has_function_privilege('authenticated', 'public.get_golden_glass_v1(bigint)', 'EXECUTE'),
  'Members can still call the Golden Glass RPC'
);

INSERT INTO auth.users (id, aud, role, email, raw_app_meta_data, raw_user_meta_data)
VALUES ('77900000-0000-0000-0000-000000000001', 'authenticated', 'authenticated',
        'award-flags@example.test', '{"provider":"email","providers":["email"]}', '{}');
INSERT INTO public.review_states (id, name)
VALUES (1, 'Active') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, name, address, location, created_by)
VALUES (
  939001,
  'Award Flags Bar Zqx',
  '1 Flag Row',
  'SRID=4326;POINT(-123.1 49.28)',
  '77900000-0000-0000-0000-000000000001'
);
INSERT INTO public.reviews (id, user_id, location, taste, presentation, state, comment)
VALUES
  (939011, '77900000-0000-0000-0000-000000000001', 939001, 5, 5, 1, ''),
  (939012, '77900000-0000-0000-0000-000000000001', 939001, 4, 4, 1, '');

SELECT set_config(
  'request.jwt.claim.sub', '77900000-0000-0000-0000-000000000001', true
);
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT is_golden_glass FROM public.locations_in_view(49.2, -123.2, 49.4, -123.0) WHERE id = 939001),
  false,
  'A map pin reports its Golden Glass flag'
);
SELECT is(
  (SELECT is_location_verified FROM public.locations_in_view(49.2, -123.2, 49.4, -123.0) WHERE id = 939001),
  false,
  'A map pin reports its verified flag'
);

SELECT set_config(
  'test.discover_item',
  (
    SELECT item::text
    FROM jsonb_array_elements(
      public.get_discover_locations_page_v1(20, 'Award Flags Bar Zqx')->'items'
    ) AS item
    WHERE (item->>'id')::bigint = 939001
  ),
  true
) IS NOT NULL;

SELECT is(
  current_setting('test.discover_item')::jsonb->'is_golden_glass',
  'false'::jsonb,
  'A Discover place reports its Golden Glass flag'
);
SELECT is(
  current_setting('test.discover_item')::jsonb->'is_location_verified',
  'false'::jsonb,
  'A Discover place reports its verified flag'
);

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
