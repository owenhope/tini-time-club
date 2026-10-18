BEGIN;
SELECT plan(19);
INSERT INTO public.notification_types(id,name) VALUES (2,'Passport test') ON CONFLICT DO NOTHING;
INSERT INTO auth.users (id, aud, role, email, raw_app_meta_data, raw_user_meta_data)
VALUES
 ('62000000-0000-0000-0000-000000000001','authenticated','authenticated','favorites-one@example.test','{"provider":"email"}','{}'),
 ('62000000-0000-0000-0000-000000000002','authenticated','authenticated','favorites-two@example.test','{"provider":"email"}','{}');
INSERT INTO public.profiles(id) VALUES ('62000000-0000-0000-0000-000000000001'), ('62000000-0000-0000-0000-000000000002') ON CONFLICT DO NOTHING;
INSERT INTO public.locations(id, name, location, created_by)
SELECT 962000 + n, 'Favorite test ' || n, 'SRID=4326;POINT(-123.1 49.28)', '62000000-0000-0000-0000-000000000001'::uuid FROM generate_series(1,32) n;

SELECT ok(NOT has_function_privilege('anon', 'public.set_location_favorite(bigint,boolean)', 'EXECUTE'), 'Visitors cannot save favorites');
SELECT ok(NOT has_table_privilege('authenticated', 'public.location_favorites', 'INSERT'), 'Members cannot write favorites for another member directly');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '62000000-0000-0000-0000-000000000001', true);
SELECT is(public.get_location_favorite(962001), false, 'Location starts unsaved');
SELECT is(public.set_location_favorite(962001,true), true, 'Star saves a location');
SELECT is(public.set_location_favorite(962001,true), true, 'Repeated save is idempotent');
SELECT is((SELECT count(*) FROM public.get_profile_favorites('62000000-0000-0000-0000-000000000001')), 1::bigint, 'Saved place appears once');
RESET ROLE;
SELECT is((SELECT count(*) FROM public.passport_awards a JOIN public.passport_definitions d ON d.id=a.definition_id WHERE a.profile_id='62000000-0000-0000-0000-000000000001' AND d.metric='favorites'), 1::bigint, 'First favorite awards one stamp');
SET LOCAL ROLE authenticated;
SELECT is(public.set_location_favorite(962001,false), false, 'Unstar removes a favorite');
SELECT is(public.get_location_favorite(962001), false, 'Removed favorite is no longer saved');
SELECT public.set_location_favorite(962001,true);
RESET ROLE;
SELECT is((SELECT count(*) FROM public.passport_awards a JOIN public.passport_definitions d ON d.id=a.definition_id WHERE a.profile_id='62000000-0000-0000-0000-000000000001' AND d.metric='favorites'), 1::bigint, 'Removing and restoring cannot farm stamps');
INSERT INTO public.location_favorites(profile_id,location_id)
SELECT '62000000-0000-0000-0000-000000000001', 962000+n FROM generate_series(2,32) n;
SELECT public.reconcile_passport_for_v1('62000000-0000-0000-0000-000000000001');
SELECT is((SELECT count(*) FROM public.passport_awards a JOIN public.passport_definitions d ON d.id=a.definition_id WHERE a.profile_id='62000000-0000-0000-0000-000000000001' AND d.metric='favorites'), 4::bigint, 'Distinct favorites advance each reached milestone once');
SELECT is((SELECT passport_points FROM public.profiles WHERE id='62000000-0000-0000-0000-000000000001'), (SELECT sum(d.points)::integer FROM public.passport_awards a JOIN public.passport_definitions d ON d.id=a.definition_id WHERE a.profile_id='62000000-0000-0000-0000-000000000001' AND a.revoked_at IS NULL), 'Profile points match awarded stamps');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '62000000-0000-0000-0000-000000000002', true);
SELECT is((SELECT count(*) FROM public.get_profile_favorites('62000000-0000-0000-0000-000000000001')),31::bigint,'Other members can read the first page and lookahead');
SELECT is((SELECT count(*) FROM public.get_profile_favorites('62000000-0000-0000-0000-000000000001',now(),962003)),2::bigint,'Cursor excludes earlier page entries');
SELECT is(public.get_location_favorite(962001),false,'Favorite state belongs to the caller');
SELECT throws_ok('SELECT public.set_location_favorite(-1,true)','22023','Location is unavailable','Unknown locations cannot be favorited');
RESET ROLE;
INSERT INTO public.blocks(blocker_id,blocked_id) VALUES ('62000000-0000-0000-0000-000000000001','62000000-0000-0000-0000-000000000002');
SET LOCAL ROLE authenticated;
SELECT throws_ok($$SELECT * FROM public.get_profile_favorites('62000000-0000-0000-0000-000000000001')$$,'42501','Favorites are unavailable','Blocked member cannot read favorites');
SELECT set_config('request.jwt.claim.sub', '62000000-0000-0000-0000-000000000001', true);
SELECT throws_ok($$SELECT * FROM public.get_profile_favorites('62000000-0000-0000-0000-000000000002')$$,'42501','Favorites are unavailable','Blocking also hides favorites in the opposite direction');
RESET ROLE;
UPDATE public.profiles SET deleted=true WHERE id='62000000-0000-0000-0000-000000000001';
SET LOCAL ROLE authenticated;
SELECT throws_ok('SELECT public.set_location_favorite(962002,true)','42501','Authentication required','Deleted members cannot save favorites');
RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
