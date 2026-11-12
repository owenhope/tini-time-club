BEGIN;
SELECT plan(3);

-- Some environments do not carry the production club profile.
INSERT INTO auth.users(id) VALUES ('c74ac2d4-e405-4b2d-a14c-813b7be780e1')
ON CONFLICT DO NOTHING;
INSERT INTO public.profiles(id,username) VALUES ('c74ac2d4-e405-4b2d-a14c-813b7be780e1','Tini Time Club')
ON CONFLICT DO NOTHING;
INSERT INTO auth.users(id) VALUES ('71100000-0000-0000-0000-000000000078');
INSERT INTO public.profiles(id,username) VALUES ('71100000-0000-0000-0000-000000000078','host-passport-reader')
ON CONFLICT (id) DO UPDATE SET username=excluded.username;

SELECT set_config('request.jwt.claim.sub', '71100000-0000-0000-0000-000000000078', true);
SET LOCAL ROLE authenticated;

SELECT lives_ok(
  $$SELECT public.get_member_passport_v1('c74ac2d4-e405-4b2d-a14c-813b7be780e1')$$,
  'A member can read the club host Passport without an error'
);
RESET ROLE;
SELECT is(
  (public.get_member_passport_v1('c74ac2d4-e405-4b2d-a14c-813b7be780e1')->>'points')::integer,
  (SELECT passport_points FROM public.profiles WHERE id='c74ac2d4-e405-4b2d-a14c-813b7be780e1'),
  'The host Passport reports the stored points'
);
SELECT throws_ok(
  $$SELECT public.reconcile_passport_for_v1('c74ac2d4-e405-4b2d-a14c-813b7be780e1')$$,
  '42501', 'Passport is unavailable',
  'The host is still never reconciled'
);

SELECT * FROM finish();
ROLLBACK;
