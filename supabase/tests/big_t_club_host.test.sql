BEGIN;
SELECT plan(5);

-- Some environments do not carry the production club profile.
INSERT INTO auth.users(id) VALUES ('c74ac2d4-e405-4b2d-a14c-813b7be780e1')
ON CONFLICT DO NOTHING;
INSERT INTO public.profiles(id,username) VALUES ('c74ac2d4-e405-4b2d-a14c-813b7be780e1','Big T')
ON CONFLICT DO NOTHING;

INSERT INTO auth.users(id) VALUES ('71000000-0000-0000-0000-000000000077');
INSERT INTO public.profiles(id,username) VALUES ('71000000-0000-0000-0000-000000000077','host-test-member')
ON CONFLICT (id) DO UPDATE SET username=excluded.username;
SELECT is((SELECT count(*) FROM public.followers
  WHERE following_id='71000000-0000-0000-0000-000000000077' AND follower_id='c74ac2d4-e405-4b2d-a14c-813b7be780e1'),1::bigint,'host follows a new member once');
SELECT is((SELECT count(*) FROM public.followers WHERE follower_id='71000000-0000-0000-0000-000000000077'),0::bigint,'member does not follow back automatically');
SELECT throws_ok($$SELECT public.reconcile_passport_for_v1('c74ac2d4-e405-4b2d-a14c-813b7be780e1')$$,'42501','Passport is unavailable','host has no Passport');
UPDATE public.passport_definitions SET points=points WHERE enabled;
SELECT is((SELECT passport_points FROM public.profiles WHERE id='c74ac2d4-e405-4b2d-a14c-813b7be780e1'),
  (SELECT sum(points)::integer FROM public.passport_definitions WHERE enabled),'host has the catalog maximum');
SELECT is((SELECT passport_points FROM public.profiles WHERE id='71000000-0000-0000-0000-000000000077'),0,'ordinary member retains earned points');
SELECT * FROM finish();
ROLLBACK;
